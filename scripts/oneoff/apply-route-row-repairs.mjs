#!/usr/bin/env node
// Apply researched repairs to route rows — prose that misdirects, pins on the wrong feature,
// waypoint arrays out of travel order — one route at a time, with a backup and a reconcile.
//
// Usage: node scripts/oneoff/apply-route-row-repairs.mjs <batch.json> [--apply]
// Without --apply it prints every change and writes nothing.
//
// batch.json = [ { "id": "wa_...", "why": "...", "ops": [ ... ] }, ... ]
// Ops (paths address the ORIGINAL row; a waypoint index is its index BEFORE any reorder):
//   { "path": "approach", "find": "exact text", "replace": "new text" }
//       the find string must occur EXACTLY ONCE in that string leaf — a wrong or ambiguous anchor
//       refuses the whole route rather than editing the wrong sentence.
//   { "path": "waypoints[3].lat", "set": 48.123 }      set a leaf (must already exist, except the
//       waypoint fields lat/lng/elev/distMi/note/directions, which may be added).
//   { "op": "reorderWaypoints", "order": [0, 2, {"name":"Castle Pass","type":"Junction",...}, 1, 3] }
//       at most one per route; ORIGINAL indices in travel order, or a new waypoint object to insert.
//       Omitting an index deletes that waypoint.
//
// Rules the writer enforces, each because the class has bitten this catalog before:
//   * new text is linted with the citation needles of audit-prose-citations.mjs and the voice cues
//     of audit-waypoint-note-voice.mjs — the app shows no sources and no pipeline talk;
//   * `directions` is POSITIONAL ("how to get HERE from the previous point"), so after a reorder
//     every waypoint whose predecessor changed has its directions CLEARED, and that is printed —
//     a leg describing a junction the climber no longer passes is worse than an empty one;
//   * the original columns are backed up before the first write and never overwritten after;
//   * every PATCH goes through patchRow (exactly one row) and the row is re-read and compared —
//     a 200 is not evidence the data changed;
//   * an entry is applied at most ONCE: a ledger records each entry before and after its PATCH. A
//     reorder that inserts or deletes is not idempotent — re-running a batch that crashed half-way
//     inserted Painted Traverse's new pins a second time and deleted Black Mountain. A pending
//     record (the PATCH may or may not have committed) is settled by comparing the live row.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
const APPLY = process.argv.includes("--apply");
// --settle: for a batch that crashed part-way BEFORE the ledger existed. Plans each entry against its
// backup (the row as it was before this entry's first write) and compares the live row: live == planned
// result → records it done; live == backup → leaves it to apply; anything else → reports it for a human.
const SETTLE = process.argv.includes("--settle");
if (!file) { console.error("usage: apply-route-row-repairs.mjs <batch.json> [--apply]"); process.exit(1); }
const batch = JSON.parse(fs.readFileSync(file, "utf8"));
const BACKUP = path.join(HERE, "route-row-repairs-2026-10-01", "backups");
fs.mkdirSync(BACKUP, { recursive: true });
// jsonb re-sorts object keys, so compare canonically — a raw stringify reports a mismatch on
// every jsonb column the write touched even when every value landed.
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((kk) => [kk, x[kk]])) : x));
const LEDGER = path.join(BACKUP, "..", "applied.jsonl");
const ledger = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const keyOf = (e) => crypto.createHash("sha1").update(e.id + "\n" + canon(e.ops || [])).digest("hex");
const record = (r) => fs.appendFileSync(LEDGER, JSON.stringify({ ...r, at: new Date().toISOString() }) + "\n");

// ── lint needles, lifted from the audits so there is one list ──────────────────────────
const cit = fs.readFileSync(path.join(HERE, "..", "audit-prose-citations.mjs"), "utf8");
const grab = (src, name) => { const m = src.match(new RegExp("^const " + name + " ?=\\s*(/.*/[a-z]*);\\s*$", "m")); if (!m) throw new Error("needle " + name + " not found"); return eval(m[1]); };
const NAMED = grab(cit, "NAMED"), ACT = grab(cit, "ACT");
const voice = fs.readFileSync(path.join(HERE, "..", "audit-waypoint-note-voice.mjs"), "utf8");
const CUES = eval(voice.slice(voice.indexOf("const CUES = [") + 13, voice.indexOf("];", voice.indexOf("const CUES = [")) + 1));
const META = /\b(the prose|on-file|our (?:data|record)|this (?:entry|row|record)|context file|the route's own|pipeline|https?:|www\.)/i;
const lint = (s) => {
  const why = [];
  if (NAMED.test(s)) why.push("names a source: " + s.match(NAMED)[0]);
  if (ACT.test(s)) why.push("sourcing act: " + s.match(ACT)[0]);
  for (const [k, re] of CUES) if (re.test(s)) why.push(k);
  if (META.test(s)) why.push("meta: " + s.match(META)[0]);
  return why;
};

const ALLOWED_COLS = new Set(["approach", "approach_logistics", "approach_variants", "itinerary", "descent_text",
  "waypoints", "pitch_detail", "climbing_route", "beta", "overview", "permit", "access", "road", "watch_out", "pro_tips"]);
const WP_ADDABLE = new Set(["lat", "lng", "elev", "distMi", "note", "directions"]);

function parsePath(p) {
  const parts = [];
  p.replace(/([^.[\]]+)|\[(\d+)\]/g, (_, k, i) => { parts.push(i !== undefined ? Number(i) : k); });
  return parts;
}
function getParent(obj, parts) {
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (o == null) return null;
    o = o[parts[i]];
  }
  return o;
}

let refused = 0, ok = 0, changes = 0;
const plans = [];
for (const entry of batch) {
  const { id, ops = [], why = "" } = entry;
  try {
    if (!/^[a-z][a-z0-9_]+$/.test(id)) throw new Error("bad id");
    const cols = [...new Set(ops.filter((o) => o.path).map((o) => parsePath(o.path)[0]).concat(ops.some((o) => o.op) ? ["waypoints"] : []))];
    for (const c of cols) if (!ALLOWED_COLS.has(c)) throw new Error(`column ${c} is not on the repair allowlist`);
    const [live] = await selectAll("routes", "id,name," + cols.join(","), `id=eq.${id}`, { pageSize: 5 });
    if (!live) throw new Error("no such route");
    let row = live;
    if (SETTLE) {
      const bf = path.join(BACKUP, id + ".json");
      if (!fs.existsSync(bf)) { console.log(`SETTLE ${id}: no backup — never written`); continue; }
      const b = JSON.parse(fs.readFileSync(bf, "utf8"));
      if (cols.some((c) => !(c in b))) { console.log(`SETTLE ${id}: backup lacks a column this entry touches — never written by it`); continue; }
      row = { ...live, ...Object.fromEntries(cols.map((c) => [c, b[c]])) };
    }
    const orig = JSON.parse(JSON.stringify(row));
    const next = JSON.parse(JSON.stringify(row));
    const log = [];
    for (const o of ops.filter((o) => o.path)) {
      const parts = parsePath(o.path);
      const parent = getParent(next, parts);
      const leaf = parts[parts.length - 1];
      if (parent == null || typeof parent !== "object") throw new Error(`${o.path}: parent does not exist`);
      if ("find" in o) {
        const cur = parent[leaf];
        if (typeof cur !== "string") throw new Error(`${o.path}: not a string (find/replace needs text)`);
        const n = cur.split(o.find).length - 1;
        if (n !== 1) throw new Error(`${o.path}: find text occurs ${n} times, need exactly 1: "${o.find.slice(0, 80)}"`);
        const l = lint(o.replace); if (l.length) throw new Error(`${o.path}: replacement fails lint (${l.join("; ")})`);
        parent[leaf] = cur.replace(o.find, o.replace);
        log.push(`  ${o.path}\n    - ${o.find}\n    + ${o.replace}`);
      } else if ("set" in o) {
        const isWp = parts[0] === "waypoints" && parts.length === 3;
        if (!(leaf in parent) && !(isWp && WP_ADDABLE.has(leaf))) throw new Error(`${o.path}: field does not exist`);
        // Never change a field's SHAPE: the readers are shape-specific (itinerary is {cal, days:[…]} and
        // RouteDetail draws its day panel only from .days) — a string written over an object hides the panel.
        const kind = (v) => (v == null ? "null" : Array.isArray(v) ? "array" : typeof v);
        const numericTextToNumber = ["lat", "lng", "elev", "distMi"].includes(leaf) && typeof parent[leaf] === "string" && !isNaN(Number(parent[leaf])) && typeof o.set === "number";
        if (parent[leaf] != null && o.set != null && kind(parent[leaf]) !== kind(o.set) && !numericTextToNumber) throw new Error(`${o.path}: would change ${kind(parent[leaf])} to ${kind(o.set)} — write the same shape`);
        if (typeof o.set === "string") { const l = lint(o.set); if (l.length) throw new Error(`${o.path}: value fails lint (${l.join("; ")})`); }
        if (["lat", "lng", "elev", "distMi"].includes(leaf) && o.set !== null && typeof o.set !== "number") throw new Error(`${o.path}: must be a number`);
        log.push(`  ${o.path}: ${JSON.stringify(parent[leaf])} -> ${JSON.stringify(o.set)}`);
        parent[leaf] = o.set;
      } else throw new Error(`${o.path}: op needs find/replace or set`);
    }
    const structural = ops.filter((o) => o.op);
    if (structural.length > 1) throw new Error("at most one structural op per route");
    if (structural.length) {
      const s = structural[0];
      if (s.op !== "reorderWaypoints") throw new Error("unknown op " + s.op);
      const wps = next.waypoints;
      const order = s.order;
      // An entry may be an ORIGINAL index or a NEW waypoint object (insertion). A new waypoint must
      // name a type the app can draw and carry real numbers or nulls — no strings in lat/lng.
      const ints = order.filter((i) => typeof i === "number");
      if (!Array.isArray(order) || !order.length || new Set(ints).size !== ints.length || ints.some((i) => !Number.isInteger(i) || i < 0 || i >= wps.length))
        throw new Error("order must be distinct original indices (or new waypoint objects)");
      const WP_TYPES = ["Trailhead", "Junction", "Water", "Campsite", "Summit", "Topout", "Hazard"];
      for (const w of order.filter((i) => typeof i === "object")) {
        if (!w || typeof w.name !== "string" || !w.name.trim()) throw new Error("new waypoint needs a name");
        if (!WP_TYPES.includes(w.type)) throw new Error(`new waypoint "${w.name}" type must be one of ${WP_TYPES.join("/")}`);
        for (const k of ["lat", "lng", "elev", "distMi"]) if (w[k] != null && typeof w[k] !== "number") throw new Error(`new waypoint "${w.name}" ${k} must be a number or null`);
        for (const k of ["name", "note", "directions"]) if (typeof w[k] === "string") { const l = lint(w[k]); if (l.length) throw new Error(`new waypoint "${w.name}" ${k} fails lint (${l.join("; ")})`); }
      }
      const out = order.map((i) => (typeof i === "number" ? wps[i] : { lat: null, lng: null, elev: null, distMi: null, note: "", directions: "", ...i }));
      order.forEach((oi, j) => {
        if (typeof oi === "object") { log.push(`  insert waypoint at ${j}: ${oi.name} (${oi.type}) ${oi.lat},${oi.lng} ${oi.elev} ft`); return; }
        const prev = j === 0 ? null : order[j - 1];
        const samePred = j === 0 ? oi === 0 : prev === oi - 1;
        // A leg this same batch wrote deliberately (a set or replace on waypoints[i].directions) is
        // written FOR the new order, so it is kept; only a pre-existing leg is stale.
        const freshlyWritten = ops.some((o) => o.path === `waypoints[${oi}].directions`);
        if (!samePred && !freshlyWritten && out[j].directions) { log.push(`  cleared directions on "${out[j].name}" (predecessor changed)`); out[j] = { ...out[j], directions: "" }; }
      });
      const dropped = wps.map((_, i) => i).filter((i) => !ints.includes(i));
      log.push(`  reorder waypoints ${JSON.stringify(order)}${dropped.length ? `; DELETES ${dropped.map((i) => '"' + wps[i].name + '"').join(", ")}` : ""}`);
      next.waypoints = out;
    }
    const key = keyOf(entry);
    const seen = ledger.filter((r) => r.key === key);
    if (seen.some((r) => r.state === "done")) throw new Error("already applied (ledger) — this exact entry landed in an earlier run");
    const pend = seen.filter((r) => r.state === "pending").pop();
    if (pend) {
      const live = canon(Object.fromEntries(pend.touched.map((c) => [c, row[c]])));
      if (live === pend.next) { if (APPLY) record({ key, id, state: "done", touched: pend.touched, next: pend.next, settled: true }); throw new Error("already applied — an earlier run crashed after its PATCH committed (ledger settled)"); }
      if (live !== pend.orig) throw new Error("an earlier run crashed mid-write and the row now matches neither its before nor its after — inspect by hand");
    }
    const touched = cols.filter((c) => JSON.stringify(orig[c]) !== JSON.stringify(next[c]));
    if (!touched.length) throw new Error("no effective change");
    if (SETTLE) {
      const snap = (o) => canon(Object.fromEntries(touched.map((c) => [c, o[c]])));
      const L = snap(live);
      if (L === snap(next)) { record({ key, id, state: "done", touched, next: snap(next), settled: true }); console.log(`SETTLE ${id}: LANDED — recorded done`); }
      else if (L === snap(orig)) console.log(`SETTLE ${id}: NOT LANDED — safe to apply`);
      else console.log(`SETTLE ${id}: MATCHES NEITHER — inspect by hand (${touched.join(",")})`);
      continue;
    }
    console.log(`${id} (${row.name}) — ${why}\n${log.join("\n")}\n`);
    plans.push({ id, key, orig, next, touched });
    ok++; changes += log.length;
  } catch (e) {
    refused++; console.log(`REFUSED ${id}: ${e.message}\n`);
  }
}
console.log(`planned: ${ok} route(s), ${changes} change(s); refused: ${refused}`);
if (!APPLY) { console.log("dry run — nothing written."); process.exit(refused ? 2 : 0); }

let bad = 0;
for (const p of plans) {
  const bf = path.join(BACKUP, p.id + ".json");
  if (!fs.existsSync(bf)) fs.writeFileSync(bf, JSON.stringify(p.orig, null, 1));
  const body = Object.fromEntries(p.touched.map((c) => [c, p.next[c]]));
  const snap = (o) => canon(Object.fromEntries(p.touched.map((c) => [c, o[c]])));
  record({ key: p.key, id: p.id, state: "pending", touched: p.touched, orig: snap(p.orig), next: snap(p.next) });
  await patchRow("routes", p.id, body);
  const [back] = await selectAll("routes", "id," + p.touched.join(","), `id=eq.${p.id}`, { pageSize: 5 });
  const diff = p.touched.filter((c) => canon(back[c]) !== canon(p.next[c]));
  if (diff.length) { bad++; console.log(`MISMATCH ${p.id}: ${diff.join(",")} did not land`); }
  else record({ key: p.key, id: p.id, state: "done", touched: p.touched, next: snap(p.next) });
}
console.log(`applied ${plans.length - bad} route(s), ${bad} mismatched. Backups in ${path.relative(process.cwd(), BACKUP)}`);
process.exit(bad ? 1 : 0);
