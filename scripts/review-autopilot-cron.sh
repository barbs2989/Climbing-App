#!/bin/bash
# The review autopilot's scheduled run (launchd: scripts/review-autopilot.plist, hourly).
#
# It runs from its OWN checkout, ~/dev/climbmatch-review-autopilot, a detached worktree of the main repo
# moved to origin/main at the start of every run, so the code that decides is always the merged code
# and no session's work-in-progress is ever executed. The credentials are the main checkout's .env /
# .env.local, linked in (never copied).
#
# INSTALL (once, on the owner's Mac):
#   cp scripts/review-autopilot.plist ~/Library/LaunchAgents/com.climbmatch.review-autopilot.plist
#   launchctl load ~/Library/LaunchAgents/com.climbmatch.review-autopilot.plist
# STOP:      launchctl unload ~/Library/LaunchAgents/com.climbmatch.review-autopilot.plist
# LOG:       ~/dev/climbmatch-review-autopilot.log
set -u
REPO="$HOME/dev/Climbing-App"
WT="$HOME/dev/climbmatch-review-autopilot"
echo "=== $(date '+%Y-%m-%d %H:%M:%S') review autopilot"
git -C "$REPO" fetch -q origin main || { echo "fetch failed; skipping this run"; exit 0; }
if [ ! -d "$WT" ]; then git -C "$REPO" worktree add -q --detach "$WT" origin/main || exit 1; fi
git -C "$WT" checkout -q --detach origin/main || exit 1
ln -sf "$REPO/.env" "$WT/.env"; ln -sf "$REPO/.env.local" "$WT/.env.local"
cd "$WT" && exec node scripts/review-autopilot.mjs --limit 15
