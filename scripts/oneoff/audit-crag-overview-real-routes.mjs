#!/usr/bin/env node
// Audit of #2223/#2225 against REAL catalog rows, not fixtures: crag routes put the Plan body on
// Overview, show crag + parking coordinates with Google/Apple directions, and list every discipline
// fact (missing ones as "Not on file yet"); empty sections are discipline-gated placeholders.
// Samples N routes per discipline from the live DB (service key), hydrates them through the app's
// own dbRouteToCamel, renders Overview / Plan / Safety server-side and checks each promise.
// Usage: node scripts/oneoff/audit-crag-overview-real-routes.mjs [perDiscipline=12]
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const N = +process.argv[2] || 12;
const dir = fs.mkdtempSync(path.join(ROOT, ".cm-audit-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });
const entry = path.join(dir, "entry.js"), out = path.join(dir, "bundle.mjs");
fs.writeFileSync(entry, [
  `export { default as RouteDetail, SuggestFix } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`,
  `export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib", "db.js"))};`,
  `export { trailheadPoint, catOf, enrichRoute } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`,
  `export { SeasonalGuidancePanel, CrowdsPanel } from ${JSON.stringify(path.join(ROOT, "EnrichmentPanels.jsx"))};`,
].join("\n"));
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}", "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("no realtime"); } };
const _err = console.error; console.error = (...a) => { if (!String(a[0]).includes("useLayoutEffect")) _err(...a); };
// SuggestFix portals into document.body. Stub the portal BEFORE the bundle's react-dom facade exists,
// and give it a body only while the form renders, so RouteDetail itself still renders without a DOM.
{ const { createRequire } = await import("node:module"); const rd = createRequire(path.join(ROOT, "package.json"))("react-dom"); rd.createPortal = (c) => c; }
const { RouteDetail, SuggestFix, dbRouteToCamel, trailheadPoint, catOf, enrichRoute, SeasonalGuidancePanel, CrowdsPanel } = await import(out);
const SRC = ["ClimbMatch.jsx", "lib/db.js", "lib/offline.js", "RouteDetail.jsx"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
// LOAD PATHS. A route reaches the page three ways, and each builds _dbArea itself: the area browser
// (dbRouteToCamel over this file's SEL), a shared ?route= link / offline pack / other queries (dbRouteToCamel
// over THEIR OWN areas() embed), and search/RPC rows (no embed; fetchRouteArea fills it in). A field added
// to one and not the others shows when browsing and vanishes from a link — the walk-in did, #2236/#2237.
// Every embed in the app source is replayed below, and the REAL fetchRouteArea runs against a stub client.
const EMBEDS = [...new Set([...SRC.matchAll(/\*, areas\([^"`]*?parent:parent_id\(name\)\)/g)].map((m) => m[0]))];
const FRA = (() => { const m = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8").match(/export async function fetchRouteArea\(routeId\) \{[\s\S]*?\n\}/); if (!m) throw new Error("fetchRouteArea not found in lib/db.js"); return m[0].replace(/^export /, ""); })();

const key = requireServiceKey();
const SEL = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,approach,approach_min,rock,rock_basis,aspect,parent:parent_id(name))";
const get = async (qs) => { for (let i = 0; ; i++) { const r = await fetch(SUPABASE_URL + "/rest/v1/routes?" + qs, { headers: headers(key) }); if (r.ok) return r.json(); const b = (await r.text()).slice(0, 200); if (i >= 4 || !/57014/.test(b)) throw new Error(r.status + " " + b); await new Promise((z) => setTimeout(z, 3000 * (i + 1))); } }; // statement timeouts under load: retry
const rnd = () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)] + "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
async function sample(filter, n) {
  // ids first (cheap), then the rows with the areas embed by id — the embed over a filtered scan
  // hits the statement timeout.
  const ids = [];
  for (let t = 0; t < 4 && ids.length < n; t++) ids.push(...(await get(`select=id&${filter}&id=gte.${rnd()}&order=id&limit=${n - ids.length}`)).map((x) => x.id));
  if (!ids.length) return [];
  return get(`select=${encodeURIComponent(SEL)}&id=in.(${ids.map((i) => '"' + i + '"').join(",")})`);
}
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false, enabled: false } } });
const noop = () => {};
const render = (route, tab) => renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
  React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop, contribs: [], myReports: [], connections: [], comments: {},
    hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const segs = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, "\n").split("\n").map((x) => x.trim()).filter(Boolean);
const count = (s, re) => (s.match(re) || []).length;

const CRAG = ["trad", "sport", "toprope", "aid", "bouldering"];
const WANT = { bouldering: ["Location", "Landing", "Crash pads", "Start", "Aspect", "Season", "Rock quality", "Wet"],
  sport: ["Location", "Bolts", "Protection", "Anchor", "Aspect", "Season", "Rock quality", "Wet"],
  trad: ["Location", "Protection", "Anchor", "Aspect", "Season", "Rock quality", "Wet", "Fixed gear"],
  toprope: ["Location", "Anchor", "Aspect", "Season", "Rock quality", "Wet"],
  aid: ["Location", "Anchor", "Aspect", "Season", "Rock quality", "Wet", "Fixed gear"] };
const FOREIGN = { bouldering: ["Bolts", "Anchor", "Protection", "Fixed gear"], sport: ["Landing", "Crash pads", "Start", "Fixed gear"],
  trad: ["Landing", "Crash pads", "Start", "Bolts"], toprope: ["Landing", "Crash pads", "Start", "Bolts", "Protection", "Fixed gear"],
  aid: ["Landing", "Crash pads", "Start", "Bolts", "Protection"] };
const SECTIONS = ["GETTING THERE", "APPROACH", "DESCENT", "ROUTE TRACK", "ROUTE FACTS", "CLIMATE & SEASON", "ROUTE BREAKDOWN", "ACCESS & REGULATIONS", "RACK", "CRAG", "PARKING"];

const stub = { from: () => ({ select: (sel) => ({ eq: (_c, id) => ({ maybeSingle: async () => { const r = await get(`select=${encodeURIComponent(sel)}&id=eq.${encodeURIComponent(id)}`); return { data: r[0] || null, error: null }; } }) }) }) };
const fetchRouteArea = new Function("supabase", FRA + "; return fetchRouteArea;")(stub);
const PC = new Proxy({}, { get: () => "#000" });
const panels = (r, onAdd) => text(renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(SeasonalGuidancePanel, { route: r, C: PC, ActionIcon: () => null, onAdd }), React.createElement(CrowdsPanel, { route: r, reported: null, C: PC, ActionIcon: () => null, onAdd }))));
const problems = [];
const P = (id, d, m) => problems.push(`${d.padEnd(14)} ${id}: ${m}`);
let rendered = 0; const C = { loadPaths: 0, seasonPh: 0, crowdPh: 0, walkIn: 0, targetsChecked: 0, crag: 0, nonCrag: 0, withParking: 0, noParking: 0, linksChecked: 0, factsChecked: 0, noAreaCoord: 0 };
const discs = process.argv.includes("--crag-only") ? CRAG : [...CRAG, "alpine", "mountaineering", "scrambling", "ice", "mixed"];
const parkFilter = "approach_logistics->>trailheadLat=not.is.null";
for (const d of discs) {
  let rows = process.argv.includes("--all-parking") ? [] : await sample(`discipline=eq.${d}`, N);
  if (process.argv.includes("--all-parking") && CRAG.includes(d)) { const ids = (await get(`select=id&discipline=eq.${d}&${parkFilter}&limit=500`)).map((x) => x.id); for (let i = 0; i < ids.length; i += 40) rows.push(...await get(`select=${encodeURIComponent(SEL)}&id=in.(${ids.slice(i, i + 40).map((x) => '"' + x + '"').join(",")})`)); }
  if (CRAG.includes(d) && !process.argv.includes("--all-parking")) rows = rows.concat(await sample(`discipline=eq.${d}&${parkFilter}`, 3));
  // routes at crags that carry a WALK-IN (areas.approach): 220 areas, easy for a random sample to miss
  if (CRAG.includes(d) && !process.argv.includes("--all-parking")) { if (!globalThis._walkAreas) { const ar = await (await fetch(SUPABASE_URL + "/rest/v1/areas?select=id&approach=not.is.null&limit=500", { headers: headers(key) })).json(); globalThis._walkAreas = ar.map((x) => x.id); } const pick = globalThis._walkAreas.sort(() => Math.random() - 0.5).slice(0, 40); const wid = (await get(`select=id&discipline=eq.${d}&area_id=in.(${pick.map((x) => '"' + x + '"').join(",")})&limit=3`)).map((x) => x.id); if (wid.length) rows = rows.concat(await get(`select=${encodeURIComponent(SEL)}&id=in.(${wid.map((i) => '"' + i + '"').join(",")})`)); } // make sure parking is exercised
  for (const row of rows) {
    let r;
    try { r = dbRouteToCamel(row); } catch (e) { P(row.id, d, "dbRouteToCamel threw " + e.message); continue; }
    const crag = CRAG.includes(catOf(r));
    let ov, pl, sf;
    try { ov = render(r, "overview"); pl = render(r, "planner"); sf = render(r, "safety"); rendered++; }
    catch (e) { P(r.id, d, "render threw: " + String(e.message).slice(0, 150)); continue; }
    const t = text(ov), sg = segs(ov), ts = text(sf);
    for (const [nm, tt] of [["overview", t], ["safety", ts], ["planner", text(pl)]]) {
      for (const bad of [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\bnull\b(?! *(?:island|hypothesis))/]) if (bad.test(tt)) P(r.id, d, `${nm} prints ${bad}: …${tt.slice(Math.max(0, tt.search(bad) - 60), tt.search(bad) + 40)}…`);
    }
    const tabsHasPlan = sg.slice(0, 80).includes("Plan");
    if (crag) {
      C.crag++;
      if (tabsHasPlan) P(r.id, d, "crag route offers a Plan tab");
      // one copy of each section heading on Overview (sg segments equal to the heading)
      for (const h of SECTIONS) { const n = sg.filter((x) => x === h).length; if (n > 1) P(r.id, d, `section "${h}" appears ${n}x on Overview`); }
      if (count(t, /GETTING THERE/g) !== 1) P(r.id, d, `GETTING THERE x${count(t, /GETTING THERE/g)}`);
      // crag coordinate vs the area row
      const a = row.areas || {};
      const tp = trailheadPoint(r);
      const cragStr = a.lat != null && a.lng != null ? (+a.lat).toFixed(5) + ", " + (+a.lng).toFixed(5) : null;
      if (!cragStr) C.noAreaCoord++;
      if (cragStr && !t.includes(cragStr)) P(r.id, d, `crag coordinate ${cragStr} (area ${row.area_id}) not shown`);
      if (!cragStr && !tp) { if (/DIRECTIONS/.test(t)) P(r.id, d, "directions offered with no coordinate at all"); }
      if (!cragStr && t.includes("CRAG ") && !/No crag coordinates on file yet/.test(t) && tp) P(r.id, d, "no area coordinate but card does not say so");
      const hrefs = [...ov.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
      const g = hrefs.filter((h) => h.startsWith("https://www.google.com/maps/dir/"));
      const ap = hrefs.filter((h) => h.startsWith("https://maps.apple.com/"));
      const dest = tp ? { lat: +tp.lat, lng: +tp.lng } : (cragStr ? { lat: +a.lat, lng: +a.lng } : null);
      if (dest) {
        if (g.length !== 1 || ap.length !== 1) P(r.id, d, `expected 1 Google + 1 Apple link, got ${g.length}/${ap.length}`);
        else {
          const gd = new URL(g[0]).searchParams.get("destination"), ad = new URL(ap[0]).searchParams.get("daddr");
          const want = dest.lat + "," + dest.lng;
          if (gd !== want) P(r.id, d, `Google destination ${gd} != ${want}`);
          if (ad !== want) P(r.id, d, `Apple daddr ${ad} != ${want}`);
          C.linksChecked++;
          if (!isFinite(dest.lat) || Math.abs(dest.lat) > 90 || Math.abs(dest.lng) > 180) P(r.id, d, `destination out of range ${want}`);
        }
        if (tp) C.withParking++; else C.noParking++;
        if (tp) {
          const ps = (+tp.lat).toFixed(5) + ", " + (+tp.lng).toFixed(5);
          if (!t.includes(ps)) P(r.id, d, `parking coordinate ${ps} not shown`);
          if (/No parking spot on file yet/.test(t)) P(r.id, d, "has parking but says none on file");
          if (/these go to the crag itself/.test(t)) P(r.id, d, "has parking but shows the crag-fallback caveat");
        } else {
          if (!/No parking spot on file yet/.test(t)) P(r.id, d, "no parking and does not say so");
          if (!/these go to the crag itself/.test(t)) P(r.id, d, "directions fall back to the crag without the caveat");
        }
      }
      if (/Drive here/.test(t)) P(r.id, d, "TrailheadCard 'Drive here' renders on a crag (second drive control)");
      // ROUTE FACTS
      const want = WANT[catOf(r)] || [];
      C.factsChecked += want.length;
      for (const l of want) if (!sg.includes(l.toUpperCase()) && !sg.includes(l)) P(r.id, d, `ROUTE FACTS lacks "${l}"`);
      for (const l of FOREIGN[catOf(r)] || []) { const i = sg.findIndex((x) => x === l || x === l.toUpperCase()); if (i >= 0 && sg[i + 1] === "Not on file yet") P(r.id, d, `foreign fact "${l}" shown as a placeholder`); }
      if (/Not on file yet/.test(t) && !/Add what you know/.test(t)) P(r.id, d, "placeholders with no Add link");
      // discipline gating of placeholders
      const single = !(r.pitches > 1);
      if (catOf(r) === "bouldering" && /No rappel information|No protection information|No ropework notes|No turnaround guidance/.test(t + ts)) P(r.id, d, "boulder shows a roped-climbing placeholder");
      if (single && /No rappel information/.test(t)) P(r.id, d, "single-pitch crag line shows a rappel placeholder");
      if (/No turnaround guidance yet/.test(ts)) P(r.id, d, "crag route shows a turnaround placeholder");
      if (!/RACK|PADS/.test(t)) P(r.id, d, "no RACK/PADS card");
      const walk = String((r._dbArea && r._dbArea.approach) || "").trim();
      if (walk) { C.walkIn++; if (!/WALK-IN/.test(t)) P(r.id, d, "crag walk-in on file but no WALK-IN"); if (/No approach description/.test(t)) P(r.id, d, "says the approach is not written down beside the crag's walk-in"); }
      // every placeholder's Add button must open a field the contribute form OFFERS for this discipline
      // App mounts SEASONAL GUIDANCE and CROWDS on a crag's Overview: an empty one is a placeholder whose Add opens its field
      { const er = enrichRoute(r), pt = panels(er, noop), filled = panels(er, undefined);
        if (!/SEASONAL GUIDANCE/.test(pt)) P(r.id, d, "no SEASONAL GUIDANCE section (not even a placeholder)");
        if (/SEASONAL GUIDANCE/.test(filled) === /Add the best season/.test(pt)) P(r.id, d, "SEASONAL GUIDANCE: placeholder and content disagree"); else if (!/SEASONAL GUIDANCE/.test(filled)) C.seasonPh++;
        if (!/CROWDS & SOLITUDE/.test(pt)) P(r.id, d, "no CROWDS section (not even a placeholder)");
        if (/CROWDS & SOLITUDE/.test(filled) === /No crowd reports for this climb yet/.test(pt)) P(r.id, d, "CROWDS: placeholder and content disagree"); else if (!/CROWDS & SOLITUDE/.test(filled)) C.crowdPh++; }
      const targets = ["approachLogistics", "road", "comms", "seasonalGuidance", "crowds"].concat(catOf(r) === "bouldering" ? ["pads"] : catOf(r) === "sport" ? ["draws"] : ["rack"]);
      if (/No approach description/.test(t)) targets.push("approach");
      if (/No descent recorded/.test(t)) targets.push("descentText");
      if (/No rappel information/.test(t)) targets.push("rap");
      if (/No pitch-by-pitch breakdown/.test(t)) targets.push("pitchDetail");
      const FF = { Location: "location", Bolts: "bolts", Protection: "protRating", Anchor: "anchor", Aspect: "aspect", Season: "season", "Rock quality": "rockQuality", Wet: "wet", "Fixed gear": "fixedGear", Landing: "landing", "Crash pads": "pads", Start: "startType" };
      for (const l of WANT[catOf(r)] || []) targets.push(FF[l]);
      globalThis.document = { body: {} };
      let form; try { form = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc }, React.createElement(SuggestFix, { route: r, onClose: noop, onSubmit: noop, onLog: noop, scrollTo: null, pending: {}, prefill: null, approachSibs: [] }))); } finally { delete globalThis.document; }
      for (const k of [...new Set(targets)]) { C.targetsChecked++; if (!form.includes(`id="sf-section-${k}"`)) P(r.id, d, `an Add button opens "${k}", which the contribute form does not offer for ${catOf(r)}`); }
    } else {
      C.nonCrag++;
      if (!tabsHasPlan) P(r.id, d, "non-crag route lost its Plan tab");
      if (/DIRECTIONS TO PARKING|Copy crag coordinates/.test(ov + pl)) P(r.id, d, "CragLocationCard on a non-crag route");
      const tp = trailheadPoint(r);
      if (tp && !/Drive here/.test(text(pl))) P(r.id, d, "non-crag route with a trailhead lost Drive here on Plan");
      if (/Not on file yet/.test(t)) P(r.id, d, "ROUTE FACTS placeholders on a non-crag route");
      if (!r.turnaround && !/No turnaround guidance yet/.test(ts)) P(r.id, d, "empty turnaround has no placeholder");
      if (["scrambling"].includes(d) && /No ropework notes|No protection information/.test(text(pl))) P(r.id, d, "scramble shows a roped placeholder");
    }
    if (!/Cell \/ sat coverage|Cell coverage/.test(ts)) P(r.id, d, "no cell-coverage section on Safety");
    // the same route through every OTHER load path must render the same Overview
    if (crag) {
      for (const emb of EMBEDS) { const [alt] = await get(`select=${encodeURIComponent(emb)}&id=eq.${encodeURIComponent(row.id)}`); C.loadPaths++; if (text(render(dbRouteToCamel(alt), "overview")) !== t) P(r.id, d, `Overview differs when loaded with the embed "${emb.slice(0, 60)}…" (a shared link / pack / query path)`); }
      const bare = { ...row }; delete bare.areas; const viaSearch = dbRouteToCamel(bare); if (!viaSearch._dbArea) viaSearch._dbArea = await fetchRouteArea(row.id); C.loadPaths++;
      if (text(render(viaSearch, "overview")) !== t) { const k1 = Object.keys(r._dbArea || {}).filter((k) => !(k in (viaSearch._dbArea || {}))); P(r.id, d, "Overview differs when opened from search (fetchRouteArea)" + (k1.length ? " — it lacks " + k1.join(",") : "")); }
    }
  }
}
console.log(`rendered ${rendered} real routes x3 tabs`, JSON.stringify(C));
if (problems.length) { console.log(problems.length + " problem(s):"); for (const p of problems) console.log("  " + p); process.exit(1); }
if (!EMBEDS.length || !C.loadPaths || !C.seasonPh || !C.crowdPh || !C.withParking || (!C.noParking && !process.argv.includes("--all-parking")) || !C.linksChecked || (!C.nonCrag && !process.argv.includes("--crag-only") && !process.argv.includes("--all-parking"))) { console.log("VACUOUS: a branch of the audit was never exercised"); process.exit(2); }
console.log("audit: ok — every sampled route keeps every promise");
