// Kit music (Node): renders an episode's whole soundtrack from SCORE.KIT.
//   moods  -> the band (intro, play, sneaky, think, sad, party, outro, calm; 'stop'/'hold' = silence)
//   notes  -> the gimmick notes (every block that lands, every letter that stamps)
//   sfx    -> named sound effects tied to story events
//   lines  -> the voices (Kokoro), with the music ducked under every word
// Then masters to -14 LUFS and writes out/music.wav (+ out/voice.json for lip-sync).
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('../engine/audio/dsp');
const I = require('../engine/audio/instruments');
const MIX = require('../engine/audio/mix');
const MU = require('../engine/music');
const KV = require('./voice');

const CH = { // chord voicings in C (transposed by the episode key)
  C: { n: ['E4', 'G4', 'C5'], b: 'C2' }, G: { n: ['D4', 'G4', 'B4'], b: 'G1' }, Am: { n: ['E4', 'A4', 'C5'], b: 'A1' },
  F: { n: ['F4', 'A4', 'C5'], b: 'F1' }, Dm: { n: ['D4', 'F4', 'A4'], b: 'D2' }, E: { n: ['E4', 'G#4', 'B4'], b: 'E2' },
  Em: { n: ['E4', 'G4', 'B4'], b: 'E2' }, Fmaj7: { n: ['E4', 'A4', 'C5'], b: 'F1' }, Csus: { n: ['F4', 'G4', 'C5'], b: 'C2' },
};
const PROG = {
  intro: ['C', 'Am'], play: ['C', 'G', 'Am', 'F'], calm: ['C', 'Am', 'F', 'G'], sneaky: ['Am', 'E'], think: ['F', 'G'],
  sad: ['Am', 'F', 'Dm', 'E'], party: ['C', 'F', 'G', 'C'], outro: ['F', 'G', 'C', 'C'],
};
// the Pip & Biscuit theme (2 bars of 8ths): the series' sonic logo
const THEME = [
  [['C5', 0, 1], ['E5', 1, 1], ['G5', 2, 2], ['E5', 4, 1], ['C5', 5, 1], ['D5', 6, 2]],
  [['E5', 0, 1], ['D5', 1, 1], ['C5', 2, 2], ['A4', 4, 1], ['G4', 5, 1], ['C5', 6, 2]],
];
const SAD_TUNE = [[['E5', 0, 3], ['C5', 3, 1], ['A4', 4, 4]], [['F4', 0, 2], ['A4', 2, 2], ['G#4', 4, 4]]];

function render(SCORE, { out = path.join(process.cwd(), 'out'), stems = !!process.env.STEMS } = {}) {
  const K = SCORE.KIT, clock = SCORE.clock, { BEAT, BAR, DURATION } = SCORE;
  const key = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, Bb: 10 }[K.key] ?? 0;
  const m = (n) => MU.m(n) + key;
  const N = Math.ceil(DURATION * SR);
  const bus = () => new Bus(N);
  const B = { drums: bus(), bass: bus(), uke: bus(), keys: bus(), lead: bus(), pad: bus(), notes: bus(), fx: bus(), verb: bus(), dly: bus() };

  // mood segments [t0, t1)
  const moods = K.moods.length ? K.moods : [{ t: 0, mood: 'play' }];
  const segs = moods.map((md, i) => ({ mood: md.mood, t0: md.t, t1: i + 1 < moods.length ? moods[i + 1].t : DURATION }));
  const moodAt = (t) => { let r = null; for (const s of segs) if (t >= s.t0 - 1e-6 && t < s.t1 - 1e-6) r = s; return r; };
  const barOf = (t) => Math.floor((t - clock.OFFSET) / BAR + 1e-6);
  const chordAt = (t) => { const s = moodAt(t); if (!s || !PROG[s.mood]) return null; const p = PROG[s.mood]; const i = Math.max(0, barOf(t) - barOf(s.t0)); return CH[p[i % p.length]]; };

  const K1 = I.kick({ punch: 0.9, tail: 0.5 }), CL = I.clap(), SN = I.snare(), CR = I.crash(18), HH = [I.hat(false, 11), I.hat(false, 12)], SH = [I.shaker(1, 15), I.shaker(0.6, 16)];
  const kicks = [];
  const lastBar = Math.ceil((DURATION - clock.OFFSET) / BAR) + 1;
  clock.eachStep(0, lastBar, 16, (t, bar, st) => {
    if (t >= DURATION - 0.05) return;
    const s = moodAt(t); if (!s) return;
    const md = s.mood, c = chordAt(t), inBar = barOf(t) - barOf(s.t0);
    const beat = st / 4, eighth = st % 2 === 0;
    // drums
    if (md === 'play' || md === 'party') {
      const big = md === 'party';
      if (big ? st % 4 === 0 : st % 8 === 0) { B.drums.addMono(K1, t, big ? 0.85 : 0.55); kicks.push(t); }
      if (st % 8 === 4) { B.drums.addMono(CL, t, big ? 0.55 : 0.42); B.verb.addMono(CL, t, 0.2); if (big) B.drums.addMono(SN, t, 0.22); }
      if (eighth) B.drums.addMono(SH[(st / 2) % 2], t, big ? 0.13 : 0.11, 0.3);
      if (big && st % 4 === 2) B.drums.addMono(HH[(st / 4) % 2 | 0], t, 0.16, -0.25);
    }
    if (md === 'sneaky' && st % 8 === 4) B.drums.addMono(I.rim(1.2, st), t, 0.35, 0.2);
    if (md === 'think' && eighth) B.drums.addMono(I.woodTick(st % 4 === 0 ? 1.1 : 0.9), t, 0.12, 0.25);
    if (!c) return;
    const R = m(c.b) + 12;
    // bass
    if (md === 'play' || md === 'calm') { if (st === 0 || st === 8) B.bass.addMono(I.bass(R, BEAT * 0.7, { bright: 0.4 }), t, 0.5); if (st === 6 || st === 14) B.bass.addMono(I.bass(R + 7, BEAT * 0.35, { bright: 0.4 }), t, 0.36); }
    if (md === 'party' && eighth) B.bass.addMono(I.bass(st % 4 === 2 ? R + 12 : R, BEAT * 0.4, { sub: 0.8 }), t, 0.5);
    if (md === 'sneaky' && st % 4 === 0) { const walk = [0, 3, 7, 9][beat % 4]; B.bass.addMono(I.pizz(R + 12 + walk), t, 0.7); }
    if (md === 'think' && (st === 0 || st === 8)) B.bass.addMono(I.pizz(R + 12), t, 0.55);
    // ukulele off-beat strums (plucked strings)
    if ((md === 'play' || md === 'party' || md === 'intro' || md === 'calm' || md === 'outro') && st % 4 === 2) {
      c.n.forEach((n, j) => B.uke.addMono(I.guitar(m(n), BEAT * 0.55, { bright: 0.7, sustain: 0.994, seed: bar * 16 + st + j }), t + j * 0.011, md === 'intro' || md === 'outro' || md === 'calm' ? 0.14 : 0.2, (j - 1) * 0.25));
    }
    // pads under the soft moods
    if ((md === 'sad' || md === 'think' || md === 'outro' || md === 'calm') && st === 0) for (const n of c.n) { const { L, R: Rr } = I.padNote(m(n), BAR, { cutoff: 900, attack: 0.35, release: 1.1 }); B.pad.addStereo(L, Rr, t, 0.06); }
    // melodies: theme on music box (intro/outro), brass (party); sad tune (sad)
    if (st === 0 && (md === 'intro' || md === 'outro' || md === 'party')) {
      const notes = MU.placeBar(clock, THEME[inBar % 2], barOf(t), key + (md === 'party' ? 0 : 12));
      for (const n of notes) {
        if (n.t >= s.t1) continue;
        if (md === 'party') { const a = I.brassNote(n.midi, n.dur * 0.9), b2 = I.brassNote(n.midi - 12, n.dur * 0.9, { bright: 0.8, seed: 99 }); B.lead.addStereo(a.L, a.R, n.t, 0.2); B.lead.addStereo(b2.L, b2.R, n.t, 0.1); B.verb.addStereo(a.L, a.R, n.t, 0.06); }
        else { const mb = I.musicBox(n.midi); B.keys.addMono(mb, n.t, 0.16); B.verb.addMono(mb, n.t, 0.16); B.dly.addMono(mb, n.t, 0.05); }
      }
    }
    if (st === 0 && md === 'sad') for (const n of MU.placeBar(clock, SAD_TUNE[inBar % 2], barOf(t), key)) { if (n.t >= s.t1) continue; const mb = I.musicBox(n.midi); B.keys.addMono(mb, n.t, 0.18); B.verb.addMono(mb, n.t, 0.25); }
  });

  // gimmick notes
  const inst = {
    marimba: (n) => I.marimba(n, { thock: 0.5 }), pizz: (n) => I.pizz(n), musicbox: (n) => I.musicBox(n), glock: (n) => I.musicBox(n, { decay: 0.6 }),
    bell: (n) => I.bell(440 * Math.pow(2, (n - 69) / 12), 1.1, 1.6, 3.5), guitar: (n) => I.guitar(n, 0.6, { bright: 0.8 }),
  };
  for (const n of K.notes) { const x = (inst[n.inst] || inst.marimba)(n.midi + key); B.notes.addMono(x, n.t, n.gain ?? (n.inst === 'pizz' ? 0.7 : 0.5), n.pan || 0); B.verb.addMono(x, n.t, 0.12); }
  // stamped letters: a glockenspiel scale up
  const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7'];
  for (const tx of K.texts) {
    if (!tx.letters) continue;
    let k = 0;
    for (const l of tx.letters) { if (l.ch === ' ') continue; const nn = tx.notes ? MU.m(tx.notes[k % tx.notes.length]) : MU.m(scale[k % scale.length]); const g = I.musicBox(nn + key, { decay: 0.6 }); B.notes.addMono(g, l.t, 0.22, ((l.j / 6) - 0.5) * 0.5); B.fx.addMono(I.thud(150, 0.04), l.t, 0.22); k++; }
  }

  // sound effects
  const yip = (t, g, pitch = 'A5') => B.fx.addMono(I.voice(MU.m(pitch), 0.12, { syl: 'a', type: 'alto', shout: 1.2, glide: -0.06, seed: Math.round(t * 100) }), t, g, 0.15);
  const SFX = {
    woodTick: (e) => B.fx.addMono(I.woodTick(e.pitch || 1), e.t, e.gain ?? 0.28, e.pan || 0),
    thud: (e) => B.fx.addMono(I.thud(e.pitch || 80, 0.09), e.t, e.gain ?? 0.8, e.pan || 0),
    bonk: (e) => { B.fx.addMono(I.thud(70, 0.1), e.t, 0.95, e.pan || 0); B.fx.addMono(I.pop(0.7), e.t, 0.55, e.pan || 0); B.fx.addMono(I.boing(), e.t + 0.02, 0.14, e.pan || 0); },
    boing: (e) => B.fx.addMono(I.boing(), e.t, e.gain ?? 0.3, e.pan || 0),
    pop: (e) => B.fx.addMono(I.pop(e.pitch || 1), e.t, e.gain ?? 0.45, e.pan || 0),
    whoosh: (e) => B.fx.addMono(I.paperFwip(e.pitch || 1.2, Math.round(e.t * 10)), e.t, e.gain ?? 0.18, e.pan || 0),
    tumble: (e) => B.fx.addMono(I.noiseSweep(e.len || 0.45, 2600, 300, { q: 1.2, pink: true }), e.t, e.gain ?? 0.25),
    scratch: (e) => { B.fx.addMono(I.tvClick(), e.t, 1.0); B.fx.addMono(I.pop(0.6), e.t, 0.5); B.fx.addMono(I.noiseSweep(0.18, 600, 4500, { q: 3 }), e.t, 0.45); B.fx.addMono(I.noiseSweep(0.14, 4000, 500, { q: 3 }), e.t + 0.17, 0.35); },
    sadTrombone: (e) => [['Bb3', 0], ['A3', 1], ['Ab3', 2], ['G3', 3]].forEach(([n, k]) => { const a = I.brassNote(MU.m(n), k === 3 ? BEAT * 1.6 : BEAT * 0.8, { bright: 0.5, seed: 70 + k }); B.fx.addStereo(a.L, a.R, e.t + k * BEAT, 0.16); }),
    ding: (e) => { B.fx.addMono(I.pop(1.6), e.t, 0.45); B.fx.addMono(I.bell(1568, 1.4, 2, 3.5), e.t, 0.32); B.fx.addMono(I.bell(2093, 1.2, 2, 3.5), e.t + 0.08, 0.22); },
    sparkle: (e) => [0, 1, 2].forEach((k) => B.fx.addMono(I.bell(1568 * Math.pow(2, (k * 4) / 12), 0.8, 1.4, 3.5), e.t + k * 0.06, 0.14)),
    whistleUp: (e) => B.fx.addMono(I.launchWhistle(e.len || 0.45), e.t, e.gain ?? 0.2, e.pan || 0),
    slide: (e) => B.fx.addMono(I.whistle(e.len || 0.4), e.t, e.gain ?? 0.16, e.pan || 0),
    riser: (e) => B.fx.addMono(I.noiseSweep(e.len || 2, 200, 7000, { q: 0.9, shape: (x) => x * x, pink: true }), e.t, e.gain ?? 0.3),
    tada: (e) => { B.fx.addMono(I.subBoom(1.6), e.t, 0.55); B.fx.addMono(CR, e.t, 0.42, -0.1); B.fx.addMono(I.pop(1.0), e.t, 0.6); B.fx.addMono(I.fireworkBurst(3, 1), e.t + 0.05, 0.25); for (const n of ['C4', 'E4', 'G4', 'C5']) { const a = I.brassNote(MU.m(n) + key, 0.9, { stab: true }); B.fx.addStereo(a.L, a.R, e.t, 0.12); } },
    yip: (e) => { yip(e.t, e.gain ?? 0.2); if ((e.n || 2) > 1) yip(e.t + 0.16, (e.gain ?? 0.2) * 0.7); },
    bark: (e) => { yip(e.t, e.gain ?? 0.24, 'E5'); if ((e.n || 1) > 1) yip(e.t + 0.22, (e.gain ?? 0.24) * 0.8, 'E5'); },
    whimper: (e) => B.fx.addMono(I.voice(MU.m('C6'), 0.5, { syl: 'u', type: 'alto', glide: -0.5, breath: 0.3, seed: 5 }), e.t, e.gain ?? 0.12),
    click: (e) => B.fx.addMono(I.tvClick(), e.t, e.gain ?? 0.5),
    chomp: (e) => { B.fx.addMono(I.woodTick(0.6), e.t, 0.35); B.fx.addMono(I.paperFwip(0.6, 3), e.t + 0.02, 0.15); },
    step: (e) => B.fx.addMono(I.woodTick(0.7 + (e.k || 0) % 2 * 0.15), e.t, e.gain ?? 0.12, e.pan || 0),
  };
  for (const e of K.sfx) (SFX[e.name] || (() => console.warn('unknown sfx', e.name)))(e);

  // voices
  let voice = null;
  if (K.lines.length) {
    const vo = KV.place(K.lines, K.voices, N, out);
    voice = vo.bus;
  }

  // silence for 'stop' / 'hold' moods (the band and its reverb tails, not the voices or effects)
  const music = [B.drums, B.bass, B.uke, B.keys, B.lead, B.pad];
  const wet = { verb: reverb(B.verb, { room: 0.8, damp: 0.35 }), dly: pingpong(B.dly, BEAT * 0.75, 0.3, 3500) };
  for (const s of segs) if (s.mood === 'stop' || s.mood === 'hold') for (const b of [...music, wet.verb, wet.dly]) MIX.gate(b, s.t0, s.t1);
  if (kicks.length) MIX.sidechain([B.bass, B.uke], kicks.filter((t) => (moodAt(t) || {}).mood === 'party'), { depth: 0.3 });
  // the band dips under every word; the gimmick notes (blocks, catches, letters) stay crisp: they ARE the story
  if (voice) MIX.duck([...music, wet.verb, wet.dly], voice, { depth: 0.55 });
  const stemsMap = { ...B, verb: wet.verb, dly: wet.dly };
  if (voice) stemsMap.voice = voice;
  const GAIN = { drums: 0.45, bass: 0.7, uke: 2.4, keys: 1.0, lead: 1.7, pad: 2.2, notes: 1.0, fx: 0.85, verb: 1, dly: 1, voice: 1.0 };
  const mix = MIX.mixdown(stemsMap, GAIN, { stemDir: stems ? out : null });
  MIX.highpass(mix, 24);
  MIX.fadeOut(mix, DURATION - 0.8, DURATION);
  const M = MIX.master(mix, 0.8, undefined, { lufs: -14 });
  MIX.writeWav(path.join(out, 'music.wav'), mix);
  console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s, ${M.lufs !== undefined ? M.lufs.toFixed(1) + ' LUFS' : ''}, ${K.lines.length} voice lines)`);
}

module.exports = { render, THEME, PROG, CH };
