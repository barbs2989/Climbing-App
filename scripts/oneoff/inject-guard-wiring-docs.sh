set -u
MD=CLAUDE.md; GW=scripts/check-guard-wiring.mjs
cp $MD /tmp/md.bak; cp $GW /tmp/gw.bak
restore(){ cp /tmp/md.bak $MD; cp /tmp/gw.bak $GW; }
run(){ npm run check:guard-wiring 2>&1; }
sum(){ md5 -q "$1"; }

echo "=========== CASE 1: delete check:fire's line from the command block"
B=$(sum $MD); grep -v '^npm run check:fire ' $MD > /tmp/o && mv /tmp/o $MD
[ "$B" = "$(sum $MD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|check:fire" | head -4; restore

echo "=========== CASE 2: stale UNDOCUMENTED entry (names a documented guard)"
B=$(sum $GW); perl -0pi -e 's/const UNDOCUMENTED = \{\};/const UNDOCUMENTED = {"check-fire.mjs":"bogus"};/' $GW
[ "$B" = "$(sum $GW)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|stale" | head -3; restore

echo "=========== CASE 3: break the bash fence (index unreadable)"
B=$(sum $MD); perl -0pi -e 's/```bash/```shell/' $MD
[ "$B" = "$(sum $MD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAILED|command block" | head -3; restore

echo "=========== CASE 4: index parses to a handful (dangerous middle)"
B=$(sum $MD); perl -0pi -e 's/```bash\n.*?```/```bash\nnpm run check:refs\nnpm run check:fire\n```/s' $MD
[ "$B" = "$(sum $MD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAILED|parsed to only" | head -3; restore

echo "=========== CASE 5: prose-only mention must NOT count (lexical vs structural)"
B=$(sum $MD); grep -v '^npm run check:fire ' $MD > /tmp/o && mv /tmp/o $MD
printf '\nA sentence naming npm run check:fire in prose, outside the block.\n' >> $MD
[ "$B" = "$(sum $MD)" ] && echo "  !! EDIT DID NOT LAND" || echo "  edit landed"
run | grep -E "FAIL|check:fire" | head -3; restore

echo "=========== restored; final state"
run | tail -3
