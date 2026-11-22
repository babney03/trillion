# Cartoons: Pip & Biscuit studio

Original kids' cartoon Shorts for YouTube: free to make, voiced, and built from a reusable kit.

**Start here → [GETTING_STARTED.md](GETTING_STARTED.md)** (channel setup, first uploads, the weekly rhythm, and whether to run multiple channels).

| file | what it is |
|---|---|
| [GETTING_STARTED.md](GETTING_STARTED.md) | your first week: channel, settings, uploads, measuring, money, multiple channels |
| [kit/README.md](kit/README.md) | the cartoon kit: how a new episode is written and built (one command) |
| [episodes/](episodes/) | finished episodes (each is one `score.js`; the build regenerates everything else) |
| [branding/](branding/) | channel avatar + banner (`make.sh` re-renders them) |
| [PLAYBOOK.md](PLAYBOOK.md) | the strategy: volume model, lanes, cadence, titles, hit loop, compilations, guardrails |
| [PIPELINE.md](PIPELINE.md) | write → render → QA → package → publish → measure, and how to automate it |
| [series/pip-and-biscuit/](series/pip-and-biscuit/) | series bible, backlog of 29 premises, episode specs + upload metadata |
| `pipeline/` | `qa.sh`, `assemble.sh`, `package.py`, `upload_youtube.py`, `scoreboard.py`, `RUNBOOK.md` |
| `pip-biscuit-tower/`, `ai-pilot/` | the first two test pilots (pencil style and 3D AI): kept for reference, not for upload |

## Make an episode
```bash
node cartoons/kit/tools/new-episode.js 003 "Bubble Trouble" --set playroom --lesson "washing hands"
node cartoons/kit/tools/build.js cartoons/episodes/003-bubble-trouble --sheet   # quick look
node cartoons/kit/tools/build.js cartoons/episodes/003-bubble-trouble --asr     # final MP4, every voice line checked
```
