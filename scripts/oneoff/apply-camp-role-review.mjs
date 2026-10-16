// Apply second-reader corrections (enrichment-wip/camping-roles/review-output/review-NN.json).
//   node scripts/oneoff/apply-camp-role-review.mjs [--apply]
// Only `verdict: "change"` rows are touched. COMPARE-AND-SET: the live row's visible camps (name +
// role, in order) must still equal what the reviewer was shown, or the row is skipped.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const APPLY = process.argv.includes("--apply");
const D = "enrichment-wip/camping-roles/";
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x);
const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,bivy`, { headers: headers(key) })).json())[0];
const sig = bivy => (bivy || []).filter(b => b.role !== "hidden").map(b => b.name + "|" + (b.role || ""));
const rollback = []; const t = { changed: 0, confirmed: 0, skipped: 0 };
for (const f of fs.readdirSync(D + "review-output").filter(f => /^review-\d+\.json$/.test(f)).sort()) {
  const inp = Object.fromEntries(JSON.parse(fs.readFileSync(D + "review-input/" + f)).map(r => [r.id, r]));
  for (const o of JSON.parse(fs.readFileSync(D + "review-output/" + f)).routes) {
    if (o.verdict !== "change") { t.confirmed++; continue; }
    const live = await read(o.id);
    if (canon(sig(live.bivy)) !== canon(inp[o.id].camps.map(c => c.name + "|" + (c.role || "")))) { t.skipped++; console.log("SKIP (moved since review)", o.id); continue; }
    const rm = new Set(o.remove || []), unhide = new Set(o.unhidePins || []), set = o.setRole || {};
    let kept = (live.bivy || []).filter(b => !(b.role === "hidden" && unhide.has(b.name)) && !rm.has(b.name)).map(b => set[b.name] ? { ...b, role: set[b.name] } : b);
    for (const a of o.add || []) { const x = { name: a.name, type: a.type || "camp", role: a.role }; if (Number.isInteger(a.elev)) x.elev = a.elev; for (const k of ["capacity", "water", "permit", "notes"]) if (String(a[k] || "").trim()) x[k] = String(a[k]).trim(); kept.push(x); }
    // mains first in the reviewer's stated order, then the rest of the mains, then route, then hidden stubs
    const order = Object.keys(set).filter(n => set[n] === "main");
    const rank = b => b.role === "main" ? (order.includes(b.name) ? order.indexOf(b.name) : 50) : b.role === "route" ? 100 : b.role === "hidden" ? 300 : 200;
    kept = kept.map((b, i) => [b, i]).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).map(x => x[0]);
    console.log(o.id, "->", kept.filter(b => b.role !== "hidden").map(b => b.role + ":" + b.name).join(" | "));
    if (!APPLY) { t.changed++; continue; }
    rollback.push({ id: o.id, bivy: live.bivy }); fs.writeFileSync(D + "review-rollback-" + process.pid + ".json", JSON.stringify(rollback));
    await patchRow("routes", o.id, { bivy: kept });
    if (canon((await read(o.id)).bivy) !== canon(kept)) throw new Error("RECONCILE FAILED " + o.id);
    t.changed++;
  }
}
console.log({ mode: APPLY ? "APPLY" : "DRY", ...t });
