#!/usr/bin/env bash
# Injection suite for check:action-versions. Every case proves the edit LANDED (by checksum)
# before it judges the guard -- the "injection logged, counter didn't move" trap this repo
# has hit in five separate guards.
#
# Case 4 must PASS: a comment naming an old pin is history, not a regression.
# Every action is pinned to a commit SHA with a `# vX.Y.Z` label; cases 8-10 guard that.
set -u
GD=.github/workflows/deploy-drift.yml
DP=.github/workflows/deploy.yml
CK=scripts/check-action-versions.mjs
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
cp $GD $T/gd.bak; cp $DP $T/dp.bak; cp $CK $T/ck.bak
restore(){ cp $T/gd.bak $GD; cp $T/dp.bak $DP; cp $T/ck.bak $CK; }
run(){ node scripts/check-action-versions.mjs 2>&1; }
sum(){ md5 -q "$1" 2>/dev/null || md5sum "$1" | cut -d' ' -f1; }
SHA='[0-9a-f]{40}'

echo "=========== CASE 1: a new job pins checkout at v4 (the #895 shape)"
B=$(sum $GD); perl -0pi -e "s|(actions/checkout\@$SHA) # v7\.0\.1|\$1 # v4.2.2|" $GD
[ "$B" = "$(sum $GD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|below the" | head -2; restore

echo "=========== CASE 2: a third-party action with no FLOORS entry"
B=$(sum $GD); perl -0pi -e 's|(      - uses: actions/checkout\@)|      - uses: someorg/some-action\@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v3.0.0\n$1|' $GD
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
B=$(sum $CK); perl -0pi -e 's{/uses:}{/usesZZ:}g' $CK
[ "$B" = "$(sum $CK)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "DIED|found NO action pins|ok —" | head -2; restore

echo "=========== CASE 8: checkout pinned by TAG, not SHA"
B=$(sum $GD); perl -0pi -e "s|actions/checkout\@$SHA # v7\.0\.1|actions/checkout\@v7|" $GD
[ "$B" = "$(sum $GD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|not a commit SHA" | head -2; restore

echo "=========== CASE 9: SHA pin with its version label removed"
B=$(sum $GD); perl -0pi -e "s|(actions/checkout\@$SHA) # v7\.0\.1|\$1|" $GD
[ "$B" = "$(sum $GD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|label" | head -2; restore

echo "=========== CASE 10: actions/cache/restore by tag (outside FLOORS, still checked)"
B=$(sum $DP); perl -0pi -e "s|actions/cache/restore\@$SHA # v6\.1\.0|actions/cache/restore\@v6|" $DP
[ "$B" = "$(sum $DP)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|not a commit SHA" | head -2; restore

echo "=========== restored; final state"
run | tail -2
