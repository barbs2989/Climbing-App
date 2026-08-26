// audit:trailhead-agreement says N routes "carry NO trailhead position at all and need research".
// It decides that by pin TYPE. The app's trailheadPoint() has a THIRD branch the audit does not
// model: a placed waypoint whose NAME matches /trailhead|parking|\bth\b/, whatever its type.
//
// So the audit can call a row positionless while the app resolves a trailhead for it and the
// Directions button works — the same class of drift as the stale SHADOWED prose, one branch over.
// This measures the gap instead of arguing about it.
//
// trailheadPoint and friends are LIFTED from source with ANCHOR LOST, never copied.
// [[a-probe-that-copies-its-subject-measures-a-fossil]]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const lift = (anchor, what) => {
  const s = src.indexOf(anchor);
  if (s < 0) throw new Error(`ANCHOR LOST: \`${anchor}\` is not in ClimbMatchCore.jsx — ${what} moved.`);
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

// The audit's own test, transcribed: logistics coords, else a TYPE-matched placed pin.
const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);

const rows = await selectAll("routes", "id,name,waypoints,approach_logistics", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report a clean catalog"); process.exit(1); }

let named = 0, auditSaysNone = 0, appResolves = 0;
const gap = [];
for (const r of rows) {
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  if (!al || !al.trailhead) continue;
  named++;
  const hasLogCoord = num(al.trailheadLat) !== null && num(al.trailheadLng) !== null;
  if (hasLogCoord) continue;
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const typedPlaced = wps.some(w => w && String(w.type || "").toLowerCase() === "trailhead"
    && num(w.lat) !== null && num(w.lng) !== null);
  if (typedPlaced) continue;
  auditSaysNone++;                                   // the audit's `noPositionAtAll` bucket
  const th = trailheadPoint({ waypoints: wps, approachLogistics: al });
  if (th && th.lat != null) {
    appResolves++;
    if (gap.length < 20) gap.push({ id: r.id, th: al.trailhead, got: th });
  }
}

console.log(`${named} WA routes name a trailhead in approach_logistics`);
console.log(`${auditSaysNone} of them are in the audit's "NO trailhead position at all" bucket`);
console.log(`${appResolves} of THOSE are resolved anyway by trailheadPoint()'s name-matched branch\n`);
for (const g of gap)
  console.log(`  ${g.id}\n     logistics name: "${g.th}"\n     app resolves -> "${g.got.name}" @${g.got.lat},${g.got.lng} (derived=${g.got.derived})\n`);

console.log(appResolves
  ? `The audit's phrase "need research, not repair" is WRONG for ${appResolves} of ${auditSaysNone}: the app already sends a climber somewhere.`
  : `ok — the audit's bucket and the app agree: none of the ${auditSaysNone} resolves.`);
