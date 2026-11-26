// Load the TOWN CATALOG (`places`, migration 0544) that the profile's Home city box searches.
//
// Every input is public domain or CC0, so the app owes nobody an on-screen credit (owner rule:
// credit only where a licence requires it -- OpenStreetMap/GeoNames (ODbL, CC-BY) and Statistics
// Canada / NRCan (OGL-Canada) all require one, so none of them is used):
//
//   US towns   2025 Census Gazetteer places (incorporated places + CDPs), public domain
//     curl -sSfLO https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_place_national.zip
//   US ranking 2024 population estimates (incorporated places) and the 2010 Gazetteer's POP10 (CDPs)
//     curl -sSfL -o subest.csv https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv
//     curl -sSfLO https://www2.census.gov/geo/docs/maps-data/data/gazetteer/Gaz_places_national.zip
//   US county  https://www2.census.gov/geo/docs/reference/codes2020/national_place_by_county2020.txt
//   US hamlets USGS GNIS populated places (Mazama WA is in no Census file), public domain
//     curl -sSfLO https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames/Topical/PopulatedPlaces_National_Text.zip
//   Canada     Wikidata (CC0): census subdivisions (ca.csv) and settlements (ca_settle.csv) --
//              the two SPARQL queries are in docs/features/profile-and-settings.md.
//
//   node scripts/oneoff/load-places.mjs <dir-holding-the-unzipped-files> [--dry] [--json out.json]
//
// The pop column is a RANKING key only ("Springfield" lists the big one first); it is never shown.
// Writes are 1,000-row upserts paced 1.5 s apart (owner's throttle rule), backing off 90 s on any
// error and stopping after three; the table is COUNTED afterwards and the run fails unless every
// parsed row is there. Idempotent: a re-run upserts the same ids.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const dry = process.argv.includes("--dry");
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
if (!dir) { console.error("usage: node scripts/oneoff/load-places.mjs <dir> [--dry] [--json out.json]"); process.exit(1); }
const rd = (f) => fs.readFileSync(path.join(dir, f), "utf8").replace(/^﻿/, "");
const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };

// The 50 states, as the profile editor's dropdown offers them (US_ST): a town in a state the
// dropdown cannot show would save a label the editor cannot read back.
const ST = { AL:1,AK:2,AZ:4,AR:5,CA:6,CO:8,CT:9,DE:10,FL:12,GA:13,HI:15,ID:16,IL:17,IN:18,IA:19,KS:20,KY:21,LA:22,ME:23,MD:24,MA:25,MI:26,MN:27,MS:28,MO:29,MT:30,NE:31,NV:32,NH:33,NJ:34,NM:35,NY:36,NC:37,ND:38,OH:39,OK:40,OR:41,PA:42,RI:44,SC:45,SD:46,TN:47,TX:48,UT:49,VT:50,VA:51,WA:53,WV:54,WI:55,WY:56 };
const FIPS = Object.fromEntries(Object.entries(ST).map(([k, v]) => [String(v).padStart(2, "0"), k]));

// The Census writes its legal description into the name ("Seattle city", "Abanda CDP"). A
// consolidated government's name is not what anyone types, so those few are spelled out.
const OVERRIDE = { "0947515": "Milford", "1234132": "Islamorada", "1303440": "Athens", "1304204": "Augusta", "1321017": "Cusseta", "1326156": "Echols County", "1332528": "Georgetown", "1349008": "Macon", "1381128": "Webster County", "1836003": "Indianapolis", "2028412": "Greeley County", "2146027": "Lexington", "2148006": "Louisville", "3001675": "Anaconda", "3011397": "Butte", "4732742": "Hartsville", "4744382": "Lynchburg", "4752006": "Nashville" };
const SUFFIX = / (city and borough|city|town|village|borough|CDP|municipality|corporation|metro township|plantation|urban county|unified government|consolidated government|metropolitan government|metro government)( \(balance\))?$/;
const cleanName = (geoid, n) => OVERRIDE[geoid] || n.replace(/ \(balance\)$/, "").replace(SUFFIX, "").trim();

const tsv = (txt, sep) => { const L = txt.split(/\r?\n/).filter((l) => l.trim()); const h = L.shift().split(sep).map((s) => s.trim()); return L.map((l) => { const f = l.split(sep).map((s) => s.trim()); return Object.fromEntries(h.map((k, i) => [k, f[i]])); }); };
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r * Math.cos(((a + c) / 2) * r); return R * Math.sqrt(x * x + y * y); };
const key = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\bsaint\b/g, "st").replace(/\bmount\b/g, "mt").replace(/\bfort\b/g, "ft").replace(/[^a-z0-9]+/g, " ").trim();

// ── US: Census places ──
const gaz = tsv(rd("2025_Gaz_place_national.txt"), "|");
if (gaz.length < 32000) fail("2025 Gazetteer parsed only " + gaz.length + " places (~32,300 expected)");
const pop24 = {};
for (const r of tsv(rd("subest.csv"), ",")) if (r.SUMLEV === "162") pop24[r.STATE + r.PLACE] = Number(r.POPESTIMATE2024);
const pop10 = {};
for (const r of tsv(rd("Gaz_places_national.txt"), "\t")) pop10[r.GEOID] = Number(r.POP10);
const counties = {};
for (const r of tsv(rd("national_place_by_county2020.txt"), "|")) (counties[r.STATEFP + r.PLACEFP] ||= []).push(r.COUNTYNAME);
const countyLabel = (cs) => !cs || !cs.length ? null : cs.length === 1 ? cs[0] : cs.length === 2 ? cs[0].replace(/ County$/, "") + " & " + cs[1] : cs.length + " counties";

const rows = [], byKey = {}, ansi = new Set();
for (const g of gaz) {
  if (!ST[g.USPS]) continue;
  const lat = Number(g.INTPTLAT), lng = Number(g.INTPTLONG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !/^\d{7}$/.test(g.GEOID)) fail("unparseable Census row " + JSON.stringify(g));
  const name = cleanName(g.GEOID, g.NAME);
  if (!name) fail("empty name for " + g.GEOID);
  const pop = pop24[g.GEOID] ?? pop10[g.GEOID] ?? null;
  const row = { id: "us-" + g.GEOID, name, region: g.USPS, country: "US", county: countyLabel(counties[g.GEOID]), pop: Number.isFinite(pop) ? pop : null, lat, lng };
  rows.push(row); ansi.add(Number(g.ANSICODE));
  (byKey[g.USPS + "|" + key(name)] ||= []).push(row);
}
const nCensus = rows.length;

// ── US: GNIS hamlets the Census does not draw ──
let nGnis = 0, nGnisDup = 0;
for (const r of tsv(rd("PopulatedPlaces_National.txt"), "|")) {
  const st = FIPS[r.state_numeric];
  if (!st) continue;
  const lat = Number(r.prim_lat_dec), lng = Number(r.prim_long_dec);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
  if (ansi.has(Number(r.feature_id))) { nGnisDup++; continue; }
  // The same town drawn twice -- the Census place and the GNIS point -- would list "Seattle, WA" twice.
  const twins = byKey[st + "|" + key(r.feature_name)] || [];
  if (twins.some((t) => km(lat, lng, t.lat, t.lng) < 10)) { nGnisDup++; continue; }
  const row = { id: "us-gnis-" + r.feature_id, name: r.feature_name, region: st, country: "US", county: r.county_name ? r.county_name + (/(County|Parish|Borough|Census Area|Municipality|city)$/.test(r.county_name) ? "" : " County") : null, pop: null, lat, lng };
  rows.push(row); nGnis++;
  (byKey[st + "|" + key(row.name)] ||= []).push(row);
}

// ── Canada: Wikidata census subdivisions, then settlements ──
const PROV = { "10": "NL", "11": "PE", "12": "NS", "13": "NB", "24": "QC", "35": "ON", "46": "MB", "47": "SK", "48": "AB", "59": "BC", "60": "YT", "61": "NT", "62": "NU" };
const csvRows = (txt) => txt.trim().split(/\r?\n/).slice(1).map((l) => { const out = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; });
const pt = (s) => { const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(s || ""); return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null; };
// Not a town: a regional district's electoral area ("Squamish-Lillooet A"), an unorganized remainder,
// a numbered census division part, or an item with no English label (Wikidata prints its Q-id).
const notTown = (n) => !n || /^Q\d+$/.test(n) || /\bunorganized\b|\bsubd(ivision|\.)|^division no|\s[A-Z]$|\bno\. ?\d+$/i.test(n);
const csd = [], csdById = {};
let nCa = 0;
for (const [item, label, code, coord, pop] of csvRows(rd("ca.csv"))) {
  const p = pt(coord), pr = PROV[String(code).slice(0, 2)];
  if (!p || !pr || notTown(label)) continue;
  const row = { id: "ca-" + code, name: label, region: pr, country: "CA", county: null, pop: pop ? Math.round(Number(pop)) : null, lat: p.lat, lng: p.lng };
  // Two Wikidata items can carry one census code (a renamed or merged municipality): keep the one
  // with a population, else the first.
  const had = csdById[row.id];
  if (had) { if (had.pop == null && row.pop != null) Object.assign(had, row); continue; }
  csdById[row.id] = row;
  rows.push(row); csd.push(row); nCa++;
  (byKey[pr + "|" + key(label)] ||= []).push(row);
  void item;
}
if (nCa < 3000) fail("Canada census subdivisions parsed only " + nCa);
// A settlement carries no province in the query that finishes (the one that asked timed out), so it
// takes the province of the census subdivisions around it -- and is LEFT OUT unless the three
// nearest all lie in one province within 40 km. A wrong province is worse than a missing hamlet:
// the box still takes the town as typed.
let nCaSet = 0, nCaAmb = 0;
const grid = {}, cell = (la, ln) => Math.floor(la) + "," + Math.floor(ln);
for (const c of csd) (grid[cell(c.lat, c.lng)] ||= []).push(c);
const around = (la, ln) => { const out = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push(...(grid[cell(la + a, ln + b)] || [])); return out; };
for (const [item, label, coord, pop] of csvRows(rd("ca_settle.csv"))) {
  const p = pt(coord);
  if (!p || notTown(label) || p.lat < 41 || p.lat > 84 || p.lng > -52 || p.lng < -142) continue;
  const near = around(p.lat, p.lng).map((c) => [km(p.lat, p.lng, c.lat, c.lng), c.region]).sort((a, b) => a[0] - b[0]).slice(0, 3);
  if (near.length < 3 || near[2][0] > 40 || new Set(near.map((x) => x[1])).size !== 1) { nCaAmb++; continue; }
  const pr = near[0][1];
  if ((byKey[pr + "|" + key(label)] || []).some((t) => km(p.lat, p.lng, t.lat, t.lng) < 10)) continue;
  const id = "ca-wd-" + item.replace(/^.*\//, "").toLowerCase();
  const row = { id, name: label, region: pr, country: "CA", county: null, pop: pop ? Math.round(Number(pop)) : null, lat: p.lat, lng: p.lng };
  rows.push(row); nCaSet++;
  (byKey[pr + "|" + key(label)] ||= []).push(row);
}

const ids = new Set();
for (const r of rows) { if (ids.has(r.id)) fail("duplicate id " + r.id); ids.add(r.id); if (r.name.length > 120) fail("name too long " + r.id); }
console.log(JSON.stringify({ census: nCensus, gnis: nGnis, gnisDropped: nGnisDup, canadaCsd: nCa, canadaSettlements: nCaSet, canadaSettlementsNoSureProvince: nCaAmb, total: rows.length }));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows));
if (dry) process.exit(0);

const { requireServiceKey, SUPABASE_URL } = await import("../lib/supabase-env.mjs");
const sk = requireServiceKey();
const H = { apikey: sk, Authorization: "Bearer " + sk, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const start = Number((process.argv.find((a) => a.startsWith("--from=")) || "--from=0").slice(7));
let errors = 0;
for (let i = start; i < rows.length; i += 1000) {
  const t0 = Date.now();
  let res;
  try { res = await fetch(SUPABASE_URL + "/rest/v1/places?on_conflict=id", { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + 1000)) }); } catch (e) { res = { ok: false, status: 0, text: async () => String(e) }; }
  const ms = Date.now() - t0;
  if (!res.ok) {
    errors++; console.error("batch " + i + " failed " + res.status + " " + (await res.text()).slice(0, 200));
    if (errors >= 3) fail("three failed batches -- stopping; resume with --from=" + i);
    await sleep(90000); i -= 1000; continue;
  }
  if (ms > 10000) { console.error("batch " + i + " took " + ms + " ms -- backing off 90 s"); await sleep(90000); }
  if (i % 20000 === 0) console.log("upserted through " + (i + 1000) + " (" + ms + " ms)");
  await sleep(1500);
}
const c = await fetch(SUPABASE_URL + "/rest/v1/places?select=id&limit=1", { headers: { ...H, Prefer: "count=exact" } });
const total = Number((c.headers.get("content-range") || "").split("/")[1]);
console.log("places now holds " + total + " rows");
if (total < rows.length) fail("expected at least " + rows.length);
