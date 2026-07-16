// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node merge-willis-wall-duplicate.mjs
// One-off: merges the duplicate "Willis Wall" route under Mount Rainier, found by the
// phase3 research agent's own hierarchy cross-check (see PR #243). rainier_willis_wall
// (older, thinner record) and wa_mount_rainier_willis_wall (fresher, far more complete
// record with real waypoints/timing/itinerary/access data) described the same physical
// route. Kept wa_mount_rainier_willis_wall as the survivor; merged over its few genuinely
// missing fields from the old row (lat/lng, rock_grade/ice_grade, description) before
// deleting rainier_willis_wall. Verified no FK references (climb_logs, crews, contributions,
// crew_listings, objectives, topo_lines) pointed at rainier_willis_wall before deleting.
import { readFileSync } from "node:fs";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = (env.match(/VITE_SUPABASE_URL=(.+)/) || [])[1].trim().replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) { console.error("Set SUPABASE_SERVICE_KEY (service_role secret)"); process.exit(1); }
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };

const SURVIVOR = "wa_mount_rainier_willis_wall";
const DUPLICATE = "rainier_willis_wall";

const patchBody = {
  lat: 46.8529,
  lng: -121.76047,
  rock_grade: "M5+",
  ice_grade: "AI3",
  description: "Willis Wall is a Grade V mixed alpine route rated as one of the most fearsome alpine faces in the lower 48 states. Between Liberty Ridge and Curtis Ridge on Mount Rainier's north face. The wall features continuous mixed climbing on steep slopes between 45-60 degrees, with sustained rock and ice sections.",
};

async function main() {
  const patchRes = await fetch(`${url}/rest/v1/routes?id=eq.${SURVIVOR}`, { method: "PATCH", headers: H, body: JSON.stringify(patchBody) });
  if (!patchRes.ok) { console.error("PATCH failed", patchRes.status, await patchRes.text()); process.exit(1); }
  console.log("Merged fields into", SURVIVOR);

  const delRes = await fetch(`${url}/rest/v1/routes?id=eq.${DUPLICATE}`, { method: "DELETE", headers: H });
  if (!delRes.ok) { console.error("DELETE failed", delRes.status, await delRes.text()); process.exit(1); }
  const deleted = await delRes.json();
  console.log("Deleted duplicate rows:", deleted.map((d) => d.id));
}
main();
