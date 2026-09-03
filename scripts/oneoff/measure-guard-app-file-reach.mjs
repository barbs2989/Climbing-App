// WHICH APP FILES DOES EACH GUARD ACTUALLY READ?
//
// #547 is the recorded incident: the three-way file split moved most of the app into
// ClimbMatchCore.jsx and RouteDetail.jsx while check:refs/check:hooks still named only the entry
// files, so for a week the guard that exists to stop production blank screens read 24% of the app.
// The repair added `guard-sources.mjs`. This asks how much of the suite actually uses it, and
// which guards read a STRICT SUBSET of the three app files.
//
// A subset is NOT automatically a defect — check:camping is about the Planner tab and RouteDetail
// is where that lives. So this prints a READING LIST classified by what the guard's own rule
// appears to be about, never a count of defects. [[when-an-audit-reports-zero-ask-its-denominator]]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

const guards = fs.readdirSync(path.join(ROOT, "scripts"))
  .filter((f) => /^check-.*\.mjs$/.test(f))
  .sort();
if (guards.length < 50) { console.error(`FAIL — only ${guards.length} guards found; a broken walk.`); process.exit(1); }

// Which files does guard-sources hand out? Read it rather than assume.
const gs = fs.readFileSync(path.join(ROOT, "scripts/lib/guard-sources.mjs"), "utf8");
const gsCovers = APP.filter((f) => gs.includes(f));
if (gsCovers.length !== 3) {
  console.error(`FAIL — guard-sources.mjs names ${gsCovers.length} of the 3 app files (${gsCovers.join(", ")}).`);
  console.error("That is the #547 shape in the shared helper itself, and every consumer inherits it.");
  process.exit(1);
}

const rows = [];
for (const g of guards) {
  const src = fs.readFileSync(path.join(ROOT, "scripts", g), "utf8");
  // Comments carry file names constantly in this repo, so strip line comments and block comments
  // before asking what the guard READS. Without this, a guard that merely DISCUSSES RouteDetail
  // reads as scanning it — the false-coverage direction.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const usesShared = /guard-sources/.test(code);
  const named = APP.filter((f) => code.includes(f));
  const reach = usesShared ? APP.slice() : named;
  const touchesApp = usesShared || named.length > 0;
  if (!touchesApp) continue;
  rows.push({ g, usesShared, named, reach, missing: APP.filter((f) => !reach.includes(f)) });
}

console.log(`${guards.length} check: guards; ${rows.length} of them read app source.\n`);
const shared = rows.filter((r) => r.usesShared);
const partial = rows.filter((r) => !r.usesShared && r.missing.length);
const full = rows.filter((r) => !r.usesShared && !r.missing.length);

console.log(`  via guard-sources (all 3 by construction) : ${shared.length}`);
console.log(`  names all 3 by hand                       : ${full.length}`);
console.log(`  names a STRICT SUBSET                     : ${partial.length}   <- the reading list\n`);

// A guard naming ONE file is usually scoped on purpose; one naming TWO of three is the shape
// worth reading, because it has already decided the rule spans more than one file.
const two = partial.filter((r) => r.named.length === 2);
const one = partial.filter((r) => r.named.length === 1);

console.log(`--- names TWO of three (${two.length}) — it already spans files, so why not the third? ---`);
for (const r of two) console.log(`  ${r.g.padEnd(38)} reads ${r.named.join(" + ")}   MISSING ${r.missing.join(", ")}`);

console.log(`\n--- names ONE (${one.length}) — usually scoped on purpose; read the subject before acting ---`);
for (const r of one) console.log(`  ${r.g.padEnd(38)} reads ${r.named[0]}`);
