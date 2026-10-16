// Validate camping-role research output against its input batch.
//   node scripts/oneoff/check-camp-role-output.mjs 07        (one batch)
//   node scripts/oneoff/check-camp-role-output.mjs           (every output present)
// Fails on: a route missing, a camp not classified or classified twice, an unknown camp name,
// a named source in any text, an emoji, a bad permit url, an add without its fields.
import fs from "node:fs";
const D = "enrichment-wip/camping-roles/";
const want = process.argv[2] ? [String(process.argv[2]).padStart(2, "0")] : fs.readdirSync(D + "output").map(f => f.match(/batch-(\d+)\.json$/)?.[1]).filter(Boolean);
const SOURCE = /\b(beckey|summitpost|mountain ?project|peakbagger|cascade alpine guide|nwhikers|wta\b|washington trails association|the mountaineers|mountaineers books|according to|per the|guidebook|trip reports?|caltopo|gaia|alltrails|reddit|forum)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const OKHOST = /(^|\.)(nps\.gov|fs\.usda\.gov|usda\.gov|recreation\.gov|dnr\.wa\.gov|parks\.wa\.gov|wdfw\.wa\.gov|blm\.gov|parks\.canada\.ca|pc\.gc\.ca)$/;
let bad = 0;
const err = (b, m) => { bad++; console.log("batch-" + b + ": " + m); };
const texts = (o, b, where) => { for (const [k, v] of Object.entries(o || {})) { if (k === "url" || k === "note") continue; if (typeof v === "string") { if (SOURCE.test(v)) err(b, where + "." + k + " names a source: " + v.match(SOURCE)[0]); if (EMOJI.test(v)) err(b, where + "." + k + " has an emoji"); } } };
const permit = (p, b, where) => {
  if (p == null) return;
  if (!String(p.what || "").trim()) err(b, where + " overnightPermit.what empty");
  texts(p, b, where + ".overnightPermit");
  if (p.url != null) { try { const h = new URL(p.url).host; if (!OKHOST.test(h)) err(b, where + " permit url not an agency host: " + p.url); } catch { err(b, where + " permit url unparseable: " + p.url); } }
};
for (const b of want) {
  const inp = JSON.parse(fs.readFileSync(D + "input/batch-" + b + ".json"));
  let out; try { out = JSON.parse(fs.readFileSync(D + "output/batch-" + b + ".json")); } catch (e) { err(b, "no/invalid output: " + e.message); continue; }
  const byId = Object.fromEntries((out.routes || []).map(r => [r.id, r]));
  for (const z of out.zones || []) permit(z.overnightPermit, b, "zone " + z.zone);
  for (const z of inp) for (const r of z.routes) {
    const o = byId[r.id]; if (!o) { err(b, r.id + " missing"); continue; }
    const seen = {};
    for (const bucket of ["main", "onRoute", "drop"]) for (const n of o[bucket] || []) seen[n] = (seen[n] || 0) + 1;
    for (const c of r.camps) { if (!seen[c.name]) err(b, r.id + ": unclassified camp '" + c.name + "'"); else if (seen[c.name] > 1) err(b, r.id + ": camp in two buckets '" + c.name + "'"); }
    const names = new Set(r.camps.map(c => c.name));
    for (const n of Object.keys(seen)) if (!names.has(n)) err(b, r.id + ": unknown camp name '" + n + "'");
    for (const a of o.add || []) {
      for (const k of ["name", "type", "capacity", "water", "permit", "notes", "role"]) if (!String(a[k] ?? "").trim()) err(b, r.id + ": add '" + a.name + "' missing " + k);
      if (!["main", "onRoute"].includes(a.role)) err(b, r.id + ": add role must be main|onRoute");
      if (a.elev != null && !(Number.isInteger(a.elev) && a.elev > 0 && a.elev < 14500)) err(b, r.id + ": add elev not integer feet: " + a.elev);
      if (names.has(a.name)) err(b, r.id + ": add duplicates an existing camp name '" + a.name + "'");
      texts(a, b, r.id + ".add");
    }
    permit(o.overnightPermit, b, r.id);
  }
}
console.log(bad ? bad + " problem(s)" : "OK: " + want.length + " batch(es) valid");
process.exit(bad ? 1 : 0);
