// Apply the camping-role research (enrichment-wip/camping-roles/output/batch-NN.json) to routes.
//   node scripts/oneoff/apply-camp-roles.mjs            dry run: print what would change
//   node scripts/oneoff/apply-camp-roles.mjs --apply    write, then re-read and reconcile
//   node scripts/oneoff/apply-camp-roles.mjs --apply --only 03,07
//
// Per route:  bivy := [main camps (role "main"), on-route camps (role "route"),
//                      stubs {name, role:"hidden"} for Campsite PINS the research dropped]
//             access.overnight_permit := the route's override, else its zone's permit
// Dropped bivy entries are removed. A pin is never deleted — its stub only keeps it out of the list.
//
// COMPARE-AND-SET: the row is re-read immediately before its write, and skipped unless its bivy
// NAMES still equal the snapshot the research was given (a climber may have contributed since, or a
// parallel session edited it) and it carries no role yet. Every pre-write row goes to a rollback file.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const APPLY = process.argv.includes("--apply");
const oi = process.argv.indexOf("--only");
const ONLY = oi > 0 ? new Set(process.argv[oi + 1].split(",").map(s => s.padStart(2, "0"))) : null;
const D = "enrichment-wip/camping-roles/";
const batches = fs.readdirSync(D + "output").map(f => f.match(/^batch-(\d+)\.json$/)?.[1]).filter(Boolean).filter(n => !ONLY || ONLY.has(n)).sort();

async function readRow(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,bivy,waypoints,access`, { headers: headers(key) });
  const j = await r.json(); if (!r.ok || !Array.isArray(j) || j.length !== 1) throw new Error("read " + id + " -> " + r.status + " " + JSON.stringify(j).slice(0, 200));
  return j[0];
}
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x);
const names = b => (Array.isArray(b) ? b : []).map(x => String(x?.name || ""));
const permitOf = p => p && typeof p === "object" && String(p.what || "").trim() ? { what: String(p.what).trim(), where: String(p.where || "").trim(), url: p.url || null } : null;

// The full pre-research bivy, per route: the research input only carries truncated notes.
const SNAP = JSON.parse(fs.readFileSync(D + "snapshot-bivy.json"));
let trimmedCount = 0; const noMain = [];
const plan = [];
for (const n of batches) {
  const inp = JSON.parse(fs.readFileSync(D + "input/batch-" + n + ".json"));
  const out = JSON.parse(fs.readFileSync(D + "output/batch-" + n + ".json"));
  const byId = Object.fromEntries(out.routes.map(r => [r.id, r]));
  const zonePermit = Object.fromEntries((out.zones || []).map(z => [z.zone, permitOf(z.overnightPermit)]));
  for (const z of inp) for (const r of z.routes) {
    const o = byId[r.id]; if (!o) throw new Error("batch " + n + " lacks " + r.id);
    const store = Object.fromEntries(r.camps.map(c => [c.name, c.store]));
    plan.push({ batch: n, id: r.id, snapshot: r.camps.filter(c => c.store === "bivy").map(c => c.name), store, o,
      permit: permitOf(o.overnightPermit) || zonePermit[z.zone] || (out.zones || []).length === 1 && permitOf(out.zones[0].overnightPermit) || null });
  }
}

function build(live, p) {
  const byName = {}; for (const b of (Array.isArray(live.bivy) ? live.bivy : [])) if (b && b.name && !byName[b.name]) byName[b.name] = b;
  const main = [], route = [], hidden = [];
  const add = p.o.add || [];
  const clean = a => { const x = { name: a.name, type: a.type || "camp" }; if (Number.isInteger(a.elev)) x.elev = a.elev; for (const k of ["capacity", "water", "permit", "notes"]) if (String(a[k] || "").trim()) x[k] = String(a[k]).trim(); return x; };
  for (const nm of p.o.main || []) { if (p.store[nm] === "bivy") { if (byName[nm]) main.push({ ...byName[nm], role: "main" }); } else main.push({ name: nm, type: "camp", role: "main" }); }
  for (const a of add.filter(a => a.role === "main")) main.push({ ...clean(a), role: "main" });
  for (const nm of p.o.onRoute || []) { if (p.store[nm] === "bivy" && byName[nm]) route.push({ ...byName[nm], role: "route" }); /* a pin alone already lists as "route" */ }
  for (const a of add.filter(a => a.role === "onRoute")) route.push({ ...clean(a), role: "route" });
  for (const nm of p.o.drop || []) if (p.store[nm] === "waypoint") hidden.push({ name: nm, role: "hidden" });
  return main.concat(route, hidden);
}

const rollback = []; let wrote = 0, skipped = 0, same = 0; const tallies = { main: 0, route: 0, hidden: 0, removed: 0 };
for (const p of plan) {
  const live = await readRow(p.id);
  const liveNames = names(live.bivy);
  let trimmedElsewhere = false;
  if (JSON.stringify(liveNames) !== JSON.stringify(p.snapshot)) {
    // A parallel writer TRIMMED 443 lists while the research ran (entries removed, none added or
    // edited). That case is allowed and its removals are RESPECTED: nothing it removed comes back.
    // Anything else — an added or edited entry, i.e. a climber's contribution — is still refused.
    const snap = SNAP[p.id] || [];
    const pure = (live.bivy || []).every(b => { const o = snap.find(x => x && x.name === b?.name); return o && JSON.stringify(o) === JSON.stringify(b); });
    if (!pure) { skipped++; console.log("SKIP (bivy edited since research)", p.id); continue; }
    trimmedElsewhere = true; trimmedCount++;
  }
  if ((live.bivy || []).some(b => b && b.role)) { same++; continue; }
  const bivy = build(live, p);
  for (const b of bivy) tallies[b.role]++;
  if (!bivy.some(b => b.role === "main")) noMain.push(p.id);
  tallies.removed += liveNames.length - bivy.filter(b => b.role !== "hidden" && liveNames.includes(b.name)).length;
  const access = { ...(live.access || {}) }; if (p.permit) access.overnight_permit = p.permit;
  if (!APPLY) { if (plan.indexOf(p) < 3) console.log(p.id, JSON.stringify(bivy.map(b => b.role + ":" + b.name)), JSON.stringify(p.permit)); continue; }
  rollback.push({ id: p.id, bivy: live.bivy, access: live.access });
  fs.writeFileSync(D + "rollback-" + process.pid + ".json", JSON.stringify(rollback));
  // re-read immediately before the write: the compare-and-set window is this one request
  const again = await readRow(p.id);
  if (JSON.stringify(again.bivy) !== JSON.stringify(live.bivy) || JSON.stringify(again.access) !== JSON.stringify(live.access)) { skipped++; console.log("SKIP (row moved during apply)", p.id); continue; }
  await patchRow("routes", p.id, { bivy, access });
  const check = await readRow(p.id);
  // jsonb RE-SORTS object keys, so the read-back is compared key-order-insensitively.
  if (canon(check.bivy) !== canon(bivy) || canon(check.access?.overnight_permit || null) !== canon(p.permit || live.access?.overnight_permit || null)) throw new Error("RECONCILE FAILED " + p.id);
  wrote++;
}
console.log({ mode: APPLY ? "APPLY" : "DRY", batches: batches.join(","), routes: plan.length, wrote, trimmedElsewhere: trimmedCount, alreadyApplied: same, skipped, ...tallies, rollback: APPLY ? D + "rollback-" + process.pid + ".json" : null });
console.log("routes left with NO main camp:", noMain.length, noMain.slice(0, 40).join(" "));
