#!/usr/bin/env python3
"""Upload a Short to YouTube with the Data API v3 (resumable upload, stdlib only).

    python3 pipeline/upload_youtube.py video.mp4 episode.meta.json

Needs three environment variables from a Google Cloud OAuth client (type "Desktop app") with the
YouTube Data API v3 enabled, and a refresh token for the channel's Google account
(scope https://www.googleapis.com/auth/youtube.upload):

    YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN

Get the refresh token once with `python3 pipeline/upload_youtube.py --auth` (prints a URL to open,
then paste the code back). Keep these in GitHub Actions secrets or your local keychain, never in git.

Notes
- Made for Kids is set from meta.status.selfDeclaredMadeForKids (comments, end screens and
  personalised ads are switched off by YouTube for those videos).
- If meta.status.publishAt is set, the video uploads as private and YouTube publishes it then.
- Default API quota is 10,000 units/day and an upload costs about 1,600, so ~6 uploads/day per
  project unless you request more quota.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"
SCOPE = "https://www.googleapis.com/auth/youtube.upload"
REDIRECT = "urn:ietf:wg:oauth:2.0:oob"


def post_form(url, data):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode(), method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def access_token():
    return post_form(TOKEN_URL, {
        "client_id": os.environ["YT_CLIENT_ID"],
        "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    })["access_token"]


def auth_flow():
    cid, secret = os.environ["YT_CLIENT_ID"], os.environ["YT_CLIENT_SECRET"]
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": "http://localhost", "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent",
    })
    print("Open this URL, approve, then copy the `code` parameter from the localhost URL you land on:\n" + url)
    code = input("code: ").strip()
    tok = post_form(TOKEN_URL, {"code": code, "client_id": cid, "client_secret": secret,
                                "redirect_uri": "http://localhost", "grant_type": "authorization_code"})
    print("\nYT_REFRESH_TOKEN=" + tok["refresh_token"])


def upload(video, meta):
    token = access_token()
    body = json.dumps({"snippet": meta["snippet"], "status": meta["status"]}).encode()
    size = os.path.getsize(video)
    init = urllib.request.Request(UPLOAD_URL, data=body, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": str(size),
    })
    with urllib.request.urlopen(init) as r:
        location = r.headers["Location"]
    with open(video, "rb") as fh:
        put = urllib.request.Request(location, data=fh.read(), method="PUT", headers={
            "Authorization": f"Bearer {token}", "Content-Type": "video/mp4", "Content-Length": str(size),
        })
        with urllib.request.urlopen(put) as r:
            res = json.loads(r.read())
    print(json.dumps({"id": res["id"], "url": f"https://youtube.com/shorts/{res['id']}",
                      "status": res.get("status", {}).get("privacyStatus"),
                      "publishAt": res.get("status", {}).get("publishAt")}, indent=2))
    return res["id"]


if __name__ == "__main__":
    if "--auth" in sys.argv:
        auth_flow()
    elif len(sys.argv) == 3:
        upload(sys.argv[1], json.loads(open(sys.argv[2]).read()))
    else:
        print(__doc__)
        sys.exit(2)
