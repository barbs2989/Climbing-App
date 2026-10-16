#!/bin/bash
# usage: go.sh r005 r006 ...  — extract, apply live (compare-and-set + verify), log.
S=$(cd "$(dirname "$0")" && pwd)
T=$(cd "$S/../../../audits/wa-contradictions-rest" && pwd)
for f in "$@"; do
  node $S/extract.mjs "$f" || exit 1
  out=$(node $S/apply.mjs "$T/research/patches-$f.json") || { echo "$out"; exit 1; }
  echo "$out"
  n=$(echo "$out" | sed -n 's/^applied \([0-9]*\) patches.*/\1/p')
  echo "$f ${n:-0}" >> $T/applied.log
done
node $S/status.mjs
