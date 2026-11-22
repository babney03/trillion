// PIP & BISCUIT: "The Wobbly Tower" (pilot episode, 9:16 Short, ~29s, ages 2-6)
// THE SCORE: the single source of truth for music AND picture.
// Every block landing, the crash, the idea and the star are events here; song.js plays a sound
// for the very same events and film.js draws them, so they cannot drift apart.
//
// Story: Pip stacks a tall tower (every block = a rising note) -> Biscuit jumps in to help and
// knocks it over (every falling block = a falling note) -> "Uh-oh!" -> Pip gets an idea ->
// they build it TOGETHER, taking turns (call and response) -> the new tower spells T-O-G-E-T-H-E-R
// -> star on top -> party.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const STYLE = 'paper';
  const clock = makeClock({ bpm: 128, offset: 0.25 }); // bouncy comic tempo: 1 beat = 0.469s, 1 bar = 1.875s
  const { T, BEAT } = clock;
  const DURATION = T(15, 2);

  // ---------- stage layout (shared so the sound can pan with the picture) ----------
  const FLOOR = Math.round(H * 0.78); // feet line; the bottom 22% (platform UI) is rug/floor only
  const B = 104; // block size
  const PIP = { x: Math.round(W * 0.245), s: 1.1 };
  const DOG = { x: Math.round(W * 0.755), s: 1.55 };
  const TOWER_X = Math.round(W * 0.52);
  const slotY = (i) => FLOOR - B * (i + 0.5); // centre of the i-th block from the bottom
  const FLIGHT = 0.42; // seconds a thrown block is in the air (lands ON the beat)

  // ---------- sections (also used by engine/tools/levels.js) ----------
  const S = {
    intro: [0, T(2)],
    build1: [T(2), T(4)],
    crash: [T(4), T(5, 2)],
    sad: [T(5, 2), T(8)],
    build2: [T(8), T(12)],
    party: [T(12), T(14)],
    outro: [T(14), DURATION],
  };

  // ---------- harmony (C major, kid-friendly) ----------
  const { chords, chordAt } = makeChords(clock, {
    C: { notes: ['E4', 'G4', 'C5'], bass: 'C2' },
    G: { notes: ['D4', 'G4', 'B4'], bass: 'G1' },
    Am: { notes: ['E4', 'A4', 'C5'], bass: 'A1' },
    F: { notes: ['F4', 'A4', 'C5'], bass: 'F1' },
    Dm: { notes: ['D4', 'F4', 'A4'], bass: 'D2' },
    Cmaj9: { notes: ['E4', 'G4', 'B4', 'D5'], bass: 'C2' },
  }, [
    [0, 0, 4, 'C'], [1, 0, 4, 'G'],
    [2, 0, 4, 'C'], [3, 0, 4, 'G'],
    [4, 0, 4, 'Am'], [5, 0, 2, 'F'], [5, 2, 2, 'Am'],
    [6, 0, 2, 'Am'], [6, 2, 2, 'Dm'], [7, 0, 4, 'G'],
    [8, 0, 4, 'C'], [9, 0, 4, 'G'], [10, 0, 4, 'Am'], [11, 0, 4, 'F'],
    [12, 0, 4, 'C'], [13, 0, 2, 'F'], [13, 2, 2, 'G'],
    [14, 0, 4, 'Cmaj9'], [15, 0, 4, 'Cmaj9'],
  ]);

  // ---------- the hook (8th grid: [note, start8th, dur8ths]) ----------
  const HOOK = {
    a: [['G4', 0, 1], ['C5', 1, 1], ['E5', 2, 2], ['D5', 4, 1], ['C5', 5, 1], ['D5', 6, 2]],
    b: [['G4', 0, 1], ['B4', 1, 1], ['D5', 2, 2], ['C5', 4, 1], ['B4', 5, 1], ['G4', 6, 2]],
    c: [['A4', 0, 1], ['C5', 1, 1], ['E5', 2, 2], ['D5', 4, 1], ['C5', 5, 1], ['A4', 6, 2]],
    d: [['F4', 0, 1], ['A4', 1, 1], ['C5', 2, 2], ['B4', 4, 1], ['A4', 5, 1], ['G4', 6, 2]],
    end: [['E5', 0, 2], ['D5', 2, 1], ['C5', 3, 1], ['C5', 4, 4]],
  };

  const ev = {
    bumpJump: T(3, 3), // Biscuit leaps...
    bump: T(4, 0), // ...and bonks the tower on the downbeat
    topple: T(4, 2), // the wobble gives way
    scratch: T(5, 2), // record scratch, music stops, "Uh-oh!"
    sad: T(5, 3.5),
    think: T(6, 2),
    idea: T(7, 0), // lightbulb!
    rebuild: T(8, 0),
    hold: T(11, 3.5), // an 8th of held breath
    star: T(12, 0), // the star lands on top: the drop
    spell: T(12, 2), // T-O-G-E-T-H-E-R lights up, one letter per 8th
    end: T(14, 0),
  };

  // ---------- round 1: Pip stacks alone (one block per beat, a rising scale) ----------
  const COLORS = ['#E84A3C', '#F7C948', '#3D8BE0', '#4CB66A', '#F28C38', '#9B6BD6', '#E8718D', '#2FB5B0'];
  const rise1 = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'];
  const round1 = rise1.map((n, i) => ({
    i, letter: 'ABCDEF'[i], color: COLORS[i], land: T(2, i), midi: m(n), who: 'pip',
    x: TOWER_X, y: slotY(i),
  }));
  // the crash: top block lands first, every landing a falling note
  const rng = U.mulberry32(7);
  const fall = round1.map((b) => {
    const order = 5 - b.i; // 0 = top block
    const dir = b.i % 2 ? 1 : -1;
    const dist = b.i === 0 ? 70 : 90 + b.i * 42 + rng() * 40;
    return {
      ...b,
      land: T(4, 3) + order * BEAT / 2,
      midi: m(rise1[b.i]),
      x1: U.clamp(TOWER_X + dir * dist, 120, W - 200),
      rot1: (rng() - 0.5) * 0.5,
      spin: (dir) * (1 + Math.floor(rng() * 2)) * Math.PI * 2,
    };
  });

  // ---------- round 2: TOGETHER, taking turns (Pip on the downbeat, Biscuit on beat 3) ----------
  const word = 'TOGETHER';
  const rise2 = ['C4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'];
  const round2 = [];
  for (let k = 0; k < 8; k++) {
    const i = k; // slot from the bottom; the top block is word[0] so the tower reads top-down
    round2.push({
      i, k, letter: word[7 - k], color: COLORS[(k + 2) % COLORS.length],
      who: k % 2 ? 'dog' : 'pip',
      land: T(8 + Math.floor(k / 2), (k % 2) * 2),
      midi: m(rise2[k]), x: TOWER_X, y: slotY(i),
    });
  }
  const starAt = { x: TOWER_X, y: slotY(8) - 6 };
  // the word lights up top-down, one letter per 8th, each a bell note (the payoff melody)
  const spellNotes = placeBar(clock, [['C5', 4, 1], ['E5', 5, 1], ['G5', 6, 1], ['E5', 7, 1]], 12)
    .concat(placeBar(clock, [['A5', 0, 1], ['G5', 1, 1], ['E5', 2, 1], ['C6', 3, 3]], 13));
  const spell = word.split('').map((ch, j) => ({ ch, j, t: spellNotes[j].t, midi: spellNotes[j].midi }));

  // ---------- title: one letter stamp per 8th (each one a glockenspiel note) ----------
  const titleNotes = ['C5', 'E5', 'G5', 'C6', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'G6'];
  const title = [];
  'PIP&'.split('').forEach((ch, j) => title.push({ ch, line: 0, j, t: T(0, j * 0.5), midi: m(titleNotes[j]) }));
  'BISCUIT'.split('').forEach((ch, j) => title.push({ ch, line: 1, j, t: T(0, 2 + j * 0.5), midi: m(titleNotes[4 + j]) }));
  const subtitle = { t: T(1, 2), text: 'the wobbly tower' };

  const bubbles = [
    { text: 'Uh-oh!', t0: ev.scratch, t1: T(6, 3), who: 'pip' },
    { text: "Let's build it together!", t0: ev.idea + BEAT / 2, t1: T(9, 1), who: 'pip' },
  ];
  const endLine = { t: ev.end + BEAT, text: "it's better together!" };

  // melodies
  const musicbox = [...placeBar(clock, HOOK.a, 0, 12), ...placeBar(clock, HOOK.b, 1, 12)];
  const sadBox = placeBar(clock, [['E5', 0, 3], ['C5', 3, 1], ['A4', 4, 2], ['F4', 6, 2]], 6);
  const brass = [...placeBar(clock, HOOK.a, 12), ...placeBar(clock, HOOK.d, 13)];
  const outroBox = [...placeBar(clock, HOOK.a, 14, 12), ...placeBar(clock, HOOK.end, 15, 12)];

  // ---------- named moments: `render.js stills @bump`, `verify` measures the sync ones ----------
  const markers = {
    title: { t: T(0, 0), sync: 'av' },
    land1: { t: round1[0].land, sync: 'a' }, // the title exit is a bigger picture change; the landing is in sync by construction
    bump: { t: ev.bump, sync: 'av' },
    topple: ev.topple,
    scratch: { t: ev.scratch, sync: 'av' },
    idea: { t: ev.idea, sync: 'av' },
    rebuild: { t: round2[0].land, sync: 'av' },
    dog1: { t: round2[1].land, sync: 'a' },
    star: { t: ev.star, sync: 'av' },
    spell: ev.spell,
    end: ev.end,
  };

  const SCORE = {
    FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, m, chords, chordAt, HOOK, ev, markers,
    FLOOR, B, PIP, DOG, TOWER_X, slotY, FLIGHT, COLORS, round1, fall, round2, starAt, spell, word,
    title, subtitle, bubbles, endLine, musicbox, sadBox, brass, outroBox,
  };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
