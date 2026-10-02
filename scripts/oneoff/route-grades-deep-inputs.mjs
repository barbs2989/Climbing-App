// Inputs for the DEEP pass (audits/route-grades/deep/): every route the first pass graded at LOW
// confidence or could not grade, and every route-identity problem it raised. Read-only.
//   node scripts/oneoff/route-grades-deep-inputs.mjs
import fs from "fs";
import { requireServiceKey, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const R = "audits/route-grades/research/out/";
const first = fs.readdirSync(R).filter(f => /^b\d+\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(R + f, "utf8")));
const mixed = ["out-1", "out-2"].flatMap(f => JSON.parse(fs.readFileSync(`audits/route-grades/mixed-beta/${f}.json`, "utf8")));
const COLS = "id,name,area_id,discipline,grade,grade_system,grade_num,rock_grade,alpine_grade,ice_grade,commitment,face,fa,overview,beta,climbing_route,pitch_detail,pitches,length_m";
async function rowsFor(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 80) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS},areas(name)&id=in.(${ids.slice(i, i + 80).join(",")})`, { headers: headers(key) });
    if (!res.ok) throw new Error("fetch " + res.status);
    for (const r of await res.json()) out[r.id] = r;
  }
  return out;
}
const brief = r => r && ({
  id: r.id, route: r.name, peak: r.areas && r.areas.name, area_id: r.area_id, discipline: r.discipline,
  grade: r.grade, rock_grade: r.rock_grade, alpine_grade: r.alpine_grade, ice_grade: r.ice_grade, commitment: r.commitment,
  face: r.face, fa: r.fa, pitches: r.pitches,
  overview: (r.overview || "").slice(0, 500), beta: (typeof r.beta === "string" ? r.beta : JSON.stringify(r.beta || "")).slice(0, 500),
  breakdown: Array.isArray(r.pitch_detail) ? r.pitch_detail.map(p => `${p.pitch}: ${p.grade || ""}`).slice(0, 12) : undefined,
});

// A. grades
const low = first.filter(x => x.scale !== "skip" && (x.confidence === "low" || !x.final_grade));
const lr = await rowsFor(low.map(x => x.id));
const A = low.map(x => ({ ...brief(lr[x.id]), first_pass: { final_grade: x.final_grade, scale: x.scale, evidence: x.evidence, note: x.note, sources: x.sources } }));

// B. identity — one item per flagged route, with every same-peak sibling so a duplicate can be named
const flag = {};
for (const x of first) if (x.identity) (flag[x.id] ||= []).push(x.identity);
for (const x of mixed) if (x.identity_problem) (flag[x.id] ||= []).push(x.identity_problem);
const fr = await rowsFor(Object.keys(flag));
const areas = [...new Set(Object.values(fr).map(r => r.area_id))];
const sib = {};
for (let i = 0; i < areas.length; i += 60) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,grade,fa,face&area_id=in.(${areas.slice(i, i + 60).join(",")})`, { headers: headers(key) });
  for (const s of await res.json()) (sib[s.area_id] ||= []).push(s);
}
const B = Object.entries(flag).filter(([id]) => fr[id]).map(([id, notes]) => ({
  ...brief(fr[id]), flagged: [...new Set(notes)],
  siblings_on_same_area: (sib[fr[id].area_id] || []).filter(s => s.id !== id).map(s => `${s.id} | ${s.name} | ${s.grade || ""} | fa: ${(s.fa || "").slice(0, 80)}`),
}));

fs.mkdirSync("audits/route-grades/deep/in", { recursive: true });
fs.mkdirSync("audits/route-grades/deep/out", { recursive: true });
const write = (pre, arr, per) => { let n = 0; for (let i = 0; i < arr.length; i += per) fs.writeFileSync(`audits/route-grades/deep/in/${pre}${++n}.json`, JSON.stringify(arr.slice(i, i + per), null, 1)); return n; };
console.log("grades:", A.length, "in", write("g", A, 14), "batches | identity:", B.length, "in", write("i", B, 14), "batches");
