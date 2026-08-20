// Injection tests for check:camping's collapse assertions (8d) and the campDetail rewrite of 8c.
//
// The expected result of those assertions is "ok" on a healthy tree, which is exactly what a
// broken assertion prints. Each case edits RouteDetail.jsx, PROVES the edit landed by checksum
// before believing anything the guard says (this repo has recorded an injection reported as
// "guard missed" when the edit never applied), runs the guard, and restores the file.
//
// Judged on whether the NAMED assertion fired, not on the exit code: several of these also
// perturb other assertions, and an exit code cannot tell the intended catch from a side effect.
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";

const FILE = "RouteDetail.jsx";
const original = fs.readFileSync(FILE, "utf8");
const sum = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);

const CASES = [
  {
    name: "1. render the prose unconditionally (undo the collapse)",
    edit: s => s.replace("{open&&more?<div style={{borderTop:", "{more?<div style={{borderTop:"),
    want: /the panel still renders prose before any tap/,
    wantLabel: "prose fields are collapsed out of the default view",
  },
  {
    name: "2. campDetail selects nothing (disclosure DELETES the prose)",
    edit: s => s.replace('return [["Capacity",b&&b.capacity],["Water",b&&b.water],["Permit",b&&b.permit]]', 'return [].concat([["Capacity",b&&b.capacity],["Water",b&&b.water],["Permit",b&&b.permit]].slice(0,0))'),
    want: /the prose a tap should reveal is not being selected/,
    wantLabel: "capacity, water and permit are still selected",
  },
  {
    name: "3. drop the aria-label (prose reachable only by mouse, announced as nothing)",
    edit: s => s.replace('aria-label={more?((open?"Hide":"Show")+" camping detail for "+label):undefined}', ""),
    want: /no aria-labelled expand control names the site/,
    wantLabel: "the collapsed row carries a labelled expand control",
  },
  {
    name: "4. blank strings select detail rows (the case the old chip scan went vacuous on)",
    edit: s => s.replace('.filter(function(r){return String(r[1]==null?"":r[1]).trim()!=="";});', '.filter(function(r){return r[1]!=null;});'),
    want: /a blank contributed site produced \d+ detail row/,
    wantLabel: "blank contributed strings select no detail rows",
  },
  {
    name: "5. collapse the NAME away too (a row reduced to a chevron)",
    edit: s => s.replace('<span style={{marginRight:6}}>{"☾"}</span>{nm}', '<span style={{marginRight:6}}>{"☾"}</span>'),
    want: /the site name is missing from the collapsed row/,
    wantLabel: "the site name survives the collapse",
  },
];

let pass = 0;
for (const c of CASES) {
  const edited = c.edit(original);
  if (sum(edited) === sum(original)) {
    console.log(`MISS  ${c.name}\n      edit never landed (file unchanged) — fix the CASE, not the guard`);
    continue;
  }
  fs.writeFileSync(FILE, edited);
  let out = "";
  try { out = execSync("npm run check:camping 2>&1", { encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(FILE, original);

  if (c.want.test(out)) { console.log(`CAUGHT ${c.name}`); pass++; }
  else {
    console.log(`MISS   ${c.name}`);
    console.log(`       expected the "${c.wantLabel}" assertion to fire; it did not.`);
    const still = out.split("\n").filter(l => l.includes(c.wantLabel)).join(" | ");
    if (still) console.log(`       guard said: ${still.trim()}`);
  }
}

// Restore is belt-and-braces: a thrown execSync above already restores, but a killed process
// would not, and this file is the app.
fs.writeFileSync(FILE, original);
if (sum(fs.readFileSync(FILE, "utf8")) !== sum(original)) { console.log("\nFAIL: RouteDetail.jsx was NOT restored"); process.exit(1); }
console.log(`\n${pass}/${CASES.length} caught; RouteDetail.jsx restored (${sum(original)})`);
process.exit(pass === CASES.length ? 0 : 1);
