#!/usr/bin/env node
// One command from score.js to a finished, checked Short.
//
//   node cartoons/kit/tools/build.js cartoons/episodes/002-cookie-share            # full render
//   node cartoons/kit/tools/build.js <episode> --sheet                            # quick contact sheet only
//   node cartoons/kit/tools/build.js <episode> --stills 3.5 @bonk 12              # chosen frames only
//   node cartoons/kit/tools/build.js <episode> --audio                            # voices + music only
//   flags: --draft (half resolution)  --no-qa  --asr (check every voice line with Whisper)
//
// Steps: sync the kit + engine into the episode folder -> voice pass (Kokoro, cached) -> music + voices
// -> render -> mux -> sync verify -> QA gate. The episode folder only needs score.js (+ optional custom.js).
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const KIT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const epDir = path.resolve(args.find((a) => !a.startsWith('--') && !/^[@\d]/.test(a)) || '.');
const has = (f) => args.includes(f);
const stillsAt = has('--stills') ? args.slice(args.indexOf('--stills') + 1).filter((a) => /^[@\d]/.test(a)) : null;
const draft = has('--draft') ? ['--draft'] : [];
if (!fs.existsSync(path.join(epDir, 'score.js'))) { console.error(`no score.js in ${epDir}`); process.exit(1); }

const step = (msg) => console.log(`\n\x1b[1m▸ ${msg}\x1b[0m`);
const run = (cmd, argv, opts = {}) => { const r = spawnSync(cmd, argv, { cwd: epDir, stdio: 'inherit', ...opts }); if (r.status !== 0) { console.error(`✗ ${cmd} ${argv.join(' ')} failed`); process.exit(r.status || 1); } };

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (!fs.existsSync(d) || fs.statSync(d).mtimeMs < fs.statSync(s).mtimeMs || fs.statSync(d).size !== fs.statSync(s).size) fs.copyFileSync(s, d);
  }
}

step('sync kit + engine');
copyDir(path.join(KIT, 'engine'), path.join(epDir, 'engine'));
copyDir(path.join(KIT, 'lib'), path.join(epDir, 'kit'));
fs.copyFileSync(path.join(KIT, 'tools', 'tts.py'), path.join(epDir, 'kit', 'tts.py'));
let html = fs.readFileSync(path.join(KIT, 'template', 'index.html'), 'utf8');
if (fs.existsSync(path.join(epDir, 'custom.js'))) html = html.replace('<!--CUSTOM-->', '<script src="custom.js"></script>');
fs.writeFileSync(path.join(epDir, 'index.html'), html.replace('<title>episode</title>', `<title>${path.basename(epDir)}</title>`));
fs.copyFileSync(path.join(KIT, 'template', 'song.js'), path.join(epDir, 'song.js'));
if (!fs.existsSync(path.join(epDir, 'voice-lengths.js'))) fs.writeFileSync(path.join(epDir, 'voice-lengths.js'), '(function(){ const L = {}; if (typeof module !== "undefined") module.exports = L; else globalThis.VOICE_LENGTHS = L; })();\n');

step('voices (Kokoro, cached per line)');
run(process.execPath, ['-e', `
  const S = require('./score'); const KV = require('./kit/voice');
  const L = KV.synth(S.KIT.lines, S.KIT.voices); KV.writeLengths(L);
  const tot = Object.values(L).reduce((a, b) => a + b, 0);
  console.log(S.KIT.lines.length + ' lines, ' + tot.toFixed(1) + 's of speech');
`]);
// the timeline now uses the real line lengths: show the layout
run(process.execPath, ['-e', `
  const S = require('./score');
  console.log('duration ' + S.DURATION.toFixed(1) + 's');
  for (const b of S.KIT.beats) console.log('  ' + b.name.padEnd(14) + b.t0.toFixed(2).padStart(6) + ' → ' + b.t1.toFixed(2).padStart(6) + '  (' + b.bars + ' bars)');
  const over = S.KIT.lines.filter((l, i, a) => i && l.t < a[i - 1].end - 0.02);
  if (over.length) console.log('  ! overlapping voice lines: ' + over.map((l) => '"' + l.text + '"').join(', '));
`]);

if (has('--asr')) { step('voice check (Whisper)'); run('/opt/tts/bin/python', [path.join(KIT, 'tools', 'asr_check.py'), '.']); }

step('music + voices');
run(process.execPath, ['song.js']);
if (has('--audio')) process.exit(0);

if (has('--sheet')) { step('contact sheet'); const S = require(path.join(epDir, 'score.js')); run(process.execPath, ['engine/render.js', 'sheet', '0', String(S.DURATION.toFixed(2)), '30', '6', '--draft']); console.log(path.join(epDir, 'out', 'sheet.png')); process.exit(0); }
if (stillsAt) { step('stills'); run(process.execPath, ['engine/render.js', 'stills', ...stillsAt, ...draft]); process.exit(0); }

step('render');
run(process.execPath, ['engine/render.js', 'video', ...draft]);
run(process.execPath, ['engine/render.js', 'mux']);
step('sync check');
spawnSync(process.execPath, ['engine/render.js', 'verify'], { cwd: epDir, stdio: 'inherit' });
if (!has('--no-qa')) { step('QA gate'); spawnSync('bash', [path.join(KIT, '..', 'pipeline', 'qa.sh'), path.join('out', path.basename(epDir) + '.mp4')], { cwd: epDir, stdio: 'inherit' }); }
console.log(`\n✓ ${path.join(epDir, 'out', path.basename(epDir) + '.mp4')}`);
