#!/usr/bin/env python3
"""Deploy proposal folders to Netlify, one site per business.

Usage:
    NETLIFY_AUTH_TOKEN=... python3 deploy/netlify-deploy.py bees-knees bodhis
    NETLIFY_AUTH_TOKEN=... python3 deploy/netlify-deploy.py --all

Each folder under deploy/ becomes <folder>-nanaimo.netlify.app (with a numeric
suffix if that name is taken). Site IDs and live URLs are recorded in
deploy/live-sites.json, so re-running a folder redeploys to the same URL.
"""
import io
import json
import os
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

API = "https://api.netlify.com/api/v1"
ROOT = Path(__file__).resolve().parent
STATE = ROOT / "live-sites.json"
# Demo sites that aren't real prospects; never deployed by --all.
SKIP = {"alder-stone", "fieldhouse"}


def call(method, path, token, body=None, content_type="application/json"):
    req = urllib.request.Request(API + path, data=body, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        req.add_header("Content-Type", content_type)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read() or b"{}")


def zip_folder(folder):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(folder.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(folder).as_posix())
    return buf.getvalue()


def create_site(slug, token):
    for n in range(0, 20):
        name = f"{slug}-nanaimo" + (f"-{n}" if n else "")
        try:
            return call("POST", "/sites", token, json.dumps({"name": name}).encode())
        except urllib.error.HTTPError as e:
            if e.code != 422:  # 422 = name already taken
                raise
    sys.exit(f"Couldn't find a free site name for {slug}")


def main():
    token = os.environ.get("NETLIFY_AUTH_TOKEN")
    if not token:
        sys.exit("NETLIFY_AUTH_TOKEN is not set")
    args = sys.argv[1:]
    if args == ["--all"]:
        args = sorted(p.name for p in ROOT.iterdir()
                      if (p / "index.html").is_file() and p.name not in SKIP)
    if not args:
        sys.exit(__doc__)

    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    for slug in args:
        folder = ROOT / slug
        if not (folder / "index.html").is_file():
            print(f"skip {slug}: no {folder}/index.html")
            continue
        site = state.get(slug)
        if not site:
            created = create_site(slug, token)
            site = {"site_id": created["id"], "url": created["ssl_url"] or created["url"]}
        call("POST", f"/sites/{site['site_id']}/deploys", token,
             zip_folder(folder), "application/zip")
        state[slug] = site
        STATE.write_text(json.dumps(state, indent=2) + "\n")
        print(f"{slug}: {site['url']}")


if __name__ == "__main__":
    main()
