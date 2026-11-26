#!/bin/bash
# Apply every pitch-gap batch not yet applied, one at a time: dbslot check first, 1000 ms between writes, stop on the
# first failure (the DB slot reports slow, or a batch exits non-zero). Applied batches are listed in applied.txt.
# Usage (from the repo root, DB slot held): bash audits/pitch-gap/apply-all.sh
cd "$(dirname "$0")/../.." || exit 1
D=audits/pitch-gap
touch $D/applied.txt
for f in $D/batches/b*.json; do
  b=$(basename "$f" .json)
  grep -qx "$b" $D/applied.txt && continue
  if ! node ~/dev/db-throttle/dbslot.mjs check; then echo "STOP before $b: DB gate says slow"; exit 2; fi
  echo "=== $b $(date +%H:%M:%S)"
  if node scripts/enrich-approach-rappel-bivy.mjs --from "$f" --pace 1000 > $D/logs/$b.log 2>&1; then
    echo "$b" >> $D/applied.txt
    grep -c "verified" $D/logs/$b.log | sed "s/^/  verified lines: /"
  else
    echo "STOP: $b exited non-zero; see $D/logs/$b.log"; tail -5 $D/logs/$b.log; exit 1
  fi
done
echo "ALL APPLIED"
