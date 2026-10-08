# Deploy folders

Each folder holds one site renamed to `index.html`, which is what a static
host expects. The `.zip` of each is the same thing, ready to drag.

## Fastest route — Netlify Drop (~2 minutes, free)

1. Go to https://app.netlify.com/drop
2. Drag the **folder** (e.g. `breakfast-nook/`) onto the page
3. You get a live URL immediately, e.g. `random-name-123.netlify.app`
4. Sign in (free) to keep it, then **Site settings → Change site name** and
   set something sensible: `breakfast-nook-preview.netlify.app`

That URL is what goes in the email.

## Better, once you're selling

Buy a domain for your own business (~$15/year) and host previews on
subdomains:

    nook.yourstudio.ca
    jinglepot.yourstudio.ca

Looks like a web company rather than a free host, and the domain is yours
to keep. Netlify, Cloudflare Pages and Vercel all attach custom domains
free.

## Do NOT use

- **claude.ai artifact links** — private by default, and the URL undercuts
  the pitch.
- **GitHub Pages on this repo** — it works and it's free, but this repo is
  public and holds every proposal. A prospect could browse from their own
  site to the ones you built for other businesses, and read the commit
  history. Keep client proposals on separate hosts.

## Note

Each site is one self-contained file. No build step, no dependencies except
Google Fonts. Any static host serves it as-is.
