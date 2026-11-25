#!/bin/bash
# resume_list10.sh N...: apply listed tier-10 batches one slot at a time; remembers finished
# batches in DONE, stops on DB slow, waits 10 min, resumes. Up to 24 tries. Full log in ALL.
S=/Users/nathanbarber/dev/db-throttle/dbslot.mjs
T=/Users/nathanbarber/.claude/jobs/d56fff32/tmp
DONE=${DONE:-$T/resume10.done}; ALL=${ALL:-$T/resume10-all.log}
touch "$DONE"
cd /Users/nathanbarber/dev/Climbing-App/.claude/worktrees/area-pages-tier20 || exit 1
for try in $(seq 1 24); do
  left=0; for n in "$@"; do grep -qx "$n" "$DONE" || left=1; done
  [ $left -eq 0 ] && { echo "all done (try $try)" >> "$ALL"; exit 0; }
  node $S acquire area-pages-tier20 >> "$ALL" 2>&1 || { sleep 600; continue; }
  slow=0
  for n in "$@"; do
    grep -qx "$n" "$DONE" && continue
    i=$(printf %02d "$n")
    for f in audits/area-pages/tier10/batch-v$i-*.json; do
      [ -e "$f" ] || continue
      echo "== $f" >> "$ALL"
      node scripts/enrich/area-page-apply.mjs --from "$f" 2>&1 | grep -v '^writing' >> "$ALL"
    done
    echo "$n" >> "$DONE"
    if ! node $S check > /dev/null; then echo "DB SLOW after v$n (try $try)" >> "$ALL"; slow=1; break; fi
  done
  node $S release area-pages-tier20 >> "$ALL" 2>&1
  [ $slow -eq 1 ] && sleep 600
done
exit 3
