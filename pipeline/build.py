#!/usr/bin/env python3
"""Build a concept site and a pitch email for each prospect.

Usage:
    python3 pipeline/build.py                 # every prospect
    python3 pipeline/build.py some-slug ...   # just these

Reads  pipeline/prospects/<slug>.json
Writes deploy/<slug>/index.html           (the site, ready to host)
       pipeline/out/<slug>.email.json     (to, subject, body for the Gmail draft)

The live URL in the email comes from deploy/live-sites.json, so build after
deploying (or build, deploy, build again). Until a URL exists the email keeps
the placeholder [LINK] and drafting refuses it.

Only facts that were actually found go in a prospect file. Everything the
template writes on its own is generic on purpose: no invented reviews,
prices, years in business or guarantees.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
PROSPECTS = ROOT / "prospects"
OUT = ROOT / "out"
DEPLOY = REPO / "deploy"
LIVE = DEPLOY / "live-sites.json"

SENDER = {"name": "Braxton Abney", "phone": "250-619-6910", "place": "Nanaimo, BC"}
PRICE, MONTHLY = "$800", "$30"
WORDS = {2: "two", 3: "three", 4: "four"}

e = html.escape

# ── palettes: light values, then dark ──────────────────────────────────────
# deep = header/footer/featured card, water = second accent, leaf = ticks,
# sun = buttons (dark text sits on it, so keep it light enough)
PALETTES = {
    "tidewater": (
        dict(paper="#F5F2EA", card="#FFFFFF", sunk="#EBE7DC", ink="#172220", ink_soft="#4F5A56",
             ink_faint="#5C655F", rule="#DCD7C9", deep="#103A4A", deep_2="#175A70", water="#2E8FA8",
             water_soft="#7FB9C7", leaf="#6E9B56", sun="#D39429", sun_lift="#E5A63C", sun_text="#8A5D12"),
        dict(paper="#101917", card="#182321", sunk="#0B1211", ink="#EAEEEB", ink_soft="#A2ADA8",
             ink_faint="#8E9994", rule="#28332F", deep="#0B1E26", deep_2="#123D4C", water="#5FB6CC",
             water_soft="#8ECBD8", leaf="#8FB878", sun="#E5A63C", sun_lift="#F0B44E", sun_text="#E8B65C")),
    "cedar": (
        dict(paper="#F4F1E8", card="#FFFFFF", sunk="#E9E4D6", ink="#1B211A", ink_soft="#4E5849",
             ink_faint="#5E6659", rule="#D9D3C2", deep="#1F3A2B", deep_2="#2C5540", water="#4F8A5B",
             water_soft="#9CC4A0", leaf="#5E8F4E", sun="#D9824A", sun_lift="#E6955E", sun_text="#97501F"),
        dict(paper="#111712", card="#19211A", sunk="#0B100C", ink="#E9EEE8", ink_soft="#A3AE9F",
             ink_faint="#8F9A8B", rule="#27322A", deep="#0E1E15", deep_2="#1D3D2B", water="#7DBB88",
             water_soft="#A3D1AA", leaf="#8EBD7C", sun="#E6955E", sun_lift="#F0A672", sun_text="#EBA575")),
    "slate": (
        dict(paper="#F3F4F0", card="#FFFFFF", sunk="#E6E8E1", ink="#181B1C", ink_soft="#4C5354",
             ink_faint="#5A6162", rule="#D6D9D1", deep="#22292C", deep_2="#344047", water="#5D8A3C",
             water_soft="#A6C78C", leaf="#6C9A46", sun="#C9D64A", sun_lift="#D6E25E", sun_text="#5E6B10"),
        dict(paper="#121516", card="#1A1E20", sunk="#0C0E0F", ink="#ECEEEC", ink_soft="#A6ADAD",
             ink_faint="#929999", rule="#2A3032", deep="#0D1012", deep_2="#283135", water="#9BC77A",
             water_soft="#B9D9A2", leaf="#A4CB84", sun="#D6E25E", sun_lift="#E1EC74", sun_text="#D3DF6A")),
    "harvest": (
        dict(paper="#F6F1E7", card="#FFFFFF", sunk="#ECE4D4", ink="#221C16", ink_soft="#5A5046",
             ink_faint="#685D52", rule="#DDD3C1", deep="#3B2A1E", deep_2="#5A4030", water="#7C8F55",
             water_soft="#BCC79B", leaf="#7C8F55", sun="#E2A43B", sun_lift="#EDB552", sun_text="#8C5E10"),
        dict(paper="#17130F", card="#211B16", sunk="#100D0A", ink="#F0EBE4", ink_soft="#B3A99E",
             ink_faint="#9E948A", rule="#332B24", deep="#1C140E", deep_2="#4A3527", water="#AEC08A",
             water_soft="#C6D3A9", leaf="#AEC08A", sun="#EDB552", sun_lift="#F4C368", sun_text="#EDBE6A")),
    "meadow": (
        dict(paper="#F2F5EE", card="#FFFFFF", sunk="#E3EADB", ink="#14211A", ink_soft="#4A5A50",
             ink_faint="#58675D", rule="#D2DCCA", deep="#15372E", deep_2="#1F5444", water="#2F9A6B",
             water_soft="#8DCBAA", leaf="#3E9A5A", sun="#F2C230", sun_lift="#F7D04E", sun_text="#7A5E00"),
        dict(paper="#0F1612", card="#16201A", sunk="#0A0F0C", ink="#E8EFEA", ink_soft="#A0AEA5",
             ink_faint="#8C9A91", rule="#24302A", deep="#0A1A15", deep_2="#1A4237", water="#5FC495",
             water_soft="#8FD6B3", leaf="#73C28A", sun="#F7D04E", sun_lift="#FADB6E", sun_text="#F2CF5E")),
    "clay": (
        dict(paper="#F4F3F1", card="#FFFFFF", sunk="#E9E7E3", ink="#1E1D1C", ink_soft="#55524E",
             ink_faint="#66625D", rule="#DAD6D0", deep="#2B3236", deep_2="#3E4A50", water="#B4532A",
             water_soft="#E3A98C", leaf="#7A8F5A", sun="#E07B4C", sun_lift="#E98D61", sun_text="#A2471D"),
        dict(paper="#141617", card="#1C1F21", sunk="#0E1011", ink="#ECEAE7", ink_soft="#AEAAA5",
             ink_faint="#9A968F", rule="#2C3033", deep="#0F1214", deep_2="#2E383D", water="#E08A62",
             water_soft="#EDB197", leaf="#A9BC8A", sun="#E98D61", sun_lift="#F09F77", sun_text="#EE9C73")),
    "olive": (
        dict(paper="#F1F2EC", card="#FFFFFF", sunk="#E4E6DC", ink="#1A1D16", ink_soft="#4F5447",
             ink_faint="#5D6355", rule="#D4D7CA", deep="#2F3A22", deep_2="#45532F", water="#6D7F3E",
             water_soft="#B5C28E", leaf="#6D7F3E", sun="#D4B04C", sun_lift="#E0BF60", sun_text="#7A6110"),
        dict(paper="#121410", card="#1A1D17", sunk="#0C0E0A", ink="#ECEEE6", ink_soft="#A9AE9F",
             ink_faint="#959A8B", rule="#2A2E24", deep="#141A0F", deep_2="#35422A", water="#A9BC7A",
             water_soft="#C3D19D", leaf="#A9BC7A", sun="#E0BF60", sun_lift="#EACB74", sun_text="#E3C46A")),
}

# ── looks: type, shape and layout, layered over base.css from styles/<name>.css ──
# Each prospect lists three [look, palette] pairs under "looks": the owner gets
# all three (/, /2/, /3/) and picks one. The intro is the hero photo's reveal.
STYLES = {
    "field": dict(intro="unveil", fonts="family=Outfit:wght@400;500;600;700;800&family=Source+Sans+3:ital,wght@0,300..700;1,400",
                  d="'Outfit'", b="'Source Sans 3'", feature=True),
    "heritage": dict(intro="unveil", fonts="family=Zilla+Slab:wght@500;600;700&family=Libre+Franklin:wght@400;500;600;700",
                     d="'Zilla Slab',Georgia", b="'Libre Franklin'", feature=False),
    "build": dict(intro="wipe", fonts="family=Archivo:wdth,wght@62..125,400..900",
                  d="'Archivo'", b="'Archivo'", feature=True),
    "garden": dict(intro="arch", fonts="family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Figtree:wght@400;500;600;700",
                   d="'Bricolage Grotesque'", b="'Figtree'", feature=False),
    "clear": dict(intro="settle", fonts="family=Manrope:wght@400..800", d="'Manrope'", b="'Manrope'", feature=True),
}


def palette_css(name):
    light, dark = PALETTES[name]

    def block(p):
        return "".join(f"--{k.replace('_', '-')}:{v};" for k, v in p.items())
    on = "--on-deep:#EEF2EF;--on-deep-soft:#C3CEC8;"
    return (f":root{{{block(light)}{on}--shade:20 30 26;}}\n"
            f"@media (prefers-color-scheme:dark){{:root:not([data-theme=\"light\"]){{{block(dark)}{on}--shade:0 0 0;}}}}\n"
            f":root[data-theme=\"dark\"]{{{block(dark)}{on}--shade:0 0 0;}}")


# ── icons ──────────────────────────────────────────────────────────────────
_S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
ICONS = {
    "build": '<path d="M3 20h18"/><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
    "water": '<path d="M12 2.6c3.6 4.2 6.2 7.2 6.2 10.3a6.2 6.2 0 0 1-12.4 0c0-3.1 2.6-6.1 6.2-10.3Z"/><path d="M9.4 13.4a2.6 2.6 0 0 0 2.6 2.6"/>',
    "leaf": '<path d="M20 4c0 9-5.4 13.6-11 13.6A5 5 0 0 1 4 12.6C4 7 8.6 4 20 4Z"/><path d="M4.5 20C7 15 11 11.6 16 9.5"/>',
    "lawn": '<path d="M3 20h18"/><path d="M5 20c0-4 1-7 2-9M9 20c0-5 1-9 3-12M13 20c0-4 1.5-7 3-9M17 20c.5-3 1.5-5 3-6"/>',
    "tree": '<path d="M12 22v-6"/><path d="M12 16c-4 0-6.5-2.5-6.5-5.6 0-2.4 1.6-4 3.4-4.6C9.4 3.6 10.6 2 12 2s2.6 1.6 3.1 3.8c1.8.6 3.4 2.2 3.4 4.6 0 3.1-2.5 5.6-6.5 5.6Z"/>',
    "stone": '<path d="M3 19h18"/><rect x="4" y="13" width="7" height="6" rx="1"/><rect x="13" y="13" width="7" height="6" rx="1"/><rect x="8" y="7" width="8" height="6" rx="1"/>',
    "snow": '<path d="M12 2v20M4.9 6l14.2 12M19.1 6 4.9 18"/><path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2"/>',
    "fence": '<path d="M5 21V7l2-3 2 3v14M15 21V7l2-3 2 3v14"/><path d="M3 10h18M3 16h18"/>',
    "clean": '<path d="M14 3 5 12"/><path d="M5 12c-1.5 1.5-2 4.5-2 8 3.5 0 6.5-.5 8-2l2-2-6-6Z"/><path d="M15 21h6M17 17h4"/>',
}
TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>'
STAR = '<svg viewBox="0 0 24 24"><path d="m12 2.6 2.9 5.9 6.5 1-4.7 4.5 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5-4.7-4.5 6.5-1Z"/></svg>'
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'
MARK = ('<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        '<path d="M16 29V15"/><path d="M16 19c-4.3 0-7.5-2.8-7.5-6.9 0-3.2 2.6-6 7.5-9.1 4.9 3.1 7.5 5.9 7.5 9.1 0 4.1-3.2 6.9-7.5 6.9Z"/>'
        '<path d="M7 26c1.8-1.6 3.6-1.6 5.4 0M19.6 26c1.8-1.6 3.6-1.6 5.4 0"/></svg>')


def icon(k):
    return _S + ICONS.get(k, ICONS["leaf"]) + "</svg>"


def tel(phone):
    d = re.sub(r"\D", "", phone)
    return "+1" + d[-10:] if len(d) >= 10 else d


def nbsp_phone(phone):
    return e(phone).replace("-", "‑")


def rating_line(p):
    if p.get("rating") and p.get("reviews"):
        src = p.get("review_source", "Google")
        return f"{p['rating']} stars from {p['reviews']} {src} reviews"
    return None


def looks(p):
    return p.get("looks") or [[p.get("style", "field"), p.get("palette", "tidewater")]]


def option_path(i):
    return "/" if i == 0 else f"/{i + 1}/"


def render(p, look=0):
    style_name, palette = looks(p)[look]
    style = STYLES[style_name]
    n_looks = len(looks(p))
    name, short, sub = p["name"], p.get("short", p["name"]), p.get("sub", "Landscaping")
    phone, ph = p["phone"], tel(p["phone"])
    areas = p.get("areas") or [p["city"]]
    rl = rating_line(p)
    lanes = p["services"][:3]
    nav = "".join(f'<a href="#s{i}">{e(l["label"])}</a>' for i, l in enumerate(lanes))
    nav += '<a href="#work">Our work</a><a href="#area">Service area</a><a href="#faq">FAQ</a>'

    trust = [rl] if rl else []
    # skip trust items that restate the rating in other words ("4.8 stars on Google")
    trust += [t for t in p.get("trust", []) if not (rl and t.startswith(f'{p["rating"]} stars'))][: 3 - len(trust)]
    trust_html = "".join(f"<span>{TICK}{e(t)}</span>" for t in trust)

    lane_html = ""
    for i, l in enumerate(lanes):
        feat = l.get("featured") and style["feature"]
        items = "".join(f"<li>{e(x)}</li>" for x in l["items"])
        lane_html += f'''
      <div class="lane{' lane--water' if feat else ''}" id="s{i}">
        <span class="lane__ico">{icon(l.get("icon", "leaf"))}</span>
        <span class="label">{e(l["label"])}</span>
        <h3>{e(l["title"])}</h3>
        <p>{e(l["text"])}</p>
        <ul>{items}</ul>
        <a class="btn{'' if feat else ' btn--deep'}" href="#quote">{e(l.get("cta", "Ask about this"))}</a>
      </div>'''

    stats = p.get("stats") or []
    if not stats:
        stats = [[p["city"], "Locally owned"]]
        if p.get("rating"):
            stats.append([f'{p["rating"]}★', f'From {p["reviews"]} reviews'])
        stats.append([str(len(areas)), "Communities served" if len(areas) > 1 else "Home base"])
        stats.append(["Call", "or text for a quote"])
    stats_html = "".join(f'<div class="stat"><b>{e(a)}</b><span>{e(b)}</span></div>' for a, b in stats[:4])

    steps = p.get("steps") or [
        ["Call, text or send the form", "Tell us what you're after. Photos of the space help us give you a straight answer faster."],
        ["We come and look", "We walk the property with you, talk through options and give you a clear quote."],
        ["We do the work, and clean up", "Booked in, done properly, and the site left tidier than we found it."],
    ]
    steps_html = "".join(f'<div><span class="num">{i+1}</span><b>{e(a)}</b><p>{e(b)}</p></div>' for i, (a, b) in enumerate(steps))

    shots = p.get("gallery") or [["Hero project", "finished job · wide"], ["Before / after", "same angle, both stages"],
                                 [lanes[0]["label"], "detail shot"], [lanes[1]["label"] if len(lanes) > 1 else "On the job", "crew at work"],
                                 ["Close-up", "texture · planting · stone"], ["The team", "faces sell a local business"]]
    gal = "".join(f'<figure class="shot"><b>{e(a)}</b><span>{e(b)}</span></figure>' for a, b in shots[:6])

    rev_head = f'{p["rating"]} stars from {p["reviews"]} reviews' if rl else "What customers say"
    rev = "".join(f'''
      <div class="rev"><span class="tagx">Placeholder</span><span class="stars" aria-label="5 out of 5">{STAR*5}</span>
        <p>{e(t)}</p><footer><span class="av"></span><span><cite>Customer name</cite><small>{e(p.get("review_source", "Google"))} review</small></span></footer></div>'''
                  for t in ["A real review goes here, word for word. The strongest ones name the job and how it went.",
                            "Aim for a spread across the services, and one that names the owner.",
                            "Nothing here is ever put in a customer's mouth. These get swapped for the real thing."])

    chips = "".join(f'<span class="chip">{e(a)}</span>' for a in areas)
    faqs = p.get("faq") or [
        ["What areas do you cover?", f"{', '.join(areas[:-1]) + ' and ' + areas[-1] if len(areas) > 1 else areas[0]}. Further out, ask and we'll give you a straight answer."],
        ["How do I get a quote?", f"Call or text {phone}, or send the form below with a few details and photos if you have them."],
        ["What do you need from me?", "The address, roughly what you're after, and when you'd like it done. Photos of the space help a lot."],
    ]
    faq_html = "".join(f'<details{" open" if i == 0 else ""}><summary>{e(q)}</summary><div class="ans">{e(a)}</div></details>'
                       for i, (q, a) in enumerate(faqs))
    options = "".join(f"<option>{e(x)}</option>" for l in lanes for x in l["items"][:2]) + "<option>Not sure yet, need advice</option>"

    info = f'<li><span class="ii">☎</span><span><b>Call or text</b><a href="tel:{ph}">{nbsp_phone(phone)}</a></span></li>'
    if p.get("address"):
        info += f'<li><span class="ii">⌂</span><span><b>Based at</b><span class="v">{e(p["address"])}</span></span></li>'
    if p.get("email"):
        info += f'<li><span class="ii">✉</span><span><b>Email</b><a href="mailto:{e(p["email"])}">{e(p["email"])}</a></span></li>'

    schema = {"@context": "https://schema.org", "@type": "LandscapingBusiness", "name": name, "telephone": phone,
              "address": {"@type": "PostalAddress", "addressLocality": p["city"], "addressRegion": p.get("region", ""), "addressCountry": p.get("country", "CA")},
              "areaServed": [{"@type": "Place", "name": a} for a in areas]}
    if rl:
        schema["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": str(p["rating"]), "reviewCount": str(p["reviews"])}

    switch = ""
    if n_looks > 1:
        switch = '<nav class="opts" aria-label="Layouts"><span>Layout</span>' + "".join(
            f'<a href="{option_path(i)}"{" aria-current=page" if i == look else ""}>{i + 1}</a>' for i in range(n_looks)) + "</nav>"
    css = (ROOT / "base.css").read_text() + "\n" + (ROOT / "styles" / f"{style_name}.css").read_text() + "\n" + (ROOT / "motion.css").read_text()
    return f'''<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(name)}</title>
<meta name="description" content="{e(p["lede"])}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{style["fonts"]}&display=swap">
<script type="application/ld+json">{json.dumps(schema)}</script>
<style>
{palette_css(palette)}
:root{{--intro:{style["intro"]};--f-d:{style["d"]},system-ui,sans-serif;--f-b:{style["b"]},system-ui,-apple-system,sans-serif;
  --page:1160px;--gut:clamp(18px,4vw,38px);--sec:clamp(56px,7vw,100px);--r:16px;--r-lg:26px;--r-sm:12px;--ease:cubic-bezier(.2,.7,.25,1)}}
{css}
.steps{{display:grid;gap:16px;counter-reset:s}}
@media(min-width:760px){{.steps{{grid-template-columns:repeat(3,1fr)}}}}
.steps div{{background:var(--card);border:1px solid var(--rule);border-radius:var(--r-lg);padding:26px 24px}}
.steps .num{{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;margin-bottom:14px;
  background:var(--deep-2);color:var(--on-deep);font-family:var(--f-d);font-weight:800}}
.steps b{{display:block;font-family:var(--f-d);font-weight:700;font-size:1.08rem;margin-bottom:7px}}
.steps p{{font-size:.93rem;color:var(--ink-soft);line-height:1.55}}
.info .ii{{width:22px;flex:none;color:var(--water);font-size:1.05rem;line-height:1.6;text-align:center}}
</style>

<div class="progress" aria-hidden="true"></div>
<div class="proposal"><span>Sample design for <b>{e(name)}</b>. Your own photos go in the empty spaces.</span>{switch}</div>

<header class="bar"><div class="wrap">
  <nav class="nav">
    <a class="mark" href="#top">{MARK}<span class="n">{e(short)}<small>{e(sub)}</small></span></a>
    <div class="links">{nav}</div>
    <div class="navend"><a class="btn btn--sm btn--out" href="tel:{ph}">{nbsp_phone(phone)}</a><a class="btn btn--sm" href="#quote">Get a quote</a></div>
    <button class="burger" type="button" id="burger" aria-expanded="false" aria-controls="dr" aria-label="Open menu">
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </nav>
  <div class="drawer" id="dr" hidden>{nav}<a class="btn btn--wide" style="margin-top:14px" href="tel:{ph}">Call {nbsp_phone(phone)}</a></div>
</div></header>

<main id="top">
<section class="hero"><div class="wrap">
  <div class="hero__top">
    <div>
      <span class="label">{e(" · ".join(areas[:3]))}</span>
      <h1>{e(p["h1"])}</h1>
      <p class="lede">{e(p["lede"])}</p>
      <div class="hero__cta"><a class="btn" href="#quote">Get a quote {ARROW}</a><a class="btn btn--out" href="tel:{ph}">{nbsp_phone(phone)}</a></div>
      <div class="trustline">{trust_html}</div>
    </div>
    <figure class="shot shot--hero"><b>Your photo here</b><span>your best finished job</span></figure>
  </div>
</div></section>

<section class="lanes-sec"><div class="wrap">
  <div class="lanes{' stack' if style["feature"] or style_name == "garden" else ''}">{lane_html}
  </div>
</div></section>

<div class="wrap"><div class="strip">{stats_html}</div></div>

<section class="sec"><div class="wrap">
  <div class="head head--mid"><span class="label">How it works</span><h2>From first call to finished job</h2>
    <p class="lede">No runaround. Here's what happens when you get in touch.</p></div>
  <div class="steps">{steps_html}</div>
</div></section>

<section class="sec" id="work" style="background:var(--sunk)"><div class="wrap">
  <div class="head head--mid"><span class="label">Recent work</span><h2>{e(p.get("work_h2", "Jobs we're proud of"))}</h2>
    <p class="lede">Photo slots, each captioned for the shot that sells the job. Real project photos get swapped in.</p></div>
  <div class="gal">{gal}</div>
</div></section>

<section class="sec"><div class="wrap">
  <div class="head head--mid"><span class="label">What customers say</span><h2>{e(rev_head)}</h2>
    <p class="lede">Left as placeholders on purpose. The right fix is a live reviews feed so this updates itself.</p></div>
  <div class="revs">{rev}
  </div>
</div></section>

<section class="sec" id="area"><div class="wrap"><div class="area">
  <div><span class="label">Where we work</span><h2 style="margin:13px 0 15px">{e(p.get("area_h2", ", ".join(areas[:3])))}</h2>
    <p class="lede">We keep the route tight so crews turn up when we said we would. Further out, ask.</p>
    <div class="chips">{chips}</div></div>
  <div class="mapslot"><b>Google Maps embed</b><span>service area</span></div>
</div></div></section>

<section class="sec" id="faq"><div class="wrap">
  <div class="head head--mid"><span class="label">Before you call</span><h2>Straight answers</h2></div>
  <div class="faq" style="margin-inline:auto">{faq_html}</div>
</div></section>

<section class="sec" id="quote" style="background:var(--sunk)"><div class="wrap"><div class="quote">
  <div><span class="label">Get a quote</span><h2 style="margin:13px 0 15px">Tell us about the property</h2>
    <p class="lede">Send a few details and we'll get back to you.</p>
    <ul class="info">{info}</ul></div>
  <form class="form" id="qf" novalidate>
    <div class="row"><div class="f"><label for="n">Name</label><input id="n" name="name" type="text" autocomplete="name" required></div>
      <div class="f"><label for="p">Phone</label><input id="p" name="phone" type="tel" autocomplete="tel" required></div></div>
    <div class="f"><label for="a">Property address</label><input id="a" name="address" type="text" autocomplete="street-address"></div>
    <div class="f"><label for="s">What do you need?</label><select id="s" name="service">{options}</select></div>
    <div class="f"><label for="m">Tell us a bit more</label><textarea id="m" name="message" placeholder="What you're after, and when you'd like it done…"></textarea>
      <span class="fine">Photos help. Text them to {nbsp_phone(phone)}.</span></div>
    <button class="btn btn--wide" type="submit">Request my quote</button>
    <p class="okmsg" id="ok" hidden role="status"></p>
  </form>
</div></div></section>
</main>

<footer class="site"><div class="wrap">
  <div class="fgrid">
    <div><a class="mark" href="#top" style="color:var(--on-deep)">{MARK}<span class="n">{e(short)}<small>{e(sub)}</small></span></a>
      <p style="margin-top:14px;font-size:.92rem;max-width:38ch;color:color-mix(in srgb,var(--on-deep) 76%,transparent)">{e(p.get("footer", p["lede"]))}</p></div>
    <div><h4>Services</h4><ul>{"".join(f'<li><a href="#s{i}">{e(l["label"])}</a></li>' for i, l in enumerate(lanes))}</ul></div>
    <div><h4>Get in touch</h4><ul><li><a href="tel:{ph}">{nbsp_phone(phone)}</a></li><li><a href="#area">{e(" · ".join(areas[:3]))}</a></li><li><a href="#quote">Request a quote</a></li></ul></div>
  </div>
  <div class="fbot"><span>© <span id="yr">2026</span> {e(name)}</span><span>Sample design, not the live site</span></div>
</div></footer>

<div class="callbar"><a class="btn btn--out" href="#quote">Get a quote</a><a class="btn" href="tel:{ph}">Call now</a></div>

<script>
(function(){{
  if(/\\.netlify\\.app$/.test(location.hostname))document.documentElement.classList.add('on-netlify');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce&&'IntersectionObserver' in window){{
    document.documentElement.classList.add('mo');
    var io=new IntersectionObserver(function(es){{es.forEach(function(en){{if(!en.isIntersecting)return;
      var t=en.target;io.unobserve(t);
      // gallery tiles start fully clipped, which reads as never visible, so the grid reveals them
      (t.matches('.gal')?Array.prototype.slice.call(t.children):[t]).forEach(function(x){{x.classList.add('in');}});
      if(t.matches('.stat'))count(t.querySelector('b'));}});}},
      {{rootMargin:'0px 0px -8% 0px',threshold:.12}});
    document.querySelectorAll('.lanes-sec .lane,.head,.strip .stat,.steps>div,.gal figure,.rev,.area,.faq,.quote>*').forEach(function(el){{
      el.classList.add('rv');el.style.setProperty('--i',Array.prototype.indexOf.call(el.parentNode.children,el)%4);
      if(!el.matches('.gal figure'))io.observe(el);}});
    document.querySelectorAll('.gal').forEach(function(g){{io.observe(g);}});
  }}
  // ratings and review counts tick up; years and words are left alone
  function count(b){{var m=/^(\\d+(?:\\.\\d+)?)(.*)$/.exec(b.textContent);if(!m)return;var to=parseFloat(m[1]);if(to>=1900||to<2)return;
    var dp=(m[1].split('.')[1]||'').length,t0=null;
    function step(t){{t0=t0||t;var k=Math.min(1,(t-t0)/1200);k=1-Math.pow(1-k,3);b.textContent=(to*k).toFixed(dp)+m[2];if(k<1)requestAnimationFrame(step);}}
    requestAnimationFrame(step);}}
  var b=document.getElementById('burger'),dr=document.getElementById('dr');
  b.addEventListener('click',function(){{var o=dr.hidden;dr.hidden=!o;b.setAttribute('aria-expanded',String(o));b.setAttribute('aria-label',o?'Close menu':'Open menu');}});
  dr.addEventListener('click',function(ev){{if(ev.target.closest('a')){{dr.hidden=true;b.setAttribute('aria-expanded','false');}}}});
  var f=document.getElementById('qf');
  f.addEventListener('submit',function(ev){{if(f.getAttribute('action'))return;ev.preventDefault();if(!f.reportValidity())return;
    var ok=document.getElementById('ok'),btn=f.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Sending…';
    setTimeout(function(){{ok.hidden=false;ok.textContent='Thanks, we’ve got it. We’ll be in touch shortly.';f.reset();btn.disabled=false;btn.textContent='Request my quote';}},600);}});
  document.getElementById('yr').textContent=new Date().getFullYear();
}})();
</script>
'''


def email(p, url):
    hi = f"Hi {p['contact']}," if p.get("contact") else "Hi there,"
    found = p.get("found_via", "came across your business online")
    n = len(looks(p))
    link = lambda i: (url if i == 0 else url.rstrip("/") + option_path(i)) if url else "[LINK]"
    links = "\n".join(f"Layout {i + 1}: {link(i)}" for i in range(n))
    body = f"""{hi}

My name is {SENDER['name']}. I build websites for trades and service businesses, and I {found}. {p['compliment']} {p['gap']}

So I put together a sample website for you. {p['pitch_line']} It's built for a phone first, because that's where most people will find you.

I made it in {WORDS.get(n, n)} different layouts so you can pick the one you like best:

{links}

They're samples, so some things are left out on purpose. I didn't copy your photos or reviews, because I didn't want to use your work without asking. The name, services and contact details are what's already public. The empty photo spaces are where your own pictures go. Once you've picked a layout and sent me some photos, I'll adjust the colours and design around them until you like it, so the finished site can look quite different from these.

No catch and nothing to sign up for. If you want one, it's {PRICE}, one time, and I'll have it live within a week. Hosting, domain and changes after that are {MONTHLY} a month if you want me to handle them. If it's not for you, just ignore this and I won't chase you.

If you'd rather not hear from me again, reply "no thanks" and I'll take you off my list.

{SENDER['name']}
{SENDER['phone']} · {SENDER['place']}"""
    return {"to": p["email"], "subject": f"I built {p['name']} a website", "body": body, "url": url}


def main():
    slugs = sys.argv[1:] or sorted(f.stem for f in PROSPECTS.glob("*.json"))
    live = json.loads(LIVE.read_text()) if LIVE.exists() else {}
    OUT.mkdir(exist_ok=True)
    for slug in slugs:
        p = json.loads((PROSPECTS / f"{slug}.json").read_text())
        p.setdefault("slug", slug)
        d = DEPLOY / slug
        d.mkdir(parents=True, exist_ok=True)
        for i in range(len(looks(p))):
            o = d / option_path(i).strip("/")
            o.mkdir(parents=True, exist_ok=True)
            (o / "index.html").write_text(render(p, i), encoding="utf-8")
        url = (live.get(slug) or {}).get("url")
        if p.get("email"):
            (OUT / f"{slug}.email.json").write_text(json.dumps(email(p, url), indent=2, ensure_ascii=False) + "\n")
        print(f"{slug}: site built, email {'ready' if url else 'waiting on a live URL'}")


if __name__ == "__main__":
    main()
