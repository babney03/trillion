// Kit voice (Node): script lines -> Kokoro speech per character -> placed on the timeline,
// with word times and a mouth track for lip-sync (out/voice.json, same format as engine Voice.speak).
//
//   const KV = require('./kit/voice');
//   KV.synth(lines, VOICES)            // makes/caches every line's audio; returns { key: seconds }
//   KV.writeLengths(lengths, file)     // voice-lengths.js, read by the score to lay out the timeline
//   const vo = KV.place(lines, VOICES, N, outDir)   // -> { bus, json } and writes out/voice.json
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { SR, Bus } = require('../engine/audio/dsp');
const EV = require('../engine/audio/voice');

const PY = process.env.KIT_PYTHON || '/opt/tts/bin/python';
const ROOT = process.cwd();
const CACHE = path.join(ROOT, 'out', '.voice');
const TTS = path.join(ROOT, 'kit', 'tts.py');

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const cfgKey = (line, V) => { const v = V[line.who] || V.narrator; return fnv(`${v.voice}|${v.speed}|${v.pitch}|${v.gain}|${line.group ? line.group.text : line.text}`); };
const partFile = (line, V) => line.group ? `${cfgKey(line, V)}_${line.group.k}.f32` : `${cfgKey(line, V)}.f32`;

function trim(x) {
  const hop = SR / 100, n = Math.floor(x.length / hop);
  const e = new Float32Array(n);
  let pk = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = x[i * hop + j]; s += v * v; } e[i] = Math.sqrt(s / hop); pk = Math.max(pk, e[i]); }
  let a = 0, b = n;
  // a low threshold + generous margins: soft consonants (the f in "four", the s in "six") are quiet but matter
  while (a < b && e[a] < pk * 0.008) a++;
  while (b > a && e[b - 1] < pk * 0.008) b--;
  return x.slice(Math.max(0, (a - 6) * hop), Math.min(x.length, (b + 6) * hop));
}
function normalise(x, targetRms = 0.1) {
  let s = 0; for (const v of x) s += v * v;
  const r = Math.sqrt(s / Math.max(1, x.length)) || 1e-6;
  const g = Math.min(8, targetRms / r);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g;
  // fade the edges (no clicks)
  const f = Math.min(240, y.length >> 2);
  for (let i = 0; i < f; i++) { y[i] *= i / f; y[y.length - 1 - i] *= i / f; }
  return y;
}

// decode the 24 kHz Kokoro wav, shift pitch+formants for the character, -> 48 kHz Float32
// a counted/spelled group ("One, two, three...") is spoken as ONE natural phrase, then split at its pauses
function splitGroup(x, n) {
  for (const merge of [10, 8, 12, 6, 14, 5, 16, 4, 18, 20, 3, 24]) {
    const segs = EV.segments(x, { thr: 0.04, merge });
    if (segs.length === n) return segs.map(([a, b]) => x.slice(Math.max(0, (a - 2) * SR / 100), Math.min(x.length, (b + 3) * SR / 100)));
  }
  // fallback: estimated word boundaries
  const words = EV.fit(x, Array.from({ length: n }, (_, i) => 'w' + i), null);
  return words.map((w) => x.slice(Math.round(w.t * SR), Math.round(w.end * SR)));
}
function load(line, V) {
  if (line.group) {
    const f = path.join(CACHE, partFile(line, V));
    if (!fs.existsSync(f)) {
      const whole = load({ who: line.who, text: line.group.text }, V);
      const parts = splitGroup(whole, line.group.n);
      parts.forEach((p, k) => { const y = normalise(p, 0.1 * ((V[line.who] || V.narrator).gain || 1)); fs.writeFileSync(path.join(CACHE, `${cfgKey(line, V)}_${k}.f32`), Buffer.from(y.buffer, y.byteOffset, y.byteLength)); });
    }
    const b = fs.readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
  }
  const v = V[line.who] || V.narrator;
  const key = cfgKey(line, V);
  const f32 = path.join(CACHE, key + '.f32');
  if (fs.existsSync(f32)) { const b = fs.readFileSync(f32); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); }
  const r = Math.pow(2, (v.pitch || 0) / 12);
  const af = [`asetrate=${24000 * r}`, `aresample=${SR}`, r !== 1 ? `atempo=${(1 / r).toFixed(5)}` : null, 'highpass=f=80', v.eq || null].filter(Boolean).join(',');
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(CACHE, key + '.wav'), '-af', af, '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const x = normalise(trim(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4)), 0.1 * (v.gain || 1));
  fs.writeFileSync(f32, Buffer.from(x.buffer, x.byteOffset, x.byteLength));
  return x;
}

function synth(lines, V) {
  fs.mkdirSync(CACHE, { recursive: true });
  const jobs = [], seen = new Set();
  for (const l of lines) {
    const v = V[l.who] || V.narrator, id = cfgKey(l, V);
    if (seen.has(id)) continue; seen.add(id);
    const short = String(l.text).split(/\s+/).filter(Boolean).length <= 2;
    jobs.push({ id, text: l.group ? l.group.text : (l.say || l.text), expect: l.text, voice: v.voice, speed: v.speed || 1, pitch: v.pitch || 0, check: l.check ?? short, alts: l.alts || [] });
  }
  const jf = path.join(CACHE, 'jobs.json');
  fs.writeFileSync(jf, JSON.stringify(jobs));
  execFileSync(PY, [TTS, jf, CACHE], { stdio: 'inherit' });
  const lengths = {};
  for (const l of lines) lengths[l.key] = +(load(l, V).length / SR).toFixed(3);
  fs.writeFileSync(path.join(CACHE, 'lines.json'), JSON.stringify(lines.map((l) => ({ who: l.who, text: l.text, file: partFile(l, V) }))));
  return lengths;
}

function writeLengths(lengths, file = path.join(ROOT, 'voice-lengths.js')) {
  fs.writeFileSync(file, `// generated by kit/voice.js: spoken length (s) of every script line, so the score can lay out the timeline\n(function(){ const L = ${JSON.stringify(lengths)}; if (typeof module !== 'undefined') module.exports = L; else globalThis.VOICE_LENGTHS = L; })();\n`);
}

function place(lines, V, N, outDir = path.join(ROOT, 'out'), fps = 30) {
  const bus = new Bus(N);
  const out = [];
  for (const l of lines) {
    const x = load(l, V);
    const v = V[l.who] || V.narrator;
    bus.addMono(x, l.t, 1, v.pan || 0);
    const words = EV.fit(x, String(l.text).split(/\s+/).filter(Boolean), null).map((w) => ({ w: w.w, t: +(l.t + w.t).toFixed(3), end: +(l.t + w.end).toFixed(3) }));
    out.push({ t: +l.t.toFixed(3), end: +(l.t + x.length / SR).toFixed(3), text: l.text, who: l.who, words });
  }
  const json = { engine: 'kokoro', lines: out, mouth: EV.mouthTrack(bus, fps) };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'voice.json'), JSON.stringify(json));
  return { bus, json };
}

module.exports = { synth, writeLengths, place, load, cfgKey, CACHE };
