# Prospect pipeline

Find busy landscaping businesses with a weak web presence, build each one a
concept site, put it live, and draft the pitch email. You read and send.

```
find.py ─► leads.csv ─► check.mjs ─► checks.json ─► prospects/<slug>.json ─► build.py ─► deploy/<slug>/
                                                                                  │
                                         cf-deploy.py ─► live-sites.json ─► build.py again ─► out/<slug>.email.json ─► Gmail draft
```

## Steps

1. **Find.** `python3 pipeline/find.py calgary edmonton ...`
   City slugs come from thehomework.ca/landscaping/. Keeps businesses with
   10+ Google reviews at 4.3+ (steady work), skips suppliers and franchises,
   audits each website, and appends to `leads.csv` with a status:
   - `lead`: has a real weakness (no site, dead site, not mobile friendly,
     no https, 5+ years stale, almost no content) and an email on its site
   - `no email`: has the weakness but the address must be found elsewhere
   - `maybe`: site works and only looks dated (builder template etc.)
   - `unverified`: the site blocked this network; check it in a browser
2. **Check.** `node pipeline/check.mjs` loads each site at phone size in
   Chromium, picks up emails that only appear once the page renders, and saves
   a screenshot to `cache/shots/`. Look at the screenshot before pitching:
   the email has to name a weakness that is actually true.
3. **Write the prospect file.** `prospects/<slug>.json`, from what the
   business says about itself (`cache/<domain>.txt`, the check text). Only
   real facts: services they list, areas they name, rating and review count.
   See any existing file for the fields.
4. **Build.** `python3 pipeline/build.py` writes `deploy/<slug>/index.html`.
5. **Deploy.** `python3 deploy/cf-deploy.py --all` (needs
   `CLOUDFLARE_API_TOKEN`; see the top of that file).
6. **Build again** so each email picks up its live URL, then Claude creates the
   Gmail drafts from `out/*.email.json`. Drafting skips any email still
   showing `[LINK]`.

`tracker.csv` records where each prospect is: built, live, drafted, sent,
replied, no thanks. A "no thanks" is final.

## Rules the emails follow

- Every claim about their current site is one we checked.
- No invented reviews, prices, years in business or guarantees on the
  concept site; anything unknown is a labelled placeholder.
- Each email says who's sending, gives a phone number, and offers a one-line
  opt-out (CASL). One follow-up at most.
