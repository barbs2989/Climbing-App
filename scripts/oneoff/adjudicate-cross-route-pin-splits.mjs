// `audit:cross-route-pins` reports 14 WA names that two routes place 2 km or more apart, and it
// deliberately does NOT say which row is wrong: a majority can be one enrichment pass counted many
// times. This asks the two records that descend from neither — the USGS 3DEP ground and the
// federal gazetteer — and prints what they say about every cluster.
//
// IT ADJUDICATES NOTHING BY VOTE. The majority is printed because it is useful context and is
// explicitly NOT part of the verdict. CLAUDE.md records the case that settles the argument: for
// "Lake Constance" the ground fits the OUTLIER better than the four agreeing pins, so a vote would
// have repaired toward the weaker record.
//
// THE RULES ARE THE ONES THIS REPO ALREADY PAID FOR:
//
//   250 m       a gazetteer feature may only speak for a cluster it is essentially ON. Skagit
//               Queen was decidable because its feature was 7 m away; Boston Basin's was 1,051 m
//               away and describing a different place with the same name.
//   POINT-LIKE  a Summit/Gap/Lake/Falls/Camp coordinate IS the place. A Stream/Ridge/Basin/Flat
//               coordinate is a cartographic LABEL somewhere along an extent, and cannot locate
//               anything. Triage by feature class BEFORE distance.
//   SEPARATION  a cluster is only credible if the ground admits its stated elevation and REFUSES
//               the others by a clear margin. Two clusters the terrain both admits is a question
//               finer than the instrument, and the honest answer is "undecided".
//   UPPER()     ArcGIS LIKE is case-sensitive. Lower-casing a search term returned NOTHING for 25
//               pins once and reported them all as climbers' names — plausible, uniform, wrong.
//
// Read-only. Writes nothing, recommends nothing it cannot show its working for.
import { selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";
import { gnis } from "./probe-gnis-reachable.mjs";
import { readFileSync } from "node:fs";

// LIFT the audit's own selectors rather than re-implementing them. A first version of this probe
// re-derived the clusters and reported 53 names where the audit reports 14 — it had skipped the
// POINT/EXTENT split and the namesake cutoff, so it flagged "High Camp" on two mountains 251 km
// apart as a disagreement. That is correct data, and a second classifier disagreeing with a guard
// is far more likely to be the second classifier. Same lesson as the citation map earlier today.
const AUDIT = readFileSync(new URL("../audit-cross-route-pins.mjs", import.meta.url), "utf8");
const lift = (name) => {
  const i = AUDIT.indexOf(`const ${name} = /`);
  if (i < 0) { console.error(`ANCHOR LOST: ${name} in audit-cross-route-pins.mjs`); process.exit(1); }
  const line = AUDIT.slice(i, AUDIT.indexOf("\n", i));
  return eval(line.slice(line.indexOf("/")).replace(/;\s*$/, ""));
};
const POINT = lift("POINT"), EXTENT = lift("EXTENT");
const NAMESAKE_KM = Number((AUDIT.match(/--namesake-km",\s*"(\d+)"/) || [])[1]);
if (!Number.isFinite(NAMESAKE_KM)) { console.error("ANCHOR LOST: --namesake-km default"); process.exit(1); }

const STATE = (process.argv.find((a) => a.startsWith("--state=")) || "--state=wa").split("=")[1];
const NEAR_M = 250;          // a feature further than this is a different place with the same name
const SPLIT_KM = 2;          // the audit's own candidate threshold
const CLUSTER_M = 300;

// A label point cannot locate an edge. Same list the camp solver uses, and for the same reason.
const LINEAR = /stream|ridge|basin|flat|valley|range|area|swamp|woods|bench|bar|channel|arroyo|canal|cliff|slope/i;

const corrobOf = (n) => !!(n && n.d <= NEAR_M);
const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const rows = await selectAll("routes", "id,waypoints", `id=like.${STATE}_*`, { pageSize: 1000 });
if (rows.length < 500) { console.error(`read only ${rows.length} routes - refusing`); process.exit(1); }

// Rebuild the audit's clusters rather than parsing its text, so this cannot drift from what it
// reports without one of the two failing loudly.
const byName = new Map();
for (const r of rows) {
  for (const w of Array.isArray(r.waypoints) ? r.waypoints : []) {
    const nm = String((w || {}).name || "").trim();
    const la = num(w && w.lat), ln = num(w && w.lng);
    if (!nm || la === null || ln === null) continue;
    if (!byName.has(nm)) byName.set(nm, []);
    byName.get(nm).push({ id: r.id, lat: la, lng: ln, elev: num(w.elev), type: String(w.type || "") });
  }
}
if (!byName.size) { console.error("no named placed pins - refusing"); process.exit(1); }

const candidates = [];
for (const [nm, pins] of byName) {
  if (new Set(pins.map((p) => p.id)).size < 2) continue;
  const cl = [];
  for (const p of pins) {
    const g = cl.find((c) => D(c.lat, c.lng, p.lat, p.lng) < CLUSTER_M);
    if (g) g.pins.push(p); else cl.push({ lat: p.lat, lng: p.lng, pins: [p] });
  }
  if (cl.length < 2) continue;
  let worst = 0;
  for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) worst = Math.max(worst, D(cl[i].lat, cl[i].lng, cl[j].lat, cl[j].lng));
  // The audit's own three filters: a POINT rather than something with EXTENT, split by at least
  // SPLIT_KM, and under the namesake cutoff — beyond which two places genuinely share a name.
  if (!(POINT.test(nm) && !EXTENT.test(nm))) continue;
  if (worst >= NAMESAKE_KM * 1000) continue;
  if (worst >= SPLIT_KM * 1000) candidates.push({ nm, cl: cl.sort((a, b) => b.pins.length - a.pins.length), worst });
}
candidates.sort((a, b) => b.worst - a.worst);
console.log(`${STATE}: ${rows.length} routes; ${candidates.length} POINT name(s) split by ${SPLIT_KM}-${NAMESAKE_KM} km\n`);
if (!candidates.length) { console.log("nothing to adjudicate."); process.exit(0); }

let decided = 0, undecided = 0, refusedByClass = 0;
for (const c of candidates) {
  console.log(`\n=== "${c.nm}"   ${(c.worst / 1000).toFixed(1)} km apart, ${c.cl.length} cluster(s) ===`);

  // The gazetteer, once, over a box covering every cluster.
  const lats = c.cl.map((x) => x.lat), lngs = c.cl.map((x) => x.lng);
  const box = [Math.min(...lngs) - 0.2, Math.min(...lats) - 0.2, Math.max(...lngs) + 0.2, Math.max(...lats) + 0.2];
  // SEARCH THE FULL NAME FIRST and only shorten if it finds nothing. An earlier version stripped a
  // "descriptive tail" and had three bugs at once, all of which read as "no point-like feature":
  //   "Lake Ingalls"   -> "Lake"        a LEADING generic ate the proper noun
  //   "Kool-Aid Lake"  -> "Kool"        a hyphen is a COMPOUND NAME here, not a tail
  //   "Sahale-Boston col" -> "Sahale"   same
  // GNIS matches on LIKE %term%, so the full name is the most precise query available and there is
  // no reason to shorten before trying it. The fallbacks drop a parenthetical or a comma clause,
  // then a TRAILING generic only — never a leading one.
  const terms = [c.nm,
    c.nm.replace(/\s*[(,].*$/, "").trim(),
    c.nm.replace(/\s*[(,].*$/, "").replace(/\s+\b(camp|col|pass|trailhead|basin|saddle|notch|junction|jct)\b\s*$/i, "").trim(),
  ].filter((t, i, a) => t && a.indexOf(t) === i);
  let hits = [], used = "";
  for (const t of terms) {
    try { hits = await gnis(t, box, 5); if (!hits.length) hits = await gnis(t, box, 7); }
    catch (e) { console.log(`   gazetteer: UNREACHABLE (${String(e.message).slice(0, 60)})`); break; }
    if (hits.length) { used = t; break; }
  }
  if (hits.length && used !== c.nm) console.log(`   gazetteer matched on the shortened term "${used}"`);

  const usable = hits.filter((h) => !LINEAR.test(h.cls || ""));
  if (hits.length && !usable.length) {
    console.log(`   gazetteer: ${hits.length} hit(s), ALL linear/areal (${[...new Set(hits.map((h) => h.cls))].join(", ")}) - a label point cannot locate an edge`);
    refusedByClass++;
  }

  const verdicts = [];
  for (const cl of c.cl) {
    const ground = await elevationAt(cl.lat, cl.lng);
    const stated = [...new Set(cl.pins.map((p) => p.elev).filter((x) => x !== null))];
    const near = usable.map((h) => ({ ...h, d: D(cl.lat, cl.lng, h.lat, h.lng) })).sort((a, b) => a.d - b.d)[0];
    const corrob = corrobOf(near);
    const fits = ground !== null && stated.length ? stated.some((x) => Math.abs(x - ground) <= 400) : null;
    // WHAT IS ACTUALLY HERE, under ANY name? This is the check that inverted the first three
    // verdicts. A cluster the gazetteer does not know by THIS name may still be a real, correctly
    // placed waypoint carrying the WRONG NAME — and moving it would destroy a good pin.
    // ...but ONLY where the pin is internally consistent. A cluster whose ground refuses its own
    // stated elevation by thousands of feet is broken however it is named, and IS a misplacement:
    // that is what separates these from the three repaired in #1519, where the outliers claimed
    // 8,600 / 6,700 / 1,000 ft while standing on 4,927 / 4,594 / 2,545.
    let elsewhere = null;
    if (!corrobOf(near) && fits === true) {
      const b2 = [cl.lng - 0.02, cl.lat - 0.02, cl.lng + 0.02, cl.lat + 0.02];
      let any = [];
      for (const layer of [5, 7]) { try { any = any.concat(await gnis("", b2, layer)); } catch { /* reported below */ } }
      const same = (x) => String(x || "").toLowerCase().replace(/[^a-z]/g, "");
      elsewhere = any.filter((h) => !LINEAR.test(h.cls || "") && same(h.name) !== same(c.nm))
        .map((h) => ({ ...h, d: D(cl.lat, cl.lng, h.lat, h.lng) }))
        .filter((h) => h.d < 800).sort((a, b) => a.d - b.d)[0] || null;
    }
    verdicts.push({ cl, ground, stated, near, corrob, fits, elsewhere });
    console.log(`   ${cl.lat.toFixed(4)},${cl.lng.toFixed(4)}  ${String(cl.pins.length).padStart(2)} pin(s)  stated ${stated.length ? stated.join("/") + " ft" : "(none)"}`
      + `  ground ${ground === null ? "UNREACHABLE" : Math.round(ground) + " ft"}`
      + `  ${fits === null ? "" : fits ? "GROUND FITS" : "ground REFUSES"}`
      + `  ${near ? `| ${near.cls} "${near.name}" ${Math.round(near.d)} m${corrob ? "  CORROBORATED" : ""}` : "| no point-like feature"}`
      + `${elsewhere ? `\n        ^ but ${elsewhere.cls} "${elsewhere.name}" is ${Math.round(elsewhere.d)} m away - suspect the NAME, not the coordinate` : ""}`);
    for (const p of cl.pins.slice(0, 3)) console.log(`        ${p.id}`);
    if (cl.pins.length > 3) console.log(`        ... +${cl.pins.length - 3} more`);
  }

  const fitting = verdicts.filter((v) => v.fits === true);
  const corrobs = verdicts.filter((v) => v.corrob);
  // THE GAZETTEER DECIDES ON ITS OWN when it is essentially ON one cluster and FAR from every
  // other. Requiring the ground to also refuse the losers was too strict and hid three real
  // findings: where both pins are internally consistent — each stating an elevation its own
  // ground admits — the terrain says nothing about WHICH IS THE NAMED PLACE, and only an
  // independent record of the name can. "Lake Ingalls" is 1 m from one cluster and 3,135 m from
  // the other; the ground admits both because both sit on plausible ground.
  const FAR_M = 1000;
  const others = verdicts.filter((v) => !v.corrob);
  const allFar = others.length && others.every((v) => !v.near || v.near.d >= FAR_M);
  const misnamed = others.filter((v) => v.elsewhere);
  if (misnamed.length) {
    console.log(`   -> NOT A MISPLACEMENT: ${misnamed.length} cluster(s) sit on a DIFFERENT named feature`
      + ` (${misnamed.map((v) => `"${v.elsewhere.name}"`).join(", ")}). Moving the pin would destroy a`
      + ` correctly-placed waypoint; the defect is its NAME, and which needs the route's own prose.`);
    undecided++;
  } else if (corrobs.length === 1 && allFar && corrobs[0].fits !== false) {
    const w = corrobs[0];
    console.log(`   -> DECIDABLE: the gazetteer is ${Math.round(w.near.d)} m from ${w.cl.lat.toFixed(4)},${w.cl.lng.toFixed(4)}`
      + ` and ${others.map((v) => v.near ? Math.round(v.near.d) + " m" : "nowhere near").join(", ")} from the other(s)`);
    decided++;
  } else if (fitting.length === 1 && verdicts.length > 1 && verdicts.every((v) => v === fitting[0] || v.fits === false)) {
    console.log(`   -> LEANS: the ground admits only ${fitting[0].cl.lat.toFixed(4)},${fitting[0].cl.lng.toFixed(4)} and refuses the rest. No gazetteer corroboration.`);
    decided++;
  } else {
    console.log(`   -> UNDECIDED: ${fitting.length} cluster(s) the ground admits, ${corrobs.length} corroborated. A question finer than the instrument is not a finding.`);
    undecided++;
  }
}

console.log(`\n${decided} decidable, ${undecided} undecided, ${refusedByClass} refused on feature class.`);
console.log(`Nothing is written. The majority is printed as context and is NOT part of any verdict.`);
