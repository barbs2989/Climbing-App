#!/bin/bash
# apply_list10.sh N...: apply the listed tier-10 batches (one slot, stop on DB slow)
S=/Users/nathanbarber/dev/db-throttle/dbslot.mjs
cd /Users/nathanbarber/dev/Climbing-App/.claude/worktrees/area-pages-tier20 || exit 1
LOG=/Users/nathanbarber/.claude/jobs/d56fff32/tmp/apply10-list.log
: > "$LOG"
node $S acquire area-pages-tier20 || exit 1
for n in "$@"; do i=$(printf %02d "$n")
  for f in audits/area-pages/tier10/batch-v$i-*.json; do
    [ -e "$f" ] || continue
    echo "== $f" >> "$LOG"
    node scripts/enrich/area-page-apply.mjs --from "$f" 2>&1 | grep -v '^writing' >> "$LOG"
    if ! node $S check > /dev/null; then echo "DB SLOW: stopped before next batch" >> "$LOG"; node $S release area-pages-tier20; exit 3; fi
  done
done
node $S release area-pages-tier20
echo finished >> "$LOG"
