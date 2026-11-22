# Cartoons: kids' Shorts studio

Original kids' cartoon Shorts for YouTube, made in volume by an automated pipeline.

| file | what it is |
|---|---|
| [PLAYBOOK.md](PLAYBOOK.md) | the strategy: volume model, lanes, cadence, titles, hit loop, compilations, guardrails |
| [PIPELINE.md](PIPELINE.md) | how a video gets made: write → render → assemble → QA → package → publish → measure |
| [pipeline/RUNBOOK.md](pipeline/RUNBOOK.md) | the prompt a daily scheduled Claude session follows |
| [series/pip-and-biscuit/bible.md](series/pip-and-biscuit/bible.md) | characters, world, AI prompt blocks, episode rules |
| [series/pip-and-biscuit/backlog.json](series/pip-and-biscuit/backlog.json) | 29 queued episode premises (story / song / slapstick) |
| [series/pip-and-biscuit/episodes/](series/pip-and-biscuit/episodes/) | episode specs (+ generated `.meta.json` for upload) |
| [pip-biscuit-tower/](pip-biscuit-tower/) | code-route pilot: `score.js` (timeline), `film.js` (picture), `song.js` (music), `kid.js` (Pip) |
| [ai-pilot/](ai-pilot/) | AI-route pilot: the Higgsfield master frame (the MP4s stay out of git) |
| `pipeline/*.sh, *.py` | `assemble.sh`, `qa.sh`, `package.py`, `upload_youtube.py`, `scoreboard.py` |

## Pilot episode: "The Wobbly Tower" (lesson: teamwork)

Pip stacks a tower, Biscuit knocks it over trying to help, "Uh-oh!", they rebuild it together, and the new tower spells TOGETHER.

| | code route | AI route |
|---|---|---|
| file (not in git; regenerate or ask) | `pilots/pip-biscuit-CODE-pilot.mp4` | `pilots/pip-biscuit-AI-pilot.mp4` |
| cost | 0 credits | 68.25 Higgsfield credits |
| length / format | 29.3s, 1080×1920, 30fps | 15.1s, 1080×1920 (from 704×1280, 24fps) |
| QA gate | pass | pass after `assemble.sh` |

Re-render the code pilot:
```bash
cd cartoons/pip-biscuit-tower && node song.js && node engine/render.js video && node engine/render.js mux && node engine/render.js verify
```
