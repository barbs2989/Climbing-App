// DOES check:overlay-absence's QUESTION HOLD FOR RouteDetail's OWN OVERLAYS?
//
// That guard asks whether an overlay claiming "you have none" is gated on an error or explained.
// It scans ClimbMatch.jsx and ClimbMatchCore.jsx — and RouteDetail's overlays are discovered by a
// SEPARATE mechanism in the scaffold (`routeDetailOverlays`, used by the browser guards), so its
// question has never been put to them. `overlayStates(code, coreCode)` takes two files, not three.
//
// This is a MEASUREMENT, not a detector: it reuses the guard's own overlay discovery and its own
// absence vocabulary, lifted with ANCHOR LOST, and prints what it finds for reading.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { routeDetailOverlays, routeDetailSource } from "../lib/overlay-scaffold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const guardSrc = fs.readFileSync(path.join(ROOT, "scripts/check-overlay-absence.mjs"), "utf8");

// Lift the guard's own CLAIMS vocabulary rather than inventing one — a second regex disagreeing
// with the guard is far more likely to be the second regex.
const cm = guardSrc.match(/^const CLAIMS = (\/.*\/[a-z]*);$/m);
if (!cm) { console.error("ANCHOR LOST: CLAIMS in check-overlay-absence.mjs"); process.exit(1); }
const CLAIMS = eval(cm[1]);

const rd = routeDetailSource();
const overlays = routeDetailOverlays(rd);
if (!overlays.length) { console.error("ANCHOR LOST: routeDetailOverlays found none."); process.exit(1); }

console.log(`check:overlay-absence scans 2 app files; RouteDetail has ${overlays.length} overlay(s) it has never asked about.\n`);

// Balance braces from each render site to get the overlay's own region, the way the scaffold does.
function regionOf(name) {
  const re = new RegExp("\\{\\s*" + name + "\\s*(?:&&|\\?)", "g");
  let best = "";
  for (const m of rd.matchAll(re)) {
    let d = 0, i = m.index;
    for (; i < rd.length; i++) { const c = rd[i]; if (c === "{") d++; else if (c === "}") { d--; if (!d) { i++; break; } } }
    const seg = rd.slice(m.index, i);
    if (seg.length > best.length) best = seg;
  }
  return best;
}

const GATE = /isError|Unavailable|[a-zA-Z]Error\b|catch\s*\(/;
let flagged = 0;
for (const o of overlays) {
  const seg = regionOf(o.name);
  const hits = [...new Set((seg.match(new RegExp(CLAIMS.source, "gi")) || []).map((x) => x.trim().slice(0, 90)))];
  const gated = GATE.test(seg);
  const verdict = !hits.length ? "no absence claim" : gated ? "claims absence, GATED" : "claims absence, NOT gated";
  if (hits.length && !gated) flagged++;
  console.log(`${o.name.padEnd(20)} ${String(seg.length).padStart(6)}ch  ${o.component || "?"}  — ${verdict}`);
  for (const h of hits.slice(0, 3)) console.log(`     claim: ${JSON.stringify(h)}`);
}
console.log(`\n${flagged} overlay(s) claim absence without a visible gate — READ them, this is not a defect count.`);
