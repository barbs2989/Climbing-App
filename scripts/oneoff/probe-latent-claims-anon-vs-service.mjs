// Were the "0 rows live, so it is LATENT" conclusions measured with a key that could SEE the
// rows?
//
// Several decisions in memory rest on a table being empty — most consequentially the guide
// application review queue, which was deliberately NOT built because `guide_documents` was
// recorded as having 0 rows. But an ANON count on an RLS-protected table returns 0 whatever the
// table holds: `climb_logs` reads 0 to anon and has 1 row to the service key. A filtered read is
// not an empty one, and here it decided not to build a trust-and-safety surface.
//
// Read-only. Any failed query is reported as INCONCLUSIVE, never as absence.
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const svc = requireServiceKey();
const anon = anonKey();

// Tables whose emptiness has been used as evidence, plus the guide surfaces specifically.
const TABLES = [
  "guide_documents", "guides", "guide_profiles",
  "user_reports", "blocks", "climb_logs", "contributions", "vouches", "belay_catches",
];

async function one(key, table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: headers(key, { Prefer: "count=exact", Range: "0-0" }),
  }).catch((e) => ({ ok: false, status: 0, _err: String(e && e.message || e) }));
  if (!r.ok) return { err: `${r.status}${r._err ? " " + r._err : ""}` };
  const cr = r.headers.get("content-range") || "";
  const n = cr.includes("/") ? cr.split("/")[1] : "?";
  return { n: n === "*" ? null : Number(n) };
}

console.log("table                anon    service   verdict");
console.log("-------------------- ------- --------- -------------------------------------------");
for (const t of TABLES) {
  const a = await one(anon, t);
  const s = await one(svc, t);
  let verdict;
  if (s.err && /404|42P01/.test(s.err)) verdict = `no such table (${s.err})`;
  else if (s.err) verdict = `INCONCLUSIVE — service query failed (${s.err})`;
  else if (s.n === 0) verdict = "genuinely empty";
  else if (a.err) verdict = `${s.n} row(s); anon query failed (${a.err})`;
  else if (a.n === 0) verdict = `NOT EMPTY — ${s.n} row(s) INVISIBLE to anon (RLS)`;
  else verdict = `${s.n} row(s), ${a.n} visible to anon`;
  const fmt = (x) => x.err ? "err" : String(x.n);
  console.log(`${t.padEnd(20)} ${fmt(a).padEnd(7)} ${fmt(s).padEnd(9)} ${verdict}`);
}
console.log("\nAn anon 0 on an RLS-protected table is not evidence of an empty table.");
