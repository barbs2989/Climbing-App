#!/usr/bin/env node
// Run a DB-backed guard; if it failed ONLY because the database was down, report the run as
// INCONCLUSIVE (a yellow ::warning:: plus a job-summary line) instead of a red job.
//
//   node scripts/ci-db-inconclusive.mjs npm run check:ui -- --snapshot ui-screens.json
//
// WHY. Measured 2026-11-11 over a sample of ~40 failed Render-guards runs reaching back to
// 2026-10-28: about 95% of the red jobs were the production Supabase project not answering
// (preflight "THE DATABASE IS UNREACHABLE", HTTP 504/521/522 from the gateway, reads abandoned
// mid-walk). Roughly 5 of ~220 failed jobs were findings about the app. Every one of those
// outage reds emailed the owner, and the guards' own output already said "this is NOT a finding
// about the app" -- so the signal was buried under its own noise, and real failures were the
// ones nobody looked at.
//
// WHAT IT DOES NOT CHANGE. The guards still fail CLOSED inside themselves: an outage is never
// reported as "the screen is fine". This wrapper only changes how CI SURFACES a run that proved
// nothing -- a warning that says so, not a failure that pages someone. Any failure without an
// outage signature, or an outage-ish failure alongside other failures, stays red.
//
// Two tiers of evidence:
//   STRONG -- the guard itself abandoned the whole run because the DB was down. Trusted as is.
//   WEAK   -- a single item failed with database wording (e.g. "query never resolved"). That
//             could also be an app bug that hangs a query, so it counts only when it is the
//             guard's ONLY failure AND a one-row read right now is slow (>1.5s, the owner's
//             throttle threshold) or failing. A healthy DB means the hang is the app's: red.
import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";

const STRONG = [
  /THE DATABASE IS UNREACHABLE/,
  /THE DATABASE READ FAILED/,
  /this run proves NOTHING about the app/i,
  /This is NOT a finding about the app/,
  /the read is down, not the app/,
  /the database is not answering \(HTTP \d+\)/i,
  /The database is not answering; per the owner's throttle rule/,
  // Gateway errors: Cloudflare 521/522/525 (origin down / timed out) and Supabase's 504/503.
  // These come from in front of Postgres, never from the app's own logic.
  /\b(read|catalog read) failed \((50[234]|52[0-9])\)/,
  /returned (50[234]|52[0-9]) (<!DOCTYPE|upstream request timeout)/i,
];
const WEAK = [
  /the signed-in query never resolved/,
  /a database READ failed/,
  /the database did not answer/,
];
// "exactly one failure" markers printed by the guards that list several items.
const SOLE_FAILURE = [/\bFAILED \(1\)/, /^1 UI check failure\(s\)/m, /^1 of \d+ assertion\(s\) failed/m];

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error("usage: node scripts/ci-db-inconclusive.mjs <command> [args...]");
  process.exit(2);
}

const MAX = 4 << 20; // keep the last 4MB of output for matching
let out = "";
const keep = (chunk) => { out += chunk; if (out.length > MAX) out = out.slice(-MAX); };

const child = spawn(argv[0], argv.slice(1), { shell: process.platform === "win32", stdio: ["inherit", "pipe", "pipe"] });
child.stdout.on("data", (d) => { process.stdout.write(d); keep(d.toString()); });
child.stderr.on("data", (d) => { process.stderr.write(d); keep(d.toString()); });

const code = await new Promise((res) => {
  child.on("error", (e) => { console.error(String(e)); res(1); });
  child.on("close", (c, sig) => res(c ?? (sig ? 1 : 0)));
});
if (code === 0) process.exit(0);

const label = argv.join(" ").replace(/^npm run /, "");
const firstLine = (re) => (out.split("\n").find((l) => re.test(l)) || "").trim().slice(0, 240);

let verdict = null;
const strong = STRONG.find((re) => re.test(out));
if (strong) {
  verdict = firstLine(strong);
} else {
  const weak = WEAK.find((re) => re.test(out));
  if (weak && SOLE_FAILURE.some((re) => re.test(out))) {
    const { probeDbLatency } = await import("./lib/db-preflight.mjs");
    const p = await probeDbLatency();
    console.log(`\nci-db-inconclusive: one-row probe after the failure: ${p.state}${p.ms != null ? ` in ${p.ms}ms` : ""}${p.err ? ` (${p.err})` : ""}`);
    if (p.state === "error" || (p.state === "ok" && p.ms > 1500)) {
      verdict = `${firstLine(weak)} [probe: ${p.state}${p.ms != null ? ` ${p.ms}ms` : ""}]`;
    } else {
      console.log("ci-db-inconclusive: the database answers promptly now, so this failure is treated as the app's: RED.");
    }
  }
}

if (!verdict) process.exit(code);

const msg = `${label} was INCONCLUSIVE — the database was down or too slow, so this run proved nothing about the app. Re-run once the project answers. Evidence: ${verdict}`;
console.log(`\n::warning title=Inconclusive (database outage)::${msg.replace(/[\r\n%]/g, " ")}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ⚠️ Inconclusive: database outage\n\n${msg}\n\n`); } catch {}
}
process.exit(0);
