#!/usr/bin/env node
// Does every guard that runs on main actually get to FINISH?
//
//   npm run check:ci-cancel
//
// This exists because a comment claimed a guarantee GitHub does not give, and was believed
// for as long as nobody measured it. render-guards.yml and zero-state.yml both carried:
//
//     # Superseded PR runs are cancellable; a main run is not. A cancelled run reports no
//     # failure, so cancelling here would make an unchecked merge look checked (#616).
//     cancel-in-progress: ${{ github.event_name == 'pull_request' }}
//
// The flag is right and the claim is wrong. `cancel-in-progress: false` only protects a run
// that is already IN PROGRESS. GitHub cancels a still-PENDING run unconditionally when a
// newer run joins the same concurrency group -- there is no flag to turn that off.
//
// Measured on run 31644233526 (event `push`, sha 7fb4e65): 18e6265's run sat pending for 15
// minutes, 7fb4e65's went pending behind it, and when 9d441d3's run was created at 21:50:48
// GitHub cancelled 7fb4e65's two seconds later. A cancelled run reports NO FAILURE, so
// #835's merge read as checked by a guard that never ran on it -- exactly the outcome the
// comment promised could not happen.
//
// The fix is structural, not a stricter flag: group by `github.sha` on a push so main runs
// never share a group and therefore never queue behind one another. This script pins that,
// because the invariant is otherwise a comment, and this repo's own record on comments as
// invariants is bad -- see #798, where a semantic rule written above three functions was
// broken in four days by a clean merge that added two more.
//
// Fails CLOSED: finding no push-triggered workflow means the scan broke, not that CI is
// safe. Same standard as check:clickable and check:counts.
//
// Comments are stripped before anything is matched. The two workflows now explain this rule
// in prose that NAMES `github.sha` and `github.ref`, so a scan that read comments would
// either pass on the strength of an explanation or fail on one. check:schema-drift records
// the same trap from the other direction: prose naming a column failed the build.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, ".github", "workflows");

// A push-triggered workflow may legitimately share one group across commits when being
// SUPERSEDED is the correct behaviour. Recorded with its reason, and checked -- an entry
// here that stops being push-triggered, or stops using the group named, FAILS as stale
// bookkeeping. Same standard as NEEDS_EXTRA_STATE in overlay-scaffold.mjs.
const EXEMPT = {
  "deploy.yml": {
    group: "pages",
    why:
      "A superseded DEPLOY is harmless -- deploying a newer tip includes the older commits, " +
      "so the site still ends up correct -- and check:drift asks from outside whether the " +
      "live site is serving the current tip, which is the failure that actually matters. " +
      "A superseded CHECK is different: nothing else ever asks that question again.",
  },
};

const fail = [];
const note = [];

if (!fs.existsSync(DIR)) {
  console.error(`FAIL — no ${path.relative(ROOT, DIR)} directory; nothing was checked`);
  process.exit(1);
}

const files = fs.readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f));
if (!files.length) {
  console.error(`FAIL — ${path.relative(ROOT, DIR)} holds no workflow files; the scan broke`);
  process.exit(1);
}

// Strip whole-line comments and trailing comments. Kept deliberately simple: these are
// workflow files, and a `#` inside a quoted string in one of them would be the only false
// case -- asserted below rather than assumed.
function decomment(src) {
  return src
    .split("\n")
    .map((line) => {
      if (/^\s*#/.test(line)) return "";
      // A `#` preceded by whitespace starts a trailing comment in YAML.
      const m = line.match(/^([^#]*?)\s+#/);
      return m ? m[1] : line;
    })
    .join("\n");
}

// Top-level `key:` blocks, by indentation. Enough for `on:` and `concurrency:`, and more
// honest than a fixed-window regex -- the trap check:fire records as "proximity is not scope".
function topBlocks(src) {
  const out = {};
  const lines = src.split("\n");
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][\w-]*):(.*)$/);
    if (m) {
      cur = m[1];
      out[cur] = [m[2]];
    } else if (cur && /^\s/.test(line)) {
      out[cur].push(line);
    } else if (line.trim() === "") {
      if (cur) out[cur].push("");
    } else {
      cur = null;
    }
  }
  for (const k of Object.keys(out)) out[k] = out[k].join("\n");
  return out;
}

let pushWorkflows = 0;

for (const f of files.sort()) {
  const raw = fs.readFileSync(path.join(DIR, f), "utf8");
  const src = decomment(raw);
  const blocks = topBlocks(src);
  const on = blocks.on || "";

  // Does it run on a push to the default branch? `on:` may be `on: push` shorthand too.
  const pushBlock = on.match(/(^|\n)\s{2}push:([\s\S]*?)(?=\n\s{2}\w|$)/);
  const pushesToMain =
    (pushBlock && /branches:.*\b(main|master)\b/s.test(pushBlock[2])) ||
    /^\s*push\s*$/m.test(on);
  if (!pushesToMain) continue;
  pushWorkflows++;

  const conc = blocks.concurrency;
  const groupLine = conc && conc.match(/(^|\n)\s*group:\s*(.+)/);
  const group = groupLine ? groupLine[2].trim() : null;

  const ex = EXEMPT[f];
  if (ex) {
    if (!group) {
      fail.push(`${f} — exempt in EXEMPT but declares no concurrency group; remove the exemption or restore the group`);
    } else if (group !== ex.group) {
      fail.push(
        `${f} — exempt on the strength of \`group: ${ex.group}\`, but the group is now \`${group}\`. ` +
          `Re-read the exemption's reasoning before widening it: ${ex.why}`
      );
    } else {
      note.push(`${f} — exempt (group: ${group})`);
    }
    continue;
  }

  if (!group) {
    // No concurrency block at all is SAFE for this invariant: nothing can supersede it.
    note.push(`${f} — no concurrency group, so nothing can supersede it`);
    continue;
  }

  // The whole invariant. On a push `github.head_ref` is empty, so the group must fall
  // through to something UNIQUE PER COMMIT. `github.ref` is shared by every push to the
  // branch, which is what builds the queue that makes a pending run cancellable.
  if (!/github\.sha|github\.run_id/.test(group)) {
    fail.push(
      `${f} — runs on push to main with \`group: ${group}\`, which is shared across every ` +
        `push to the branch. A main run can then sit PENDING behind an earlier one, and ` +
        `GitHub cancels a pending run when the next merge's run joins the group — reporting ` +
        `no failure, so that merge reads as checked by a guard that never ran on it. ` +
        `Use \`github.head_ref || github.sha\` so main pushes never share a group. ` +
        `\`cancel-in-progress\` cannot fix this; it only protects an in-progress run.`
    );
  } else {
    note.push(`${f} — per-commit group (${group})`);
  }
}

// Fail closed. Zero push-triggered workflows would make every assertion above vacuous, and
// that is the realistic failure mode here: a renamed key, a reformatted `on:` block, or a
// parser that quietly stops matching.
if (!pushWorkflows) {
  console.error(
    `FAIL — found ${files.length} workflow files but NONE that trigger on a push to main. ` +
      `Either the trigger was removed from all of them (main is now unchecked, which is #795) ` +
      `or this script's \`on:\` parsing broke. Nothing above was actually verified.`
  );
  process.exit(1);
}

// The two browser guards must still run on main at all -- the #795 invariant. A workflow that
// stops being push-triggered drops out of the loop above silently, which is the same
// coverage-hole-is-invisible shape check:overlay-discovery exists for.
for (const required of ["render-guards.yml", "zero-state.yml"]) {
  if (!files.includes(required)) {
    fail.push(`${required} is missing — it is one of the two browser guards that must run against main`);
    continue;
  }
  const src = decomment(fs.readFileSync(path.join(DIR, required), "utf8"));
  const on = topBlocks(src).on || "";
  const pushBlock = on.match(/(^|\n)\s{2}push:([\s\S]*?)(?=\n\s{2}\w|$)/);
  if (!(pushBlock && /branches:.*\b(main|master)\b/s.test(pushBlock[2]))) {
    fail.push(
      `${required} no longer triggers on a push to main. A pull_request run tests the base as ` +
        `it stood when that run started, so without this nothing asks about main itself (#795).`
    );
  }
}

for (const n of note) console.log(`  ok   ${n}`);
console.log(`\n${pushWorkflows} workflow(s) run on push to main; ${files.length} workflow files scanned.`);

if (fail.length) {
  console.error(`\nFAIL — ${fail.length} problem(s):`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("ok — no guard that runs on main can be cancelled by the next merge.");

// Injection cases (re-run these after any change to the parsing above; each must FAIL, and
// its message must name the workflow):
//   1. render-guards.yml: `github.sha` -> `github.ref`            => fails naming render-guards.yml
//   2. zero-state.yml:    `github.sha` -> `github.ref`            => fails naming zero-state.yml
//   3. deploy.yml:        `group: pages` -> `group: deploy-${{ github.ref }}` => fails as a stale exemption
//   4. render-guards.yml: delete the `push:` trigger              => fails on the #795 invariant
//   5. all workflows:     delete the `push:` trigger              => fails closed, "NONE that trigger on a push"
//   6. add `# group: ${{ github.ref }}` as a COMMENT              => must PASS (comments are stripped)
