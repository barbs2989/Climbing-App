// Census for the owner's note (2026-11-26): the RAPPELS section must describe ONE rope only.
// Pulls every route carrying rappel data and classifies it: station list needs two ropes
// (by length or stated), and prose that speaks of two/double ropes.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { rappelRopeNeed } from "../../lib/rappels.js";
import fs from "node:fs";
const key = requireServiceKey();
const sel = "id,name,area_id,rappel_detail,rappels,rappel_count_note,descent_text,gear";
const a = await selectAll("routes", sel, "rappel_detail=not.is.null", { key, pageSize: 500 });
console.error("with rappel_detail:", a.length);
const b = await selectAll("routes", sel, "rappels=not.is.null&rappel_detail=is.null", { key, pageSize: 500 });
console.error("rappels prose only:", b.length);
const b2 = await selectAll("routes", sel, "rappel_count_note=not.is.null&rappel_detail=is.null&rappels=is.null", { key, pageSize: 500 });
console.error("count note only:", b2.length);
const TWO = /\b(two|2|double|twin|pair of|2\s*[x×])\s*(?:\d{2}\s?m\s*)?(?:ropes?|half ropes?)\b|\bdouble[- ]rope|\b2\s*[x×]\s*\d{2}\s?m\b|\b\d{2}\s?m\s*[x×]\s*2\b|\btwo-rope\b|\bdoubled? ropes\b/i;
const out = [];
for (const r of [...a, ...b, ...b2]) {
  const route = { rappelDetail: r.rappel_detail, rappelCountNote: r.rappel_count_note };
  const need = rappelRopeNeed(route);
  const txt = [typeof r.rappels === "string" ? r.rappels : JSON.stringify(r.rappels), r.rappel_count_note,
    ...(Array.isArray(r.rappel_detail) ? r.rappel_detail.map(x => [x.station, x.notes, x.pull, x.anchor].filter(Boolean).join(" ")) : [])].filter(Boolean).join(" | ");
  const two = TWO.test(txt);
  out.push({ id: r.id, name: r.name, n: Array.isArray(r.rappel_detail) ? r.rappel_detail.length : 0, need: need && need.needs, max: need && need.max, twoText: two });
}
fs.writeFileSync(process.argv[2], JSON.stringify({ rows: [...a, ...b, ...b2], cls: out }, null, 1));
const c = (f) => out.filter(f).length;
console.log("total", out.length, "double", c(x => x.need === "double"), "single70", c(x => x.need === "single70"), "twoText", c(x => x.twoText), "double|twoText", c(x => x.need === "double" || x.twoText));
