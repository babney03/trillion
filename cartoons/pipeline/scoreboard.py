#!/usr/bin/env python3
"""Find the hits: rank published Shorts by views per hour and flag winners to make more of.

    python3 pipeline/scoreboard.py pipeline/ledger.json            # needs YT_API_KEY (read-only key)
    python3 pipeline/scoreboard.py pipeline/ledger.json --offline  # re-rank from the views already saved

ledger.json is a list of {"episode", "video_id", "lane", "lesson", "published", "views"} rows; the
pipeline appends one row per upload. (A Claude session can also refresh views with the TubeAlfred
YouTube tools instead of an API key.)

Rules (the volume model):
- WINNER: top 15% by views/hour after 48h AND at least 2x the channel median  -> make 3-5 variations
- KEEP:   above the median                                                     -> keep the lane going
- WEAK:   below half the median after 20 uploads in that lane                  -> rethink or drop the lane
"""
import json
import os
import statistics
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone


def fetch_views(ids, key):
    out = {}
    for i in range(0, len(ids), 50):
        q = urllib.parse.urlencode({"part": "statistics", "id": ",".join(ids[i:i + 50]), "key": key})
        with urllib.request.urlopen(f"https://www.googleapis.com/youtube/v3/videos?{q}") as r:
            for it in json.loads(r.read()).get("items", []):
                out[it["id"]] = int(it["statistics"].get("viewCount", 0))
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "pipeline/ledger.json"
    rows = json.load(open(path))
    if not rows:
        print("ledger is empty: nothing published yet")
        return
    if "--offline" not in sys.argv:
        views = fetch_views([r["video_id"] for r in rows], os.environ["YT_API_KEY"])
        for r in rows:
            r["views"] = views.get(r["video_id"], r.get("views", 0))
        json.dump(rows, open(path, "w"), indent=2)
    now = datetime.now(timezone.utc)
    for r in rows:
        hrs = max(1.0, (now - datetime.fromisoformat(r["published"].replace("Z", "+00:00"))).total_seconds() / 3600)
        r["vph"] = r.get("views", 0) / hrs
        r["age_h"] = hrs
    med = statistics.median(r["vph"] for r in rows) or 1e-9
    ranked = sorted(rows, key=lambda r: -r["vph"])
    cut = max(1, round(len(ranked) * 0.15))
    print(f"{'episode':10} {'lane':10} {'views':>9} {'v/hour':>8}  verdict")
    for i, r in enumerate(ranked):
        verdict = "WINNER" if (i < cut and r["age_h"] >= 48 and r["vph"] >= 2 * med) else ("keep" if r["vph"] >= med else "weak")
        r["verdict"] = verdict
        print(f"{r['episode']:10} {r.get('lane',''):10} {r.get('views',0):>9} {r['vph']:>8.1f}  {verdict}")
    lanes = {}
    for r in rows:
        lanes.setdefault(r.get("lane", "?"), []).append(r["vph"])
    print("\nlanes:")
    for lane, v in lanes.items():
        flag = "  <- rethink" if len(v) >= 20 and statistics.median(v) < med / 2 else ""
        print(f"  {lane:10} {len(v):3} uploads, median {statistics.median(v):.1f} v/h{flag}")
    winners = [r for r in ranked if r["verdict"] == "WINNER"]
    if winners:
        print("\nmake variations of: " + ", ".join(f"{w['episode']} ({w.get('lesson','')})" for w in winners))


if __name__ == "__main__":
    main()
