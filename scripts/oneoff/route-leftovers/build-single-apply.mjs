// Build audits/route-leftovers/single/out/<batch>-apply.json from <batch>.json: confirmed results only, minus the
// ops the reviewer held, with the reviewer's text amendments. Usage: node build-single-apply.mjs s5
import fs from "node:fs";
const b = process.argv[2], dir = new URL("../../../audits/route-leftovers/single/out/", import.meta.url).pathname;
const { results } = JSON.parse(fs.readFileSync(`${dir}${b}.json`, "utf8"));
// Held after review: [id, column, path JSON] — the op is dropped, with the reason kept in the apply file.
const HOLD = {
  "wa_new_york_gully|pitch_detail|[4]": "pitch 3 already describes an originally-aided crux corner; a fifth aided-corner row may be that same feature twice",
};
// Reviewer amendments to replace text: keep the figure the one source states rather than a rounding of it.
const AMEND = {
  "wa_berdeen_peak_scramble|bivy|a very big first day with four thousand feet of gain": "a very big first day with about 6,550 ft of gain",
};
const out = [], held = [];
for (const r of results) {
  if (r.verdict !== "confirmed" || !r.ops?.length) continue;
  const ops = [];
  for (const o of r.ops) {
    const why = HOLD[`${o.id}|${o.column}|${JSON.stringify(o.path || [])}`];
    if (why) { held.push({ id: o.id, column: o.column, path: o.path, why }); continue; }
    const am = o.op === "replace_text" && AMEND[`${o.id}|${o.column}|${o.find}`];
    ops.push(am ? { ...o, replace: am } : o);
  }
  if (ops.length) out.push({ id: r.id, verdict: "confirmed", rule: "single source accepted by the owner (2026-10-01)", fact: r.fact, ops });
}
fs.writeFileSync(`${dir}${b}-apply.json`, JSON.stringify({ results: out, held }, null, 1));
console.log(`${b}: ${out.length} results, ${out.reduce((n, r) => n + r.ops.length, 0)} ops, ${held.length} held`);
