// Probe for 0396 (groups near a place): the public key can call area_point, and the groups read the
// app makes (with the home-area embed) returns each public group's area and point.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const key = anonKey();
const pt = await fetch(SUPABASE_URL + "/rest/v1/rpc/area_point", { method: "POST", headers: headers(key, { "Content-Type": "application/json" }), body: JSON.stringify({ aid: "or_smith_rock" }) });
console.log("area_point(or_smith_rock):", pt.status, await pt.text());
const g = await fetch(SUPABASE_URL + "/rest/v1/groups?select=id,name,location,area_id,lat,lng,home_area:areas(name)", { headers: headers(key) });
console.log("groups (anon):", g.status, await g.text());
