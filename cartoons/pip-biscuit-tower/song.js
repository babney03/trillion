// THE SONG: renders every sound of "The Wobbly Tower" from the score into out/music.wav.
//   node song.js            (STEMS=1 also writes out/stem-*.wav, LUFS=-14 masters to YouTube loudness)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, W } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), uke = bus(), keys = bus(), lead = bus(), fx = bus(), pad = bus();
const verb = bus(), dly = bus();
const pan = (x) => (x / W - 0.5) * 1.1; // sounds come from where they happen on screen

// sections where the band plays
const playing = (t) => ((t >= T(2) && t < ev.scratch - BEAT / 2) || (t >= T(8) && t < ev.hold) || (t >= ev.star && t < ev.end)) && Math.abs(t - ev.bump) > 0.01; // the band freezes an 8th before the scratch, and lets the bonk hit alone
const party = (t) => t >= ev.star && t < ev.end;

// ---------- drums ----------
const K = I.kick({ punch: 0.9, tail: 0.5 }), CL = I.clap(), SN = I.snare(), HC = [I.hat(false, 11), I.hat(false, 12)], CR = I.crash(18);
const SH = [I.shaker(1, 15), I.shaker(0.6, 16)];
const kicks = [];
clock.eachStep(2, 14, 16, (t, b, s) => {
  if (!playing(t)) return;
  const big = party(t);
  if (big ? s % 4 === 0 : s % 8 === 0) { drums.addMono(K, t, big ? 0.9 : 0.7); kicks.push(t); }
  if (s % 8 === 4) { drums.addMono(CL, t, 0.55); verb.addMono(CL, t, 0.25); }
  if (s % 2 === 0) drums.addMono(SH[(s / 2) % 2], t, 0.16, 0.3);
  if (big && s % 4 === 2) drums.addMono(HC[s % 2], t, 0.16, -0.25);
});
drums.addMono(CR, ev.star, 0.45, -0.1);
// snare roll into the held breath before the star
for (let i = 0; i < 8; i++) drums.addMono(SN, T(11, 1.5) + i * BEAT / 4, 0.12 + i * 0.03, 0.05);

// ---------- bass: bouncy root-fifth ----------
clock.eachStep(2, 14, 8, (t, b, s) => {
  if (!playing(t)) return;
  const c = sc.chordAt(t);
  if (!c) return;
  const R = c.bass + 12;
  if (s === 0 || s === 4) bass.addMono(I.bass(R, BEAT * 0.7, { bright: 0.4 }), t, 0.55);
  if (s === 3 || s === 7) bass.addMono(I.bass(R + 7, BEAT * 0.35, { bright: 0.4 }), t, 0.4);
});

// ---------- ukulele-ish chord strums on the off-beats (plucked strings) ----------
clock.eachStep(0, 15, 8, (t, b, s) => {
  if (!(playing(t) || t < T(2) || t >= ev.end)) return;
  if (s % 2 !== 1) return;
  const c = sc.chordAt(t);
  if (!c) return;
  c.notes.forEach((n, j) => uke.addMono(I.guitar(n, BEAT * 0.6, { bright: 0.7, sustain: 0.994, seed: b * 10 + s + j }), t + j * 0.012, t < T(2) || t >= ev.end ? 0.16 : 0.22, (j - 1) * 0.25));
});

// ---------- soft pad under the sad part and the outro ----------
for (const c of sc.chords) {
  if (!(c.t0 >= ev.scratch && c.t0 < T(8)) && !(c.t0 >= ev.end)) continue;
  for (const n of c.notes) { const { L, R } = I.padNote(n, c.t1 - c.t0, { cutoff: 900, attack: 0.4, release: 1.2 }); pad.addStereo(L, R, c.t0, 0.07); }
}

// ---------- melodies ----------
for (const n of sc.musicbox.concat(sc.outroBox)) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t, 0.17); verb.addMono(mb, n.t, 0.18); dly.addMono(mb, n.t, 0.06); }
for (const n of sc.sadBox) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t, 0.2); verb.addMono(mb, n.t, 0.28); }
// title: each letter stamp is a glockenspiel note
for (const L of sc.title) { const g = I.musicBox(L.midi, { decay: 0.6 }); keys.addMono(g, L.t, 0.22, ((L.j / 6) - 0.5) * 0.6); fx.addMono(I.thud(140, 0.04), L.t, 0.25); }
// brass hook in the party
for (const n of sc.brass) {
  const a = I.brassNote(n.midi, n.dur * 0.9), b = I.brassNote(n.midi - 12, n.dur * 0.9, { bright: 0.8, seed: 99 });
  lead.addStereo(a.L, a.R, n.t, 0.22); lead.addStereo(b.L, b.R, n.t, 0.11); verb.addStereo(a.L, a.R, n.t, 0.08);
}

// ---------- THE GIMMICK: every block that lands plays a note ----------
for (const b of sc.round1) { const x = I.marimba(b.midi, { thock: 0.6 }); keys.addMono(x, b.land, 0.45, pan(b.x)); verb.addMono(x, b.land, 0.15); fx.addMono(I.woodTick(1.0), b.land, 0.3, pan(b.x)); }
// round 2: Pip's blocks on marimba, Biscuit's on pizzicato + a pop (call and response), climbing higher
for (const b of sc.round2) {
  const x = b.who === 'pip' ? I.marimba(b.midi, { thock: 0.6 }) : I.pizz(b.midi);
  keys.addMono(x, b.land, b.who === 'pip' ? 0.55 : 0.75, pan(b.x)); verb.addMono(x, b.land, 0.15);
  fx.addMono(I.woodTick(1.1), b.land, 0.3, pan(b.x));
  if (b.who === 'dog') fx.addMono(I.pop(1.3), b.land - sc.FLIGHT, 0.25, pan(sc.DOG.x)); // the toss
}
// whoosh on every throw
for (const b of sc.round1.concat(sc.round2)) fx.addMono(I.paperFwip(1.2, Math.round(b.land * 10)), b.land - sc.FLIGHT, 0.12, pan(b.x));
// the crash: falling notes, each block a bonk
for (const f of sc.fall) { const x = I.marimba(f.midi, { thock: 1, decay: 0.22 }); keys.addMono(x, f.land, 0.32, pan(f.x1)); fx.addMono(I.thud(120 + f.i * 15, 0.06), f.land, 0.45, pan(f.x1)); }
// the word lights up: bells
for (const L of sc.spell) { const g = I.bell(440 * Math.pow(2, (L.midi - 69) / 12), 1.2, 1.6, 3.5); keys.addMono(g, L.t, 0.2, ((L.j / 7) - 0.5) * 0.8); verb.addMono(g, L.t, 0.15); }

// ---------- fx tied to story events ----------
fx.addMono(I.whistle(ev.bump - ev.bumpJump), ev.bumpJump, 0.18, pan(sc.DOG.x)); // the leap
fx.addMono(I.boing(), ev.bump - 0.01, 0.16, pan(sc.TOWER_X));
fx.addMono(I.thud(70, 0.1), ev.bump, 0.95, pan(sc.TOWER_X));
fx.addMono(I.pop(0.7), ev.bump, 0.5, pan(sc.TOWER_X));
for (let i = 0; i < 5; i++) fx.addMono(I.woodTick(0.8 + (i % 2) * 0.3), ev.bump + BEAT * 0.75 + i * BEAT / 4, 0.08, pan(sc.TOWER_X)); // wobble
fx.addMono(I.noiseSweep(0.4, 2500, 300, { q: 1.2, pink: true }), ev.topple, 0.25); // down it goes
// record scratch + sad trombone ("wah wah wah waaah")
fx.addMono(I.tvClick(), ev.scratch, 1.0);
fx.addMono(I.pop(0.6), ev.scratch, 0.5); // a sharp edge so the scratch reads as a hit
fx.addMono(I.noiseSweep(0.18, 600, 4500, { q: 3 }), ev.scratch, 0.45);
fx.addMono(I.noiseSweep(0.14, 4000, 500, { q: 3 }), ev.scratch + 0.17, 0.35);
[['Bb3', 0], ['A3', 1], ['Ab3', 2], ['G3', 3]].forEach(([n, k]) => {
  const dur = k === 3 ? BEAT * 1.6 : BEAT * 0.8;
  const a = I.brassNote(m(n), dur, { bright: 0.5, seed: 70 + k });
  lead.addStereo(a.L, a.R, ev.scratch + BEAT + k * BEAT, 0.2);
});
fx.addMono(I.bwomp(), ev.sad, 0.2);
// the idea: a ding + sparkle
fx.addMono(I.pop(1.6), ev.idea, 0.5);
fx.addMono(I.bell(1568, 1.4, 2, 3.5), ev.idea, 0.35);
fx.addMono(I.bell(2093, 1.2, 2, 3.5), ev.idea + 0.08, 0.25);
// the star lands: the drop
fx.addMono(I.noiseSweep(T(11, 3.5) - T(10, 2), 200, 7000, { q: 0.9, shape: (x) => x * x, pink: true }), T(10, 2), 0.35); // riser
fx.addMono(I.launchWhistle(sc.FLIGHT), ev.star - sc.FLIGHT, 0.2);
fx.addMono(I.subBoom(1.8), ev.star, 0.6);
fx.addMono(I.pop(1.0), ev.star, 0.6);
fx.addMono(I.fireworkBurst(3, 1), ev.star + 0.05, 0.3);
// biscuit's happy yips (short formant "arf"s)
const arf = (t, g = 0.18) => { const v = I.voice(m('A5'), 0.11, { syl: 'a', type: 'alto', shout: 1.2, glide: -0.05, seed: Math.round(t * 100) }); fx.addMono(v, t, g, pan(sc.DOG.x)); };
arf(T(1, 3)); arf(T(1, 3) + 0.16, 0.14); arf(T(7, 3)); arf(T(7, 3) + 0.16, 0.14);
for (let k = 0; k < 6; k++) arf(ev.star + BEAT / 2 + k * BEAT, 0.12);

// ---------- mix ----------
MIX.sidechain([bass, uke], kicks.filter((t) => party(t)), { depth: 0.35 });
const stems = {
  drums, bass, uke, keys, lead, fx, pad,
  verb: reverb(verb, { room: 0.8, damp: 0.35 }),
  dly: pingpong(dly, BEAT * 0.75, 0.32, 3500),
};
const GAIN = { drums: 0.42, bass: 0.7, uke: 2.6, keys: 1.0, lead: 1.8, fx: 0.85, pad: 2.4, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 24);
MIX.gate(mix, ev.hold, ev.star - 0.002); // the held breath before the star
MIX.fadeOut(mix, DURATION - 1.4, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
