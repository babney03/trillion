# The pipeline: from backlog to published Short

```
 backlog.json ──► 1 WRITE ──► 2 RENDER ──► 3 ASSEMBLE ──► 4 QA ──► 5 PACKAGE ──► 6 PUBLISH ──► 7 MEASURE
 (premises)      episode     code route    assemble.sh    qa.sh    package.py    upload_      scoreboard.py
                 spec JSON   or AI route   (AI clips)     + sheet  (.meta.json)  youtube.py   ──► winners go
                 (Claude)    (Claude)                     review                 (scheduled)      back to the
                                                                                                  top of backlog
```

Every stage reads and writes files in this folder, so any stage can be re-run on its own, by a person or
by a scheduled Claude session following `pipeline/RUNBOOK.md`.

## The two production routes (measured on the pilot)

| | **Code route** (animation-studio engine) | **AI route** (Higgsfield) |
|---|---|---|
| Pilot | `pilots/pip-biscuit-CODE-pilot.mp4` | `pilots/pip-biscuit-AI-pilot.mp4` |
| Look | hand-drawn picture book, flat 2D | glossy 3D, like the top channels |
| Length | 29.3s | 15.1s (one clip; the model maxes out at 15s) |
| Cost | **0 credits** | **68.25 credits** (0.75 frame + 67.5 for 15s of video with sound) |
| Time | 2m47s render on this container, plus the writing (see below) | under 8 minutes of generation |
| Sound | synthesised score; every hit verified within 20ms of the picture | generated with the clip: music, effects, a spoken line |
| Control | exact: every beat is in `score.js` | prompt-level; it followed all 5 beats this time, but that isn't guaranteed |
| Character consistency | perfect (same code every time) | good within a clip; can drift between clips, so reuse the master frame |
| Other formats (16:9 compilations) | re-render from the same score | regenerate, or pillarbox |
| What limits volume | Claude's writing time per new episode | credits |

**Credits math:** the 210 credits on the Starter plan cover about 3 fifteen-second AI Shorts.
2 AI Shorts a day ≈ 135 credits/day ≈ 4,000/month, so daily AI volume needs a bigger Higgsfield plan.
**Recommended mix:** the code route for daily volume, the AI route for 1-2 "hero" episodes a week and for remaking proven winners in 3D.

## Stage by stage

### 1. WRITE: premise → episode spec
- Input: next `status: "idea"` item in `series/<series>/backlog.json` (winner variations go first).
- Claude writes `series/<series>/episodes/NNN-slug.json` in the shape of `001-wobbly-tower.json`:
  logline, timed beats (shot, action, sound, on-screen text), the AI prompt (bible blocks pasted verbatim) and the publish block.
- Rules come from `series/<series>/bible.md` (hook in second 1, one lesson, the musical gimmick, kind fix, payoff, ≤2 text lines).

### 2a. RENDER: code route
```bash
SK=<animation-studio skill dir>
node $SK/scripts/new-project.js cartoons/<slug> --format 9:16
cp cartoons/pip-biscuit-tower/kid.js cartoons/<slug>/        # Pip
# copy drawBg / drawDog / block helpers from pip-biscuit-tower/film.js, write the new score.js + film.js + song.js from the spec
cd cartoons/<slug> && node song.js && node engine/render.js video && node engine/render.js mux && node engine/render.js verify
```
- A new episode in an existing set is mostly a new `score.js` (the beats) plus new action functions in `film.js`.
- **Next build step for real volume:** extract the playroom, Pip, Biscuit, blocks, bubbles, sparkle, sunburst and
  title stamps from `pip-biscuit-tower/film.js` into a shared `cartoons/kit/` and make episodes data-driven
  (beats → standard actions: toss, carry, fall, think, idea, cheer). Then a new episode is a 100-line score instead of a 400-line film.

### 2b. RENDER: AI route (Higgsfield MCP, from a Claude session)
1. One master frame per set (`generate_image`, `gpt_image_2_6`, 9:16, about 1 credit) with the bible's STYLE/PIP/BISCUIT blocks. Reuse it.
2. One `generate_video` per 15s of story: `grok_video_v15`, `duration: 15`, `resolution: 720p`,
   `start_image` = master frame, prompt = the spec's timed beats ("0-3s: ... 3-6s: ..."). Native audio is included.
   For 30s episodes, use two clips: the second clip's `start_image` is the last frame of the first.
3. `estimate_video_cost` first; stop if the run would exceed the day's credit budget.

### 3. ASSEMBLE
```bash
pipeline/assemble.sh out.mp4 clip1.mp4 [clip2.mp4] [--music bed.wav] [--endcard card.png]
```
It scales and crops to 1080×1920, joins the clips, optionally mixes a music bed, and normalises to -14 LUFS.

### 4. QA (hard gate)
```bash
pipeline/qa.sh out.mp4      # 9:16, ≥720px, 10-180s, audio, -16..-12 LUFS, true peak ≤ -1 dBTP, motion in second 1
```
Then **look at the contact sheet** it writes. Reject AI clips with morphing faces or hands, outfit changes, or text artifacts.
The raw AI pilot failed this gate (704×1280); after `assemble.sh` it passed.

### 5. PACKAGE
```bash
python3 pipeline/package.py series/pip-and-biscuit/episodes/NNN-slug.json --publish-at 2026-11-25T16:00:00Z
```
It writes `NNN-slug.meta.json` (title, description, tags, category, Made for Kids, publishAt) and lints the title against the playbook.

### 6. PUBLISH
```bash
YT_CLIENT_ID=... YT_CLIENT_SECRET=... YT_REFRESH_TOKEN=... python3 pipeline/upload_youtube.py out.mp4 NNN-slug.meta.json
```
- It uploads as private with `publishAt`, so YouTube releases it on schedule.
- **Credentials are still to be set up:** a Google Cloud OAuth client with YouTube Data API v3 enabled, then `--auth` once for the refresh token.
- The default API quota (10,000 units/day) allows about 6 uploads/day.
- Run the upload from your own machine or a GitHub Action that holds the secrets. This cloud container would need `www.googleapis.com` and `oauth2.googleapis.com` allowed on its network.
- Append `{episode, video_id, lane, lesson, published}` to `pipeline/ledger.json`.

### 7. MEASURE
```bash
YT_API_KEY=... python3 pipeline/scoreboard.py pipeline/ledger.json
```
It ranks every Short by views per hour and labels it WINNER, keep or weak. Lane medians tell you what to drop. A Claude session can also refresh view counts with the TubeAlfred YouTube tools, no key needed.

## Running it unattended

`pipeline/RUNBOOK.md` is written as the prompt for a **scheduled Claude Code session** (a daily scheduled task).
Each run: 2 episodes from the backlog → render → QA → package → schedule the uploads → update the ledger → commit the specs.

Recommended rollout:
1. **Week 1, review mode:** the session renders and packages but doesn't upload. You approve each video.
2. **Week 2+, auto mode:** uploads go out as scheduled-private, so you can still veto before `publishAt`.
3. **Weekly:** a second scheduled task runs the scoreboard and reorders the backlog with winner variations.

What a person still owns: the YouTube channel and its credentials, the Higgsfield plan/budget, and spot-checking the first videos.
