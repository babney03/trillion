#!/usr/bin/env python3
"""Deploy proposal folders to Cloudflare Pages, one project per business.

Usage:
    python3 deploy/cf-deploy.py some-slug other-slug
    python3 deploy/cf-deploy.py --all          # every folder not yet live
    python3 deploy/cf-deploy.py --all --redo   # redeploy everything

Needs CLOUDFLARE_API_TOKEN in the environment (Account → Cloudflare Pages →
Edit). Set it as a plain environment variable, not a proxy-injected network
secret: the upload step sends its own short-lived token to api.cloudflare.com,
and a proxy that rewrites the Authorization header there breaks it.

Free plan: unlimited sites and bandwidth, 500 deploys a month. Each folder
becomes https://<slug>.pages.dev (Cloudflare adds a suffix if that name is
taken). Live URLs go into deploy/live-sites.json alongside the Netlify ones,
so pipeline/build.py picks them up for the emails.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "live-sites.json"
WRANGLER = ROOT.parent / "pipeline" / "node_modules" / ".bin" / "wrangler"
API = "https://api.cloudflare.com/client/v4"
# Demo sites that aren't real prospects.
SKIP = {"alder-stone", "fieldhouse"}


def api(method, path, token, body=None):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b"{}") | {"success": False, "status": e.code}


def project_name(slug):
    # Pages names: lowercase letters, digits and dashes, at most 58 characters.
    return "".join(c if c.isalnum() else "-" for c in slug.lower()).strip("-")[:58]


def main():
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not token:
        sys.exit("CLOUDFLARE_API_TOKEN isn't set. See the note at the top of this file.")
    if not WRANGLER.exists():
        sys.exit("Run `npm install` in pipeline/ first.")
    accounts = api("GET", "/accounts", token).get("result") or []
    if not accounts:
        sys.exit("The token can't see any Cloudflare account. Check its permissions.")
    acct = os.environ.get("CLOUDFLARE_ACCOUNT_ID") or accounts[0]["id"]

    args = sys.argv[1:]
    redo = "--redo" in args
    args = [a for a in args if a != "--redo"]
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    if args == ["--all"]:
        args = sorted(p.name for p in ROOT.iterdir() if (p / "index.html").is_file() and p.name not in SKIP
                      and (redo or p.name not in state))
    if not args:
        sys.exit(__doc__)

    env = dict(os.environ, CLOUDFLARE_ACCOUNT_ID=acct, WRANGLER_SEND_METRICS="false")
    for slug in args:
        folder = ROOT / slug
        if not (folder / "index.html").is_file():
            print(f"skip {slug}: no {folder}/index.html")
            continue
        name = project_name(slug)
        proj = api("GET", f"/accounts/{acct}/pages/projects/{name}", token)
        if not proj.get("success"):
            proj = api("POST", f"/accounts/{acct}/pages/projects", token,
                       {"name": name, "production_branch": "main"})
            if not proj.get("success"):
                print(f"{slug}: couldn't create project: {proj.get('errors')}")
                continue
        out = subprocess.run([str(WRANGLER), "pages", "deploy", str(folder), "--project-name", name,
                              "--branch", "main", "--commit-dirty=true"],
                             env=env, capture_output=True, text=True)
        if out.returncode:
            print(f"{slug}: deploy failed\n{out.stdout[-800:]}{out.stderr[-800:]}")
            continue
        sub = proj["result"].get("subdomain") or f"{name}.pages.dev"
        state[slug] = {"host": "cloudflare", "project": name, "url": f"https://{sub}"}
        STATE.write_text(json.dumps(state, indent=2) + "\n")
        print(f"{slug}: https://{sub}")


if __name__ == "__main__":
    main()
