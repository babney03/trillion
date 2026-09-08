# trillion

Website work for local businesses.

## What's in here right now

### `showcase/surface-catalogue.html`
A live capability sheet — twelve code-generated backgrounds and textures, a
demo card that reskins off a single hue value, and the interface parts a
small-business site gets assembled from. Open the file directly in a browser;
it has no build step and no dependencies beyond Google Fonts.

Published copy: https://claude.ai/code/artifact/810b9445-745c-4946-b0f3-c2705dce518e

### `shared/`
The design system behind that page, split for reuse:

| File | What it holds |
| --- | --- |
| `css/tokens.css` | Colour, type scale, spacing, shadows. A site's whole palette derives from three numbers (`--brand-h/s/l`). |
| `css/base.css` | Reset, typography, layout primitives. |
| `css/textures.css` | The background/texture library. Also `.bg-slot`, the hook for dropping in a Canva or Higgsfield export. |
| `css/components.css` | Buttons, nav, cards, reviews, gallery, FAQ, forms, footer, sticky mobile call bar. |
| `js/site.js` | Sticky header, mobile drawer, scroll reveal, call bar, form handling. No dependencies. |

### `templates/home-services/`
**Incomplete.** A contractor one-pager started and then set aside. The markup
uses `{{token}}` placeholders that expect a fill script which was never
written, so it does not render as-is. Kept for the section structure and the
local-business schema markup; treat it as notes, not a working template.

## Notes

- No Canva or Higgsfield access from the build environment. Backgrounds are
  generated in CSS instead. Exports from either tool can still be dropped in
  via `--bg-hero-image` / `--bg-section-image` / `--bg-cta-image`.
- No imagery is generated here — client photos go into the marked slots.
- Forms have no backend; they need an endpoint wired up before launch.
