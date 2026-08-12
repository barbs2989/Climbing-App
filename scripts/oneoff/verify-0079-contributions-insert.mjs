// Is 0079's INSERT policy on `contributions` in effect on the LIVE database?
//
// 0079 declares:
//   create policy "anyone can contribute" on contributions for insert to public with check (true);
//
// `pg_policies` is not reachable through PostgREST, so this cannot be READ — it has to be
// MEASURED by attempting the write each role would actually make. A migration file is not
// applied state, and this table is where that has bitten twice in opposite directions.
//
// MEASURED 2026-08-12: anon INSERT returns **201**. 0079's effect IS live.
// That reverses the 2026-08-09 measurement (401 / 42501) recorded in
// memory:add-route-form-persisted-nothing, so do not trust either date over a fresh run —
// run this instead. The key is not the variable: the same `sb_publishable_…` key was used
// both times.
//
// Self-cleaning: every row it creates is deleted with the service key before it exits, so
// a run leaves the table exactly as it found it. Safe to re-run.
//
// It also probes four tables that must NOT accept an anonymous write (routes, areas,
// profiles, climb_logs). That control is the point: it separates "contributions is
// deliberately open" from "anon write is open project-wide", which look identical if you
// only ever probe the one table you came for. All four returned 401 / 42501 on 2026-08-12.

import { headers, anonKey, requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const anonHeaders = (extra) => headers(anonKey(), extra);
const serviceHeaders = (extra) => headers(requireServiceKey(), extra);

const T = `${SUPABASE_URL}/rest/v1/contributions`;
const out = [];
const say = (label, verdict, detail) => { out.push({ label, verdict, detail }); console.log(`  ${verdict.padEnd(6)} ${label}${detail ? " — " + detail : ""}`); };

// A payload shaped exactly like the one #794's AddRoute now files.
const probe = {
  kind: "new_route",
  area_id: null,
  route_id: null,
  field: null,
  value: JSON.stringify({ __probe: "0079-verification", name: "DO NOT KEEP" }),
};

console.log("\n0079 — contributions INSERT policy, measured against the live DB\n");

// 1. Does the table exist and is it anon-readable? (0002's public read policy)
const r1 = await fetch(`${T}?select=id&limit=1`, { headers: anonHeaders() });
say("table reachable, anon SELECT", r1.ok ? "ok" : "FAIL", `HTTP ${r1.status}`);
const existing = r1.ok ? await r1.json() : [];

// 2. How many rows are in there right now (service key, bypasses RLS)?
requireServiceKey();
const r2 = await fetch(`${T}?select=id`, { headers: serviceHeaders({ Prefer: "count=exact" }) });
const total = r2.headers.get("content-range")?.split("/")[1] ?? "?";
say("row count (service key)", "info", `${total} rows`);

// 3. THE question: can an anonymous client INSERT today?
const r3 = await fetch(T, {
  method: "POST",
  headers: anonHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
  body: JSON.stringify(probe),
});
const body3 = await r3.text();
let inserted = null;
if (r3.status === 201) {
  say("anon INSERT", "OPEN", "HTTP 201 — 0079 IS ALREADY APPLIED (or an equivalent policy exists)");
  try { inserted = JSON.parse(body3)[0]?.id; } catch {}
} else {
  let code = "";
  try { code = JSON.parse(body3).code || ""; } catch {}
  say("anon INSERT", "BLOCKED", `HTTP ${r3.status}${code ? " / " + code : ""} — 0079 is NOT applied`);
}

// 4. Clean up if the probe actually landed. Never leave a probe row behind.
if (inserted) {
  const del = await fetch(`${T}?id=eq.${inserted}`, { method: "DELETE", headers: serviceHeaders() });
  say("probe row removed", del.ok ? "ok" : "FAIL", `id=${inserted}`);
}

// 5. Does the service key still work? Distinguishes "RLS rejected anon" from "table broken".
const r5 = await fetch(T, {
  method: "POST",
  headers: serviceHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
  body: JSON.stringify(probe),
});
if (r5.status === 201) {
  const id = (await r5.json())[0]?.id;
  say("service-key INSERT", "ok", "HTTP 201 — the table itself accepts this payload shape");
  const del = await fetch(`${T}?id=eq.${id}`, { method: "DELETE", headers: serviceHeaders() });
  say("service probe removed", del.ok ? "ok" : "FAIL", `id=${id}`);
} else {
  say("service-key INSERT", "FAIL", `HTTP ${r5.status} ${(await r5.text()).slice(0, 200)}`);
}

// 6. Is the 4000-char cap from 0008 still live? #794 relies on it (photos are counted, not embedded).
const big = { ...probe, value: "x".repeat(4100) };
const r6 = await fetch(T, { method: "POST", headers: serviceHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(big) });
say("value length cap (0008)", r6.status === 400 ? "ok" : "CHECK", `HTTP ${r6.status} on a 4100-char value`);

// 7. THE CONTROL. An open `contributions` and an open database look identical if the only
// table you probe is the one you came for. These four must all refuse an anonymous write;
// if any of them starts accepting one, the finding is not "0079 is applied" but "RLS is
// wrong somewhere else", which is a different and much larger problem.
console.log("\n  control — these must all REFUSE an anonymous insert:");
const CONTROLS = [
  ["routes", { id: "__probe_delete_me", name: "PROBE", area_id: null }],
  ["areas", { id: "__probe_delete_me", name: "PROBE" }],
  ["profiles", { id: "00000000-0000-0000-0000-000000000000", name: "PROBE" }],
  ["climb_logs", { route_id: "__probe", notes: "PROBE" }],
];
let leaks = 0;
for (const [table, body] of CONTROLS) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: anonHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  let code = ""; try { code = JSON.parse(txt).code || ""; } catch {}
  if (r.status === 201) {
    leaks++;
    say(`anon INSERT ${table}`, "LEAK", `HTTP 201 — anon can write this table`);
    try { // never leave a probe row behind, even one that should have been impossible
      const id = JSON.parse(txt)[0]?.id;
      if (id != null) await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: serviceHeaders() });
    } catch {}
  } else {
    say(`anon INSERT ${table}`, "ok", `HTTP ${r.status}${code ? " / " + code : ""} — refused`);
  }
}

// 8. Prove the table is exactly as it was found. A probe that leaves rows is a probe that
// corrupts the thing it measures — `contributions` row count is itself a signal (see the
// note in memory: 0 rows was long misread as "nobody contributes" rather than "every write
// was rejected").
const rAfter = await fetch(`${T}?select=id`, { headers: serviceHeaders({ Prefer: "count=exact" }) });
const after = rAfter.headers.get("content-range")?.split("/")[1] ?? "?";
say("row count unchanged", String(after) === String(total) ? "ok" : "FAIL", `${total} before, ${after} after`);

console.log(`\n  existing anon-visible rows sampled: ${existing.length}`);
console.log(`  verdict: contributions anon INSERT is ${r3.status === 201 ? "OPEN (0079 in effect)" : "CLOSED (0079 not applied)"}; ${leaks} unexpected table(s) writable by anon\n`);
process.exit(leaks > 0 ? 1 : 0);
