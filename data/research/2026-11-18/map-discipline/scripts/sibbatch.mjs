// Sibling reuse: a route whose OWN stored text names a trailhead that a sibling on the same peak already pins
// gets that pin's coordinate. Reads fresh; skips anything that already has coords or whose area moved.
import fs from "fs";
const { selectAll, requireServiceKey, SUPABASE_URL } = await import("file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs");
const key = requireServiceKey(); const TODAY = "2026-11-18";
const SAFE_STORED = ["wa_big_snow_mountain_southwest_ridge","wa_chimney_rock_west_face","wa_beyond_redlining","wa_little_sister_southeast_ridge","wa_marvin_s_ear","wa_mount_adams_northwest_ridge","wa_poltergeist_pinnacle","wa_prusik_peak_solid_gold","wa_the_monk_le_gibet","wa_the_monk_odine","wa_the_monk_scabo","wa_the_monk_west_cracks_left_crack","wa_the_monk_west_cracks_right_crack","wa_three_queens_middle_peak","wa_three_queens_west_peak","wa_trapper_mountain_north_couloir"];
const SAFE_TEXT = { wa_baring_mountain_oatmeal_man: "approach", wa_chimney_peak_the_chimney: "approach", wa_mount_adams_avalanche_white_salmon_glaciers: "approach", wa_mount_fury_east_direct_east_ridge: "approach", wa_this_my_friend: "approach" };
const sib = JSON.parse(fs.readFileSync("siblings.json")); const S = new Map(sib.map(s => [s.id, s]));
const ids = [...SAFE_STORED, ...Object.keys(SAFE_TEXT)];
const rows = await selectAll("routes", "id,area_id,approach_logistics,waypoints,approach", `id=in.(${ids.map(x => `"${x}"`).join(",")})`, { key, pageSize: 100 });
const R = new Map(rows.map(r => [r.id, r]));
const srcIds = [...new Set(ids.flatMap(i => S.get(i).ths.find(t => t.names.includes(S.get(i).named[0])).from))];
const evRes = await fetch(`${SUPABASE_URL}/rest/v1/route_field_evidence?select=route_id,field,level,evidence&route_id=in.(${srcIds.map(x => `"${x}"`).join(",")})&limit=2000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
if (!evRes.ok) throw new Error("evidence read " + evRes.status + " " + (await evRes.text()).slice(0, 200));
const ev = await evRes.json();
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const batch = {}, skipped = [];
for (const id of ids) {
  const s = S.get(id), r = R.get(id); if (!r) { skipped.push([id, "row not found"]); continue; }
  if (r.area_id !== s.area) { skipped.push([id, "area moved"]); continue; }
  const al = r.approach_logistics && typeof r.approach_logistics === "object" ? { ...r.approach_logistics } : {};
  if (al.trailheadLat != null || (r.waypoints || []).some(w => /trailhead/i.test(w && w.type || "") && w.lat != null)) { skipped.push([id, "already placed"]); continue; }
  const t = s.ths.find(t => t.names.includes(s.named[0]));
  // a coordinate printed in the route's own approach must agree
  const printed = String(r.approach || "").match(/(4\d\.\d{3,})\s*,\s*(-1[12]\d\.\d{3,})/);
  if (printed && m(t, { lat: +printed[1], lng: +printed[2] }) > 300) { skipped.push([id, `own text prints ${printed[1]},${printed[2]}, ${Math.round(m(t, { lat: +printed[1], lng: +printed[2] }))} m from the sibling pin`]); continue; }
  if (!al.trailhead) al.trailhead = s.named[0];
  al.trailheadLat = +(+t.lat).toFixed(6); al.trailheadLng = +(+t.lng).toFixed(6);
  const srcEv = ev.filter(e => t.from.includes(e.route_id) && /approach_logistics|waypoints\/.*trail/i.test(e.field)).flatMap(e => e.evidence || []).filter(e => e && e.url);
  const evidence = [...new Map(srcEv.map(e => [e.url, { ...e }])).values()].slice(0, 3);
  const fact = { url: `https://barbs2989.github.io/Climbing-App/#route=${t.from[0]}`, fact: `Same named trailhead as sibling ${t.from[0]} on this peak; own ${SAFE_TEXT[id] || "stored trailhead"} names it`, retrieved_at: TODAY };
  batch[id] = { area: s.area, set: { approach_logistics: al },
    ledger: [{ field: "approach_logistics", value: al, method: "single-source", level: "unconfirmed", evidence: [...evidence, fact] }],
    review: { sibling: t.from, siblingEvidence: evidence.length, printedAgrees: !!printed } };
}
fs.writeFileSync("batch-sib.json", JSON.stringify(batch, null, 1));
console.log("entries", Object.keys(batch).length, "skipped", skipped.length); skipped.forEach(s => console.log(" skip", ...s));
for (const [id, e] of Object.entries(batch)) console.log(id.padEnd(48), e.set.approach_logistics.trailhead.slice(0, 40).padEnd(40), e.set.approach_logistics.trailheadLat, e.set.approach_logistics.trailheadLng, "sibEv", e.review.siblingEvidence, e.review.printedAgrees ? "printed✓" : "");
