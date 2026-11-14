#!/usr/bin/env node
// check:research-locks — a research batch can never overwrite a field the research ledger has
// locked (owner, 2026-11-14: "index when you are highly confident of a field being correct so that
// the next agent or session does not try to research or change that field").
//
// Four things, each one a way the lock could silently stop working:
//   1. The rules themselves: scripts/lib/research-ledger.mjs --selftest (MP+OpenBeta are one source,
//      MP coordinates are never evidence, 3 sources to overturn a lock, expired official locks free).
//   2. enrich:apply reads the ledger and calls lockViolations() BEFORE its first patchRow(), and
//      refuses (continue) on a violation — a lock checked after the write protects nothing.
//   3. enrich:apply stores evidence only after "verified on re-read", or on the ledger-only path.
//   4. Migration 0435 keeps route_field_evidence private: RLS on and NO policy. Read with the anon
//      key, an empty ledger looks like "no locks" and would wave every overwrite through.
// Each structural assertion is also run against a mutated copy that must FAIL (the injection
// suite), so a refactor that makes a test vacuous is caught too.
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITER = path.join(ROOT, "scripts/enrich-approach-rappel-bivy.mjs");
const MIG_DIR = path.join(ROOT, "supabase/migrations");
const fails = [];

// 1. self-test
const st = spawnSync(process.execPath, [path.join(ROOT, "scripts/lib/research-ledger.mjs"), "--selftest"], { encoding: "utf8" });
if (st.status !== 0) fails.push("research-ledger self-test failed:\n" + (st.stdout + st.stderr).split("\n").filter(l => l.startsWith("FAIL")).join("\n"));

// 2 + 3. writer structure
function writerProblems(src) {
  const p = [];
  if (!/import\s*\{[^}]*\blockViolations\b[^}]*\}\s*from\s*"\.\/lib\/research-ledger\.mjs"/.test(src)) p.push("enrich:apply does not import lockViolations from ./lib/research-ledger.mjs");
  const call = src.indexOf("lockViolations(body");
  const patch = src.indexOf("await patchRow(");
  const read = src.indexOf("await readLedger(id)");
  if (call < 0) p.push("enrich:apply never calls lockViolations(body, …)");
  if (read < 0) p.push("enrich:apply never reads the ledger (await readLedger(id))");
  if (patch < 0) p.push("enrich:apply has no patchRow call to order the lock check against");
  if (call >= 0 && patch >= 0 && call > patch) p.push("lockViolations is called AFTER patchRow — the lock would be checked once the field was already overwritten");
  if (read >= 0 && call >= 0 && read > call) p.push("the ledger is read after lockViolations runs");
  if (call >= 0 && !/if \(locked\.length\) \{[^\n]*continue; \}/.test(src)) p.push("a lock violation does not skip the route (expected `if (locked.length) { … continue; }`)");
  if (!/\/route_field_evidence\?select=\*&route_id=eq\./.test(src) || !/readLedger = async id => \{\s*let k; try \{ k = requireServiceKey\(\)/.test(src)) p.push("the ledger is not read with the service key — under RLS the anon key reads an empty ledger");
  const verified = src.indexOf('"   verified on re-read"');
  const writes = [...src.matchAll(/await writeLedger\(/g)].map(m => m.index);
  const ledgerOnly = src.indexOf("if (!Object.keys(body).length) {");
  for (const w of writes) if (!(w > verified || (ledgerOnly >= 0 && w > ledgerOnly && w < patch))) p.push("evidence is written somewhere other than after a verified re-read or on the ledger-only path");
  if (!writes.length) p.push("enrich:apply never writes evidence (writeLedger)");
  return p;
}
const src = readFileSync(WRITER, "utf8");
fails.push(...writerProblems(src));

// 4. migration privacy
const mig = readdirSync(MIG_DIR).find(f => /^\d{4}_research_field_evidence\.sql$/.test(f));
function migrationProblems(sql) {
  const p = [];
  if (!/create table if not exists route_field_evidence/i.test(sql)) p.push("migration does not create route_field_evidence");
  if (!/alter table route_field_evidence enable row level security/i.test(sql)) p.push("route_field_evidence does not enable RLS");
  if (/create policy[^;]*on\s+route_field_evidence/i.test(sql)) p.push("route_field_evidence has a policy — evidence URLs must stay service-key only");
  if (/grant\s+[^;]*on\s+(table\s+)?route_field_evidence\s+to\s+(anon|authenticated|public)/i.test(sql)) p.push("route_field_evidence is granted to a client role");
  return p;
}
if (!mig) fails.push("no supabase/migrations/NNNN_research_field_evidence.sql");
const sql = mig ? readFileSync(path.join(MIG_DIR, mig), "utf8") : "";
if (mig) fails.push(...migrationProblems(sql));

// injection suite: each mutation must be caught
const injections = [
  ["lock check removed", () => writerProblems(src.replace("lockViolations(body", "lockViolationsX(body"))],
  ["lock check after the write", () => writerProblems(src.replace("await patchRow(", "await patchRowX(").replace("lockViolations(body", "await patchRow(x);lockViolations(body"))],
  ["violation does not skip", () => writerProblems(src.replace(/if \(locked\.length\) \{([^\n]*)continue; \}/, "if (locked.length) {$1 }"))],
  ["ledger read with anon key", () => writerProblems(src.replace("let k; try { k = requireServiceKey()", "let k = key; try { k = key"))],
  ["public read policy", () => mig ? migrationProblems(sql + "\ncreate policy p on route_field_evidence for select using (true);") : ["(no migration)"]],
  ["RLS removed", () => mig ? migrationProblems(sql.replace(/alter table route_field_evidence enable row level security;/i, "")) : ["(no migration)"]],
];
for (const [name, run] of injections) if (!run().length) fails.push(`injection "${name}" was NOT caught — this guard has gone blind to it`);

if (fails.length) { console.error("check:research-locks FAILED\n- " + fails.join("\n- ")); process.exit(1); }
console.log(`check:research-locks: ok (self-test, writer order, ${mig} privacy, ${injections.length} injections caught)`);
