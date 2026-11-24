// node reread.mjs <rollback.json> — re-read the written rows and reconcile every applied value (jsonb key order ignored)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { NPX, NPX_PRE } from "../../scripts/lib/npx.mjs";
const rb = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const ids = [...new Set(rb.map((r) => r.id))];
const cols = [...new Set(rb.map((r) => r.column))];
const sqlf = (process.env.BATCH_DIR || ".") + "/reread.sql";
fs.writeFileSync(sqlf, `select json_agg(json_build_object('id', id, ${cols.map((c) => `'${c}', ${c}`).join(", ")})) j from routes where id in (${ids.map((i) => `'${i}'`).join(",")});`);
const raw = execFileSync(NPX, [...NPX_PRE, "supabase", "db", "query", "--linked", "--read-only", "-f", sqlf], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const rows = Object.fromEntries(JSON.parse(raw.slice(raw.indexOf("{"))).rows[0].j.map((x) => [x.id, x]));
const canon = (v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
let ok = 0, bad = 0;
for (const f of rb) {
  const live = rows[f.id] ? rows[f.id][f.column] : undefined;
  if (JSON.stringify(canon(live)) === JSON.stringify(canon(f.applied))) ok++;
  else { bad++; console.log("MISMATCH", f.id, f.column, JSON.stringify(live).slice(0, 80)); }
}
console.log(`hold ${ok} / ${rb.length}, mismatch ${bad}`);
