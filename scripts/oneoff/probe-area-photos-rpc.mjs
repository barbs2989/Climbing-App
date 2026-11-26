// Times area_photos (0541) as the app calls it: the anon key, through PostgREST, one area at a time.
// Usage: node scripts/oneoff/probe-area-photos-rpc.mjs [area_id ...]
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["washington", "wa_north_cascades", "wa_leavenworth", "wa_index", "wa_lower_town_wall", "wa_mount_baker", "california"];
for (const id of ids) {
  const t = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/area_photos`, { method: "POST", headers: headers(anonKey(), { "Content-Type": "application/json" }), body: JSON.stringify({ p_area_id: id, p_limit: 40 }) });
  const body = await r.json();
  console.log(id, r.status, Date.now() - t + " ms", "place=" + body.place, "photos=" + (Array.isArray(body.photos) ? body.photos.length : JSON.stringify(body).slice(0, 120)));
}
