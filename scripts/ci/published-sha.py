#!/usr/bin/env python3
"""Which commit is CURRENTLY published to GitHub Pages?

Prints the sha, or nothing at all if it cannot be determined. Nothing is a meaningful
answer: should-publish.sh treats it as "fall back to the strict tip rule", so an outage
degrades to the old behaviour rather than to a guess.

THE NEWEST DEPLOYMENT RECORD IS NOT NECESSARILY THE LIVE ONE. A stale run can put a
failure record on top of a healthy site -- that happened on 2026-08-06 -- so walk back to
the most recent deployment whose latest status is actually "success". check:drift has
made the same walk from outside since it was written; this is the same rule, inside.

Parsed as JSON rather than with grep, deliberately. An unparseable response yields NOTHING
and is safe, but a response parsed WRONGLY could yield a plausible sha that is not live --
and a wrong sha here could let a run publish over something newer, which is the one
outcome should-publish.sh exists to prevent.

--fixture <file> reads a canned deployments payload instead of calling the API, so the
walk can be tested without a network or a token.
"""
import json
import os
import sys
import urllib.request

API = os.environ.get("GITHUB_API", "https://api.github.com")
REPO = os.environ.get("GITHUB_REPOSITORY", "")
TOKEN = os.environ.get("GH_TOKEN", "")


def get(path):
    req = urllib.request.Request(
        API + path,
        headers={
            "accept": "application/vnd.github+json",
            **({"authorization": "Bearer " + TOKEN} if TOKEN else {}),
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def main():
    fixture = None
    if "--fixture" in sys.argv:
        fixture = sys.argv[sys.argv.index("--fixture") + 1]

    try:
        if fixture:
            with open(fixture) as fh:
                blob = json.load(fh)
            deployments, statuses = blob["deployments"], blob["statuses"]
            look = lambda d: statuses.get(str(d["id"]), [])
        else:
            if not REPO:
                return ""
            deployments = get("/repos/%s/deployments?environment=github-pages&per_page=20" % REPO)
            look = lambda d: get("/repos/%s/deployments/%s/statuses?per_page=1" % (REPO, d["id"]))

        for d in deployments:
            st = look(d)
            if st and st[0].get("state") == "success":
                sha = d.get("sha") or ""
                # A short or malformed sha is not usable for ancestry; treat it as unknown.
                return sha if len(sha) >= 7 else ""
        return ""
    except Exception:
        return ""


if __name__ == "__main__":
    sys.stdout.write(main())
