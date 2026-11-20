---
name: Keelson
description: A vessel safety plan, drawn up — drafting-sheet linework with safety-sign colour only where it means something.
colors:
  drafting-film: "#f4f5f2"
  sheet: "#ffffff"
  ink: "#111416"
  ink-2: "#3a4145"
  ink-3: "#59626a"
  rule: "#cdd2cf"
  rule-soft: "#e3e6e3"
  fire-red: "#c41e1c"
  fire-wash: "#fbe9e8"
  lifesaving-green: "#08703f"
  lifesaving-wash: "#e4f2ea"
  caution-yellow: "#f2c200"
  caution-wash: "#fff6cc"
  mandatory-blue: "#1a5aa6"
  mandatory-wash: "#e7eef8"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 1.6rem + 2.2vw, 3.6rem)"
    fontWeight: 760
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 1.35rem + 1vw, 2.15rem)"
    fontWeight: 760
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1rem + 0.2vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo Variable, Archivo, system-ui, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 640
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  sm: "3px"
  md: "4px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "22px"
  gutter: "clamp(16px, 4vw, 40px)"
components:
  button:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 22px"
    height: "52px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    padding: "0 22px"
    height: "52px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 13px"
    height: "50px"
  choice-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.md}"
    height: "46px"
  mark-overdue:
    backgroundColor: "{colors.fire-wash}"
    textColor: "{colors.fire-red}"
    rounded: "{rounded.sm}"
  mark-soon:
    backgroundColor: "{colors.caution-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  mark-ok:
    backgroundColor: "{colors.lifesaving-wash}"
    textColor: "{colors.lifesaving-green}"
    rounded: "{rounded.sm}"
---

# Design System: Keelson

## Overview

**Creative North Star: "The safety plan on the wheelhouse wall."**

Keelson looks like the general-arrangement and fire-and-safety plan a small vessel already carries: a white drafting sheet, ink linework, a title block, revision table and callout balloons. It is built for a skipper on a phone in daylight, so contrast is hard and there are no muddy midtones. Colour is not decoration; it carries the meaning safety signs give it.

**Key Characteristics:**
- Drawing-sheet furniture is the interface: title blocks, schedules, general notes, callout balloons, zone markers.
- One typeface family, Archivo, used across its width axis: expanded for titles, condensed uppercase for sheet labels.
- Tabular numerals everywhere; dates and counts line up.
- A low-glare night palette for the wheelhouse via `prefers-color-scheme: dark`.

## Colors

### Primary
- **Ink** (#111416): text, linework, selected controls and the primary button. The page's authority.

### Neutral
- **Drafting Film** (#f4f5f2): the page ground. **Sheet** (#ffffff): panels, documents and the hero drawing. **Ink 2 / Ink 3** for secondary text; **Rule** for hairlines.

### Named Rules
**The Safety Sign Rule.** Colour appears only with its ISO safety meaning: fire red for overdue, danger and fire equipment; lifesaving green for done, on track and lifesaving equipment; caution yellow for due soon and the deadline highlight; mandatory blue for links and focus. Never use them decoratively.

**The Yellow Needs Ink Rule.** Caution yellow always sits with ink text or an ink outline, never white text.

## Typography

**Font:** Archivo Variable (self-hosted via @fontsource-variable/archivo, width axis 62–125%).

### Hierarchy
- **Display** (760, font-stretch 112%, -0.02em): page headlines.
- **Heading** (760, 104–112%): section and panel titles.
- **Body** (400, 100%, 1.55): 17–18px base for older eyes outdoors.
- **Label** (640, 78% width, uppercase, 0.06em): title-block cell labels and table heads only, never above a heading.

## Layout

Content sits in a 1240px page (920px in the app) with fluid gutters. Landing sections pair a heading with a short intro, then a drawing convention: numbered general notes, a schedule table, a specification list. On phones the app uses a fixed bottom tab bar with 60px targets; desktop puts tabs in the top bar.

## Elevation & Depth

Flat. Depth comes from line weight, not shadow: 2px ink frames for sheets and title blocks, a 3px top rule on panels, 1px rules inside. No drop shadows.

## Shapes

Near-square corners (3–4px). Balloons are the only circles. Tick boxes are drawn squares with a drawn check, never glyphs.

## Components

### Buttons
52px tall, 2px ink border, square corners, label never wraps. Primary is solid ink. Quiet buttons are underlined text.

### Inputs / Fields
50px tall, 1.5px border, blue focus outline. Segmented choices and big tick-box rows replace small radios and checkboxes.

### Navigation
App tabs: drawn icons with labels; the current tab is solid ink.

### Title block
A bordered grid of label/value cells naming vessel, class, revision and deadline. Used on the hero drawing, the Today screen and the manual cover.

### Vessel drawing
Plain SVG geometry: hull profile, waterline, station ticks, wheelhouse, plus ISO-style safety symbols and numbered callouts. Lines plot in once on load and when the vessel type changes; reduced motion shows them drawn.

## Do's and Don'ts

### Do:
- Use drawing conventions (title block, schedule, general notes, revision table) to organize information.
- Keep every control usable one-handed: 44px minimum, 52px for primary actions.
- Label sample data as sample.

### Don't:
- Don't add wave graphics, life rings as decoration, or navy-and-white "nautical" styling.
- Don't use safety colours outside their meaning.
- Don't put small uppercase labels above headings.
- Don't imply Transport Canada endorsement.
