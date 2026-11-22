# RUNBOOK: daily production run (prompt for a scheduled Claude session)

> Paste the "Run" section below as the prompt of a daily scheduled task in this repository.
> Settings live in "Config". The session must follow `cartoons/series/<series>/bible.md` and `cartoons/PLAYBOOK.md`.

## Config
- SERIES: `pip-and-biscuit`
- EPISODES_PER_RUN: 2
- ROUTE: `code` (the free kit). Use `ai` only when there is a Higgsfield credit budget.
- AI_CREDIT_BUDGET_PER_RUN: 70 (one 15s clip). Never exceed it; check `balance` and `estimate_video_cost` first.
- MODE: `review` (render + package only) | `auto` (also upload as scheduled-private)
- PUBLISH_SLOTS (UTC): 16:00 and 22:00, starting the day after the run

## Run
1. `git pull`. Read `cartoons/PLAYBOOK.md`, `cartoons/series/$SERIES/bible.md`, `backlog.json`, `pipeline/ledger.json`.
2. If `ledger.json` has ≥10 rows and the last scoreboard is older than 7 days, refresh views
   (TubeAlfred `youtube_channel_shorts` for the channel, or `scoreboard.py` with `YT_API_KEY`).
   Move 3 variations of each WINNER to the top of the backlog (same premise shape, new object, place or lesson;
   at most 3 per premise).
3. For each of the next EPISODES_PER_RUN `idea` items:
   a. Write `episodes/NNN-slug.json` in the shape of `001-wobbly-tower.json`. Title by the playbook formulas.
   b. Code route (default, free):
      - `node cartoons/kit/tools/new-episode.js NNN "Title" --set <set> --lesson "<lesson>"`, then fill in the 8 beats from the spec (see `cartoons/kit/README.md`).
      - Run `node cartoons/kit/tools/build.js cartoons/episodes/NNN-slug --sheet`, read the sheet and fix what reads wrong.
      - Then run it again with `--asr` for the final MP4. It must pass the voice check, sync check and QA gate.
   c. AI route (only with a credit budget): see PIPELINE.md 2b and `pipeline/assemble.sh`. Read the contact sheet;
      if a face, hand, paw or outfit glitches, regenerate once, then mark the item `needs_review` and move on.
   d. `python3 pipeline/package.py <spec> --publish-at <next free slot>`.
   e. MODE=auto: `python3 pipeline/upload_youtube.py <mp4> <meta>` and append the ledger row. MODE=review: send the
      MP4 and title to the user for approval.
   f. Set the backlog item's status (`rendered`, `scheduled`, `needs_review`).
4. Commit the specs, metadata, backlog and ledger (never the MP4s or `out/` folders) on the working branch and push.
5. Report: what was made, credits spent, QA results, scheduled times, and any `needs_review` items.

## Never
- Spend over the credit budget, or retry a failed generation more than once.
- Upload without passing `qa.sh`, or with Made for Kids off.
- Copy existing shows, or upload the same premise more than 3 times.
