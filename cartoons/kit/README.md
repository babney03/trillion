# The cartoon kit

Everything a Pip & Biscuit episode needs, so a new episode is one script file (about 150 lines), not a new animation project.

```
kit/
  lib/score-kit.js   write an episode as beats (the timeline grows to fit the real voice lengths)
  lib/pip.js         Pip: expressions, lip-sync, walk/jump, gestures, holding props
  lib/biscuit.js     Biscuit: sit/stand/trot/leap/flop/beg, ears, tail, eyebrows, carries props in his mouth
  lib/actors.js      actions -> poses each frame, plus blinks, breathing, gaze, talking body language
  lib/sets.js        playroom, kitchen (optional table), backyard: static art + moving clouds/light/butterflies
  lib/props.js       block star ball cookie plate jar cup apple teddy cupcake flower toothbrush
  lib/fx.js          sparkle burst dust confetti sunburst lightbulb hearts/notes tears zzz popword tint flash
  lib/film.js        draws any episode (camera, props, characters, effects, title stamps, end card)
  lib/music.js       mood-based band + series theme + sound effects + voices, music ducked under every word
  lib/voice.js       Kokoro voices per character, pitch for Pip, lip-sync track
  tools/build.js     one command: sync -> voices -> music -> render -> sync check -> QA
  tools/new-episode.js   scaffold an episode with the 8-beat lesson structure
  tools/tts.py       batch Kokoro TTS with an automatic clarity check on short lines
  tools/asr_check.py Whisper listens to every line and compares it with the script
  engine/            the animation-studio renderer (vendored; synced into each episode at build)
```

## Make an episode

```bash
node cartoons/kit/tools/new-episode.js 003 "Bubble Trouble" --set playroom --lesson "washing hands"
# edit cartoons/episodes/003-bubble-trouble/score.js
node cartoons/kit/tools/build.js cartoons/episodes/003-bubble-trouble --sheet       # 30-frame contact sheet (~1 min)
node cartoons/kit/tools/build.js cartoons/episodes/003-bubble-trouble --asr         # final MP4 + voice check (~5 min)
```

The output is `cartoons/episodes/<ep>/out/<ep>.mp4` (1080×1920, 30fps, -14 LUFS). It has passed the sync check and `pipeline/qa.sh`.

## Writing beats (cheat sheet)

```js
ep.beat('name', { bars: 2, mood: 'play', pad: 0.3 }, (b) => {
  const l = b.say('pip', 'Look, Biscuit!', b.T(0, 1));       // voice line at bar 0 beat 1 (who: narrator | pip | grandma | milo)
  b.after(l, 1)                                               // the beat after that line ends (+1 beat)
  b.act('pip', 'gesture', t0, t1, { g: 'wave' })              // see gestures below
  b.act('biscuit', 'jump', t0, t1, { to: x, h: 200 })         // jump | hop | move {to} | pose {pose} | face {dir}
  b.act('pip', 'emote', t0, t1, { face: 'joy', hold: false }) // see faces below
  b.act('pip', 'look', t0, t1, { at: 'biscuit' | 'up' | 'down' | 'camera' | [x, y] })
  b.toss('pip', 'b0', { land, to: [x, y], note: 'C4' })       // prop lands ON `land` with a note + sparkle
  b.fly(id, t0, t1, [x, y], { from: 'current' | { who, slot }, arc, spin })
  b.hold(id, who, t0, t1)  b.place(id, t, x, y)  b.hide(id, t, { pop: true })  b.wobble(ids, t0, t1, { pivot })
  b.count('pip', ['One!', 'Two!'], [t1, t2])                  // spoken counting, each word clarity-checked
  b.sfx('bonk', t)   b.note(t, 'E4', 'marimba')   b.mood('sad', t)   b.cam(t0, t1, { zoom: 1.1, x, y })
  b.fx('popword', t, { text: 'BONK!', x, y, t1 })   b.fx('lightbulb', t, { who: 'pip', t1 })   b.fx('tint', t0, { t1 })
  b.title(t, ['PIP &', 'BISCUIT'], { sub })   b.stamp(t, 'TOGETHER')   b.endcard(t, { text: 'TEAMWORK!' })
  b.hit('bonk', t)                                            // a sync marker the build verifies (sound + picture)
});
```

- **Moods:** intro, play, calm, sneaky, think, sad, party, outro, stop (silence), hold (an 8th of held breath).
- **Pip faces:** content happy joy laugh surprised shock sad worried think proud determined sleepy cross love.
- **Biscuit faces:** content happy joy excited sad sorry surprised curious sleepy.
- **Pip gestures:** wave waveBoth cheer point pointUp think cheeks handsOnHead clap shrug akimbo cover reach hug hold offer.
- **Other actions:**
  - both: dance bounce hop squash nod shake tilt slump
  - Biscuit: bark pose (sit stand flop beg)
- **Sound effects:**
  - hits: woodTick thud bonk boing pop
  - movement: whoosh tumble slide whistleUp riser step
  - moments: scratch sadTrombone ding sparkle tada click chomp
  - Biscuit: yip bark whimper

## Rules the build enforces
- Lines never overlap (it warns if they do), and beats grow to fit the real spoken length.
- Every `b.hit` is checked: the sound within 20ms and the picture within 1 frame.
- `--asr`: every line must be understood by Whisper. Short lines get alternate takes automatically.
- QA gate: 9:16, ≥720px, 10–180s, -14 LUFS, true peak ≤ -1 dBTP, motion in the first second.

## Setup on a fresh machine
```bash
python3.12 -m venv /opt/tts && /opt/tts/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu && /opt/tts/bin/pip install kokoro soundfile faster-whisper
```
You also need Node 22+, ffmpeg and Chrome/Chromium. The Kokoro and Whisper models download from Hugging Face on first use.
