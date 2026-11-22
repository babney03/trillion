# Pip & Biscuit: series bible

The single reference every episode is written and rendered from. If a prompt, script or render
disagrees with this file, this file wins. Keep it short and specific.

## The show in one line

A curious 5-year-old girl and her clumsy, loving puppy turn small everyday problems into a lesson,
in under 60 seconds, with music and almost no words.

- **Audience:** ages 2-6, watched with or near a parent. Made for Kids on YouTube.
- **Promise of every episode:** something goes wrong → a kind fix → a happy, musical payoff.
- **Language load:** a narrator tells the story in short sentences; Pip speaks 3-6 short lines (counting and calling out loud count as speaking). No reading is needed: no speech bubbles, and big words like BONK! are decoration only.

## Characters

### Pip (hero)
- 5 years old, big round head, huge sparkly brown eyes, rosy cheeks.
- Curly orange hair in **two puffs**, a small green hair clip on her left puff.
- **Yellow t-shirt dress with a small red star**, red sneakers with white soles.
- Personality: determined, imaginative, quick to forgive. Says "Uh-oh!" and "Let's ___ together!"
- Signature moves: hands on hips when proud, both arms up when happy, finger up when she gets an idea (lightbulb).

### Biscuit (sidekick)
- Chubby tan puppy, floppy brown ears, white muzzle, **red collar with a gold bell**.
- Personality: over-excited helper. His help causes the problem; his effort helps fix it.
- Never talks. Communicates with yips, ear droops, tail wags and head tilts.
- Signature moves: bounces on his front paws, carries things in his mouth, flops when sorry.

### Recurring extras (use sparingly, max 1 per episode)
- **Grandma Rosie**: silver bun, round glasses, green cardigan. Teaches by example.
- **Milo**: Pip's 3-year-old cousin, blue overalls. Lets Pip practise sharing and patience.

## World
- Home base: Pip's playroom (mint polka-dot walls, window high left, toy shelf right, teal round rug, wooden floor, bunting).
- Other sets (one per episode): kitchen, bathroom (teeth/bath), backyard, park, bedroom (bedtime), grocery store, rainy street.
- Palette: candy primaries. Pip's yellow and Biscuit's tan must always pop against the background.

## AI-route consistency kit (Higgsfield)

Paste these blocks into every image/video prompt verbatim; never paraphrase them.

```
STYLE: Bright, glossy 3D animated preschool cartoon, soft global illumination, saturated candy colors,
friendly rounded shapes, simple uncluttered background, high quality children's TV animation, no text, no logos.

PIP: a cheerful 5-year-old girl with a big round head, huge sparkly brown eyes, rosy cheeks, curly orange hair
in two puffs with a small green hair clip, wearing a yellow t-shirt dress with a small red star and red sneakers.

BISCUIT: a chubby tan puppy with floppy brown ears, a white muzzle and a red collar with a gold bell.
```

- **Reference frame:** generate one "master frame" per set with `gpt_image_2_6` (about 1 credit), then pass it as
  `start_image` (and the original pilot frame as an `image_reference`) for every clip, so faces and outfits stay locked.
- Pilot master frame (playroom): `cartoons/ai-pilot/pip-frame.png` (Higgsfield job `f222bec7-9cd6-4a82-b8cd-0f145daa78fc`). Note: the AI route draws Pip in 3D, which doesn't match the kit's 2D look. Pick one look per channel.
- Reject and regenerate any clip where Pip's hair, dress or Biscuit's collar changes, or a hand or paw morphs.

## Code-route kit (`cartoons/kit`), the free way we make episodes
- The characters, sets, props, effects, music and voices all live in the kit. An episode is one `score.js` (see `cartoons/kit/README.md`).
- **Pip:** `kit/lib/pip.js`, clean modern-2D, with lip-sync, 14 faces, walk/jump and 16 gestures.
- **Biscuit:** `kit/lib/biscuit.js`, with sit/stand/trot/leap/flop/beg, swinging ears, wagging tail and eyebrow acting. The brown patch over his right eye is his mark: never drop it.
- **Sets:** playroom, kitchen (with an optional table) and backyard (with Biscuit's doghouse).
- **Voices (free, Kokoro):**
  - narrator `af_heart`: warm, speed 0.94
  - Pip `af_bella` pitched up 4 semitones (≈267 Hz, a 5-year-old's range)
  - Grandma `bf_isabella`
  - Milo `am_puck` +7
  - Biscuit never speaks: yips, barks and whimpers only.
- **Music identity:**
  - the Pip & Biscuit theme (2 bars, C major) on music box in intros and outros, and on brass in the party;
  - plucked off-beat "ukulele";
  - marimba for Pip's actions, pizzicato for Biscuit's.
- **Every episode** runs the clarity check (Whisper hears every line), the sync check and the QA gate before upload.

## Episode rules
1. **Hook in the first second:** something moves or pops on frame 1. No slow fades in.
2. **One problem, one lesson.** The lesson is the title.
3. **The gimmick:** every repeated action plays a note (blocks, footsteps, toothbrush strokes, raindrops).
4. **The setback** gets a record scratch or sad trombone and a blue tint. Keep it short (under 3s) and never scary.
5. **The fix** is always kind, never a punishment. Pip and Biscuit fix it *together*.
6. **The payoff** is a musical drop: star, confetti, cheer. Then a 2s calm ending so the loop restarts cleanly.
7. Length 25-45s. Text only inside the 9:16 safe area (top 11.5%, bottom 22%, right 140px are covered by YouTube UI).

## Never
- Copy characters, names, music or looks from existing shows.
- Show unsafe behaviour without showing the safe way right after (road, stairs, oven, water).
- Use fear, violence, gross-out or "prank" humour, or anything commercial (no products, no "buy").
- Reuse a premise with only the object swapped more than 3 times (YouTube's "inauthentic/repetitive content" risk).
