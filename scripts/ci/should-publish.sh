#!/usr/bin/env bash
# May THIS commit publish to production?
#
# deploy.yml used to answer that with "am I the tip of main?", checked before the build and
# again after it. The property that test was protecting is stated in its own comment and is
# the right one: PRODUCTION MUST NOT MOVE BACKWARDS. On 2026-08-06 a re-run of an older
# commit finished after newer runs and published, and #613, #621 and #622 vanished from the
# live site.
#
# But "am I the tip?" is a PROXY for that property, and it is over-strict in exactly the way
# that starves the pipeline. Measured 2026-09-02: over 25 consecutive runs, 10 had the deploy
# job SKIPPED because a merge landed during their ~1 minute build and 10 more were cancelled
# while queued -- production sat 17 commits and ~80 minutes behind main, and every run still
# reported "success" at the run level. When several sessions merge every few minutes, NOTHING
# is ever still the tip when its build finishes, so nothing publishes at all.
#
# So ask the real question instead: is what is currently PUBLISHED a strict ancestor of me?
# If it is, publishing me moves production forward and cannot revert anything. If it is not --
# because production already has me, or has something newer, or something off my line -- skip.
# That admits the superseded-but-still-newer case the tip test refused, and still refuses the
# 2026-08-06 case, because there the late re-run's commit was an ANCESTOR of what was live.
#
# FAILS SAFE, and that is deliberate: if the published commit cannot be determined, this falls
# back to the old strict tip rule. Any API trouble degrades to today's behaviour rather than
# to a guess, and the worst case is the starvation we already have rather than a rollback.
#
# The published-commit lookup lives in published-sha.py and parses JSON as JSON. An
# unparseable response yields NOTHING and is safe -- it falls back to the strict tip rule --
# but a response parsed WRONGLY could yield a plausible sha that is not live, and that is the
# one input that could let this publish over something newer.
#
# Self-tested by scripts/oneoff/probe-should-publish.mjs over a real temp repository, so the
# ancestry cases are genuine rather than mocked. _TEST_TIP / _TEST_PUBLISHED exist only for
# that probe: the healthy state here is "publish", which is also what a broken test prints.
set -uo pipefail

SHA="${SHA:-${GITHUB_SHA:-}}"
BR="${DEFAULT_BRANCH:-main}"
REPO="${GITHUB_REPOSITORY:-}"
OUT="${GITHUB_OUTPUT:-/dev/stdout}"

say() { echo "::notice::$1"; }
publish() { echo "current=true"  >> "$OUT"; say "publishing ${SHA:0:7}: $1"; exit 0; }
skip()    { echo "current=false" >> "$OUT"; say "not publishing ${SHA:0:7}: $1"; exit 0; }

if [ -z "$SHA" ]; then skip "no commit sha in the environment"; fi

TIP="${_TEST_TIP:-}"
if [ -z "$TIP" ]; then
  git fetch --quiet origin "$BR" || true
  TIP=$(git rev-parse FETCH_HEAD 2>/dev/null || echo "")
fi

# The common case, and it needs no API call at all.
if [ -n "$TIP" ] && [ "$TIP" = "$SHA" ]; then publish "it is the tip of $BR"; fi

# Superseded. That used to end it; now it only means we have to ask what is actually live.
# The newest deployment record is NOT necessarily the live one -- a stale run can put a
# failure record on top of a healthy site -- so walk back to the most recent deployment whose
# latest status is "success", exactly as check:drift does.
PUB="${_TEST_PUBLISHED:-}"
if [ -z "$PUB" ]; then
  PUB=$(python3 "$(dirname "$0")/published-sha.py" 2>/dev/null || echo "")
fi

if [ -z "$PUB" ]; then
  skip "superseded by ${TIP:0:7}, and the published commit could not be determined -- falling back to the strict tip rule"
fi
if [ "$PUB" = "$SHA" ]; then
  skip "production already serves this commit"
fi
if git merge-base --is-ancestor "$PUB" "$SHA" 2>/dev/null; then
  publish "superseded by ${TIP:0:7}, but production is still on ${PUB:0:7} -- this moves it FORWARD"
fi
skip "production is on ${PUB:0:7}, which is not an ancestor of this commit -- publishing would move it backwards or sideways"
