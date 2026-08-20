// Independent re-read of the four Mowich Lake routes through the ANON role — the role the app
// actually uses. The applier's own reconcile ran as the service key, which bypasses RLS; this asks
// the question a climber's browser asks.
//
// The ids are listed here rather than defaulted from a file, because a verifier that silently
// substitutes stale input prints a confident green about the wrong wave.
// [[a-probe-that-copies-its-subject-measures-a-fossil]]
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const IDS = ["wa_mount_rainier_mowich_face", "rainier_north_mowich_headwall",
  "wa_mount_rainier_edmunds_headwall", "rainier_central_mowich_face"];
const K = anonKey();
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,road,access,approach_logistics&id=in.(${IDS.join(",")})`,
  { headers: { apikey: K, Authorization: "Bearer " + K }, signal: AbortSignal.timeout(60000) });
if (!r.ok) { console.error(`${r.status} ${(await r.text()).slice(0, 200)}`); process.exit(1); }
const rows = await r.json();
// Fail closed: a short read is not a clean result.
if (rows.length !== IDS.length) { console.error(`expected ${IDS.length} rows, got ${rows.length} — refusing to report`); process.exit(1); }

let bad = 0;
for (const x of rows) {
  const road = x.road || {}, ac = x.access || {};
  const status = String(road.status || ""), gate = String(road.seasonalGate || ""), clo = String(ac.closures || "");
  const knowsClosed = /Fairfax|Carbon River Bridge/i.test(status) && /no public/i.test(status);
  const stillSaysJuly = /opens?\s*~?\s*(early\s*)?july|not open until/i.test(gate);
  console.log(`${knowsClosed && !stillSaysJuly ? "ok  " : "FAIL"}  ${x.id}`);
  console.log(`        status   : ${status.slice(0, 110)}`);
  console.log(`        gate     : ${gate.slice(0, 110) || "(none)"}`);
  console.log(`        closures : ${clo.slice(0, 110) || "(none)"}`);
  console.log(`        trailhead: ${String((x.approach_logistics || {}).trailhead || "")}`);
  if (!knowsClosed || stillSaysJuly) bad++;
}
console.log(`\n${rows.length} Mowich routes read through the anon role; ${bad} still misstate the road.`);
process.exit(bad ? 1 : 0);
