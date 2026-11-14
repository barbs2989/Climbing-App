// Apply research verdicts (BRIEF.md) in three stages, in this order, because the track rule reads the pins:
//   node apply-verdicts.mjs pins   <verdictsDir> [--write]   move/add Trailhead + Summit pins
//   node apply-verdicts.mjs tracks <verdictsDir> <gpxOutDir> <harvest.json>...   -> writes GPX files +
//        decisions.json for ../gpx-tracks-fkt/apply.mjs (which does the paced write, rollback, reconcile)
//   node apply-verdicts.mjs facts  <verdictsDir> <harvest.json>... [--write]   trip-report facts
// Dry run unless --write. Every write: rollback file first, patchRow (exactly one row), re-read after.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, selectAll } from "../../lib/supabase-env.mjs";
import { shoutedStrings } from "../../lib/shouted-prose.mjs";
import { haversineM } from "../gpx-tracks-fkt/rule.mjs";
import { duplicateIn, sameTrack, stackedPin } from "./dedupe.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const [stage, vDir, ...rest] = process.argv.slice(2);
const WRITE = rest.includes("--write");
const args = rest.filter(a => a !== "--write");
const verdicts = fs.readdirSync(vDir).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(path.join(vDir, f), "utf8")));
// holds.json (beside the verdicts dir): { "tracks": { route_id: why }, "pins": {...}, "facts": {...} } —
// the reviewer's overrides. A held item is never applied.
const holdFile = path.join(path.dirname(path.resolve(vDir)), "holds.json");
const HOLD = fs.existsSync(holdFile) ? JSON.parse(fs.readFileSync(holdFile, "utf8")) : {};
const held = (kind, id) => { const why = HOLD[kind]?.[id]; if (why) console.log(`HELD ${kind} ${id}: ${why}`); return !!why; };
const routesV = verdicts.flatMap(v => (v.routes || []).map(r => ({ ...r, area_id: v.area_id })));
// JSONB reorders object keys, so compare stored values by CONTENT, never by JSON text
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getRow(id, cols) {
  const rows = await selectAll("routes", cols, `id=eq.${encodeURIComponent(id)}`, { pageSize: 10 });
  if (rows.length !== 1) throw new Error(`${id}: ${rows.length} rows`);
  return rows[0];
}
// a SummitPost file id is "sp<f>": its GPX is sp-<f>; a Peakbagger ascent is pb-<aid>
const slugOf = aid => /^sp\d/.test(String(aid)) ? `sp-${String(aid).slice(2)}` : `pb-${aid}`;
function loadHarvest(files) {
  const found = r => r.pb && !r.pb.skip && r.pb.dm <= 2000;
  const m = new Map();
  // A SummitPost record (sp-to-harvest.mjs, carries spSections) is MERGED into the peak, never in place of it:
  // the multi-peak check must still see every Peakbagger track, and the facts check every page it may copy.
  const sp = [];
  for (const f of files) for (const rec of JSON.parse(fs.readFileSync(f, "utf8"))) { if (rec.spSections !== undefined) { sp.push(rec); continue; } if (found(rec) || !m.has(rec.area_id)) m.set(rec.area_id, rec); }
  for (const s of sp) { const rec = m.get(s.area_id); if (!rec) { m.set(s.area_id, s); continue; } rec.tracks = [...(rec.tracks || []), ...(s.tracks || [])]; rec.spSections = s.spSections; rec.spRoutes = s.spRoutes; }
  for (const rec of m.values()) if (Array.isArray(rec.tracks)) { const seen = new Set(); rec.tracks = rec.tracks.filter(t => !seen.has(String(t.aid)) && seen.add(String(t.aid))); }
  return m;
}
const rollback = (name, rows) => { const f = path.join(REPO, "scripts", `rollback-gpx-any-source-${name}-${Date.now()}.json`); fs.writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), note: "restore with patchRow(routes, id, before)", rows }, null, 1)); console.log("rollback saved", f); };

if (stage === "pins") {
  const plan = [];
  for (const r of routesV) for (const p of r.pins || []) {
    if (held("pins", r.route_id)) continue;
    if (!["Summit", "Trailhead"].includes(p.type) || !["move", "add"].includes(p.action) || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) { console.log("SKIP malformed pin", r.route_id, JSON.stringify(p)); continue; }
    if (p.type === "Trailhead" && !p.confirmedBy) { console.log("SKIP trailhead without a confirming source", r.route_id); continue; }
    plan.push({ id: r.route_id, area: r.area_id, p });
  }
  const byId = new Map(); for (const x of plan) (byId.get(x.id) || byId.set(x.id, []).get(x.id)).push(x);
  const writes = [];
  for (const [id, xs] of byId) {
    const row = await getRow(id, "id,area_id,waypoints");
    if (row.area_id !== xs[0].area) { console.log(`REFUSE ${id}: area ${row.area_id} != verdict ${xs[0].area}`); continue; }
    const before = row.waypoints || [];
    const wps = JSON.parse(JSON.stringify(before));
    for (const { p } of xs) {
      const same = wps.map((w, i) => ({ w, i })).filter(({ w }) => w.lat != null && new RegExp(p.type, "i").test(w.type || ""));
      if (p.action === "move") {
        if (!same.length) { console.log(`SKIP ${id}: no ${p.type} pin to move`); continue; }
        const near = same.sort((a, b) => haversineM([a.w.lat, a.w.lng], [p.lat, p.lng]) - haversineM([b.w.lat, b.w.lng], [p.lat, p.lng]))[0];
        const d = Math.round(haversineM([near.w.lat, near.w.lng], [p.lat, p.lng]));
        console.log(`${id.padEnd(50)} move ${p.type} ${d} m  -> ${p.lat},${p.lng}  (${(p.confirmedBy || p.evidence || "").slice(0, 70)})`);
        wps[near.i] = { ...near.w, lat: +(+p.lat).toFixed(6), lng: +(+p.lng).toFixed(6), ...(p.name && p.type === "Trailhead" ? { name: p.name } : {}) };
      } else {
        if (same.length) { console.log(`SKIP ${id}: add ${p.type} but one exists`); continue; }
        console.log(`${id.padEnd(50)} add  ${p.type} ${p.lat},${p.lng} ${p.name || ""}`);
        const pin = { type: p.type, name: p.name || p.type, lat: +(+p.lat).toFixed(6), lng: +(+p.lng).toFixed(6) };
        if (p.type === "Trailhead") wps.unshift(pin); else wps.push(pin);
      }
    }
    const stacked = wps.map(w => [w, stackedPin(w, wps)]).find(([w, o]) => o && !before.some(b => b.lat === w.lat && b.lng === w.lng && b.type === w.type));
    if (stacked) { console.log(`REFUSE ${id}: ${stacked[0].type} "${stacked[0].name}" would sit on "${stacked[1].name}" (${stacked[1].type}), a duplicate pin`); continue; }
    if (JSON.stringify(wps) !== JSON.stringify(before)) writes.push({ id, before, after: wps });
  }
  console.log(`pin writes planned: ${writes.length}`);
  if (!WRITE) process.exit(0);
  rollback("pins", writes.map(w => ({ id: w.id, before: { waypoints: w.before } })));
  let bad = 0;
  for (const w of writes) { await patchRow("routes", w.id, { waypoints: w.after }); await sleep(1000); }
  for (const w of writes) { const now = await getRow(w.id, "id,waypoints"); if (canon(now.waypoints) !== canon(w.after)) { bad++; console.log("RECONCILE", w.id); } }
  console.log(`pins written ${writes.length}, reconcile problems ${bad}`);
}

if (stage === "tracks") {
  const [gpxDir, ...files] = args;
  const harvest = loadHarvest(files);
  fs.mkdirSync(gpxDir, { recursive: true });
  const decisions = [];
  // One GPS file logged as ascents of SEVERAL peaks (an Inspiration Traverse logged once per summit, found
  // 2026-11-04 on Primus + Klawatti) is a multi-peak line: refuse it on every peak. Index each harvested
  // track by its rounded first point so the geometry compare stays cheap.
  const startKey = p => `${(+p[0]).toFixed(4)},${(+p[1]).toFixed(4)}`;
  const byStart = new Map();
  for (const [area, rec] of harvest) for (const x of rec.tracks || []) if (x.pts?.length >= 10) (byStart.get(startKey(x.pts[0])) || byStart.set(startKey(x.pts[0]), []).get(startKey(x.pts[0]))).push({ area, x });
  const otherPeak = (area, tr) => (byStart.get(startKey(tr.pts[0])) || []).find(o => o.area !== area && sameTrack(tr.pts.map(p => [p[0], p[1]]), o.x.pts.map(p => [p[0], p[1]])));
  for (const r of routesV) {
    const t = r.track;
    if (!t || t.verdict !== "same" || t.inSeason !== true || held("tracks", r.route_id)) continue;
    const tr = (harvest.get(r.area_id)?.tracks || []).find(x => String(x.aid) === String(t.aid));
    if (!tr?.pts || tr.pts.length < 10) { console.log("SKIP no points", r.route_id, t.aid); continue; }
    const op = otherPeak(r.area_id, tr);
    if (op) { console.log(`REFUSE ${r.route_id}: ascent ${t.aid}'s GPS file is also logged on ${op.area} (ascent ${op.x.aid}) — a multi-peak line`); continue; }
    if (!/Successful Summit/i.test((tr.stats || []).find(s => s[1] === "Ascent Type")?.[2] || "")) { console.log("SKIP not a logged summit", r.route_id, t.aid); continue; }
    const slug = slugOf(t.aid);
    // no <time>: a party's elapsed time is never shown
    const xml = `<?xml version="1.0"?>\n<gpx version="1.1" creator="climbmatch"><trk><trkseg>\n${tr.pts.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}">${p[2] != null ? `<ele>${p[2]}</ele>` : ""}</trkpt>`).join("\n")}\n</trkseg></trk></gpx>\n`;
    fs.writeFileSync(path.join(gpxDir, slug + ".gpx"), xml);
    decisions.push({ id: r.route_id, slug, fktTitle: /^sp/.test(String(t.aid)) ? `summitpost gpx ${String(t.aid).slice(2)}` : `peakbagger ascent ${t.aid}`, why: (t.why || "").slice(0, 300), ...(t.kind === "oneway" ? { tier: "oneway" } : {}) });
  }
  const byAid = new Map(); for (const d of decisions) (byAid.get(d.slug) || byAid.set(d.slug, []).get(d.slug)).push(d.id);
  for (const [slug, ids] of byAid) if (ids.length > 1) { console.log(`REFUSE ${slug}: one recording chosen for ${ids.join(", ")} — two routes cannot share one track (are they one route?)`); }
  const kept = [];
  for (const d of decisions.filter(d => byAid.get(d.slug).length === 1)) {
    const v = routesV.find(r => r.route_id === d.id), pts = (harvest.get(v.area_id)?.tracks || []).find(x => slugOf(x.aid) === d.slug).pts;
    const sibs = await selectAll("routes", "id,gpx", `area_id=eq.${encodeURIComponent(v.area_id)}&id=neq.${encodeURIComponent(d.id)}&gpx=not.is.null`, { pageSize: 200 });
    const twin = sibs.find(x => sameTrack(pts.map(p => [p[0], p[1]]), x.gpx));
    if (twin) { console.log(`REFUSE ${d.id}: ${d.slug} is already the stored track of ${twin.id}`); continue; }
    kept.push(d);
  }
  decisions.length = 0; decisions.push(...kept);
  fs.writeFileSync(path.join(gpxDir, "decisions.json"), JSON.stringify(decisions, null, 1));
  console.log(`decisions ${decisions.length} -> ${path.join(gpxDir, "decisions.json")}; next: FKT_GPX_DIR=${gpxDir} node scripts/oneoff/gpx-tracks-fkt/apply.mjs ${path.join(gpxDir, "decisions.json")} [--write]`);
}

if (stage === "facts") {
  const harvest = loadHarvest(args);
  const words = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
  const grams = (s, n) => { const w = words(s), g = new Set(); for (let i = 0; i + n <= w.length; i++) g.add(w.slice(i, i + n).join(" ")); return g; };
  const MON = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const LIST = { watch_out: "watch_out", pro_tips: "pro_tips", what_to_bring: "what_to_bring" };
  const writes = [], refused = [];
  for (const r of routesV) {
    const facts = (r.facts || []).filter(f => f && typeof f.text === "string" && f.text.trim());
    if (!facts.length || held("facts", r.route_id)) continue;
    const hv = harvest.get(r.area_id);
    // every text a fact could have been copied from: the trip reports AND the SummitPost peak + route pages
    const reports = [...(hv?.tracks || []).map(t => t.tr || ""), ...Object.values(hv?.spSections || {}), ...(hv?.spRoutes || []).flatMap(x => Object.values(x.sections || {}))].join("\n");
    const repGrams = grams(reports, 6);
    const row = await getRow(r.route_id, "id,area_id,watch_out,pro_tips,what_to_bring,seasonal_guidance,approach,descent_text");
    if (row.area_id !== r.area_id) { console.log(`REFUSE ${r.route_id}: area mismatch`); continue; }
    const after = {}, cur = k => after[k] ?? row[k];
    for (const f of facts) {
      const text = f.text.trim().replace(/\s+/g, " ");
      if ((HOLD.factText || []).some(x => text.includes(x))) { refused.push([r.route_id, "held by reviewer: " + text.slice(0, 50)]); continue; }
      const copied = [...grams(text, 6)].find(g => repGrams.has(g));
      if (copied) { refused.push([r.route_id, "copied: " + copied]); continue; }
      if (shoutedStrings(text).length) { refused.push([r.route_id, "shouted"]); continue; }
      if (/\b(peakbagger|summitpost|trip report|according to|reported by)\b/i.test(text)) { refused.push([r.route_id, "names a source"]); continue; }
      const dup = duplicateIn(text, [cur("watch_out"), cur("pro_tips"), cur("what_to_bring"), cur("approach"), cur("descent_text"), Object.values(cur("seasonal_guidance")?.monthBreakdown || {}).map(m => m && typeof m === "object" ? m.reason : m)]);
      if (dup) { refused.push([r.route_id, `duplicate of "${String(dup).slice(0, 60)}"`]); continue; }
      if (LIST[f.field]) {
        if (text.length > 160) { refused.push([r.route_id, "list item too long"]); continue; }
        const list = Array.isArray(cur(f.field)) ? cur(f.field) : [];
        if (list.some(x => String(x).toLowerCase() === text.toLowerCase())) continue;
        after[f.field] = [...list, text];
      } else if (f.field === "monthBreakdown") {
        const m = +f.month; if (!(m >= 1 && m <= 12)) { refused.push([r.route_id, "monthBreakdown without a month"]); continue; }
        const sg = JSON.parse(JSON.stringify(cur("seasonal_guidance") || {}));
        const mb = sg.monthBreakdown && typeof sg.monthBreakdown === "object" && !Array.isArray(sg.monthBreakdown) ? sg.monthBreakdown : {};
        const key = Object.keys(mb).find(k => k.toLowerCase().startsWith(MON[m].toLowerCase().slice(0, 3))) || MON[m];
        // the panel reads a month as {status, reason}: append to the REASON, never String() the object
        // (that wrote "[object Object]" over 44 months' status and reason; repair-month-objects.mjs)
        const m0 = mb[key], why = m0 && typeof m0 === "object" ? String(m0.reason || "") : String(m0 || "");
        if (why.toLowerCase().includes(text.toLowerCase())) continue; // already written (a re-run)
        const reason = why ? `${why.trim().replace(/[.;,]?$/, ".")} ${text}` : text;
        mb[key] = m0 && typeof m0 === "object" ? { ...m0, reason } : { reason };
        sg.monthBreakdown = mb; after.seasonal_guidance = sg;
      } else if (f.field === "approach_note" || f.field === "descent_note") {
        const col = f.field === "approach_note" ? "approach" : "descent_text";
        if (text.length > 400) { refused.push([r.route_id, "note too long"]); continue; }
        const base = cur(col) || "";
        if (base.toLowerCase().includes(text.toLowerCase())) continue;
        after[col] = base ? `${base.trim()} ${text}` : text;
      } else refused.push([r.route_id, "unknown field " + f.field]);
    }
    if (Object.keys(after).length) writes.push({ id: r.route_id, before: Object.fromEntries(Object.keys(after).map(k => [k, row[k] ?? null])), after });
  }
  for (const w of writes) console.log(w.id.padEnd(50), Object.keys(w.after).join(","));
  for (const [id, why] of refused) console.log("REFUSED", id, why);
  console.log(`fact writes planned ${writes.length}, refused ${refused.length}`);
  if (!WRITE) process.exit(0);
  rollback("facts", writes.map(w => ({ id: w.id, before: w.before })));
  let bad = 0;
  for (const w of writes) { await patchRow("routes", w.id, w.after); await sleep(1000); }
  for (const w of writes) { const now = await getRow(w.id, "id," + Object.keys(w.after).join(",")); for (const k of Object.keys(w.after)) if (canon(now[k]) !== canon(w.after[k])) { bad++; console.log("RECONCILE", w.id, k); } }
  console.log(`fact rows written ${writes.length}, reconcile problems ${bad}`);
}
