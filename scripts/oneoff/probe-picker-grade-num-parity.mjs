// Proves picker_grade_num() (0210, SQL) gives the SAME scale and number as lib/grade.js
// gradeNumFrom for every grade the contribute form's picker can submit. The SQL function exists so
// an agreed grade correction can reach routes.grade_num without the client supplying the number;
// if the two ever disagree, a corrected route sorts and filters somewhere its grade does not say.
//
// The vocabulary is LIFTED from ClimbMatchCore.jsx (ADDR_YDS / VS / WIS / MS / AIDS / CLS), never
// retyped — a copy would agree with itself whatever the picker offered. Live: needs the linked
// Supabase CLI (supabase/.temp) and runs one query.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { gradeNumFrom } from "../../lib/grade.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const SETS = { ADDR_YDS: "yds", ADDR_VS: "v", ADDR_WIS: "wi", ADDR_MS: "m", ADDR_AIDS: "aid", ADDR_CLS: "class" };
const tokens = [];
for (const [name, sys] of Object.entries(SETS)) {
  const m = core.match(new RegExp("const " + name + "=(\\[[^\\]]*\\])"));
  if (!m) { console.error("ANCHOR LOST: " + name + " not found in ClimbMatchCore.jsx"); process.exit(1); }
  for (const t of JSON.parse(m[1])) tokens.push({ t, sys });
}
if (tokens.length < 150) { console.error("FAIL: only " + tokens.length + " picker grades lifted"); process.exit(1); }

const lit = tokens.map(x => "'" + x.t.replace(/'/g, "''") + "'").join(",");
const out = execFileSync("npx", ["supabase", "db", "query", "--linked", `select t, (picker_grade_num(t)).sys as sys, (picker_grade_num(t)).num as num from unnest(array[${lit}]) as t`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
const rows = JSON.parse(out.slice(out.indexOf("{"))).rows;
const bySql = new Map(rows.map(r => [r.t, r]));

let fails = 0;
for (const { t, sys } of tokens) {
  const s = bySql.get(t), want = gradeNumFrom(t, sys);
  const ok = s && s.sys === sys && s.num != null && Number(s.num) === want;
  if (!ok) { fails++; console.log(`FAIL  ${t}: SQL ${s ? s.sys + " " + s.num : "missing"} vs gradeNumFrom ${sys} ${want}`); }
}
// Non-vacuity: free text and alpine grades must convert to NOTHING, or the trigger would apply them.
const neg = ["Grade III", "AD+", "easy scramble", "WI", "5.", "A"];
const nout = execFileSync("npx", ["supabase", "db", "query", "--linked", `select t, (picker_grade_num(t)).sys as sys from unnest(array[${neg.map(x => "'" + x + "'").join(",")}]) as t`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
for (const r of JSON.parse(nout.slice(nout.indexOf("{"))).rows) if (r.sys != null) { fails++; console.log(`FAIL  "${r.t}" converted to ${r.sys} — only picker grades may convert`); }
console.log(fails ? fails + " failed" : `ok — ${tokens.length} picker grades agree with gradeNumFrom; ${neg.length} non-picker strings convert to nothing`);
process.exit(fails ? 1 : 0);
