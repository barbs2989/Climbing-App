// Pitch and rappel GAP census (owner note 2026-11-26): "Audit where the route says x number of pitches, and the
// route breakdown doesn't show all the info for every pitch ... Same for rappels."
// Reads every routes row with pitches >= 2 (service key, paged) and classifies, with the app's own rules:
//   PITCH GAP   a roped route (isPitched) whose stored count exceeds the pitch_detail entries (pitchShortfall's test)
//   PITCH EMPTY the same with NO pitch_detail at all (a sub-set of PITCH GAP)
//   THIN        an entry that has no notes, or notes under 40 characters, and no length/anchor
//   RAPPEL GAP  rappels are part of the descent (not rappelsAreNone, and rappels/descent_text says rappel)
//               but rappel_detail is empty
// Writes audits/pitch-gap/census.json (one slim row per gap route) and prints totals by discipline.
// Usage: node audits/pitch-gap/census.mjs
import fs from "fs";
import { selectAll, requireServiceKey } from "../../scripts/lib/supabase-env.mjs";
import { isPitched } from "../../lib/breakdownRows.js";
import { rappelsAreNone } from "../../lib/rappelText.js";
const key = requireServiceKey();
const SEL = "id,name,area_id,discipline,pitches,pitch_detail,rappel_detail,rappels,descent_text,length_m,stars,classic,guide_stars,grade";
const rows = await selectAll("routes", SEL, "pitches=gte.2&discipline=neq.bouldering", { key, pageSize: 1000 });
const RAP = /\brap(?:pel)?s?\b|rappell?(?:ing|ed)|abseil/i;
const thin = (e) => { const n = String((e && (e.notes || e.note || e.desc || e.description)) || "").trim(); return n.length < 40 && !(e && (e.lengthM || e.length_m || e.length)) && !(e && e.anchor); };
const by = {}, out = [];
for (const r of rows) {
  const route = { discipline: r.discipline, rappels: r.rappels, rappelDetail: r.rappel_detail };
  const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
  const rd = Array.isArray(r.rappel_detail) ? r.rappel_detail : [];
  const roped = isPitched(route);
  const pitchGap = roped && r.pitches > pd.length;
  const nThin = pd.filter(thin).length;
  const rapSaid = RAP.test(String(r.rappels ?? "")) || /^\s*\d/.test(String(r.rappels ?? "")) || (r.rappels && typeof r.rappels === "object") || RAP.test(r.descent_text || "");
  const rapGap = roped && !rappelsAreNone(route) && !!rapSaid && rd.length === 0;
  const b = (by[r.discipline] ||= { n: 0, roped: 0, gap: 0, empty: 0, thinRoutes: 0, rapGap: 0, rapUnknown: 0 });
  b.n++; if (roped) b.roped++; if (pitchGap) b.gap++; if (roped && !pd.length) b.empty++; if (roped && nThin) b.thinRoutes++; if (rapGap) b.rapGap++;
  if (roped && !rapSaid && !rd.length && !rappelsAreNone(route)) b.rapUnknown++;
  if (pitchGap || (roped && nThin) || rapGap)
    out.push({ id: r.id, name: r.name, area: r.area_id, disc: r.discipline, grade: r.grade, pitches: r.pitches, pd: pd.length, thin: nThin, rd: rd.length, rapGap, stars: r.stars, classic: r.classic, gs: r.guide_stars, lenM: r.length_m });
}
fs.writeFileSync(new URL("./census.json", import.meta.url), JSON.stringify(out));
console.log("rows pitches>=2:", rows.length);
console.table(by);
const t = Object.values(by).reduce((a, b) => { for (const k in b) a[k] = (a[k] || 0) + b[k]; return a; }, {});
console.log("TOTAL", t, "gap routes written:", out.length);
