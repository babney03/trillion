#!/usr/bin/env node
// Scaffold a new episode with the 8-beat lesson structure every Pip & Biscuit episode uses.
//   node cartoons/kit/tools/new-episode.js 003 "Bubble Trouble" --set playroom --lesson "washing hands"
// Then edit cartoons/episodes/003-bubble-trouble/score.js and run:
//   node cartoons/kit/tools/build.js cartoons/episodes/003-bubble-trouble --sheet   (fast look)
//   node cartoons/kit/tools/build.js cartoons/episodes/003-bubble-trouble           (final video)
const fs = require('fs');
const path = require('path');
const [num, title] = process.argv.slice(2);
const opt = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
if (!num || !title) { console.log('usage: new-episode.js <number> "<Title>" [--set playroom|kitchen|backyard] [--lesson "..."]'); process.exit(1); }
const slug = `${String(num).padStart(3, '0')}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
const dir = path.resolve(__dirname, '..', '..', 'episodes', slug);
if (fs.existsSync(path.join(dir, 'score.js'))) { console.error(`${dir}/score.js already exists`); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const set = opt('set', 'playroom'), lesson = opt('lesson', 'TODO');
fs.writeFileSync(path.join(dir, 'score.js'), `// Pip & Biscuit, episode ${num}: "${title}" (lesson: ${lesson})
// The 8 beats: hello -> setup -> problem -> uh-oh -> idea -> fix (the musical gimmick) -> payoff -> bye.
// Every beat grows to fit its voice lines. Rules: hook in second 1, one lesson, a kind fix, <= 45 s.
(function () {
  const node = typeof require !== 'undefined' && typeof module !== 'undefined';
  const KS = node ? require('./kit/score-kit') : globalThis.KitScore;
  const ep = KS.episode({ id: 'PB${String(num).padStart(3, '0')}', title: ${JSON.stringify(title)}, set: '${set}', bpm: 126, cast: { pip: { x: 0.26 }, biscuit: { x: 0.76 } } });
  const { W, FLOOR, BEAT } = ep;
  const PIP = ep.cast.pip, DOG = ep.cast.biscuit;
  const HANDS = [PIP.x, FLOOR - 236 * PIP.s], MOUTH = [DOG.x, FLOOR - 212 * DOG.s];
  // props: ep.prop('ball', 'ball', { x, y })  kinds: block star ball cookie plate jar cup apple teddy cupcake flower toothbrush

  ep.beat('hello', { bars: 2, mood: 'intro' }, (b) => {
    b.title(b.T(0), ['PIP &', 'BISCUIT'], { sub: ${JSON.stringify(title.toLowerCase())}, subT: b.T(1, 1.5) });
    b.hit('title', b.T(0));
    b.act('pip', 'gesture', b.T(0), b.T(1, 3), { g: 'wave' });
    b.act('pip', 'emote', b.T(0), b.T(2), { face: 'joy' });
    b.act('biscuit', 'pose', b.T(0, 1), b.T(1), { pose: 'beg' });
    b.act('biscuit', 'bounce', b.T(0, 1), b.T(1), { h: 20 });
    b.act('biscuit', 'pose', b.T(1), b.T(1, 0.1), { pose: 'sit' });
    b.sfx('yip', b.T(0, 3));
    b.say('narrator', 'Pip and Biscuit!', b.T(0, 2.5));
  });

  ep.beat('setup', { bars: 3, mood: 'play' }, (b) => {
    b.say('narrator', 'TODO: what Pip is doing (one short sentence).', b.T(0, 0.25));
    // the musical gimmick: every repeated action plays the next note, e.g. b.note(t, 'C4', 'marimba')
  });

  ep.beat('problem', { bars: 3, mood: 'sneaky' }, (b) => {
    b.say('narrator', 'TODO: what goes wrong.', b.T(0, 0.25));
    // b.sfx('bonk', t); b.fx('popword', t, { text: 'BONK!', x: W / 2, y: FLOOR - 900, t1: t + 0.9 }); b.hit('bonk', t);
  });

  let sadFrom = 0;
  ep.beat('uhoh', { bars: 2, mood: 'stop' }, (b) => {
    sadFrom = b.T(0);
    b.sfx('scratch', b.T(0)); b.hit('scratch', b.T(0));
    const l = b.say('pip', 'Uh-oh!', b.T(0, 0.5));
    b.mood('sad', b.T(1));
    b.sfx('sadTrombone', l.end + 0.1);
  });

  ep.beat('idea', { bars: 2, mood: 'think', pad: 0.2 }, (b) => {
    b.act('pip', 'gesture', b.T(0), b.T(0, 3), { g: 'think' });
    b.act('pip', 'emote', b.T(0), b.T(0, 3), { face: 'think' });
    const ding = b.T(0, 3);
    b.fx('tint', sadFrom, { t1: ding, color: '#7486C9', alpha: 0.4 });
    b.act('pip', 'emote', sadFrom, b.T(0), { face: 'sad' });
    b.sfx('ding', ding); b.hit('idea', ding);
    b.fx('lightbulb', ding, { t1: b.T(2, 2), who: 'pip', dy: -70, dx: -20 });
    b.fx('flash', ding, { alpha: 0.45 });
    b.mood('play', ding);
    b.act('pip', 'gesture', ding, ding + 0.8, { g: 'pointUp' });
    b.act('pip', 'emote', ding, ding + 4, { face: 'joy' });
    b.say('pip', "TODO: Pip's kind idea (the lesson, in her words).", ding + BEAT * 0.75);
  });

  ep.beat('fix', { bars: 3, mood: 'play' }, (b) => {
    // TODO: they do it together; count / call each step out loud with b.count('pip', [...], [...times])
  });

  ep.beat('payoff', { bars: 3, mood: 'party', pad: 0.2 }, (b) => {
    const t = b.T(0);
    b.sfx('tada', t); b.hit('yay', t);
    b.fx('flash', t, { alpha: 0.6 });
    b.fx('sunburst', t, { x: W / 2, y: FLOOR - 520, t1: t + 6 });
    b.fx('confetti', t, { n: 160, spawn: 2.2, t1: t + 5 });
    b.act('pip', 'dance', t, t + 3.4); b.act('pip', 'emote', t, t + 3.4, { face: 'laugh' });
    b.act('biscuit', 'pose', t, t + 0.1, { pose: 'beg' }); b.act('biscuit', 'dance', t, t + 3.4); b.act('biscuit', 'emote', t, t + 3.4, { face: 'joy' });
    const n = b.say('narrator', 'TODO: the lesson in 4-5 words!', t + BEAT);
    b.stamp(n.t + 0.4, 'TODO', { per: BEAT / 4, t1: t + 7 });
    b.until(t + 3.4);
  });

  ep.beat('bye', { bars: 2, mood: 'outro', pad: 0.1 }, (b) => {
    b.act('biscuit', 'pose', b.T(0), b.T(0, 0.1), { pose: 'sit' });
    const n = b.say('narrator', 'TODO: a question for the viewer?', b.T(0, 0.25));
    b.endcard(n.t, { text: 'TODO!' });
    const bye = b.say('pip', 'Bye-bye!', b.after(n, 0.25));
    b.act('pip', 'gesture', bye.t - 0.3, bye.end + 1.2, { g: 'waveBoth' });
    b.act('biscuit', 'bark', bye.end, bye.end + 0.4, { n: 1 }); b.sfx('bark', bye.end);
    b.until(bye.end + 0.7);
  });

  const SCORE = ep.done();
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
`);
console.log(`created ${path.relative(process.cwd(), path.join(dir, 'score.js'))}\nnext: edit it, then  node cartoons/kit/tools/build.js ${path.relative(process.cwd(), dir)} --sheet`);
