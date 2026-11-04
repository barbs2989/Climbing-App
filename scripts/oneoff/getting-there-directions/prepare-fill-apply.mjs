// Turn second-check outputs (nb-check-*-out.json, FILL_CHECK_BRIEF.md) into the applier's input:
//   <prefix>-research.json  confirmed/corrected entries as found:true (rejected as found:false)
//   <prefix>-live.json      the LIVE rows (approach, approach_logistics) re-read by id just now, so the
//                           applier's absence rail and merge base see today's row, not the backlog list
//   node prepare-fill-apply.mjs <prefix> nb-check-X-out.json [...]
import fs from "fs";
import { SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
const [prefix, ...files] = process.argv.slice(2);
const research = files.flatMap(f => JSON.parse(fs.readFileSync(f, "utf8"))).map(e => ({
  ...e, found: ["confirmed", "corrected"].includes(e.verdict), unverified: e.verdict + ": " + (e.note || ""),
}));
const ids = research.map(e => e.id);
const live = [];
for (let i = 0; i < ids.length; i += 20) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach,approach_logistics&id=in.(${ids.slice(i, i + 20).map(encodeURIComponent).join(",")})`,
    { headers: { apikey: anonKey(), Authorization: "Bearer " + anonKey() }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error("live read " + res.status);
  live.push(...await res.json());
}
if (live.length !== ids.length) throw new Error("live read returned " + live.length + " of " + ids.length);
fs.writeFileSync(prefix + "-research.json", JSON.stringify(research, null, 1));
fs.writeFileSync(prefix + "-live.json", JSON.stringify(live, null, 1));
const v = {}; for (const e of research) v[e.verdict] = (v[e.verdict] || 0) + 1;
console.log(JSON.stringify(v), "— live rows", live.length);
