#!/usr/bin/env python3
"""Deploy proposal folders to Netlify, one site per business.

Usage:
    python3 deploy/netlify-deploy.py bees-knees bodhis
    python3 deploy/netlify-deploy.py --all

Auth: in the cloud environment the token is a network secret, so the proxy adds
the Authorization header itself. Set NETLIFY_AUTH_TOKEN only when running
somewhere without that secret.

Each folder under deploy/ becomes <folder>.netlify.app, or <folder>-nanaimo
(with a numeric suffix) if that name is taken. Site IDs and live URLs are recorded in
deploy/live-sites.json, so re-running a folder redeploys to the same URL.
"""
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.netlify.com/api/v1"
ROOT = Path(__file__).resolve().parent
STATE = ROOT / "live-sites.json"
# Demo sites that aren't real prospects; never deployed by --all.
SKIP = {"alder-stone", "fieldhouse"}


def call(method, path, token, body=None, content_type="application/json"):
    req = urllib.request.Request(API + path, data=body, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        req.add_header("Content-Type", content_type)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read() or b"{}")


def deploy_folder(site_id, folder, token):
    # File-digest deploy: each file is uploaded under its own path. A zip
    # deploy stored index.html as "/" and Netlify served it as text/plain.
    files = {"/" + f.relative_to(folder).as_posix(): f
             for f in sorted(folder.rglob("*")) if f.is_file()}
    digests = {path: hashlib.sha1(f.read_bytes()).hexdigest() for path, f in files.items()}
    deploy = call("POST", f"/sites/{site_id}/deploys", token,
                  json.dumps({"files": digests}).encode())
    by_sha = {d: p for p, d in digests.items()}
    for sha in deploy.get("required", []):
        path = by_sha[sha]
        call("PUT", f"/deploys/{deploy['id']}/files{path}", token,
             files[path].read_bytes(), "application/octet-stream")


def create_site(slug, token):
    # The plain slug first: a prospect outside Nanaimo shouldn't see "nanaimo" in their link.
    names = [slug] + [f"{slug}-nanaimo" + (f"-{n}" if n else "") for n in range(0, 20)]
    for name in names:
        try:
            return call("POST", "/sites", token, json.dumps({"name": name}).encode())
        except urllib.error.HTTPError as e:
            if e.code != 422:  # 422 = name already taken
                raise
    sys.exit(f"Couldn't find a free site name for {slug}")


def main():
    token = os.environ.get("NETLIFY_AUTH_TOKEN")
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
            # Prospects must see the site without a Netlify login, and the
            # "Powered by Netlify" badge covers the sticky Call button.
            call("PATCH", f"/sites/{site['site_id']}", token, json.dumps({"sso_login": False}).encode())
            try:
                call("PATCH", f"/sites/{site['site_id']}", token,
                     json.dumps({"built_with_badge_enabled": False}).encode())
            except urllib.error.HTTPError as e:
                if e.code != 422:  # 422: the free plan no longer lets the badge be removed
                    raise
            # Record the site now, so a deploy that fails below can't leave an
            # untracked site that the next run would duplicate.
            state[slug] = site
            STATE.write_text(json.dumps(state, indent=2) + "\n")
        deploy_folder(site["site_id"], folder, token)
        state[slug] = site
        STATE.write_text(json.dumps(state, indent=2) + "\n")
        print(f"{slug}: {site['url']}")


if __name__ == "__main__":
    main()
