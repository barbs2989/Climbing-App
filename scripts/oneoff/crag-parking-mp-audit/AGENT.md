Read /Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/JUDGE.md and follow it. You are given a list of input
files in /Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/batches/. Process them one at a time, in order.
Skip any whose output /Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/out/<name> already exists.

For each file: Read the WHOLE file (continue with offset until the end), judge EVERY group yourself.
Then write an overrides JSON object holding only the groups that are NOT `keep`, keyed by gid, e.g.
`{"g12":{"v":"wrong","park_at":"...","near":"...","why":"..."},"g15":{"v":"move","c":3,"why":"..."}}`
(an empty `{}` if all are keep) to /Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/ov/<name>, and run
`python3 /Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/mk.py <name> /Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/ov/<name>`
which writes the full output with every other group as keep. Do not write any other scripts; never
decide verdicts with code — only by reading each group. No web access.

Reply only with one line per file: name, groups, wrong, move, unsure.
