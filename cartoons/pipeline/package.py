#!/usr/bin/env python3
"""Turn an episode spec into upload-ready YouTube metadata (and lint it).

    python3 pipeline/package.py series/pip-and-biscuit/episodes/001-wobbly-tower.json [--publish-at 2026-11-25T16:00:00Z]

Writes <episode>.meta.json next to the spec. Lint rules come from what worked on the channels we
studied: the lesson or the problem is in the title, an emoji, #forkids, under ~70 characters so it
isn't cut off on phones, and Made for Kids set.
"""
import json
import sys
from pathlib import Path

MAX_TITLE = 100      # YouTube hard limit
SOFT_TITLE = 70      # what fits on a phone before "..."
BASE_TAGS = ["kids cartoon", "cartoon for kids", "preschool", "toddler", "shorts"]


def lint(meta):
    problems = []
    t = meta["title"]
    if len(t) > MAX_TITLE:
        problems.append(f"title is {len(t)} chars (max {MAX_TITLE})")
    if len(t) > SOFT_TITLE:
        problems.append(f"title is {len(t)} chars; over {SOFT_TITLE} gets cut off on phones")
    if "#forkids" not in t.lower() and "#forkids" not in meta["description"].lower():
        problems.append("add #forkids to the title or description")
    if not any(ord(ch) > 0x2600 for ch in t):
        problems.append("titles with an emoji performed better; add one")
    if not meta["status"]["selfDeclaredMadeForKids"]:
        problems.append("Made for Kids must be true for this channel")
    if len(", ".join(meta["snippet"]["tags"])) > 480:
        problems.append("tags exceed 500 characters")
    return problems


def build(spec, publish_at=None):
    p = spec["publish"]
    tags = list(dict.fromkeys(p.get("tags", []) + BASE_TAGS + [spec.get("lesson", "")]))
    tags = [x for x in tags if x and x != "none (pure fun)"]
    status = {
        "privacyStatus": "private" if publish_at else "public",
        "selfDeclaredMadeForKids": bool(p.get("made_for_kids", True)),
        "containsSyntheticMedia": False,  # clearly animated cartoons don't need the realistic-AI label
    }
    if publish_at:
        status["publishAt"] = publish_at  # YouTube flips it public at this time
    return {
        "episode": spec["id"],
        "title": p["title"],
        "description": p["description"],
        "snippet": {
            "title": p["title"],
            "description": p["description"],
            "tags": tags,
            "categoryId": p.get("category_id", "1"),
            "defaultLanguage": "en",
            "defaultAudioLanguage": "en",
        },
        "status": status,
    }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    spec_path = Path(sys.argv[1])
    publish_at = sys.argv[sys.argv.index("--publish-at") + 1] if "--publish-at" in sys.argv else None
    spec = json.loads(spec_path.read_text())
    meta = build(spec, publish_at)
    problems = lint(meta)
    out = spec_path.with_suffix(".meta.json")
    out.write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    print(f"wrote {out}")
    for pr in problems:
        print(f"  ! {pr}")
    sys.exit(1 if any("max" in pr or "must" in pr for pr in problems) else 0)


if __name__ == "__main__":
    main()
