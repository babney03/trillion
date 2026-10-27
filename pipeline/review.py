#!/usr/bin/env python3
"""Merge leads.csv with the browser checks into one ranked shortlist.

Usage: python3 pipeline/review.py [--all]

Prints each candidate with the weaknesses the browser confirmed, the best
email found, and where its screenshot is. Without --all, only rows that have
both an email and a confirmed weakness are shown.
"""
import csv
import json
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FREE_MAIL = ("gmail.com", "hotmail.com", "outlook.com", "yahoo.", "shaw.ca", "telus.net", "sasktel.net")


def domain(url):
    return urllib.parse.urlsplit(url).netloc.lower().removeprefix("www.") if url else ""


def confirmed(lead, chk):
    """Weaknesses a customer would actually run into, per the browser."""
    if not lead["website"]:
        return ["no website"]
    if not chk:
        return [w for w in lead["weaknesses"].split("; ") if w.startswith("site down")]
    if chk.get("error") or (chk.get("status") or 0) >= 400:
        return ["site down" if chk.get("status") in (404, 410, 500, 502, 503) or "ERR_NAME" in chk.get("error", "")
                else "unverified"]
    if chk.get("status") in (202, 403, 429) and chk.get("text_len", 0) < 400:
        return ["unverified"]
    w = []
    if not chk.get("viewport") or chk.get("overflow_px", 0) > 20:
        w.append("doesn't fit a phone screen")
    elif chk.get("small_text"):
        w.append("text too small on a phone")
    if chk.get("final", "").startswith("http://"):
        w.append("no https (browsers mark it 'Not secure')")
    if chk.get("text_len", 0) < 500:
        w.append("almost nothing on the page")
    if not chk.get("tel"):
        w.append("phone number isn't tap-to-call")
    if chk.get("load_ms", 0) > 9000:
        w.append(f"slow ({chk['load_ms'] // 1000}s to load)")
    stale = [x for x in lead["weaknesses"].split("; ") if x.startswith("copyright")]
    return w + stale


def best_email(lead, chk, name):
    cands = (chk or {}).get("emails") or lead["email"].split()
    if not cands:
        return ""
    site = domain(lead["website"])
    for e in cands:                       # an address on their own domain first
        if site and e.split("@")[1].endswith(site.split(".", 1)[-1] if site.count(".") > 1 else site):
            return e
    for e in cands:                       # then a free-mail address
        if e.split("@")[1].startswith(FREE_MAIL) or e.split("@")[1] in FREE_MAIL:
            return e
    return cands[0]


def main():
    leads = list(csv.DictReader((ROOT / "leads.csv").open()))
    checks = json.loads((ROOT / "checks.json").read_text()) if (ROOT / "checks.json").exists() else {}
    rows = []
    for l in leads:
        chk = checks.get(domain(l["website"]))
        weak = confirmed(l, chk)
        email = best_email(l, chk, l["name"])
        strong = [w for w in weak if w not in ("unverified", "phone number isn't tap-to-call")]
        rows.append((bool(email and strong), len(strong), int(l["reviews"]), l, weak, email))
    rows.sort(key=lambda r: (not r[0], -r[1], -r[2]))
    for ok, _, _, l, weak, email in rows:
        if not ok and "--all" not in sys.argv:
            continue
        print(f"{l['city'][:12]:12} {l['reviews']:>4} {l['rating']}  {l['name'][:40]:40} {email:36} {'; '.join(weak)}")


if __name__ == "__main__":
    main()
