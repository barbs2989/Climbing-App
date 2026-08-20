// Injection cases for `check:jsx-comments`. Its healthy output is "no comment is rendered as
// copy", which is also what a guard whose traversal silently stopped visiting JSXText prints.
//
// Every case proves its edit LANDED BY CHECKSUM before judging the guard, and restores the file
// afterwards. Without that, a pattern that failed to match reads as "the guard missed it" and
// sends you debugging the wrong file.
//
//   node scripts/oneoff/inject-jsx-comment-cases.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("../..", import.meta.url).pathname;
const sum = s => createHash("sha1").update(s).digest("hex").slice(0, 10);
const run = () => {
  try { return { out: execFileSync("node", [ROOT + "scripts/check-jsx-comments.mjs"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), code: 0 }; }
  catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status }; }
};

const CASES = [
  { file: "ClimbMatchCore.jsx", name: "the REAL defect: unwrap the MY OBJECTIVES comment",
    edit: s => s.replace("{/* With logs down the badge stops saying", "/* With logs down the badge stops saying")
                .replace("so say which it is. */}", "so say which it is. */"),
    wantFail: true, want: /ClimbMatchCore\.jsx:\d+ renders a comment/ },

  // CHILDREN position, which is the whole point. The first version of this case injected before
  // `<WaypointList` — but that sits inside `{…}`, an EXPRESSION container, where `/* */` really is
  // a comment. The guard correctly ignored it and the case read as a miss. Pick an anchor that is
  // genuinely between two sibling elements, or the case tests the opposite of what it claims.
  { file: "RouteDetail.jsx", name: "a NEW leaked comment elsewhere, in real children position",
    edit: s => s.replace(">ROUTE TRACK</SL><div", ">ROUTE TRACK</SL>/* injected leak */<div"),
    wantFail: true, want: /RouteDetail\.jsx:\d+ renders a comment/ },

  // Exercise the fail-closed path directly. Renaming the visitor key makes babel-traverse THROW
  // on an unknown node type, so the guard dies with a stack trace instead of reaching its own
  // "traversal broke" branch — a different failure, and one that proves nothing about the branch.
  { file: "scripts/check-jsx-comments.mjs", name: "the traversal sees nothing -> 'traversal broke', never 'clean'",
    edit: s => s.replace("      textNodes++;", "      // textNodes++;"),
    wantFail: true, want: /traversal broke/ },

  // Precision: one delimiter is not a comment. The guard requires BOTH, so real copy containing a
  // stray slash-star is left alone — flagging it would be flagging correct work.
  { file: "RouteDetail.jsx", name: "children text with only an opening /* and no closer must PASS",
    edit: s => s.replace(">ROUTE TRACK</SL><div", ">ROUTE TRACK</SL>/* no closer here <div"),
    wantFail: false, want: /no comment is rendered as copy/ },
];

let bad = 0;
for (const c of CASES) {
  const abs = ROOT + c.file;
  const original = readFileSync(abs, "utf8");
  const originalSum = sum(original);
  const mutated = c.edit(original);
  if (sum(mutated) === originalSum) {
    console.log(`SKIP  ${c.name}\n      edit never landed — fix the CASE, not the guard.`);
    bad++; continue;
  }
  writeFileSync(abs, mutated);
  const { out, code } = run();
  writeFileSync(abs, original);
  if (sum(readFileSync(abs, "utf8")) !== originalSum) {
    console.log(`FATAL ${c.name}: ${c.file} was NOT restored. Fix by hand before anything else.`);
    process.exit(1);
  }
  const failed = code !== 0;
  const okCase = failed === c.wantFail && c.want.test(out);
  if (!okCase) bad++;
  console.log(`${okCase ? "ok   " : "MISS "} ${c.name}`);
  if (!okCase) console.log(out.split("\n").filter(Boolean).slice(-4).map(l => "        " + l).join("\n"));
}

console.log(`\n${CASES.length - bad}/${CASES.length} behaved as specified.`);
process.exit(bad ? 1 : 0);
