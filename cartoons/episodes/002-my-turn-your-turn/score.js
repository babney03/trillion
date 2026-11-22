// Pip & Biscuit, episode 2: "My Turn, Your Turn" (lesson: taking turns)
// Pip won't share her bouncy ball, Biscuit is sad. Pip has an idea: take turns! They play catch,
// and every catch plays the next note up.
(function () {
  const node = typeof require !== 'undefined' && typeof module !== 'undefined';
  const KS = node ? require('./kit/score-kit') : globalThis.KitScore;

  const ep = KS.episode({
    id: 'PB002', title: 'My Turn, Your Turn', set: 'backyard', bpm: 126,
    cast: { pip: { x: 0.26 }, biscuit: { x: 0.76 } },
  });
  const { W, FLOOR, BEAT } = ep;
  const PIP = ep.cast.pip, DOG = ep.cast.biscuit;
  const HANDS = [PIP.x, FLOOR - 236 * PIP.s];
  const MOUTH = [DOG.x, FLOOR - 212 * DOG.s];
  const ball = ep.prop('ball', 'ball', { color: '#E8483B', x: HANDS[0], y: HANDS[1], s: 1.35 });
  const up = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];

  ep.beat('hello', { bars: 2, mood: 'intro' }, (b) => {
    b.title(b.T(0), ['PIP &', 'BISCUIT'], { sub: 'my turn, your turn', subT: b.T(1, 1.5) });
    b.hit('title', b.T(0));
    b.hold(ball, 'pip', b.T(0), b.T(2));
    b.act('pip', 'emote', b.T(0), b.T(2), { face: 'joy' });
    b.act('biscuit', 'pose', b.T(0, 1), b.T(1), { pose: 'beg' });
    b.act('biscuit', 'bounce', b.T(0, 1), b.T(1), { h: 20 });
    b.act('biscuit', 'pose', b.T(1), b.T(1, 0.1), { pose: 'sit' });
    b.sfx('yip', b.T(0, 3));
    b.say('narrator', 'Pip and Biscuit!', b.T(0, 2.5));
  });

  // Pip bounces her ball: up, catch, up, catch (every catch a note)
  ep.beat('bounce', { bars: 3, mood: 'play', pad: 0.3 }, (b) => {
    b.say('narrator', 'Pip has a bouncy red ball!', b.T(0, 0.25));
    for (let k = 0; k < 3; k++) {
      const t0 = b.T(0, 2 + k * 2), top = [HANDS[0] + 10, FLOOR - 820];
      b.fly(ball, t0, t0 + BEAT * 0.9, top, { from: { who: 'pip', slot: 'hands' }, arc: 0, spin: 1 });
      b.fly(ball, t0 + BEAT * 0.9, t0 + BEAT * 1.8, HANDS, { arc: 0, spin: -1 });
      b.hold(ball, 'pip', t0 + BEAT * 1.8, t0 + BEAT * 2);
      b.act('pip', 'gesture', t0 - 0.1, t0 + 0.25, { g: 'reach' });
      b.act('pip', 'gesture', t0 + BEAT * 1.6, t0 + BEAT * 2, { g: 'hold' });
      b.act('pip', 'look', t0, t0 + BEAT * 2, { at: 'up' });
      b.note(t0 + BEAT * 1.8, up[k], 'marimba'); b.sfx('pop', t0 + BEAT * 1.8, { pitch: 0.9, gain: 0.3 });
      b.sfx('whoosh', t0, { gain: 0.12 });
      b.act('biscuit', 'look', t0, t0 + BEAT * 2, { at: [HANDS[0], FLOOR - 700] });
    }
    b.act('biscuit', 'emote', b.T(0, 2), b.T(3), { face: 'excited' });
    b.hold(ball, 'pip', b.T(0, 8), b.T(3) + 3);
  });

  // Biscuit trots over to play... "No! It's mine!"
  ep.beat('mine', { bars: 3, mood: 'sneaky' }, (b) => {
    const l = b.say('narrator', 'Biscuit wants to play too!', b.T(0, 0.25));
    b.act('biscuit', 'move', b.T(0, 1), b.T(1, 1), { to: W * 0.56 });
    b.act('biscuit', 'pose', b.T(1, 1), b.T(1, 1.1), { pose: 'beg' });
    b.act('biscuit', 'emote', b.T(1, 1), b.T(2, 2), { face: 'excited' });
    b.act('biscuit', 'bark', b.T(1, 1.5), b.T(1, 2.5), { n: 2 }); b.sfx('yip', b.T(1, 1.5));
    const no = b.say('pip', "No! It's mine!", b.after(l, 1.5));
    b.hold(ball, 'pip', b.T(0), no.end + 0.6, {});
    b.act('pip', 'gesture', no.t - 0.2, no.end + 0.8, { g: 'hug' });
    b.act('pip', 'emote', no.t - 0.2, no.end + 0.8, { face: 'cross' });
    b.act('pip', 'shake', no.t, no.end);
    b.sfx('scratch', no.t - 0.25); b.hit('mine', no.t - 0.25);
    b.fx('flash', no.t - 0.25, { alpha: 0.35, decay: 16 });
    b.fx('popword', no.t - 0.25, { t1: no.end + 0.3, text: 'MINE!', x: W * 0.3, y: FLOOR - 900, size: 120, color: '#E8483B', rot: -0.1 });
    b.act('biscuit', 'pose', no.end, no.end + 0.1, { pose: 'sit' });
    b.act('biscuit', 'emote', no.end, no.end + 0.1, { face: 'sad', hold: true });
    b.until(no.end + 0.4);
  });

  // Biscuit is sad (blue). Pip sees it.
  let sadFrom = 0;
  ep.beat('sad', { bars: 2, mood: 'sad', pad: 0.3 }, (b) => {
    sadFrom = b.T(0);
    b.act('biscuit', 'move', b.T(0), b.T(1), { to: DOG.x });
    b.act('biscuit', 'pose', b.T(1), b.T(1, 0.1), { pose: 'flop' });
    b.act('biscuit', 'face', b.T(1), b.T(1, 0.1), { dir: -1 });
    b.sfx('whimper', b.T(1));
    const n = b.say('narrator', 'Oh no. Biscuit is sad.', b.T(0, 1));
    b.act('pip', 'emote', n.t, b.T(2), { face: 'worried' });
    b.act('pip', 'look', n.t, b.T(2), { at: 'biscuit' });
    b.fx('tears', b.T(1, 1), { t1: b.T(2) + 2.4, who: 'biscuit', at: 'face', dx: 0, dy: -20 });
  });

  // DING: "Let's take turns!"
  ep.beat('idea', { bars: 2, mood: 'think', pad: 0.2 }, (b) => {
    b.act('pip', 'gesture', b.T(0), b.T(0, 3), { g: 'think' });
    b.act('pip', 'emote', b.T(0), b.T(0, 3), { face: 'think' });
    const ding = b.T(0, 3);
    b.fx('tint', sadFrom, { t1: ding, color: '#7486C9', alpha: 0.38, fadeIn: 0.6 });
    b.sfx('ding', ding); b.hit('idea', ding);
    b.fx('lightbulb', ding, { t1: b.T(2, 2), who: 'pip', dy: -70, dx: -20 });
    b.fx('flash', ding, { alpha: 0.45 });
    b.mood('play', ding);
    b.act('pip', 'gesture', ding, ding + 0.8, { g: 'pointUp' });
    b.act('pip', 'emote', ding, ding + 4, { face: 'joy' });
    const l = b.say('pip', "Let's take turns! My turn, then your turn!", ding + BEAT * 0.75);
    b.act('biscuit', 'pose', l.t, l.t + 0.1, { pose: 'sit' });
    b.act('biscuit', 'face', l.t, l.t + 0.1, { dir: 1 });
    b.act('biscuit', 'emote', l.t, l.t + 0.1, { face: 'happy', hold: true });
    b.act('biscuit', 'emote', l.end, l.end + 1, { face: 'joy' });
    b.act('biscuit', 'bark', l.end, l.end + 0.4, { n: 2 }); b.sfx('yip', l.end);
    b.until(l.end + 0.4);
  });

  // catch! back and forth, each catch a note climbing the scale; Pip calls every turn
  ep.beat('turns', { bars: 4, mood: 'play', pad: 0.1 }, (b) => {
    const calls = ['Your turn!', 'My turn!', 'Your turn!', 'My turn!', 'Your turn!', 'My turn!'];
    for (let k = 0; k < 6; k++) {
      const land = b.T(0, 1 + k * 2);
      const toDog = k % 2 === 0;
      b.fly(ball, land - 0.62, land, toDog ? MOUTH : HANDS, { from: { who: toDog ? 'pip' : 'biscuit', slot: toDog ? 'hands' : 'mouth' }, arc: 260, spin: toDog ? 1 : -1 });
      b.hold(ball, toDog ? 'biscuit' : 'pip', land, b.T(0, 1 + (k + 1) * 2) - 0.62);
      b.act(toDog ? 'pip' : 'biscuit', 'throw', land - 0.8, land - 0.3, { release: land - 0.62 });
      b.note(land, up[k], toDog ? 'pizz' : 'marimba');
      b.sfx('pop', land, { pitch: toDog ? 1.2 : 0.9, gain: 0.3 });
      b.fx('sparkle', land, { x: toDog ? MOUTH[0] : HANDS[0], y: (toDog ? MOUTH[1] : HANDS[1]) - 40, n: 5, r: 50 });
      b.say('pip', calls[k], land - 0.62 - 0.05, { body: false });
      b.act(toDog ? 'biscuit' : 'pip', 'emote', land, land + 0.6, { face: 'joy' });
      b.act('pip', 'look', land - 0.62, land, { at: toDog ? 'biscuit' : [HANDS[0], FLOOR - 600] });
    }
    b.hold(ball, 'pip', b.T(0, 11), b.T(4) + 4);
    b.hit('catch1', b.T(0, 1), 'a');
  });

  // the payoff: both jump for joy, confetti, TAKE TURNS
  ep.beat('yay', { bars: 3, mood: 'party', pad: 0.2 }, (b) => {
    const land = b.T(0);
    b.sfx('tada', land); b.hit('yay', land);
    b.fx('flash', land, { alpha: 0.6 });
    b.fx('sunburst', land, { x: W / 2, y: FLOOR - 520, t1: land + 6 });
    b.fx('confetti', land, { n: 160, spawn: 2.2, t1: land + 5 });
    b.act('pip', 'jump', land, land + 0.7, { h: 120 });
    b.act('biscuit', 'jump', land + 0.1, land + 0.8, { h: 110 });
    b.act('pip', 'dance', land + 0.7, land + 3.6);
    b.act('biscuit', 'pose', land + 0.8, land + 0.9, { pose: 'beg' });
    b.act('biscuit', 'dance', land + 0.8, land + 3.6);
    b.act('pip', 'emote', land, land + 3.6, { face: 'laugh' });
    b.act('biscuit', 'emote', land, land + 3.6, { face: 'joy' });
    const n = b.say('narrator', 'Taking turns is more fun!', land + BEAT);
    b.stamp(n.t + 0.4, 'TAKE TURNS', { per: BEAT / 4, t1: land + 7 });
    for (let k = 0; k < 3; k++) b.sfx('yip', land + BEAT * (2 + k * 2), { n: 1, gain: 0.16 });
    b.until(land + 3.6);
  });

  ep.beat('bye', { bars: 2, mood: 'outro', pad: 0.1 }, (b) => {
    b.act('biscuit', 'pose', b.T(0), b.T(0, 0.1), { pose: 'sit' });
    const n = b.say('narrator', 'Can you take turns too?', b.T(0, 0.25));
    b.endcard(n.t, { text: 'TAKE TURNS!' });
    const bye = b.say('pip', 'Bye-bye!', b.after(n, 0.25));
    b.act('pip', 'gesture', bye.t - 0.3, bye.end + 1.2, { g: 'waveBoth' });
    b.act('pip', 'emote', bye.t, bye.end + 1.2, { face: 'joy' });
    b.act('biscuit', 'bark', bye.end, bye.end + 0.4, { n: 1 }); b.sfx('bark', bye.end);
    b.until(bye.end + 0.7);
  });

  const SCORE = ep.done();
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
