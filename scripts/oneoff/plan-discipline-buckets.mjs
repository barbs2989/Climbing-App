// Plans the dissolution of discipline-named PARENT areas ("Adirondack Ice & Mixed" holding
// crags). READ-ONLY: writes an ops file, changes nothing. Needs the service key.
//
//   node scripts/oneoff/plan-discipline-buckets.mjs --out <ops.json>
//
// Rule (owner, 2026-10-25): ice, mixed and dry tooling are not an area. A discipline bucket is
// DISSOLVED: each crag under it moves to the bucket's parent (the place), its subtree paths are
// rewritten, and the empty bucket is deleted. Names that are a real place with "ice" in them
// ("Ice Park", "Ice Box", "Ice Pond", "Ice Caves") are NOT buckets. A bucket whose move would put
// two same-named siblings under one parent is HELD and listed, never folded here.
//
// Nested buckets are simulated in depth order against the state the earlier moves leave, so the
// ops file is exactly the sequence the apply step runs.
import fs from "fs";
import { loadEnv } from "../lib/supabase-env.mjs";

const env = loadEnv();
const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error("service key missing: symlink .env");
const outIdx = process.argv.indexOf("--out");
const outFile = outIdx > 0 ? process.argv[outIdx + 1] : null;

async function fetchAll(select) {
  const out = [];
  let from = 0;
  for (;;) {
    const r = await fetch(`${url}/rest/v1/areas?select=${select}&order=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}`, "Range-Unit": "items" },
    });
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error(JSON.stringify(rows).slice(0, 300));
    out.push(...rows);
    if (rows.length < 1000) return out;
    from += 1000;
  }
}

export const DISC = /\b(ice|mixed|dry[- ]?tool(ing)?|tooling)\b/i;
// "ice" as part of a PLACE: a park, a cave, a box canyon, a pond. These are named places, kept.
export const PLACE_ICE = /\bice\s+(park|caves?|box|pond|cream|age|canyon|castles?|knife|lakes?|beds|station|cube|house|cap|reservoir|walls?|parlor|slabs?)\b/i;
export const isBucket = name => DISC.test(name) && !PLACE_ICE.test(name);

export function buildPlan(areas) {
  const by = new Map(areas.map(a => [a.id, { ...a }]));
  const kidsOf = new Map();
  const indexKids = () => {
    kidsOf.clear();
    for (const a of by.values()) if (a.parent_id) {
      if (!kidsOf.has(a.parent_id)) kidsOf.set(a.parent_id, new Set());
      kidsOf.get(a.parent_id).add(a.id);
    }
  };
  indexKids();
  const depth = a => (a.path || "").split(".").length;
  const buckets = areas.filter(a => isBucket(a.name) && a.parent_id && kidsOf.has(a.id))
    .sort((x, y) => depth(x) - depth(y) || x.id.localeCompare(y.id));
  const ops = [], held = [], dissolved = [];
  for (const b0 of buckets) {
    const b = by.get(b0.id);
    if (!b || !b.parent_id) continue;
    const parent = by.get(b.parent_id);
    const childIds = [...(kidsOf.get(b.id) || [])];
    if (!childIds.length) { // an empty bucket: nothing moves, the bucket goes
      ops.push({ type: "delete", id: b.id, name: b.name, prev: { parent_id: b.parent_id, path: b.path } });
      by.delete(b.id); indexKids(); dissolved.push(b.name);
      continue;
    }
    const sibNames = new Set([...(kidsOf.get(parent.id) || [])].filter(id => id !== b.id).map(id => by.get(id).name.toLowerCase()));
    const clash = childIds.map(id => by.get(id)).filter(c => sibNames.has(c.name.toLowerCase())).map(c => c.name);
    if (clash.length) { held.push({ id: b.id, name: b.name, why: "same-named sibling would be created: " + clash.join("; ") }); continue; }
    for (const cid of childIds) {
      const c = by.get(cid);
      const oldPath = c.path, label = oldPath.split(".").pop();
      const newPath = parent.path + "." + label;
      ops.push({ type: "reparent", id: c.id, name: c.name, to: parent.id, prev: { parent_id: b.id, path: oldPath }, path: newPath });
      c.parent_id = parent.id;
      c.path = newPath;
      for (const d of by.values()) {
        if (d.id !== c.id && d.path.startsWith(oldPath + ".")) {
          const dOld = d.path, dNew = newPath + d.path.slice(oldPath.length);
          ops.push({ type: "path", id: d.id, name: d.name, prev: { path: dOld }, path: dNew });
          d.path = dNew;
        }
      }
    }
    ops.push({ type: "delete", id: b.id, name: b.name, prev: { parent_id: b.parent_id, path: b.path } });
    by.delete(b.id);
    indexKids();
    dissolved.push(b.name);
  }
  return { ops, held, dissolved };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const areas = await fetchAll("id,name,parent_id,path,route_count,area_type");
  const plan = buildPlan(areas);
  const counts = {
    buckets: plan.dissolved.length + plan.held.length,
    dissolved: plan.dissolved.length, held: plan.held.length,
    reparent: plan.ops.filter(o => o.type === "reparent").length,
    pathFix: plan.ops.filter(o => o.type === "path").length,
    delete: plan.ops.filter(o => o.type === "delete").length,
  };
  console.log(JSON.stringify(counts));
  for (const h of plan.held) console.log("HELD", h.name, "|", h.why);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify({ counts, ...plan }, null, 1));
}
