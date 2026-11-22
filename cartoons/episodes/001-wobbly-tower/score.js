// Pip & Biscuit, episode 1: "The Wobbly Tower" (lesson: teamwork; bonus: counting to 8)
// Pip stacks a tall tower, Biscuit leaps in to help and knocks it down. Uh-oh! Pip has an idea:
// they rebuild it together, counting every block, and put a star on top.
(function () {
  const node = typeof require !== 'undefined' && typeof module !== 'undefined';
  const KS = node ? require('./kit/score-kit') : globalThis.KitScore;

  const ep = KS.episode({
    id: 'PB001', title: 'The Wobbly Tower', set: 'playroom', bpm: 126,
    cast: { pip: { x: 0.25 }, biscuit: { x: 0.77 } },
  });
  const { W, FLOOR, BEAT } = ep;
  const PIP = ep.cast.pip, DOG = ep.cast.biscuit;
  const TX = Math.round(W * 0.51);                       // the tower
  const slot = (i) => [TX, FLOOR - 52 - i * 104];       // block i, from the bottom
  const PIP_HANDS = [PIP.x, FLOOR - 236 * PIP.s];
  const DOG_MOUTH = [DOG.x, FLOOR - 212 * DOG.s];
  const N = 8;
  const letters = 'ABCDEFGH';
  const blocks = [];
  for (let i = 0; i < N; i++) blocks.push(ep.prop(`b${i}`, 'block', { letter: letters[i], color: ['#E8483B', '#FFC93C', '#3B8FE5', '#45B868', '#F58A33', '#9A6BDA', '#EF6F9A', '#2FB7B0'][i], seed: i }));
  ep.prop('star', 'star', {});
  const up = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
  const counts = ['One!', 'Two!', 'Three!', 'Four!', 'Five!', 'Six!', 'Seven!', 'Eight!'];
  // where each block lands when the tower falls: 4 by Pip, 4 by Biscuit
  const fallTo = [[150, 0], [700, 0], [395, 0], [905, 0], [255, 0], [640, 0], [455, 0], [985, 0]].map(([x]) => [x, FLOOR - 52]);
  // a leap that lands exactly on `hit` (the jump action spends 68% of its time in the air)
  const leap = (b, who, hit, to, h, air = 0.62) => { const dur = air / 0.68; const t0 = hit - 0.86 * dur; b.act(who, 'jump', t0, t0 + dur, { to, h }); };

  // 1. HELLO: the title stamps in, letter by letter, while Pip waves
  ep.beat('hello', { bars: 2, mood: 'intro' }, (b) => {
    b.title(b.T(0), ['PIP &', 'BISCUIT'], { sub: 'the wobbly tower', subT: b.T(1, 1.5) });
    b.hit('title', b.T(0));
    b.act('pip', 'gesture', b.T(0), b.T(1, 3), { g: 'wave' });
    b.act('pip', 'emote', b.T(0), b.T(1, 3), { face: 'joy' });
    b.act('biscuit', 'pose', b.T(0, 1), b.T(1, 0), { pose: 'beg' });
    b.act('biscuit', 'emote', b.T(0), b.T(2), { face: 'excited' });
    b.act('biscuit', 'bounce', b.T(0, 1), b.T(1, 0), { h: 20 });
    b.act('biscuit', 'pose', b.T(1, 0), b.T(1, 0.1), { pose: 'sit' });
    b.sfx('yip', b.T(0, 3));
    b.say('narrator', 'Pip and Biscuit!', b.T(0, 2.5));
  });

  // 2. STACK: every block Pip tosses lands on the beat and plays the next note up
  ep.beat('stack', { bars: 3, mood: 'play', pad: 0.3 }, (b) => {
    b.say('narrator', 'Pip is building a super tall tower!', b.T(0, 0.25));
    for (let i = 0; i < N; i++) {
      const land = b.T(0, 2 + i);
      b.toss('pip', blocks[i], { land, to: slot(i), note: up[i], flight: 0.38, hold: 0.2, arc: 140 + i * 18 });
    }
    b.act('pip', 'emote', b.T(0, 1.5), b.T(2, 2), { face: 'determined' });
    b.act('pip', 'look', b.T(0, 1.5), b.T(2, 2), { at: [TX, FLOOR - 600] });
    b.act('biscuit', 'look', b.T(0, 1.5), b.T(2, 2), { at: [TX, FLOOR - 500] });
    b.act('biscuit', 'emote', b.T(0, 1.5), b.T(2, 2), { face: 'curious' });
    const look = b.say('pip', 'Look, Biscuit! So tall!', b.T(1, 3.5));
    b.act('pip', 'gesture', look.t, look.end, { g: 'point', dir: 1, high: true });
    b.act('pip', 'emote', look.t, look.end, { face: 'joy' });
    b.act('biscuit', 'emote', look.t, look.end, { face: 'excited' });
    b.act('biscuit', 'bounce', look.t, look.end, { h: 18 });
  });

  // 3. OOPS: Biscuit leaps in to help... BONK. The tower wobbles, then tumbles: every block a falling note
  ep.beat('oops', { bars: 3, mood: 'sneaky' }, (b) => {
    const l = b.say('narrator', 'Biscuit wants to help!', b.T(0, 0.5));
    const hit = b.after(l, 1.5);
    b.act('biscuit', 'emote', b.T(0), hit, { face: 'excited' });
    b.act('biscuit', 'squash', hit - 0.75, hit - 0.45);
    leap(b, 'biscuit', hit, TX + 150, 210);
    b.sfx('slide', hit - 0.55, { len: 0.5 });
    b.sfx('bonk', hit); b.hit('bonk', hit);
    b.fx('burst', hit, { x: TX + 60, y: FLOOR - 330, r: 64 });
    b.fx('flash', hit, { alpha: 0.4, decay: 16 }); // the impact frame
    b.fx('popword', hit, { t1: hit + 0.9, text: 'BONK!', x: TX + 70, y: FLOOR - 960, size: 140, color: '#FFC93C', rot: 0.1 });
    b.fx('shake', hit, { amp: 14 });
    b.act('biscuit', 'squash', hit, hit + 0.5);
    b.act('biscuit', 'move', hit + 0.12, hit + 0.75, { to: DOG.x });
    b.act('biscuit', 'emote', hit, hit + 2.4, { face: 'surprised' });
    b.act('pip', 'emote', hit - 0.3, hit + 3, { face: 'shock' });
    b.act('pip', 'gesture', hit, hit + 3, { g: 'cheeks' });
    // wobble... then down it comes
    const top = hit + BEAT * 2;
    b.wobble(blocks, hit, top, { pivot: [TX, FLOOR], amp: 0.065, freq: 3.2 });
    for (let k = 0; k < 6; k++) b.sfx('woodTick', hit + BEAT * (0.75 + k * 0.25), { gain: 0.08, pitch: 0.8 + (k % 2) * 0.3 });
    b.sfx('tumble', top);
    for (let i = N - 1; i >= 0; i--) {
      const land = top + BEAT * 0.5 + (N - 1 - i) * BEAT * 0.25;
      b.fly(blocks[i], top, land, fallTo[i], { arc: i ? 120 + i * 10 : 20, spin: (i % 2 ? 1 : -1) * (2 + (i % 3)), rot: (i % 3 - 1) * 0.18 });
      b.note(land, up[i], 'marimba', { gain: 0.32 });
      b.sfx('thud', land, { gain: 0.35, pitch: 110 + i * 12 });
      b.fx('dust', land, { x: fallTo[i][0], y: FLOOR });
    }
    b.act('pip', 'look', top, top + 2, { at: 'down' });
    b.until(top + BEAT * 3);
  });

  // 4. UH-OH: record scratch, the world turns blue, Biscuit feels sorry (until Pip's idea, below)
  let sadFrom = 0;
  ep.beat('uhoh', { bars: 3, mood: 'stop' }, (b) => {
    sadFrom = b.T(0);
    b.sfx('scratch', b.T(0)); b.hit('scratch', b.T(0));
    b.fx('popword', b.T(0), { t1: b.T(1), text: 'UH-OH!', x: W * 0.5, y: FLOOR - 900, size: 120, color: '#7CC7F2', rot: -0.08 });
    const l = b.say('pip', 'Uh-oh! My tower!', b.T(0, 0.5), { check: true, alts: ['Uh oh! My tower!', 'Uh-oh. My tower!', 'Oh no! My tower!'] });
    b.act('pip', 'gesture', b.T(0), l.end, { g: 'cheeks' });
    b.mood('sad', b.T(1));
    b.sfx('sadTrombone', l.end + 0.1);
    b.act('biscuit', 'pose', l.end + 0.2, l.end + 0.3, { pose: 'flop', facing: -1 });
    b.act('biscuit', 'face', l.end + 0.2, l.end + 0.3, { dir: -1 });
    b.act('biscuit', 'emote', l.end, l.end + 0.1, { face: 'sorry', hold: true });
    b.sfx('whimper', l.end + 0.5);
    const n = b.say('narrator', 'Oh no! Biscuit feels sorry.', b.after(l, 0.5));
    b.cam(b.T(0, 1), b.T(2), { zoom: 1.08, x: W * 0.52, y: FLOOR - 340 });
    b.until(n.end);
  });

  // 5. IDEA: Pip thinks... DING! "Let's build it together!"
  ep.beat('idea', { bars: 2, mood: 'think', pad: 0.2 }, (b) => {
    b.act('pip', 'gesture', b.T(0), b.T(0, 3), { g: 'think' });
    b.act('pip', 'emote', b.T(0), b.T(0, 3), { face: 'think' });
    const ding = b.T(0, 3);
    b.fx('tint', sadFrom, { t1: ding, fadeOut: 0.25, color: '#7486C9', alpha: 0.42 });
    b.act('pip', 'emote', sadFrom, b.T(0), { face: 'sad' });
    b.act('pip', 'slump', sadFrom + 1.4, b.T(0));
    b.sfx('ding', ding); b.hit('idea', ding);
    b.fx('lightbulb', ding, { t1: b.T(2, 2), who: 'pip', dy: -70, dx: -20 });
    b.fx('flash', ding, { alpha: 0.5 });
    b.mood('play', ding);
    b.cam(ding, ding + 0.6, { zoom: 1, x: W / 2, y: ep.H / 2 });
    b.act('pip', 'gesture', ding, ding + 0.9, { g: 'pointUp' });
    b.act('pip', 'emote', ding, ding + 4, { face: 'joy' });
    b.act('pip', 'hop', ding, ding + 0.4, { h: 36 });
    const l = b.say('pip', "It's okay, Biscuit! Let's build it together!", ding + BEAT * 0.75);
    b.act('pip', 'gesture', ding + 0.9, l.end, { g: 'offer', dir: 1 });
    b.act('biscuit', 'pose', ding + 0.6, ding + 0.7, { pose: 'sit' });
    b.act('biscuit', 'face', ding + 0.6, ding + 0.7, { dir: 1 });
    b.act('biscuit', 'emote', ding + 0.4, ding + 0.5, { face: 'happy', hold: true });
    b.act('biscuit', 'emote', l.end, l.end + 1.2, { face: 'joy' });
    b.act('biscuit', 'bark', l.end + 0.1, l.end + 0.5, { n: 2 });
    b.sfx('yip', l.end + 0.1);
    b.fx('hearts', l.end, { t1: l.end + 1, who: 'biscuit', n: 4 });
    b.until(l.end + 0.5);
  });

  // 6. REBUILD: taking turns (Pip on the downbeat, Biscuit on beat 3), counting every block out loud
  ep.beat('rebuild', { bars: 3, mood: 'play', pad: 0.1 }, (b) => {
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    order.forEach((i, k) => {
      const who = k % 2 ? 'biscuit' : 'pip';
      const land = b.T(0, k * 1.5); // a bouncy dotted rhythm: room for every spoken number (first pick-up starts in the previous beat)
      const hold = 0.3, flight = 0.42;
      b.fly(blocks[i], land - flight - hold - 0.26, land - flight - hold, who === 'pip' ? PIP_HANDS : DOG_MOUTH, { arc: 60 });
      b.toss(who, blocks[i], { land, to: slot(k), note: up[k], inst: who === 'pip' ? 'marimba' : 'pizz', hold, flight });
      if (who === 'biscuit') b.sfx('pop', land - flight, { pitch: 1.3, gain: 0.3 });
      b.act(who, 'emote', land, land + 0.5, { face: 'joy' });
    });
    b.count('pip', counts, order.map((i, k) => b.T(0, k * 1.5) + 0.05), { alts: { 3: ['Fourr!', 'For!'], 7: ['Eight!!', 'Ate!'] } });
    b.act('pip', 'look', b.T(0), b.T(2, 3), { at: [TX, FLOOR - 500] });
    b.act('biscuit', 'look', b.T(0), b.T(2, 3), { at: [TX, FLOOR - 500] });
  });

  // 7. STAR: an 8th of silence, the star lands on top: the drop
  ep.beat('star', { bars: 2, mood: 'play', pad: 0.2 }, (b) => {
    const l = b.say('pip', 'And now... the star!', b.T(0, 0.25));
    const land = b.after(l, 1);
    b.place('star', l.t, PIP_HANDS[0], PIP_HANDS[1]);
    b.fx('sparkle', l.t, { x: PIP_HANDS[0], y: PIP_HANDS[1] - 60, n: 8, r: 90 });
    b.sfx('sparkle', l.t);
    b.hold('star', 'pip', l.t, land - 0.45);
    b.act('pip', 'gesture', l.t, land - 0.45, { g: 'reach' });
    b.mood('hold', land - BEAT / 2);
    b.fly('star', land - 0.45, land, [TX, FLOOR - 52 - N * 104 - 4], { from: { who: 'pip', slot: 'hands' }, arc: 220, spin: 1 });
    b.sfx('whistleUp', land - 0.45, { len: 0.4 });
    b.sfx('tada', land); b.hit('star', land);
    b.mood('party', land);
    b.fx('flash', land, { alpha: 0.75 });
    b.fx('shake', land, { amp: 16, decay: 7 });
    b.fx('sunburst', land, { x: TX, y: FLOOR - 52 - N * 104 - 4, t1: land + 7 });
    b.fx('confetti', land, { n: 170, spawn: 2.4, t1: land + 6 });
    b.fx('sparkle', land, { x: TX, y: FLOOR - 52 - N * 104 - 4, n: 10, r: 130 });
    b.glow('star', land, land + 9);
    b.act('pip', 'dance', land, land + 3.4);
    b.act('pip', 'emote', land, land + 3.4, { face: 'laugh' });
    b.act('biscuit', 'pose', land, land + 0.1, { pose: 'beg' });
    b.act('biscuit', 'dance', land, land + 3.4);
    b.act('biscuit', 'emote', land, land + 3.4, { face: 'joy' });
    for (let k = 0; k < 3; k++) b.sfx('yip', land + BEAT * (1 + k * 2), { n: 1, gain: 0.16 });
    const n = b.say('narrator', 'They did it... together!', land + BEAT);
    b.stamp(n.t + 0.6, 'TOGETHER', { per: BEAT / 4, t1: land + 9 });
    b.until(land + 3.2);
  });

  // 8. BYE: the lesson, a wave, done (and it loops cleanly back to the title)
  ep.beat('bye', { bars: 2, mood: 'outro', pad: 0.1 }, (b) => {
    b.act('biscuit', 'pose', b.T(0), b.T(0, 0.1), { pose: 'sit' });
    const n = b.say('narrator', 'Building is more fun with a friend.', b.T(0, 0.25));
    b.endcard(n.t, { text: 'TEAMWORK!' });
    const bye = b.say('pip', 'Bye-bye!', b.after(n, 0.25));
    b.act('pip', 'gesture', bye.t - 0.3, bye.end + 0.8, { g: 'waveBoth' });
    b.act('pip', 'emote', bye.t, bye.end + 0.8, { face: 'joy' });
    b.act('biscuit', 'bark', bye.end, bye.end + 0.4, { n: 1 });
    b.sfx('bark', bye.end);
    b.until(bye.end + 0.4);
  });

  const SCORE = ep.done();
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
