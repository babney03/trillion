#!/usr/bin/env python3
"""Keep pipeline/tracker.csv in step with the prospect files and live URLs.

Usage: python3 pipeline/tracker.py                    # add new prospects, fill URLs
       python3 pipeline/tracker.py set <slug> <status> [note]

Status runs: built → live → drafted → sent → replied / no thanks / won.
A "no thanks" is final: build and drafting skip it from then on.
"""
import csv
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TRACKER = ROOT / "tracker.csv"
LIVE = ROOT.parent / "deploy" / "live-sites.json"
FIELDS = ["slug", "name", "city", "email", "url", "status", "updated", "note"]


def load():
    return {r["slug"]: r for r in csv.DictReader(TRACKER.open())} if TRACKER.exists() else {}


def save(rows):
    with TRACKER.open("w", newline="") as f:
        w = csv.DictWriter(f, FIELDS)
        w.writeheader()
        w.writerows(rows.values())


def main():
    rows = load()
    if sys.argv[1:2] == ["set"]:
        slug, status = sys.argv[2], sys.argv[3]
        rows[slug].update(status=status, updated=str(date.today()), note=" ".join(sys.argv[4:]) or rows[slug]["note"])
        save(rows)
        return
    live = json.loads(LIVE.read_text()) if LIVE.exists() else {}
    for f in sorted((ROOT / "prospects").glob("*.json")):
        p = json.loads(f.read_text())
        r = rows.setdefault(f.stem, {"slug": f.stem, "name": p["name"], "city": p["city"], "email": p.get("email", ""),
                                     "url": "", "status": "built", "updated": str(date.today()), "note": ""})
        url = (live.get(f.stem) or {}).get("url", "")
        if url and not r["url"]:
            r.update(url=url, status="live" if r["status"] == "built" else r["status"], updated=str(date.today()))
    save(rows)
    counts = {}
    for r in rows.values():
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print(", ".join(f"{v} {k}" for k, v in counts.items()))


if __name__ == "__main__":
    main()
