# Kids' cartoon Shorts: the volume playbook

The strategy the pipeline serves. Read this before changing what we make or how often.

## The thesis: views come from a few hits, so take many shots and pounce on winners

What the channels we studied show (YouTube data, Nov 2026):

| channel | what most Shorts get | what the hits get |
|---|---|---|
| Toon Stories (AI-made, one template) | 50K-500K | 4M, 7.7M, 13M, 20M |
| ToonTiny (1.55M subs, recurring family) | 10K-50K | one at 2.7M |
| BabyBillion ("Kids Learn ___") | 1M-5M | 21M, 29M, 34M, 36M, 54M |

Views follow a power law. You can't predict which video hits, but you can control two things:
1. **Shots on goal**: publish a lot, consistently.
2. **Speed of exploitation**: when one hits, the algorithm is already looking for more like it.
   Ship 3-5 variations of the winner within a week.

## What we make: three lanes

| lane | length | share (month 1) | why |
|---|---|---|---|
| **Story**: Pip & Biscuit lesson (problem → kind fix → payoff) | 25-45s | 60% | the format behind ToonTiny's and BabyBillion's hits; builds characters people subscribe for |
| **Song**: counting, colours, shapes loop | 10-20s | 25% | NuNu-style rhyme Shorts hit billions; short = high completion and replays |
| **Slapstick**: no dialogue | 15-30s | 15% | works in every language; cheapest to make |

After 20 uploads in a lane, `pipeline/scoreboard.py` tells you to keep it or drop it.

## Cadence

- **Days 1-30:** 2 Shorts a day (about 60). Mostly the free code route, plus 1-2 AI "hero" episodes a week.
- **Days 31-60:** keep 2 a day. Half are variations of winners, half are new premises from `backlog.json`.
- **Every 10 Shorts:** one 5-10 minute compilation as a long-form video (see the flywheel below).

Consistency beats bursts: schedule uploads at the same times every day (`publishAt`), not 20 in one go.

## Packaging that worked on the studied channels

- **Titles:** the problem or lesson, a name, an emoji, `#forkids`, under 70 characters.
  - "Biscuit Knocked It Over! 😮🧱 Let's Build It Together #forkids"
  - "Pip Learns To Share Her Cookies 🍪💛 #forkids"
  - "Uh-oh, Pip! Don't Chase the Ball 🚦⚽ #forkids"
- **First frame** = the thumbnail on Shorts: both characters, bright, mid-action. Never a black or title-only frame.
- **Hook in second one:** something moves on frame 1 (the QA gate checks this).
- **Loop ending:** 1-2s of calm at the end so the replay feels seamless (replays count as views).

## The hit loop (weekly)

1. `scoreboard.py` ranks every Short by views per hour.
2. **WINNER** (top 15% after 48h and 2× the channel median): add 3-5 variations to the top of the backlog.
   Same premise shape, new object/place/lesson (the tower → a sandcastle → a snowman → a cake).
3. **WEAK lane** after 20 uploads: change the lane's premise style, length or title formula before dropping it.
4. Rewrite the next week's titles to copy the winners' title pattern.

## The compilation flywheel (where the money is)

Made-for-Kids Shorts earn very little per view: kids' videos get no personalised ads, and Shorts
revenue is a shared pool. The big kids' channels earn on **long-form compilations** (Sheriff Labrador and
Baby Bobo upload 40-70 minute compilations). Shorts build the audience; compilations monetise it.
- Code-route episodes re-render in 16:9 from the same score: `node engine/render.js formats 16:9`.
- AI-route episodes: generate 16:9 versions of winners, or use pillarboxed 9:16 in a branded frame.
- Stitch 10-20 episodes with a 3-second title card between them: `pipeline/assemble.sh` (switch to 1920×1080).

## Scale levers once something works
- **Languages:** slapstick and song episodes have no or few words. Re-upload them with translated
  titles to Spanish, Hindi and Portuguese channels (Higgsfield's creator-dub workflow handles spoken lines).
- **Second series:** once Pip & Biscuit has 3+ hits, clone the bible for a second cast in another lane.

## Guardrails (break these and the channel dies)
- **Made for Kids = yes** on every upload (COPPA; the FTC fines channels). `package.py` refuses otherwise.
- **YouTube's "inauthentic content" rule** (mass-produced, repetitive videos can lose monetisation):
  - a recurring cast and a real story every time;
  - at most 3 object-swaps of one premise;
  - never re-upload the same video with small edits.
  This is the main risk of a volume strategy, and the reason the pipeline varies stories rather than templates.
- **AI disclosure:** clearly animated cartoons don't need YouTube's "altered or synthetic" label. That label is
  for realistic people, places and events. Keep `containsSyntheticMedia: false` unless that changes.
- **Original only:** no characters, names, music or looks from existing shows.
- **Quality bar:** every video passes `pipeline/qa.sh` and a contact-sheet review. A glitchy AI hand in a kids' video
  gets comments from parents and reports, not views.
