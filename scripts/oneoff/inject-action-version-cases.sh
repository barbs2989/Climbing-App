#!/usr/bin/env bash
# Injection suite for check:action-versions. Every case proves the edit LANDED (by checksum)
# before it judges the guard -- the "injection logged, counter didn't move" trap this repo
# has hit in five separate guards.
#
# Case 4 must PASS: a comment naming an old pin is history, not a regression.
set -u
GD=.github/workflows/deploy-drift.yml
DP=.github/workflows/deploy.yml
CK=scripts/check-action-versions.mjs
cp $GD /tmp/gd.bak; cp $DP /tmp/dp.bak; cp $CK /tmp/ck.bak
restore(){ cp /tmp/gd.bak $GD; cp /tmp/dp.bak $DP; cp /tmp/ck.bak $CK; }
run(){ node scripts/check-action-versions.mjs 2>&1; }
sum(){ md5 -q "$1"; }

echo "=========== CASE 1: a new job pins checkout@v4 (the #895 shape)"
B=$(sum $GD); perl -0pi -e 's|actions/checkout\@v7|actions/checkout\@v4|' $GD
[ "$B" = "$(sum $GD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|below the" | head -2; restore

echo "=========== CASE 2: a third-party action with no FLOORS entry"
B=$(sum $GD); perl -0pi -e 's|(      - uses: actions/checkout\@v7)|      - uses: someorg/some-action\@v3\n$1|' $GD
[ "$B" = "$(sum $GD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|no entry in FLOORS" | head -2; restore

echo "=========== CASE 3: a FLOORS entry no workflow uses"
B=$(sum $CK); perl -0pi -e 's|  "actions/checkout": 7,|  "actions/checkout": 7,\n  "actions/never-used-here": 2,|' $CK
[ "$B" = "$(sum $CK)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|Stale" | head -2; restore

echo "=========== CASE 4: a COMMENT naming deploy-pages@v4 must PASS (history, not a pin)"
B=$(sum $DP); printf '\n# Historical note: the 2026-08-06 outage failed at deploy-pages@v4.\n' >> $DP
[ "$B" = "$(sum $DP)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | tail -2; restore

echo "=========== CASE 5: break the uses: regex -> DIED, never ok"
B=$(sum $CK); perl -0pi -e 's{/uses:}{/usesZZ:}' $CK
[ "$B" = "$(sum $CK)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "DIED|found NO action pins|ok —" | head -2; restore

echo "=========== restored; final state"
run | tail -2
