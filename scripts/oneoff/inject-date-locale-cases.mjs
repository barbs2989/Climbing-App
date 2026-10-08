#!/usr/bin/env node
// Injection suite for scripts/check-date-locale.mjs.
//
// Each case reverts ONE link, proves by CHECKSUM that the edit landed, runs the guard, and restores
// the file byte-identically. Two cases must stay SILENT: the `DLOCALE||undefined` spelling core
// already uses, and a NUMBER's toLocaleString(), which is not a date.
//
// IT EDITS lib/ AND THE APP IN PLACE. Do not commit, and do not run the build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RD = "RouteDetail.jsx", ALP = "lib/AlpineConditionsCard.jsx", CAL = "lib/Calendar.jsx";
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  // The route page's weekday label back on the device default — the shape found on 2026-10-07.
  { name: "weekday-back-to-device-default", file: RD, expect: "fail",
    find: 'const wkDay=function(date){return new Date(date+"T12:00:00Z").toLocaleDateString(DLOCALE,{weekday:"short",timeZone:"UTC"});};',
    repl: 'const wkDay=function(date){return new Date(date+"T12:00:00Z").toLocaleDateString(undefined,{weekday:"short",timeZone:"UTC"});};',
    says: /RouteDetail\.jsx:\d+: \.toLocaleDateString\(undefined/ },
  // A hard-coded locale is the other way to ignore the preference.
  { name: "alpine-card-hardcodes-us", file: ALP, expect: "fail",
    find: 'return new Date(Date.UTC(2026, i, 15)).toLocaleDateString(DLOCALE, { month: "short", timeZone: "UTC" });',
    repl: 'return new Date(Date.UTC(2026, i, 15)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });',
    says: /AlpineConditionsCard\.jsx:\d+: \.toLocaleDateString\("en-US"/ },
  // No argument at all.
  { name: "no-argument-at-all", file: CAL, expect: "fail",
    find: 'const fSun=d=>d.toLocaleTimeString(DLOCALE,{hour:"numeric",minute:"2-digit"});',
    repl: 'const fSun=d=>d.toLocaleTimeString();',
    says: /Calendar\.jsx:\d+: \.toLocaleTimeString\(no argument/ },
  // MUST STAY SILENT — the fallback spelling core uses at one site.
  { name: "fallback-spelling", file: CAL, expect: "pass",
    find: 'const fSun=d=>d.toLocaleTimeString(DLOCALE,{hour:"numeric",minute:"2-digit"});',
    repl: 'const fSun=d=>d.toLocaleTimeString(DLOCALE||undefined,{hour:"numeric",minute:"2-digit"});',
    says: null },
  // MUST STAY SILENT — a number's thousands separator is not the date preference.
  { name: "number-formatting-is-not-a-date", file: CAL, expect: "pass",
    find: 'const fSun=d=>d.toLocaleTimeString(DLOCALE,{hour:"numeric",minute:"2-digit"});',
    repl: 'const fSun=d=>d.toLocaleTimeString(DLOCALE,{hour:"numeric",minute:"2-digit"});const _n=(1234).toLocaleString();',
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const f = path.join(ROOT, c.file);
  const before = fs.readFileSync(f, "utf8");
  const beforeSum = sum(f);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the guard`); bad++; continue; }
  fs.writeFileSync(f, before.replace(c.find, c.repl));
  if (sum(f) === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(f, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "check-date-locale.mjs")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(f, before);
  if (sum(f) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    if (caught && c.says.test(out)) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
