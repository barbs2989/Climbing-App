// Plan the GENERIC-AREA FOLD (owner, 2026-10-07: "an area will be just called bouldering, ice climbing,
// mixed, etc. these are too generic. The climbs need to be in specific named areas"), and write it as a
// migration. Reads the LIVE tree and the researched decisions in audits/generic-area-names-2026-10-07/,
// simulates every step on an in-memory copy under the database's own rules, and refuses to write SQL
// for a plan that breaks one:
//   areas_leaf_xor       an area that holds climbs cannot gain a sub-area
//   routes_require_leaf  a climb cannot move onto an area that has sub-areas
// Both are honoured by ORDER, never bypassed: a parent that must become a leaf (Grand Ledge, whose only
// sub-areas were "Bouldering" and "Top Rope") takes its climbs through a holding area created beside it.
//
// What happens to each generic area (scripts/lib/generic-area-name.mjs decides "generic"):
//   STATE BUCKET ("CO Ice & Mixed", "CT Bouldering")  each child goes where the research put it —
//       fold_into the same place, move_under the place containing it, or stay at the state — then the
//       bucket, emptied, is deleted.
//   GROUPING LAYER ("Garden of the Gods > Bouldering > <boulders>")  its sub-areas move up one level
//       (a same-named place there is FOLDED, never duplicated) and the layer is deleted.
//   CATCH-ALL LEAF ("Fern Point > Other Climbs")  each climb goes where the research placed it; the
//       ones no source places stay together, renamed for their place ("<Place> Bouldering" / "Routes" /
//       "Ice Climbs" — the catalog's own convention, 900 areas already) or a researched name.
//   ALL-GENERIC CHILDREN ("Grand Ledge > Bouldering + Top Rope")  dissolved: the climbs sit on the place.
//   EMPTY generic leaf  deleted.
//
//   node scripts/oneoff/plan-generic-area-fold.mjs            dry plan: prints the summary + problems
//   node scripts/oneoff/plan-generic-area-fold.mjs --write    also writes the migration + plan JSON
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { genericAreaName } from "../lib/generic-area-name.mjs";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const DIR = path.join(ROOT, "audits/generic-area-names-2026-10-07");
const MIG = path.join(ROOT, "supabase/migrations/0259_fold_generic_discipline_areas.sql");
const WRITE = process.argv.includes("--write");
const key = requireServiceKey();
const J = f => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const EXEMPT = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/data/generic-area-names-exempt.json"), "utf8")).exempt;

// ── the live tree ────────────────────────────────────────────────────────────────────────────────
const live = await selectAll("areas", "id,name,parent_id,area_type,lat,lng,route_count,region", "", { key, pageSize: 1000 });
if (live.length < 40000) throw new Error(`read only ${live.length} areas`);
const A = new Map(live.map(a => [a.id, { ...a, parent: a.parent_id }]));
const kids = new Map();
for (const a of A.values()) { if (!kids.has(a.parent)) kids.set(a.parent, new Set()); kids.get(a.parent).add(a.id); }
const kidsOf = id => [...(kids.get(id) || [])].map(k => A.get(k));
const direct = new Map(); for (const a of A.values()) direct.set(a.id, kids.get(a.id)?.size ? 0 : a.route_count || 0);
const holds = id => (direct.get(id) || 0) > 0;
const ancestors = id => { const out = []; for (let p = A.get(A.get(id)?.parent); p; p = A.get(p.parent)) out.push(p); return out; };
const crumb = id => ancestors(id).reverse().map(p => p.name).concat(A.get(id).name).slice(1).join(" > ");
const stateOf = id => { const ch = ancestors(id).reverse(); return ch[1] || ch[0]; };
const isGeneric = id => { const a = A.get(id); return !!a && !(id in EXEMPT && EXEMPT[id].name === a.name) && !!genericAreaName(a.name, ancestors(id).map(p => p.name)); };
const snapshot = new Map(live.map(a => [a.id, { name: a.name, parent: a.parent_id, rc: a.route_count }]));
// The DATABASE's name key, which refuse_duplicate_area compares by ("Ice Climbing by the Covered Bridge" =
// "By the Covered Bridge"; found by the second dry run). Asked of the database, not re-implemented.
import { execFileSync } from "child_process";
const CK = new Map();
{ const out = execFileSync("npx", ["supabase", "db", "query", "--linked", "select id, catalog_key(name) k from areas", "-o", "json"], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString();
  for (const r of JSON.parse(out.slice(out.indexOf("{"))).rows) CK.set(r.id, r.k);
  if (CK.size < 40000) throw new Error(`catalog_key read only ${CK.size} areas`); }

// A place's key: the same place spelled two ways folds. "Colorado National Monument (Ice)" =
// "Colorado National Monument"; "Castlewood Canyon State Park - Ice" = "Castlewood Canyon SP".
const DISC = /\b(ice|mixed|bouldering|boulders|problems|climbs|routes|dry ?tooling|drytooling)\b/g;
const pkey0 = n => { const b = String(n).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(([^)]*)\)/g, (m, x) => /\b(ice|mixed|rock|bouldering|boulders|roped|climbs|routes|dry ?tool)/.test(x) ? " " : " " + x + " ")
  .replace(/^the\s+/, "").replace(/,\s*the$/, "").replace(/\bmount\b/g, "mt").replace(/\bstate park\b/g, "sp").replace(/[^a-z0-9]+/g, " ").trim();
  const k = b.replace(DISC, " ").replace(/\s+/g, " ").trim(); return k || b; };
const PK = new Map(), pkey = n => { let k = PK.get(n); if (k === undefined) { k = pkey0(n); PK.set(n, k); } return k; };

// ── simulation primitives: each one checks the database's rule, then records an op ────────────────
const ops = [], problems = [], notes = [];
const ids = new Set(A.keys());
const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const mint = (near, name) => { const pre = near.split("_")[0]; let id = pre + "_" + slug(name), n = 2; while (ids.has(id)) id = pre + "_" + slug(name) + "_" + n++; ids.add(id); return id; };
const setParent = (id, to) => { kids.get(A.get(id).parent)?.delete(id); A.get(id).parent = to; if (!kids.has(to)) kids.set(to, new Set()); kids.get(to).add(id); };
function create(name, parent, lat, lng, type, why) {
  if (holds(parent)) throw new Error(`create ${name}: ${parent} holds climbs`);
  const id = mint(parent, name), region = A.get(parent).region;
  A.set(id, { id, name, parent, area_type: type, lat: lat ?? null, lng: lng ?? null, route_count: 0, region });
  setParent(id, parent); direct.set(id, 0);
  if (byKey) { const kk = pkey(name); (byKey.get(kk) || byKey.set(kk, []).get(kk)).push(id); }
  ops.push({ op: "create", id, name, parent, lat: lat ?? null, lng: lng ?? null, type, region, why });
  return id;
}
function reparent(id, to, why) {
  if (holds(to)) throw new Error(`reparent ${id} -> ${to}: ${to} holds climbs`);
  if (id === to || ancestors(to).some(p => p.id === id)) throw new Error(`reparent ${id} -> ${to}: a cycle`);
  const from = A.get(id).parent; if (from === to) return;
  ops.push({ op: "reparent", id, from, to, why }); setParent(id, to);
  // refuse_duplicate_area matches the moving area against EVERY same-key area within 1.5 km — its own
  // sub-areas included: "Hard boiled egg area" holds the boulder "Hard boiled egg" (catalog_key drops
  // "area"; third dry run). A real twin elsewhere was already folded (twinNear); a match inside the
  // area's own line is not a duplicate, so that one statement runs with the trigger's bypass.
  const a = A.get(id), ck = CK.get(id);
  if (ck && hasXY(a) && a.name === snapshot.get(id)?.name) {
    const line = new Set([...ancestors(id).map(p => p.id)]);
    const sub = x => { for (let p = A.get(x); p; p = A.get(p.parent)) if (p.id === id) return true; return false; };
    const hits = (byCKget(ck)).filter(x => x !== id && A.has(x) && hasXY(A.get(x)) && A.get(x).name === snapshot.get(x)?.name && kmBetween(a, A.get(x)) <= 1.5);
    if (hits.length && hits.every(x => sub(x) || line.has(x))) { ops[ops.length - 1].bypass = true; notes.push(`bypass: ${id} "${a.name}" matches only its own ${hits.map(x => A.get(x).name).join(", ")}`); }
  }
}
function moveAll(from, to, why) {
  const n = direct.get(from) || 0; if (!n) return;
  if (kids.get(to)?.size) throw new Error(`move climbs ${from} -> ${to}: ${to} has sub-areas`);
  ops.push({ op: "moveall", from, to, n, why }); direct.set(from, 0); direct.set(to, (direct.get(to) || 0) + n);
}
const routesIn = new Map();   // area id -> [{id,name,discipline}] for areas whose climbs move one by one
function moveOne(r, from, to, why) {
  if (kids.get(to)?.size) throw new Error(`move climb ${r.id} -> ${to}: ${to} has sub-areas`);
  ops.push({ op: "moveone", route: r.id, name: r.name, from, to, why });
  direct.set(from, direct.get(from) - 1); direct.set(to, (direct.get(to) || 0) + 1);
  routesIn.set(from, (routesIn.get(from) || []).filter(x => x.id !== r.id)); routesIn.set(to, [...(routesIn.get(to) || []), r]);
}
function rename(id, to, why) {
  const a = A.get(id); if (a.name === to) return;
  ops.push({ op: "rename", id, from: a.name, to, why }); a.name = to;
  if (byKey) { const kk = pkey(to); (byKey.get(kk) || byKey.set(kk, []).get(kk)).push(id); }
}
function retype(id, to) { const a = A.get(id); if (a.area_type === to) return; ops.push({ op: "retype", id, from: a.area_type, to }); a.area_type = to; }
const redirect = new Map();   // folded/deleted id -> the area that took its place
const resolve = id => { while (redirect.has(id)) id = redirect.get(id); return id; };
function del(id, into, fill, why) {
  if (kids.get(id)?.size) throw new Error(`delete ${id}: has sub-areas`);
  if (holds(id)) throw new Error(`delete ${id}: holds climbs`);
  ops.push({ op: "delete", id, name: A.get(id).name, into, fill: !!fill, why });
  kids.get(A.get(id).parent)?.delete(id); A.delete(id); redirect.set(id, into);
}
// The suffix the importer gives a place's own climbs ("<X> Bouldering" / "<X> Ice Climbs" / "<X> Routes").
const suffixFor = rs => rs.length && rs.every(r => r.discipline === "bouldering") ? " Bouldering" : rs.length && rs.every(r => r.discipline === "ice" || r.discipline === "mixed") ? " Ice Climbs" : " Routes";
// An area holding climbs that must GAIN sub-areas: its climbs go to "<X> Routes" beside it, which then
// moves under it (the importer's split, scripts/pipeline/import-route-grades.mjs).
function makeParentable(id, why) {
  if (!holds(id)) return;
  const a = A.get(id), rs = routesIn.get(id);
  const t = create(a.name + (rs ? suffixFor(rs) : " Routes"), a.parent, a.lat, a.lng, "crag", "holding: " + why);
  moveAll(id, t, why); reparent(t, id, why);
  if (rs) { routesIn.set(t, rs); routesIn.delete(id); }
  if (!rs) { notes.push(`split ${id} (${crumb(id)}): its own climbs -> a "${a.name} Routes/Bouldering/Ice Climbs" child, named in SQL by their disciplines`); ops.push({ op: "namesplit", id: t, base: a.name }); }
}
// FOLD a into b (same place): sub-areas recurse onto a same-keyed child of b, climbs join b's.
// THE SAME PLACE FILED DEEPER: refuse_duplicate_area (0218) refuses a re-parent when a same-named area
// within 1.5 km sits anywhere else in the state — the ice tree's "“On the Rocks” Mixed Wall" moving under
// Colorado Springs, beside the same wall under Colorado Springs > North Cheyenne Canyon (0.00 km; found by
// the first dry run). That twin IS the place: fold into it instead.
const kmBetween = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const hasXY = a => a && a.lat != null && a.lng != null && Math.abs(a.lat) > 0.1;
let byCK = null;    // the database's catalog_key -> area ids (names as read; a renamed area is compared by place key only)
const byCKget = k => { if (!byCK) { byCK = new Map(); for (const [i, kk] of CK) (byCK.get(kk) || byCK.set(kk, []).get(kk)).push(i); } return byCK.get(k) || []; };
let byKey = null;   // place key -> area ids; a renamed/created area is appended (stale entries re-checked by name)
function twinNear(id) {
  const a = A.get(id); if (!hasXY(a)) return null;
  const st = stateOf(id)?.id, k = pkey(a.name), anc = new Set(ancestors(id).map(p => p.id));
  const under = x => { for (let p = A.get(x); p; p = A.get(p.parent)) if (p.id === id) return true; return false; };
  if (!byKey) { byKey = new Map(); for (const x of A.values()) { const kk = pkey(x.name); (byKey.get(kk) || byKey.set(kk, []).get(kk)).push(x.id); } }
  if (!byCK) { byCK = new Map(); for (const [i, kk] of CK) (byCK.get(kk) || byCK.set(kk, []).get(kk)).push(i); }
  const ck = CK.get(id) && a.name === snapshot.get(id)?.name ? CK.get(id) : null;
  const cand = new Set([...(byKey.get(k) || []), ...(ck ? byCK.get(ck) || [] : [])]);
  const same = x => pkey(x.name) === k || (ck && CK.get(x.id) === ck && x.name === snapshot.get(x.id)?.name);
  const hits = [...cand].map(i => A.get(i)).filter(x => x && x.id !== id && same(x) && !anc.has(x.id) && hasXY(x) && kmBetween(a, x) <= 1.5 && stateOf(x.id)?.id === st && !under(x.id));
  return hits.length === 1 ? hits[0].id : null;
}
function reparentOrFold(k, b, why) {
  const tw = twinNear(k);
  if (tw && tw !== b) { notes.push(`fold into a nearby twin: "${A.get(k).name}" (${k}) into ${crumb(tw)} (${tw})`); return fold(k, tw, why + ` (same place as ${A.get(tw).name}, filed under ${A.get(A.get(tw).parent).name})`); }
  makeParentable(b, why); reparent(k, b, why);
}
function fold(a, b, why) {
  a = resolve(a); b = resolve(b); if (a === b) return;
  for (const k of kidsOf(a)) {
    const m = kidsOf(b).find(x => pkey(x.name) === pkey(k.name));
    if (m) fold(k.id, m.id, why); else reparentOrFold(k.id, b, why);
  }
  if (holds(a)) {
    if (!kids.get(b)?.size) { moveAll(a, b, why); if (routesIn.has(a)) { routesIn.set(b, [...(routesIn.get(b) || []), ...routesIn.get(a)]); routesIn.delete(a); } }
    else { reparent(a, b, why + " (kept as a sub-area: " + A.get(b).name + " has sub-areas)"); return; }
  }
  del(a, b, true, why);
}
// Put `child` under `target` as its own sub-area — or fold it into a same-keyed child already there.
function placeUnder(child, target, why) {
  child = resolve(child); target = resolve(target);
  const m = kidsOf(target).find(x => x.id !== child && pkey(x.name) === pkey(A.get(child).name));
  if (m) { if (m.name !== A.get(child).name) notes.push(`fold by place key: "${A.get(child).name}" (${child}) into "${m.name}" (${m.id}) under ${A.get(target).name}`); return fold(child, m.id, why + ` (same place as ${m.name})`); }
  reparentOrFold(child, target, why);
}
// A climb-holding parent becomes the leaf: its (generic, leaf) children dissolve into it.
const rkey = n => String(n).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^the\s+/, "").replace(/,\s*the$/, "").replace(/[^a-z0-9]+/g, " ").trim();
function dissolveInto(p, why) {
  const ls = kidsOf(p); if (!ls.length) return false;
  // Grand Ledge: "Hollywood" V4 (Bouldering) and "Hollywood" 5.12a (Top Rope) — eleven names on both
  // lists. Same-named climbs in two disciplines are, as a rule, different climbs (0221's reading), and one
  // area must not hold two climbs under one name: keep the two leaves, named for the place, instead.
  const names = ls.flatMap(l => (routesIn.get(l.id) || []).map(r => rkey(r.name)));
  if (new Set(names).size !== names.length) { notes.push(`not dissolved: ${crumb(p)} — its buckets share climb names across disciplines; each is renamed for the place instead`); return false; }
  const h = create(A.get(p).name + " (holding)", A.get(p).parent, null, null, "crag", "holding: " + why);
  for (const l of ls) { if (kids.get(l.id)?.size) throw new Error(`dissolve ${p}: ${l.id} has sub-areas`); moveAll(l.id, h, why); }
  for (const l of ls) del(l.id, p, false, why);
  moveAll(h, p, why); del(h, p, false, "holding area emptied");
  if (A.get(p).area_type === "region") retype(p, "crag");
  return true;
}

// ── 1. STATE BUCKETS and the Colorado "Alpine Rock" bucket ─────────────────────────────────────────
const byCrumb = (stateId, bc) => {
  const parts = bc.split(">").map(s => s.trim()).filter(Boolean);
  let cur = [A.get(stateId)];
  for (const p of parts) { const nx = cur.flatMap(c => kidsOf(c.id)).filter(k => pkey(k.name) === pkey(p) || k.name.toLowerCase() === p.toLowerCase()); if (!nx.length) { const deep = [...A.values()].filter(x => x.name.toLowerCase() === p.toLowerCase() && stateOf(x.id)?.id === stateId); if (deep.length === 1) { cur = deep; continue; } return null; } cur = nx; }
  return cur.length === 1 ? cur[0].id : null;
};
const buckets = J("decisions-buckets.json");   // [{bucket, state, children:[decision]}], processed in file order
// Every target is resolved on the UNTOUCHED tree, before any bucket is processed: a later decision names
// "Mt. Evans" or "RMNP - Rock", which an earlier one renames; `resolve` then follows any fold.
const target0 = new Map();
for (const b of buckets) for (const d of b.children) if (A.has(b.bucket) && !d.target_id && d.target_breadcrumb) target0.set(d, byCrumb(stateOf(b.bucket).id, d.target_breadcrumb));
for (const b of buckets) {
  if (!A.has(b.bucket)) { problems.push(`bucket ${b.bucket} no longer exists`); continue; }
  const st = A.get(b.bucket).parent;
  for (const d of b.children) {
    if (!A.has(resolve(d.child_id))) { problems.push(`${b.bucket}: child ${d.child_id} gone`); continue; }
    if (snapshot.get(d.child_id)?.parent !== b.bucket) { problems.push(`${b.bucket}: child ${d.child_id} is no longer under the bucket`); continue; }
    let t = d.target_id ? resolve(d.target_id) : target0.get(d) ? resolve(target0.get(d)) : null;
    if ((d.action === "fold_into" || d.action === "move_under") && (!t || !A.has(t))) { problems.push(`${b.bucket}: ${d.child_name} -> target "${d.target_id || d.target_breadcrumb}" not found; kept at state`); t = null; }
    const why = `${A.get(b.bucket).name}: ${d.evidence || d.action}`.slice(0, 300);
    try {
      if (d.action === "fold_into" && t) fold(d.child_id, t, why);
      else if (d.action === "move_under" && t) placeUnder(d.child_id, t, why);
      else placeUnder(d.child_id, st, why);
      const c = resolve(d.child_id);
      if (d.rename_to && A.has(c) && c === d.child_id && !genericAreaName(d.rename_to, ancestors(c).map(p => p.name))) rename(c, d.rename_to, "researched name");
      if (d.target_rename_to && t && A.has(resolve(t)) && !genericAreaName(d.target_rename_to, ancestors(resolve(t)).map(p => p.name))) rename(resolve(t), d.target_rename_to, "researched name");
    } catch (e) { problems.push(`${b.bucket}: ${d.child_name}: ${e.message}`); }
  }
  if (A.has(b.bucket)) { try { del(b.bucket, st, false, "bucket emptied"); } catch (e) { problems.push(`bucket ${b.bucket}: ${e.message} — left: ${kidsOf(b.bucket).map(k => k.name).join(", ")}`); } }
}

// ── 2. GROUPING LAYERS: sub-areas up one level ─────────────────────────────────────────────────────
const groupings = () => [...A.values()].filter(a => kids.get(a.id)?.size && isGeneric(a.id)).sort((x, y) => ancestors(x.id).length - ancestors(y.id).length);
for (let g of groupings()) {
  if (!A.has(g.id)) continue;
  const up = g.parent, why = `"${g.name}" was a grouping under ${A.get(up).name}`;
  try { for (const k of kidsOf(g.id)) placeUnder(k.id, up, why); del(g.id, up, false, why); }
  catch (e) { problems.push(`grouping ${g.id}: ${e.message}`); }
}

// ── 3. LEAVES: empty / all-generic siblings / researched ───────────────────────────────────────────
const leafDec = new Map(J("decisions-leaves.json").map(d => [d.generic_area_id, d]));
const packets = new Map(J("leaf-packets.json").map(p => [p.generic_area.id, p]));
for (const [id, p] of packets) routesIn.set(id, p.climbs.map(c => ({ id: c.id, name: c.name, discipline: c.discipline, lat: c.lat, lng: c.lng })));
const leaves = () => [...A.values()].filter(a => !kids.get(a.id)?.size && isGeneric(a.id));
for (const l of leaves().filter(l => !holds(l.id))) { try { del(l.id, l.parent, false, "empty generic area"); } catch (e) { problems.push(`empty ${l.id}: ${e.message}`); } }
const dissolved = new Set(), triedDissolve = new Set();
for (const l of leaves()) {
  if (!A.has(l.id)) continue;
  const p = l.parent, sibs = kidsOf(p);
  if (sibs.every(s => !kids.get(s.id)?.size && isGeneric(s.id))) {
    if (triedDissolve.has(p)) continue; triedDissolve.add(p);
    try { if (dissolveInto(p, `every sub-area of ${A.get(p).name} was a discipline bucket (${sibs.map(s => s.name).join(", ")})`)) dissolved.add(p); } catch (e) { problems.push(`dissolve ${p}: ${e.message}`); }
  }
}
const placed = { existing: 0, new_area: 0, stay: 0 };
for (const l of leaves()) {
  if (!A.has(l.id)) continue;
  const p = A.get(l.id).parent, d = leafDec.get(l.id), rs = routesIn.get(l.id);
  if (!rs) { problems.push(`leaf ${l.id} (${crumb(l.id)}) has no packet — not researched`); continue; }
  if (rs.length !== direct.get(l.id)) problems.push(`leaf ${l.id}: packet lists ${rs.length} climbs, the tree ${direct.get(l.id)}`);
  const newIds = new Map();
  for (const c of (d?.climbs || [])) {
    const r = rs.find(x => x.id === c.id); if (!r) continue;
    const why = `${c.evidence || ""}`.slice(0, 300);
    try {
      if (c.target && c.target.existing) {
        const t = resolve(c.target.existing);
        if (!A.has(t)) { problems.push(`${l.id}: ${c.name} -> ${c.target.existing} gone`); continue; }
        if (kids.get(t)?.size) { problems.push(`${l.id}: ${c.name} -> ${A.get(t).name} has sub-areas; left unplaced`); continue; }
        moveOne(r, l.id, t, why); placed.existing++;
      } else if (c.target && c.target.new_area) {
        const nm = c.target.new_area.trim();
        if (genericAreaName(nm, ancestors(l.id).map(x => x.name))) { problems.push(`${l.id}: new area "${nm}" is itself generic; left unplaced`); continue; }
        let t = newIds.get(pkey(nm)) || kidsOf(p).find(x => pkey(x.name) === pkey(nm))?.id;
        if (t && kids.get(t)?.size) { problems.push(`${l.id}: ${c.name} -> existing ${A.get(t).name} has sub-areas; left unplaced`); continue; }
        if (!t) { t = create(nm, p, r.lat ?? l.lat, r.lng ?? l.lng, "crag", why); newIds.set(pkey(nm), t); }
        moveOne(r, l.id, t, why); placed.new_area++;
      }
    } catch (e) { problems.push(`${l.id}: ${c.name}: ${e.message}`); }
  }
  const rest = routesIn.get(l.id) || [];
  placed.stay += rest.length;
  if (!rest.length) { del(l.id, p, false, "every climb placed on its named wall/boulder"); continue; }
  const ln = d?.leaf_name && !genericAreaName(d.leaf_name, ancestors(l.id).map(x => x.name)) ? d.leaf_name.trim() : null;
  // "Orris Falls Bouldering" / "Big Bend Bouldering Area" / "Bouldering in Tumwater Canyon": the place is the rest
  const base = A.get(p).name.replace(/\s*\b(bouldering|boulders|routes|climbs|ice climbs)(\s+areas?)?\s*$/i, "").replace(/^(bouldering|boulders)\s+(in|at)\s+/i, "").trim() || A.get(p).name;
  const sfx = /buildering/i.test(l.name) ? " Buildering" : suffixFor(rest), fb = base !== A.get(p).name ? base + (sfx === " Bouldering" ? " Boulders" : sfx) : base + sfx;
  let name = ln || fb;
  // ...never the parent's own name ("Upper 7-Mile Boulders > Misc. Problems" -> not a second "Upper 7-Mile
  // Boulders"; the fourth dry run): those are the place's OTHER boulders/climbs.
  // Compared by the light key (rkey), NOT the place key: pkey drops discipline words, so "Yellow Bluff
  // Bouldering" would read as "Yellow Bluff" and every fallback would turn into "Other ..." (first review).
  if (rkey(name) === rkey(A.get(p).name)) name = "Other " + A.get(p).name;
  const twin = kidsOf(p).find(s => s.id !== l.id && pkey(s.name) === pkey(name) && s.name.toLowerCase() === name.toLowerCase());
  if (twin && !kids.get(twin.id)?.size) { moveAll(l.id, twin.id, `the place's own climbs join "${twin.name}"`); del(l.id, twin.id, false, "joined its named twin"); continue; }
  if (twin) { problems.push(`${l.id}: "${name}" is taken by a sub-area with sub-areas`); continue; }
  rename(l.id, name, ln ? `researched: ${(d.leaf_name_evidence || "").slice(0, 200)}` : `no source places these climbs more precisely than ${A.get(p).name}`);
}

// ── 3b. ONE climb filed twice, now in one area: merge (dupcheck-generic-area-fold.mjs listed every pair;
//        merges.json holds the ones READ as the same climb — the copy already in the place is kept) ─────
const merges = fs.existsSync(path.join(DIR, "merges.json")) ? J("merges.json") : [];
for (const m of merges) ops.push({ op: "merge", keep: m.keep, drop: m.drop, why: m.why });

// ── 3c. NEW NAMES against refuse_duplicate_area: the database's catalog_key drops "ice", "climbs",
//        "area", so "Piatt Park Ice Climbs" keys as "Piatt Park" — its own parent (fifth dry run). Every
//        renamed/created name is keyed BY THE DATABASE; a match only in the area's own line (parent,
//        child) runs that one statement with the bypass; a match with any OTHER nearby place is a problem.
{
  const named = ops.filter(o => o.op === "rename" || o.op === "create");
  const names = [...new Set(named.map(o => o.op === "rename" ? o.to : o.name))];
  const sqlq = `select t, catalog_key(t) k from unnest(array[${names.map(s => "'" + s.replace(/'/g, "''") + "'").join(",")}]::text[]) t`;
  const out = execFileSync("npx", ["supabase", "db", "query", "--linked", sqlq, "-o", "json"], { cwd: ROOT, maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }).toString();
  const NK = new Map(JSON.parse(out.slice(out.indexOf("{"))).rows.map(r => [r.t, r.k]));
  for (const o of named) {
    const id = o.id, nm = o.op === "rename" ? o.to : o.name, nk = NK.get(nm), a = A.get(id) || A.get(resolve(id));
    if (!nk || !a || !hasXY(a)) continue;
    const line = new Set(ancestors(a.id).map(p => p.id));
    const sub = x => { for (let p = A.get(x); p; p = A.get(p.parent)) if (p.id === a.id) return true; return false; };
    const st = stateOf(a.id)?.id;
    const hits = byCKget(nk).filter(x => x !== a.id && A.has(x) && hasXY(A.get(x)) && kmBetween(a, A.get(x)) <= 1.5 && stateOf(x)?.id === st);
    if (!hits.length) continue;
    if (hits.every(x => line.has(x) || sub(x))) { o.bypass = true; notes.push(`bypass: "${nm}" (${a.id}) keys like its own ${hits.map(x => A.get(x).name).join(", ")}`); }
    else problems.push(`name "${nm}" (${a.id}) keys like a nearby place: ${hits.filter(x => !line.has(x) && !sub(x)).map(x => crumb(x)).join("; ")}`);
  }
}

// ── 4. every remaining generic name is a problem; regions now holding climbs say "crag" ────────────
for (const a of A.values()) if (isGeneric(a.id)) problems.push(`STILL GENERIC: ${a.id} ${crumb(a.id)}`);
for (const a of A.values()) if (holds(a.id) && a.area_type === "region") retype(a.id, "crag");

const count = o => ops.filter(x => x.op === o).length;
console.log(`ops: ${ops.length} | create ${count("create")} reparent ${count("reparent")} moveall ${count("moveall")} (${ops.filter(x => x.op === "moveall").reduce((s, x) => s + x.n, 0)} climbs) moveone ${count("moveone")} rename ${count("rename")} delete ${count("delete")} retype ${count("retype")}`);
console.log(`leaf climbs: placed on an existing wall/boulder ${placed.existing}, on a new named one ${placed.new_area}, kept together under their place ${placed.stay}; dissolved into the place ${dissolved.size} parents`);
for (const n of notes) console.log("note: " + n);
if (problems.length) { console.log(`\nPROBLEMS (${problems.length}):`); for (const p of problems) console.log("  " + p); }
fs.writeFileSync(path.join(DIR, "plan.json"), JSON.stringify({ written: new Date().toISOString(), ops, problems }, null, 1));
if (!WRITE) process.exit(0);
if (problems.some(p => !p.startsWith("leaf ") && !p.includes("left unplaced"))) { console.error("refusing to write the migration while structural problems remain"); process.exit(1); }

// ── SQL ────────────────────────────────────────────────────────────────────────────────────────────
const q = s => s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'";
const n = v => v == null ? "null" : String(+v);
const touched = new Set(); for (const o of ops) for (const k of ["id", "from", "to", "parent", "into"]) if (o[k] && (snapshot.has(o[k]) || A.has(o[k]))) touched.add(o[k]);
const lines = [];
const sumMoves = ops.filter(o => o.op === "moveall").reduce((s, o) => s + o.n, 0) + count("moveone");
lines.push(`-- 0259: fold the areas named only by DISCIPLINE into the places they are.
--
-- Owner, 2026-10-07: "I notice in many areas that an area will be just called bouldering, ice climbing,
-- mixed, etc. these are too generic. The climbs need to be in specific named areas not just generic
-- names. ... Do deep research online to find the right area to place these climbs."
-- Generated by scripts/oneoff/plan-generic-area-fold.mjs from the LIVE tree and the researched decisions in
-- audits/generic-area-names-2026-10-07/ (each decision carries its evidence). The rule for "generic" is
-- scripts/lib/generic-area-name.mjs; check:generic-area-names asks it of every area daily.
--   state buckets  ("CO Ice & Mixed", "CT Bouldering", "NH Ice and Mixed", "Alpine Rock", ...) — each
--                  child to its geographic home, the same place FOLDED (never filed twice)
--   grouping layers ("<place> > Bouldering > <boulders>") — sub-areas up one level
--   catch-alls      ("Other Climbs", "Misc", "Bouldering") — climbs onto the wall/boulder a source names;
--                  the rest stay together, renamed for their place
-- ${ops.length} steps: ${count("create")} areas created, ${count("reparent")} re-parented, ${sumMoves} climbs moved, ${count("rename")} renamed,
-- ${count("delete")} deleted. Climbs keep their ids; nothing about a climb changes but its area.
-- areas_leaf_xor / routes_require_leaf are honoured by ORDER (a holding area beside a parent that must
-- become a leaf); refuse_duplicate_area stays ON. refuse_duplicate_route is bypassed for the climb moves
-- only: each moved climb was checked against its new area's climbs out of band (plan step "dup check").
-- Every step asserts its exact effect and the whole migration aborts on the first surprise.
-- No climber data is lost: a photo or note on a deleted area moves to the area that took its place.

begin;

create function pg_temp.mk(p_id text, p_name text, p_parent text, p_lat float8, p_lng float8, p_type text, p_region text) returns void language plpgsql as $f$
begin
  if exists (select 1 from areas where id = p_id) then raise exception '0259: % already exists', p_id; end if;
  insert into areas (id, name, parent_id, area_type, region, lat, lng) values (p_id, p_name, p_parent, p_type, p_region, p_lat, p_lng);
end $f$;
create function pg_temp.mv_area(p_id text, p_from text, p_to text) returns void language plpgsql as $f$
begin
  update areas set parent_id = p_to where id = p_id and parent_id = p_from;
  if not found then raise exception '0259: % is not under % (re-parent to %)', p_id, p_from, p_to; end if;
end $f$;
create function pg_temp.mv_all(p_from text, p_to text, p_n int) returns void language plpgsql as $f$
declare k int;
begin
  select count(*) into k from routes where area_id = p_from;
  if k <> p_n then raise exception '0259: % holds % climbs, the plan read %', p_from, k, p_n; end if;
  update routes set area_id = p_to where area_id = p_from;
end $f$;
create function pg_temp.mv_one(p_id text, p_from text, p_to text) returns void language plpgsql as $f$
begin
  update routes set area_id = p_to where id = p_id and area_id = p_from;
  if not found then raise exception '0259: climb % is not on %', p_id, p_from; end if;
end $f$;
create function pg_temp.ren(p_id text, p_from text, p_to text) returns void language plpgsql as $f$
begin
  update areas set name = p_to where id = p_id and name = p_from;
  if not found then raise exception '0259: % is not named "%"', p_id, p_from; end if;
end $f$;
create function pg_temp.typ(p_id text, p_from text, p_to text) returns void language plpgsql as $f$
begin
  update areas set area_type = p_to where id = p_id and area_type is not distinct from p_from;
  if not found then raise exception '0259: % is not a %', p_id, p_from; end if;
end $f$;
-- ONE climb filed twice, now in one area: the keeper fills each BLANK column from the copy (every column
-- the table has, read from the catalog, so a column added later is not silently skipped), then the copy
-- goes. Aborts if any climber row points at the copy — nothing of anybody's is cascaded away.
create function pg_temp.merge_route(p_keep text, p_drop text) returns void language plpgsql as $f$
declare c record; sets text := ''; k int;
begin
  if (select area_id from routes where id = p_keep) is distinct from (select area_id from routes where id = p_drop) then
    raise exception '0259: % and % are not in one area', p_keep, p_drop; end if;
  select (select count(*) from contributions where route_id = p_drop) + (select count(*) from topo_lines where route_id = p_drop)
       + (select count(*) from gps_submissions where route_id = p_drop) + (select count(*) from content_reports where route_id = p_drop)
       + (select count(*) from route_base_checkins where route_id = p_drop) + (select count(*) from objectives where route_id = p_drop)
       + (select count(*) from hazard_votes where route_id = p_drop) + (select count(*) from climb_logs where route_id = p_drop)
       + (select count(*) from crew_listings where route_id = p_drop) + (select count(*) from user_itineraries where route_id = p_drop)
       + (select count(*) from crews where route_id = p_drop) + (select count(*) from user_lists where p_drop = any(route_ids)) into k;
  if k > 0 then raise exception '0259: % climber rows point at %, the copy this deletes', k, p_drop; end if;
  for c in select column_name, data_type from information_schema.columns
            where table_schema = 'public' and table_name = 'routes' and is_generated = 'NEVER' and is_identity = 'NO'
              and column_name not in ('id', 'name', 'area_id', 'created_at', 'updated_at') loop
    sets := sets || format('%I = case when %s then o.%I else k.%I end, ', c.column_name,
      case when c.data_type in ('text', 'character varying') then format('nullif(btrim(k.%I), '''') is null', c.column_name)
           when c.data_type = 'jsonb' then format('(k.%I is null or k.%I in (''null''::jsonb, ''{}''::jsonb, ''[]''::jsonb))', c.column_name, c.column_name)
           when c.data_type = 'ARRAY' then format('coalesce(cardinality(k.%I), 0) = 0', c.column_name)
           else format('k.%I is null', c.column_name) end, c.column_name, c.column_name);
  end loop;
  execute format('update routes k set %s from routes o where k.id = $1 and o.id = $2', left(sets, length(sets) - 2)) using p_keep, p_drop;
  delete from routes where id = p_drop;
  if not found then raise exception '0259: copy % was not there to delete', p_drop; end if;
end $f$;
-- the importer's SPLIT_SUFFIX: a place's own climbs, moved beside its new sub-areas, are named by what they are
create function pg_temp.namesplit(p_id text, p_base text) returns void language plpgsql as $f$
begin
  update areas set name = p_base || (select case when bool_and(discipline = 'bouldering') then ' Bouldering'
    when bool_and(discipline in ('ice', 'mixed')) then ' Ice Climbs' else ' Routes' end from routes where area_id = p_id)
   where id = p_id;
  if not found then raise exception '0259: split child % missing', p_id; end if;
end $f$;
-- delete an emptied area; a climber's photo/note on it moves to its keeper; a FOLD fills the keeper's blanks
create function pg_temp.del(p_id text, p_into text, p_fill boolean) returns void language plpgsql as $f$
begin
  if exists (select 1 from areas where parent_id = p_id) then raise exception '0259: % still has sub-areas', p_id; end if;
  if exists (select 1 from routes where area_id = p_id) then raise exception '0259: % still holds climbs', p_id; end if;
  if p_fill then
    update areas k set
      elevation = coalesce(k.elevation, o.elevation), elevation_ft = coalesce(k.elevation_ft, o.elevation_ft),
      prominence_ft = coalesce(k.prominence_ft, o.prominence_ft),
      blurb = case when nullif(btrim(k.blurb), '') is null then o.blurb else k.blurb end,
      avy_zone = case when nullif(btrim(k.avy_zone), '') is null then o.avy_zone else k.avy_zone end,
      lat = case when k.lat is null or k.lng is null then o.lat else k.lat end,
      lng = case when k.lat is null or k.lng is null then o.lng else k.lng end
    from areas o where o.id = p_id and k.id = p_into;
  end if;
  update topos set area_id = p_into where area_id = p_id;
  update contributions set area_id = p_into where area_id = p_id;
  delete from areas where id = p_id;
  if not found then raise exception '0259: % was not there to delete', p_id; end if;
end $f$;

do $$ begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  if not exists (select 1 from areas where id = ${q(buckets[0]?.bucket || "co_co_ice_mixed")}) then raise notice '0259: no catalog'; return; end if;
end $$;
`);
// the empty-database escape must cover the whole body: wrap the ops in one DO block keyed on that test
lines.push(`create temp table m_recount on commit drop as
  select distinct a.id from areas a join areas t on a.path @> t.path where t.id in (${[...touched].filter(id => snapshot.has(id)).map(q).join(", ")});
`);
lines.push(`do $$ begin
if not exists (select 1 from areas where id = ${q(buckets[0]?.bucket || "co_co_ice_mixed")}) then return; end if;`);
const BY_ON = "perform set_config('catalog.allow_duplicate', 'on', true); ", BY_OFF = " perform set_config('catalog.allow_duplicate', 'off', true);  -- keys like its OWN parent/child only";
for (const o of ops) {
  const c = o.why ? `  -- ${String(o.why).replace(/\s+/g, " ").slice(0, 160)}` : "";
  if (o.op === "create" && o.bypass) lines.push(`${BY_ON}perform pg_temp.mk(${q(o.id)}, ${q(o.name)}, ${q(o.parent)}, ${n(o.lat)}, ${n(o.lng)}, ${q(o.type)}, ${q(o.region)});${BY_OFF}`);
  else if (o.op === "rename" && o.bypass) lines.push(`${BY_ON}perform pg_temp.ren(${q(o.id)}, ${q(o.from)}, ${q(o.to)});${BY_OFF}`);
  else if (o.op === "create") lines.push(`perform pg_temp.mk(${q(o.id)}, ${q(o.name)}, ${q(o.parent)}, ${n(o.lat)}, ${n(o.lng)}, ${q(o.type)}, ${q(o.region)});${c}`);
  else if (o.op === "reparent" && o.bypass) lines.push(`perform set_config('catalog.allow_duplicate', 'on', true); perform pg_temp.mv_area(${q(o.id)}, ${q(o.from)}, ${q(o.to)}); perform set_config('catalog.allow_duplicate', 'off', true);  -- its only same-key match within 1.5 km is its OWN sub-area or ancestor${c ? ";" + c.slice(4) : ""}`);
  else if (o.op === "reparent") lines.push(`perform pg_temp.mv_area(${q(o.id)}, ${q(o.from)}, ${q(o.to)});${c}`);
  else if (o.op === "moveall") lines.push(`perform set_config('catalog.allow_duplicate', 'on', true); perform pg_temp.mv_all(${q(o.from)}, ${q(o.to)}, ${o.n}); perform set_config('catalog.allow_duplicate', 'off', true);${c}`);
  else if (o.op === "moveone") lines.push(`perform set_config('catalog.allow_duplicate', 'on', true); perform pg_temp.mv_one(${q(o.route)}, ${q(o.from)}, ${q(o.to)}); perform set_config('catalog.allow_duplicate', 'off', true);  -- ${o.name}${c ? ":" + c.slice(4) : ""}`);
  else if (o.op === "rename") lines.push(`perform pg_temp.ren(${q(o.id)}, ${q(o.from)}, ${q(o.to)});${c}`);
  else if (o.op === "merge") lines.push(`perform pg_temp.merge_route(${q(o.keep)}, ${q(o.drop)});${c}`);
  else if (o.op === "namesplit") lines.push(`perform pg_temp.namesplit(${q(o.id)}, ${q(o.base)});  -- a place's own climbs, beside its new sub-areas (the importer's split)`);
  else if (o.op === "retype") lines.push(`perform pg_temp.typ(${q(o.id)}, ${q(o.from)}, ${q(o.to)});`);
  else if (o.op === "delete") lines.push(`perform pg_temp.del(${q(o.id)}, ${q(o.into)}, ${o.fill});  -- ${o.name}${c ? ":" + c.slice(4) : ""}`);
}
lines.push(`end $$;
`);
lines.push(`-- path is set per row by trg_areas_set_path and does NOT cascade (0221, 0233, 0251)
do $$ declare k int; begin
  loop
    update areas c set path = p.path || text2ltree(c.id) from areas p
     where c.parent_id = p.id and c.path is distinct from p.path || text2ltree(c.id);
    get diagnostics k = row_count;
    exit when k = 0;
  end loop;
end $$;

insert into m_recount select distinct a.id from areas a join areas t on a.path @> t.path
  where t.id in (${[...touched].filter(id => A.has(id)).map(q).join(", ")});
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select id from m_recount);

do $$ declare k int; begin
  if not exists (select 1 from areas where id = 'colorado') then return; end if;
  select count(*) into k from areas where id in (${ops.filter(o => o.op === "delete").map(o => q(o.id)).join(", ")});
  if k > 0 then raise exception '0259: % areas meant to go are still there', k; end if;
  select count(*) into k from areas c join areas p on p.id = c.parent_id where c.path is distinct from p.path || text2ltree(c.id);
  if k > 0 then raise exception '0259: % stale paths', k; end if;
end $$;

commit;
`);
fs.writeFileSync(MIG, lines.join("\n"));
console.log(`wrote ${path.relative(ROOT, MIG)} (${ops.length} steps)`);
