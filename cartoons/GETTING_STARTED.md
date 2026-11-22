# Getting started: your first week

Everything below is free. It takes about an hour on day 1, then 10 minutes a day.

## Day 1: set up the channel (about 45 minutes)

### 1. Use a separate Google account
- Create a new Google account just for the channel (or use a Brand Account, see step 2).
  It keeps the channel apart from your personal email, and you can add helpers later without sharing your password.
- Turn on 2-Step Verification: myaccount.google.com → Security. A hijacked kids' channel is a nightmare to recover.

### 2. Create the channel
1. Sign in at youtube.com → your profile picture → **Settings** → **Add or manage your channel(s)** → **Create a channel**.
   This makes a Brand Account channel, which is easier to hand over or share later.
2. Name: **Pip & Biscuit**. Handle: `@PipAndBiscuit`. If it's taken, try `@PipAndBiscuitTV` or `@PipAndBiscuitCartoons`.
3. Upload the branding I made (in `cartoons/branding/`):
   - profile picture: `avatar.png`
   - banner: `banner.png` (2560×1440; the middle stays visible on phones)
4. Channel description (paste and edit):
   > Pip is five, Biscuit is a very helpful puppy, and together they turn little everyday problems into
   > big lessons: sharing, taking turns, being kind, trying again. Short, musical, gentle cartoons for
   > ages 2–6, with new episodes every week.

### 3. The settings that matter (YouTube Studio → Settings)
- **Channel → Advanced settings → Audience: "Yes, set this channel as made for kids."**
  This is required by law (COPPA) for kids' content. YouTube then turns off comments, personalised ads,
  end screens and cards for your videos. That's normal for every kids' channel.
- **Channel → Feature eligibility → verify your phone number.** This unlocks custom thumbnails and longer videos.
- **Upload defaults:**
  - Category: *Film & Animation*
  - Description: the channel description above
  - Tags: `kids cartoon, cartoon for kids, preschool, toddler learning, pip and biscuit`
- When you upload, answer **"Altered or synthetic content": No.** The label is for realistic footage; cartoons don't need it.

## Day 1: your first two uploads (15 minutes)

Upload the two finished episodes (sent with this guide):

| file | title |
|---|---|
| `pb001-wobbly-tower.mp4` | Biscuit Knocked It Over! 😮🧱 Let's Count & Build Together #forkids |
| `pb002-my-turn-your-turn.mp4` | Pip Won't Share Her Ball! 🔴🐶 Taking Turns for Kids #forkids |

How to upload:
- Use YouTube Studio on a computer, or the YouTube app's **+** button.
- Vertical videos under 3 minutes automatically become Shorts.
- Paste the title. Use the description template above with a sentence about the episode. Set **Made for kids: Yes**.
- In the app you can pick the cover frame: choose one with both characters and a big expression.
- **Don't upload the old test videos** (the pencil-style pilot and the 3D AI clip). They don't match the new look, and a channel needs one consistent style.

## Days 2–14: the rhythm

- **Post one episode a day at the same time.** Late afternoon in your country is a good default.
  Consistency matters more than volume in week one. Scheduled publishing keeps it regular.
- **Ask me for new episodes.** For example: *"make episodes 3, 4 and 5 from the backlog"*, or *"make an episode where Biscuit is scared of the vacuum"*.
  - Each episode is one score file built from the kit.
  - It renders in about 4 minutes.
  - Every voice line is checked automatically.
- **Day 14:** switch to 2 a day if you can keep it up.

## Every week: find what works (10 minutes)

In YouTube Studio → **Analytics → Content → Shorts**, look at each video's:
- **Views**
- **"Stayed to watch" vs "swiped away"**: the share who kept watching. This is the number that matters most.
- **Average view duration**

Tell me which episodes did best. I'll make 3–5 new episodes in the same shape (same kind of problem, new setting or object) and adjust the titles to match. That's the volume playbook: lots of shots, then double down on the hits.

## When will it make money?

YouTube's Partner Program needs **1,000 subscribers** plus either **10 million Shorts views in 90 days** or **4,000 watch hours of long videos in 12 months**.
- Kids' Shorts earn little per view, so plan for this.
- The usual path is: Shorts build the audience, then long **compilations** (10+ episodes stitched together) earn the money.
- I can render compilations from finished episodes whenever you're ready. Expect months, not weeks.

## Should you make multiple channels?

**Not yet. Start with one channel.**
1. **The algorithm learns from one channel's signal.** Splitting 60 videos across three channels gives each one a third of the data, so it takes three times longer to find your audience.
2. **Each channel has to qualify for monetisation separately.** Three half-grown channels earn nothing; one grown channel does.
3. **Duplicate channels are against YouTube's spam rules.** Uploading the same or near-identical videos across several channels to get more reach can get *all* the linked channels terminated, not just one.

**When a second channel does make sense:**
- **Other languages, once you have hits.** The kit's free voice engine also speaks Spanish, Hindi, Portuguese, French and Italian (still to be tested). The same animation with a new voice track is a different audience, and that's allowed. Spanish is the biggest kids' market after English.
- **A different show for a different audience**, for example a lullaby or song channel. It must be genuinely different content, not copies.

## What I need from you to automate uploads later (not urgent)

After about 20 manual uploads, the upload step can be automated (`pipeline/upload_youtube.py`). It needs:
- a Google Cloud project with the YouTube Data API turned on;
- an OAuth login for the channel account.

Steps are in `PIPELINE.md`. Uploading by hand for the first few weeks is also a good quality check: you watch every episode before it goes out.
