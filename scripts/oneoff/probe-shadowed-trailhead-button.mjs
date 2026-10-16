// Does the "Directions to trailhead" button still fail on the SHADOWED row audit:trailhead-agreement
// names? That audit's prose asserts RouteDetail "picks the pin by type alone ... and returns null".
// #1213/#1215/#1222 put wpPlaced() on every branch, so that may no longer be true.
//
// Lifts the real functions from source (ANCHOR LOST on a rename) and runs them over the LIVE row,
// rather than reading the source by eye. [[a-probe-that-copies-its-subject-measures-a-fossil]]
//
// NOT A DUPLICATE of verify-trailhead-button-not-shadowed.mjs, and read that one first: it renders
// the real RouteDetail over FIXTURES and proves the button ELEMENT appears, while stating outright
// that it cannot see the destination — renderToStaticMarkup does not serialise onClick, so the URL
// lives in a closure. This asks the half that leaves open, on the row the audit actually names:
// WHERE does it drive, and is that the coordinate the audit says is unreachable? Presence there,
// destination here; neither answers the other.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const lift = (anchor, what) => {
  const s = src.indexOf(anchor);
  if (s < 0) throw new Error(`ANCHOR LOST: \`${anchor}\` is not in ClimbMatchCore.jsx — ${what} moved, and this probe would measure nothing.`);
  let d = 0, e = -1;
  for (let i = src.indexOf("{", s); i < src.length; i++) { if (src[i] === "{") d++; else if (src[i] === "}" && --d === 0) { e = i + 1; break; } }
  if (e < 0) throw new Error(`could not balance braces for ${what}`);
  return src.slice(s, e);
};
const trailheadPoint = new Function([
  lift("const WP_TYPE_MAP={", "WP_TYPE_MAP"),
  lift("export function wpPlaced(", "wpPlaced").replace(/^export /, ""),
  lift("function wpType(", "wpType"),
  lift("function wpIs(", "wpIs"),
  lift("function trailheadPoint(", "trailheadPoint"),
].join(";") + ";return trailheadPoint;")();

const ID = process.argv[2] || "wa_spire_mountain_scramble";
const rows = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${ID}`);
if (!rows.length) { console.error(`no such route: ${ID}`); process.exit(1); }
const r = rows[0];
const route = { waypoints: r.waypoints || [], approachLogistics: r.approach_logistics || {} };
const al = route.approachLogistics;

console.log(`row: ${r.id}\n`);
for (const w of route.waypoints)
  if (/trailhead/i.test(String(w.type || ""))) console.log(`  pin  "${w.name || w.label}"  lat=${JSON.stringify(w.lat)} lng=${JSON.stringify(w.lng)}`);
console.log(`  log  "${al.trailhead}"  lat=${JSON.stringify(al.trailheadLat)} lng=${JSON.stringify(al.trailheadLng)}\n`);

const th = trailheadPoint(route);
console.log(`trailheadPoint() -> ${JSON.stringify(th)}\n`);
// The button is `const th=trailheadPoint(route); if(!th||th.lat==null) return null;` at both sites.
const renders = !!(th && th.lat != null);
console.log(renders
  ? `ok — the button RENDERS, driving to ${th.lat},${th.lng} (derived=${th.derived}), and the map draws that point dashed.\n   The audit's SHADOWED prose is STALE: it describes the pre-#1213 behaviour.`
  : `the button returns NULL — the audit's prose still holds.`);
process.exit(renders ? 0 : 1);
