#!/usr/bin/env node
// One-off (owner note 2026-11-26, "text too long in the header"): a route's climate.forecastZone
// is printed after the label "Forecast zone —". 342 routes stored a paragraph there (up to 333
// characters, often naming a website). Each is set to the name of the avalanche.org forecast-zone
// polygon its coordinate (the route's, else its area's) falls in, the name the live "Avalanche
// today" card prints; a route in no zone loses the key. The plan file is made from the nightly
// snapshot; every row is RE-READ live first and skipped if its value is no longer the one planned
// over. Rollback JSON is written before each write. Paced by patchRow (>= 1 s per write).
//
//   node scripts/oneoff/forecast-zone-is-a-name.mjs PLAN.json [--dry] [--limit N]
import fs from "fs";
import { execFileSync } from "child_process";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const planPath = args.find(a => !a.startsWith("--") && !/^\d+$/.test(a));
const dry = args.includes("--dry");
const li = args.indexOf("--limit"), limit = li >= 0 ? Number(args[li + 1]) : Infinity;
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const key = requireServiceKey();
const rbPath = `scripts/rollback-forecast-zone-name-${Date.now()}.json`;
const rollback = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let done = 0, skipped = 0, same = 0;
for (const p of plan) {
  if (done >= limit) break;
  if (done && done % 50 === 0 && !dry) {
    try { execFileSync("node", [process.env.HOME + "/dev/db-throttle/dbslot.mjs", "check"], { stdio: "ignore" }); }
    catch { console.error("dbslot check says the database is slow — STOPPED after", done); break; }
  }
  const t0 = Date.now();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(p.id)}&select=id,area_id,climate`, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!res.ok) { console.error("read failed", p.id, res.status); break; }
  const ms = Date.now() - t0;
  if (ms > 10000) { console.error("a keyed read took", ms, "ms — STOPPED"); break; }
  const [row] = await res.json();
  if (!row || row.area_id !== p.area_id || !row.climate || row.climate.forecastZone !== p.old) { skipped++; console.log("skip (changed live)", p.id); continue; }
  const next = { ...row.climate };
  if (p.zone) next.forecastZone = p.zone; else delete next.forecastZone;
  if (JSON.stringify(next) === JSON.stringify(row.climate)) { same++; continue; }
  if (dry) { console.log("would", p.id, "->", p.zone || "(removed)"); done++; continue; }
  rollback.push({ id: p.id, climate: row.climate });
  fs.writeFileSync(rbPath, JSON.stringify(rollback, null, 1));
  const out = await patchRow("routes", p.id, { climate: next });
  const got = out.climate && out.climate.forecastZone;
  if ((p.zone || undefined) !== (got || undefined)) { console.error("did not land", p.id, got); break; }
  done++;
  if (done % 25 === 0) console.log(done, "written");
  await sleep(0);
}
console.log({ done, skipped, same, rollback: dry ? null : rbPath });
