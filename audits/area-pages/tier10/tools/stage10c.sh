#!/bin/bash
# stage10c.sh BRANCH LO HI: new branch off origin/main, stage tier-10 batches LO..HI and new rollback files
cd /Users/nathanbarber/dev/Climbing-App/.claude/worktrees/area-pages-tier20 || exit 1
git fetch -q origin main || exit 1
git checkout -q -b "$1" origin/main || exit 1
for n in $(seq "$2" "$3"); do
  for f in audits/area-pages/tier10/batch-v$n-*.json; do [ -e "$f" ] && git add "$f"; done
done
git ls-files --others --exclude-standard scripts/ | grep '^scripts/rollback-area-page-.*\.json$' | xargs git add
echo "staged: $(git diff --cached --name-only | wc -l)"
