#!/bin/bash
# Apply region batches through the shared DB slot. Run from the worktree root.
#   DONE=<file> LOG=<file> bash audits/area-pages/regions/tools/apply-regions.sh 001 002 ...
# Remembers finished batches in $DONE; a batch the apply refuses entries in is still marked done (refusals are
# grepped from $LOG and reworded by hand, then re-applied as their own run).
SLOT=area-pages-regions
DONE=${DONE:-/tmp/regions.done}; LOG=${LOG:-/tmp/regions.log}
touch "$DONE"
node ~/dev/db-throttle/dbslot.mjs acquire $SLOT >> "$LOG" 2>&1
for n in "$@"; do
  grep -qx "$n" "$DONE" && continue
  f=audits/area-pages/regions/batch-r$n.json
  [ -f "$f" ] || { echo "missing $f" >> "$LOG"; continue; }
  if ! node ~/dev/db-throttle/dbslot.mjs check >> "$LOG" 2>&1; then
    echo "DB SLOW before r$n — releasing 10 min" >> "$LOG"
    node ~/dev/db-throttle/dbslot.mjs release $SLOT >> "$LOG" 2>&1; sleep 600
    node ~/dev/db-throttle/dbslot.mjs acquire $SLOT >> "$LOG" 2>&1
  fi
  echo "=== r$n $(date +%T)" >> "$LOG"
  node scripts/enrich/area-page-apply.mjs --from "$f" --rollback-dir audits/area-pages/regions/rollbacks >> "$LOG" 2>&1
  echo "$n" >> "$DONE"
done
node ~/dev/db-throttle/dbslot.mjs release $SLOT >> "$LOG" 2>&1
echo "ALL DONE $(date +%T)" >> "$LOG"
