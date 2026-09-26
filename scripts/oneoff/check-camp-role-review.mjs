// Validate a second-reader review output against its input.  node scripts/oneoff/check-camp-role-review.mjs [NN]
import fs from "node:fs";
const D = "enrichment-wip/camping-roles/";
const want = process.argv[2] ? [String(process.argv[2]).padStart(2, "0")] : fs.readdirSync(D + "review-output").map(f => f.match(/review-(\d+)\.json$/)?.[1]).filter(Boolean);
const SOURCE = /\b(beckey|summitpost|mountain ?project|peakbagger|cascade alpine guide|nwhikers|wta\b|washington trails association|the mountaineers|mountaineers books|according to|per the|guidebook|trip reports?|caltopo|gaia|alltrails|reddit|forum)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
let bad = 0; const err = (b, m) => { bad++; console.log("review-" + b + ": " + m); };
for (const b of want) {
  const inp = JSON.parse(fs.readFileSync(D + "review-input/review-" + b + ".json"));
  let out; try { out = JSON.parse(fs.readFileSync(D + "review-output/review-" + b + ".json")); } catch (e) { err(b, "no/invalid output: " + e.message); continue; }
  const by = Object.fromEntries((out.routes || []).map(r => [r.id, r]));
  for (const r of inp) {
    const o = by[r.id]; if (!o) { err(b, r.id + " missing"); continue; }
    if (!["confirm", "change"].includes(o.verdict)) err(b, r.id + " verdict must be confirm|change");
    const names = new Set(r.camps.map(c => c.name)), pins = new Set(r.campsitePins.filter(p => p.hiddenFromList).map(p => p.name));
    for (const [n, role] of Object.entries(o.setRole || {})) { if (!names.has(n)) err(b, r.id + " setRole unknown camp '" + n + "'"); if (!["main", "route"].includes(role)) err(b, r.id + " bad role " + role); }
    for (const n of o.remove || []) { if (!names.has(n)) err(b, r.id + " remove unknown camp '" + n + "'"); if (o.setRole && o.setRole[n]) err(b, r.id + " both setRole and remove '" + n + "'"); }
    for (const n of o.unhidePins || []) if (!pins.has(n)) err(b, r.id + " unhidePins names no hidden pin '" + n + "'");
    for (const a of o.add || []) {
      for (const k of ["name", "type", "capacity", "water", "permit", "notes", "role"]) if (!String(a[k] ?? "").trim()) err(b, r.id + " add '" + a.name + "' missing " + k);
      if (!["main", "route"].includes(a.role)) err(b, r.id + " add role must be main|route");
      if (a.elev != null && !(Number.isInteger(a.elev) && a.elev > 0 && a.elev < 14500)) err(b, r.id + " add elev not integer feet");
      if (names.has(a.name)) err(b, r.id + " add duplicates existing '" + a.name + "'");
      for (const k of ["name", "capacity", "water", "permit", "notes"]) { const v = String(a[k] || ""); if (SOURCE.test(v)) err(b, r.id + " add." + k + " names a source: " + v.match(SOURCE)[0]); if (EMOJI.test(v)) err(b, r.id + " add." + k + " emoji"); }
    }
    if (o.verdict === "confirm" && (Object.keys(o.setRole || {}).length || (o.remove || []).length || (o.add || []).length || (o.unhidePins || []).length)) err(b, r.id + " confirm must carry no changes");
  }
}
console.log(bad ? bad + " problem(s)" : "OK: " + want.length + " review batch(es) valid"); process.exit(bad ? 1 : 0);
