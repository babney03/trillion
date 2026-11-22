// KitScore: write an episode as beats; this turns it into the score the music, voices and film all read.
// An episode's score.js:
//
//   const ep = KitScore.episode({ id: 'PB001', title: 'The Wobbly Tower', set: 'playroom', bpm: 120,
//     cast: { pip: { x: 0.27 }, biscuit: { x: 0.76 } } });
//   ep.beat('hello', { bars: 2, mood: 'intro' }, (b) => {
//     b.title(b.T(0), ['PIP &', 'BISCUIT']);
//     const l = b.say('narrator', 'Pip and Biscuit!', b.T(0, 2));
//     b.act('pip', 'gesture', b.T(0), b.T(2), { g: 'wave' });
//   });
//   const SCORE = ep.done();
//
// Beats run back to back. A beat lasts `bars` bars or longer if its voice lines need the time (line lengths
// come from voice-lengths.js, written by the build's voice pass; before that they are estimated).
(function () {
  const node = typeof require !== 'undefined' && typeof module !== 'undefined';
  const U = node ? require('../engine/util') : globalThis.U;
  const MU = node ? require('../engine/music') : globalThis.MUSIC;
  let LEN = {};
  if (node) { try { const p = require('path').join(process.cwd(), 'voice-lengths.js'); if (require('fs').existsSync(p)) LEN = require(p); } catch (e) { LEN = {}; } } else LEN = globalThis.VOICE_LENGTHS || {};

  const VOICES = {
    narrator: { voice: 'af_heart', speed: 0.94, pitch: 0, gain: 1.0 },
    pip: { voice: 'af_bella', speed: 1.0, pitch: 4, gain: 1.05 },
    grandma: { voice: 'bf_isabella', speed: 0.88, pitch: -1, gain: 1.0 },
    milo: { voice: 'am_puck', speed: 1.05, pitch: 7, gain: 1.0 },
  };
  const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  const keyOf = (who, text) => `${who}_${fnv(text)}`;
  const estimate = (text, who) => String(text).split(/\s+/).filter(Boolean).length * (who === 'narrator' ? 0.36 : 0.33) + 0.35;

  function episode(o) {
    const FPS = o.fps || 30;
    const FORMAT = U.pickFormat(o.format || '9:16');
    const [W, H] = U.formatSize(FORMAT);
    const SAFE = U.safeArea(W, H);
    const clock = MU.makeClock({ bpm: o.bpm || 120, offset: o.offset ?? 0.3 });
    const { BEAT, BAR } = clock;
    const T = (bar, beat = 0) => clock.T(bar, beat);
    const set = typeof o.set === 'string' ? { name: o.set } : (o.set || { name: 'playroom' });
    const FLOOR = Math.round(H * 0.78);
    const E = { actions: [], lines: [], props: {}, propOps: [], fx: [], cam: [], moods: [], notes: [], sfx: [], texts: [], markers: {}, sections: {}, beats: [] };
    const cast = {};
    for (const [id, c] of Object.entries(o.cast || {})) { const kind = c.kind || id; cast[id] = { id, kind, x: (c.x ?? 0.5) * W, s: c.s || (kind === 'pip' ? 1.12 : 1.05), facing: c.facing || 1, pose: c.pose || null, z: c.z || 0 }; }
    const voices = { ...VOICES, ...(o.voices || {}) };
    let cursor = o.start ?? T(0);
    const snapHalf = (t) => clock.OFFSET + Math.ceil((t - clock.OFFSET) / (BEAT / 2) - 1e-6) * (BEAT / 2);

    function beat(name, opts = {}, fn = () => {}) {
      const t0 = cursor;
      let lastEnd = t0, until = t0;
      const lines = [];
      const b = {
        name, t0, BEAT, BAR, W, H, FLOOR, SAFE, cast,
        T: (bar = 0, bt = 0) => t0 + (bar * 4 + bt) * BEAT,
        X: (f) => f * W,
        // a voice line. `at` defaults to right after the previous line of this beat.
        say(who, text, at, extra = {}) {
          const t = at ?? (lines.length ? snapHalf(lastEnd + (extra.gap ?? 0.15)) : t0 + BEAT * 0.5);
          const key = keyOf(who, text), len = LEN[key] ?? estimate(text, who);
          const line = { who, text, t, end: t + len, key, len, estimated: LEN[key] === undefined };
          if (extra.alts) line.alts = extra.alts;
          if (extra.check !== undefined) line.check = extra.check;
          E.lines.push(line); lines.push(line);
          lastEnd = Math.max(lastEnd, line.end);
          if (who !== 'narrator' && extra.body !== false) E.actions.push({ who, type: 'talk', t0: t, t1: t + len, args: extra });
          return line;
        },
        // count / spell out loud: one natural phrase, each word placed on its own time (e.g. as blocks land)
        // count / call out loud: each word on its own time (as blocks land, as a ball is caught).
        // Short lines get the voice pass's clarity check; `alts` gives extra spellings to try.
        count(who, words, times, extra = {}) {
          return words.map((w, k) => { const l = b.say(who, w, times[k], { body: false }); l.check = true; if (extra.alts && extra.alts[k]) l.alts = extra.alts[k]; return l; });
        },
        after(line, beats = 0) { return snapHalf(line.end + 0.06) + beats * BEAT; },
        until(t) { until = Math.max(until, t); },
        act(who, type, a, z, args = {}) { E.actions.push({ who, type, t0: a, t1: z ?? a + BEAT, args }); until = Math.max(until, z ?? a); },
        fx(type, t, args = {}) { E.fx.push({ type, t, ...args }); },
        sfx(name, t, args = {}) { E.sfx.push({ name, t, ...args }); },
        note(t, n, inst = 'marimba', args = {}) { E.notes.push({ t, midi: typeof n === 'string' ? MU.m(n) : n, inst, ...args }); },
        mood(m, t) { E.moods.push({ t: t ?? t0, mood: m }); },
        cam(a, z, args) { E.cam.push({ t0: a, t1: z, ...args }); },
        hit(nm, t, sync = 'av') { E.markers[nm] = { t, sync }; },
        mark(nm, t) { E.markers[nm] = t; },
        // stamped letters, one per 8th note (each plays a glockenspiel note): titles and payoff words
        title(t, rows, args = {}) { const tx = { kind: 'title', t, rows, t1: args.t1 ?? t0 + (opts.bars || 2) * BAR - 0.3, per: args.per ?? BEAT / 2, y: args.y, sub: args.sub, subT: args.subT, notes: args.notes }; tx.letters = letterTimes(tx); E.texts.push(tx); until = Math.max(until, tx.letters.length ? tx.letters[tx.letters.length - 1].t : t); return tx; },
        stamp(t, word, args = {}) { const tx = { kind: 'stamp', t, rows: [word], t1: args.t1, per: args.per ?? BEAT / 2, y: args.y, size: args.size, notes: args.notes }; tx.letters = letterTimes(tx); E.texts.push(tx); until = Math.max(until, tx.letters.length ? tx.letters[tx.letters.length - 1].t : t); return tx; },
        endcard(t, args = {}) { E.texts.push({ kind: 'end', t, ...args }); },
        // props
        place(id, t, x, y, args = {}) { E.propOps.push({ prop: id, t, op: 'at', x, y, ...args }); },
        hide(id, t, args = {}) { E.propOps.push({ prop: id, t, op: args.pop ? 'pop' : 'hide' }); if (args.pop) E.fx.push({ type: 'sparkle', t, propAt: id, n: 6, r: 50 }); },
        hold(id, who, a, z, args = {}) { E.propOps.push({ prop: id, t: a, op: 'hold', who, slot: args.slot || (cast[who] && cast[who].kind === 'biscuit' ? 'mouth' : 'hands'), t1: z }); },
        fly(id, a, z, to, args = {}) { E.propOps.push({ prop: id, t: a, op: 'fly', t1: z, from: args.from || 'current', to, arc: args.arc ?? 150, spin: args.spin ?? 0, rot: args.rot || 0 }); E.propOps.push({ prop: id, t: z, op: 'at', x: to[0], y: to[1], rot: args.rot || 0, landed: true }); },
        wobble(ids, a, z, args = {}) { for (const id of ids) E.propOps.push({ prop: id, t: a, op: 'wobble', t1: z, pivot: args.pivot, amp: args.amp ?? 0.08, freq: args.freq ?? 3 }); },
        glow(id, a, z) { E.propOps.push({ prop: id, t: a, op: 'glow', t1: z }); },
        // a character tosses a prop so it lands ON time `land` at `to` (the note, sparkle and tick fire then)
        toss(who, id, { land, to, flight = 0.42, hold = 0.32, arc = 170, note, inst = 'marimba', sfx = 'woodTick', sparkle = true, rot = 0 }) {
          const kind = cast[who] ? cast[who].kind : who;
          const tr = land - flight;
          b.hold(id, who, tr - hold, tr);
          E.propOps.push({ prop: id, t: tr, op: 'fly', t1: land, from: { who, slot: kind === 'biscuit' ? 'mouth' : 'hands' }, to, arc, spin: kind === 'biscuit' ? 1 : -1, rot });
          E.propOps.push({ prop: id, t: land, op: 'at', x: to[0], y: to[1], rot, landed: true });
          E.actions.push({ who, type: 'throw', t0: tr - hold, t1: tr + 0.3, args: { release: tr } });
          if (note) b.note(land, note, inst, { pan: (to[0] / W - 0.5) * 1.1 });
          if (sfx) b.sfx(sfx, land, { pan: (to[0] / W - 0.5) * 1.1 });
          if (sparkle) b.fx('sparkle', land, { x: to[0], y: to[1] - 50 });
          until = Math.max(until, land);
        },
      };
      if (opts.mood) b.mood(opts.mood, t0);
      fn(b);
      const need = Math.max(lastEnd + (opts.pad ?? 0.45), until + (opts.tailPad ?? 0)) - t0;
      const bars = Math.max(opts.bars || 1, Math.ceil(need / BAR - 1e-6));
      const t1 = t0 + bars * BAR;
      E.sections[name] = [t0, t1]; E.beats.push({ name, t0, t1, bars });
      cursor = t1;
      return { t0, t1, b };
    }

    // every stamped letter gets its own time (one per `per`), shared by the picture and the glockenspiel
    function letterTimes(tx) {
      const out = []; let k = 0;
      tx.rows.forEach((row, r) => row.split('').forEach((ch, j) => { out.push({ ch, row: r, j, t: tx.t + k * tx.per }); if (ch !== ' ') k++; }));
      return out;
    }

    function prop(id, kind, args = {}) { E.props[id] = { id, kind, ...args }; return id; }

    function done(extra = {}) {
      const DURATION = cursor + (o.tail ?? 1.0);
      const byT = (a, b) => a.t - b.t || 0;
      E.actions.sort((a, b) => a.t0 - b.t0);
      E.propOps.sort(byT); E.moods.sort(byT); E.notes.sort(byT); E.sfx.sort(byT); E.fx.sort(byT); E.lines.sort(byT);
      const SCORE = {
        FPS, FORMAT, W, H, SAFE, DURATION, clock, T, BEAT, BAR, S: E.sections, markers: E.markers,
        KIT: {
          id: o.id, title: o.title, set, FLOOR, cast, voices, key: o.key || 'C', theme: o.theme ?? true,
          actions: E.actions, lines: E.lines, props: E.props, propOps: E.propOps, fx: E.fx, cam: E.cam,
          moods: E.moods, notes: E.notes, sfx: E.sfx, texts: E.texts, beats: E.beats, ...extra,
        },
      };
      return SCORE;
    }

    return { beat, prop, done, T, W, H, FLOOR, SAFE, BEAT, BAR, clock, cast, get cursor() { return cursor; }, set cursor(v) { cursor = v; }, m: MU.m };
  }

  const KitScore = { episode, VOICES, keyOf, fnv };
  if (node) module.exports = KitScore; else globalThis.KitScore = KitScore;
})();
