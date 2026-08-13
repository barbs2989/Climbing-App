// Is the Supabase project actually degraded, or is CI just unlucky?
//
// Every branch's browser guards went red at once on queries timing out ("Loading countries…"
// after 45s). That is a claim about the database, and it should be measured rather than
// inferred from a pile of red ticks.
//
// Measures what the APP's own first screens ask for, under the ANON key — the role a real user
// and every browser guard actually uses, and the one with the 3s statement_timeout. The service
// key has a longer one and would report health the app does not have.
//
// Warm-second-request discipline: the first call of a run pays ~3.7s of connection setup, so a
// single cold sample cannot tell "no index" from "slow handshake".
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const key = anonKey();

// A DEADLINE, because an outage does not always answer. This probe was written against a
// project returning fast 503s and had no timeout at all; when the same project later stopped
// answering entirely, a single call hung past 120s and the watch polling it produced no output
// whatsoever. "No answer" is a health verdict and has to arrive as one. 15s is well past the
// measured cold-connection cost (~3.8-6.4s) so a slow project still reports honestly.
const DEADLINE_MS = 15000;

async function timed(label, path) {
  const t = Date.now();
  let status = 0, note = "";
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: headers(key),
      signal: AbortSignal.timeout(DEADLINE_MS),
    });
    status = res.status;
    const body = await res.text();
    if (!res.ok) { try { note = JSON.parse(body).code || ""; } catch { note = body.slice(0, 40); } }
    else note = `${(JSON.parse(body) || []).length} rows`;
  } catch (e) {
    note = e.name === "TimeoutError" ? `NO ANSWER in ${DEADLINE_MS / 1000}s`
      : e.cause ? String(e.cause.code || e.cause.name || e.cause) : e.message;
  }
  return { label, ms: Date.now() - t, status, note };
}

// The two the guards died on, plus a trivial control that touches almost nothing.
const QUERIES = [
  ["control (1 area by pk)", "areas?select=id&limit=1"],
  ["countries (Climbs tab)", "areas?select=id,name,area_type&area_type=eq.country&limit=50"],
  ["profiles (Discover tab)", "profiles?select=id,name&limit=20"],
  ["routes by area", "routes?select=id,name&area_id=eq.wa_mount_stuart&limit=20"],
];

let failed = 0;
for (const pass of ["COLD", "WARM"]) {
  console.log(`\n--- ${pass} ---`);
  for (const [label, path] of QUERIES) {
    const r = await timed(label, path);
    if (r.status !== 200) failed++;
    const flag = r.status === 200 ? (r.ms > 3000 ? "  <-- OVER the 3s anon timeout" : "") : "  <-- FAILED";
    console.log(`${String(r.ms).padStart(6)} ms  ${String(r.status).padStart(3)}  ${r.label.padEnd(26)} ${r.note}${flag}`);
  }
}

// EXIT CODE, because this gets used as a gate and not only read by a person.
// It printed a table and exited 0 unconditionally -- including when all 8 queries
// returned 503 -- so a watch script gating on `if node probe-db-health.mjs` declared
// the database recovered while it was still down, and re-ran a branch's browser
// guards into the same outage. A health probe that cannot say "unhealthy" in the one
// channel automation reads is worse than no probe: it answers confidently and wrong.
console.log(`\n${failed ? `${failed}/8 queries FAILED — the database is not healthy` : "8/8 ok"}`);
process.exit(failed ? 1 : 0);
