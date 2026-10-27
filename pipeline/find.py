#!/usr/bin/env python3
"""Find landscaping prospects: busy businesses with a weak website and an email.

Usage:
    python3 pipeline/find.py kelowna kamloops victoria ...
    python3 pipeline/find.py --min-reviews 15 calgary

Source: thehomework.ca city pages, which carry each business's Google rating,
review count and website as structured data. Every website is then fetched and
audited. A lead qualifies when it has enough reviews to show steady work, an
email address on its own site, and at least one real weakness a new site fixes
(no site, a dead site, not mobile friendly, no https, years out of date, next
to no content). A builder template or an untappable phone number alone only
makes it a "maybe"; "no email" means the weakness is there but the address has
to be found elsewhere.

Writes pipeline/leads.csv (appends; one row per business, de-duplicated by
website domain) and saves each site's visible text to pipeline/cache/<domain>.txt
so the prospect file can be written from what the business says about itself.
"""
import concurrent.futures as cf
import csv
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LEADS = ROOT / "leads.csv"
CACHE = ROOT / "cache"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
FIELDS = ["city", "name", "rating", "reviews", "phone", "address", "website", "email", "weaknesses", "score", "status"]
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
JUNK_EMAIL = ("example.", "sentry", "wixpress", "domain.com", "email.com", "yourname", "@2x", ".png", ".jpg",
              ".webp", "godaddy", "squarespace", "wordpress", "schema.org", "jquery")
# Retailers and suppliers rather than crews that go out and do jobs.
NOT_A_CREW = re.compile(r"suppl|soil|gravel|nursery|garden cent|tree farm|turf dealer|synthetic|artificial|"
                        r"weed man|nutri-lawn|siteone|rona|home depot|stone (?:centre|center)|aggregates", re.I)
BUILDERS = {"wix.com": "Wix", "squarespace": "Squarespace", "godaddy": "GoDaddy builder",
            "weebly": "Weebly", "jimdo": "Jimdo", "site123": "Site123", "webnode": "Webnode"}


def get(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-CA,en"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.geturl(), r.read(1_500_000).decode("utf-8", "replace")


def city_listings(slug):
    _, page = get(f"https://thehomework.ca/landscaping/{slug}/")
    for card in re.findall(r'<article class="contractor-card".*?</article>', page, re.S):
        name = re.search(r'itemprop="name">(.*?)<', card)
        if not name:
            continue
        rating = re.search(r'rating-num">([\d.]+)', card)
        reviews = re.search(r'\((\d+) reviews?\)', card)
        phone = re.search(r'href="tel:([^"]+)"', card)
        site = re.search(r'href="([^"]+)"[^>]*itemprop="url"', card)
        addr = re.search(r'itemprop="address">(.*?)<', card)
        yield {"city": slug, "name": html.unescape(name.group(1)),
               "phone": phone.group(1) if phone else "",
               "address": html.unescape(addr.group(1)) if addr else "",
               "website": html.unescape(site.group(1)) if site else "",
               "rating": float(rating.group(1)) if rating else 0.0,
               "reviews": int(reviews.group(1)) if reviews else 0}


def text_of(page):
    page = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", page)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", page))).strip()


def emails_in(page):
    found = set(re.findall(r'mailto:([^"\'?>\s]+)', page)) | set(EMAIL.findall(text_of(page)))
    out = []
    for m in found:
        m = urllib.parse.unquote(m).strip(".").lower()
        if EMAIL.fullmatch(m) and not any(j in m for j in JUNK_EMAIL) and m not in out:
            out.append(m)
    return out


def audit(lead):
    """Return (emails, weaknesses, text) for a lead's website."""
    url = lead["website"]
    if not url:
        return [], ["no website"], ""
    try:
        final, page = get(url)
    except urllib.error.HTTPError as ex:
        if ex.code in (404, 410, 500, 502, 503):
            return [], [f"site down (HTTP {ex.code})"], ""
        return [], [f"unverified (HTTP {ex.code})"], ""
    except Exception as ex:
        # Resets and timeouts are often the host blocking this network, not a
        # dead site. Check these from a browser before saying anything.
        return [], [f"unverified ({type(ex).__name__})"], ""
    weak, low = [], page.lower()
    if final.startswith("http://"):
        weak.append("no https")
    if 'name="viewport"' not in low and "name='viewport'" not in low:
        weak.append("not mobile friendly")
    for k, v in BUILDERS.items():
        if k in low:
            weak.append(f"{v} template")
            break
    years = [int(y) for y in re.findall(r"(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)", low)]
    if years and max(years) <= date.today().year - 5:
        weak.append(f"copyright {max(years)}")
    txt = text_of(page)
    if len(txt) < 600:
        weak.append("almost no content")
    if "tel:" not in low:
        weak.append("phone not tappable")
    if "facebook.com" in final or "instagram.com" in final:
        weak.append("social page only")
    emails = emails_in(page)
    if not emails:
        base = f"{urllib.parse.urlsplit(final).scheme}://{urllib.parse.urlsplit(final).netloc}"
        for path in ("/contact", "/contact-us", "/contact-us/", "/contact/", "/about"):
            try:
                emails = emails_in(get(base + path, 12)[1])
            except Exception:
                continue
            if emails:
                break
    return emails, weak, txt


def domain(url):
    return urllib.parse.urlsplit(url).netloc.lower().removeprefix("www.") if url else ""


def main():
    args = sys.argv[1:]
    min_reviews = 10
    if args[:1] == ["--min-reviews"]:
        min_reviews, args = int(args[1]), args[2:]
    CACHE.mkdir(exist_ok=True)
    rows = list(csv.DictReader(LEADS.open())) if LEADS.exists() else []
    seen = {domain(r["website"]) or r["name"].lower() for r in rows}

    pool = []
    for slug in args:
        try:
            listings = list(city_listings(slug))
        except Exception as ex:
            print(f"{slug}: couldn't read ({ex})")
            continue
        busy = [b for b in listings if b["reviews"] >= min_reviews and b["rating"] >= 4.3
                and not NOT_A_CREW.search(b["name"])]
        print(f"{slug}: {len(listings)} listed, {len(busy)} with {min_reviews}+ reviews")
        pool += [b for b in busy if (domain(b["website"]) or b["name"].lower()) not in seen]

    with cf.ThreadPoolExecutor(8) as ex:
        results = list(ex.map(audit, pool))
    new = 0
    for b, (emails, weak, txt) in zip(pool, results):
        key = domain(b["website"]) or b["name"].lower()
        if key in seen:
            continue
        seen.add(key)
        if txt:
            (CACHE / f"{key.replace('/', '_')}.txt").write_text(txt[:20000])
        strong = [w for w in weak if not w.endswith("template") and w != "phone not tappable"
                  and not w.startswith("unverified")]
        score = len(strong) * 2 + len(weak) - len(strong)
        if not strong:
            status = ("unverified" if any(w.startswith("unverified") for w in weak)
                      else "maybe" if emails and weak else "site is fine")
        else:
            status = "lead" if emails else "no email"
        rows.append({**b, "email": " ".join(emails[:2]), "weaknesses": "; ".join(weak), "score": score, "status": status})
        new += status == "lead"
    # Another run may have written the file meanwhile; keep its rows too.
    if LEADS.exists():
        have = {domain(r["website"]) or r["name"].lower() for r in rows}
        rows += [r for r in csv.DictReader(LEADS.open())
                 if (domain(r["website"]) or r["name"].lower()) not in have]
    order = {"lead": 0, "no email": 1, "maybe": 2, "unverified": 3}
    rows.sort(key=lambda r: (order.get(r["status"], 3), -int(r["score"]), -int(r["reviews"])))
    with LEADS.open("w", newline="") as f:
        w = csv.DictWriter(f, FIELDS)
        w.writeheader()
        w.writerows({k: r.get(k, "") for k in FIELDS} for r in rows)
    print(f"{new} new qualified leads; {sum(r['status'] == 'lead' for r in rows)} total in {LEADS.relative_to(ROOT.parent)}")


if __name__ == "__main__":
    main()
