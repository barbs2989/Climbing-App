#!/usr/bin/env node
// Injection suite for probe-group-self-row-carries-your-id.mjs.
//
// `bare-ME-fallback` is the real historical defect, restored verbatim: `ME` has id 0 and every id
// test on the row then reads false at once, so ONE edit must trip four assertions. That is the
// point of asserting the four readers separately rather than only the id — a future fallback that
// carries an id but loses `_profile` fails differently and wants a different repair.
//
// TWO CASES MUST STAY SILENT. Spreading a different object is fine as long as the id survives, and
// so is reordering the append — a suite that pinned either would forbid ordinary work.
//
// IT EDITS ClimbMatch.jsx IN PLACE. Do not commit, and do not build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const abs = path.join(ROOT, "ClimbMatch.jsx");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex");

const SELF = 'id===_meGid?Object.assign({},ME,{id:_meGid})';

const CASES = [
  // THE REAL DEFECT: bare ME, whose id is 0 in a group keyed by uuid.
  { name: "bare-ME-fallback", expect: "fail", find: SELF, repl: "id===_meGid?ME",
    says: /carries id 0|labelled "Member"|\+ Mod button on YOUR OWN row/ },
  // The id is the load-bearing part: keep the spread, break only the id.
  { name: "id-left-as-zero", expect: "fail", find: SELF, repl: "id===_meGid?Object.assign({},ME,{id:0})",
    says: /carries id 0|labelled "Member"/ },
  // A fallback that carries the id but loses _profile fails DIFFERENTLY — the "undefined · 0"
  // shape check:real-profile-rows exists for — so the subtitle assertion must catch it.
  { name: "profile-flag-dropped", expect: "fail",
    find: "return (id===_meGid&&m&&!m._profile)?Object.assign({},m,{_profile:true}):m;",
    repl: "return m;", says: /labelled "climberLine"/ },
  // MUST STAY SILENT: a different object is fine while the id survives.
  { name: "spread-meLive-shape", expect: "pass", find: SELF,
    repl: "id===_meGid?Object.assign({},ME,{id:_meGid,avatar:ME.avatar||\"\"})", says: null },
  // MUST STAY SILENT: appending you FIRST is a layout choice, not a correctness one.
  { name: "self-row-first", expect: "pass",
    find: "?mem.concat([_meGid]):mem", repl: "?[_meGid].concat(mem):mem", says: null },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(abs, "utf8");
  const beforeSum = sum();
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  fs.writeFileSync(abs, before.replace(c.find, c.repl));
  if (sum() === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(abs, before); bad++; continue; }

  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-group-self-row-carries-your-id.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(abs, before);
  if (sum() !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // Judged on the FAIL lines only — a case written against the text an assertion prints when it
    // PASSES reports MISSED against a probe firing correctly.
    const named = c.says.test(out.split("\n").filter((l) => /FAIL|ANCHOR LOST|^ {2}- /.test(l)).join("\n"));
    if (caught && named) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
