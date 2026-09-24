// One-shot check for 0199, run with the PUBLIC (anon) key — what a signed-out visitor holds.
//   1. share_crew_itinerary is refused (no EXECUTE for anon), so nobody without an account can
//      write a crew's plan.
//   2. user_itineraries answers an anon read with zero rows (owner-only RLS).
//   3. user_lists still answers shared rows to anon — the `?list=` link must open for a recipient
//      with no account, which is what the Privacy Policy now says.
// Row-count assertions on (2) are not evidence of emptiness: RLS answers 0 whatever the table holds.
// That is the point here — anon must SEE zero. Exits non-zero on any unexpected answer.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const key = anonKey();
let bad = 0;
const say = (ok, msg) => { console.log((ok ? "  ok   " : "  FAIL ") + msg); if (!ok) bad++; };

let r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/share_crew_itinerary`, {
  method: "POST", headers: headers(key, { "Content-Type": "application/json" }),
  body: JSON.stringify({ p_crew_id: "00000000-0000-0000-0000-000000000000", p_itinerary: null }),
});
let body = await r.text();
say(r.status === 401 || r.status === 403 || /permission denied/i.test(body), `anon share_crew_itinerary refused (HTTP ${r.status}: ${body.slice(0, 90)})`);

r = await fetch(`${SUPABASE_URL}/rest/v1/user_itineraries?select=route_id&limit=5`, { headers: headers(key) });
body = await r.text();
say(r.ok && body.trim() === "[]", `anon user_itineraries read returns no rows (HTTP ${r.status}: ${body.slice(0, 60)})`);

r = await fetch(`${SUPABASE_URL}/rest/v1/user_lists?select=id,shared&limit=50`, { headers: headers(key) });
body = await r.text();
let rows = [];
try { rows = JSON.parse(body); } catch (_e) {}
say(r.ok && Array.isArray(rows) && rows.every((x) => x.shared === true), `anon user_lists read returns only shared lists (${Array.isArray(rows) ? rows.length : "?"} row(s))`);

console.log(bad ? `\nverify-0199: ${bad} FAILED` : "\nverify-0199: ok");
process.exit(bad ? 1 : 0);
