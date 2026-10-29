// Writes one context file per route in scope: the row as stored now, read with the service key.
// Usage: node audits/pitch-beta-2026-10-25/gen-context.mjs <ids.txt>
// (ids.txt: one route id per line). Read-only against the database.
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey, SUPABASE_URL } from "../../scripts/lib/supabase-env.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const dir = path.join(here, "context");
fs.mkdirSync(dir, { recursive: true });
const ids = fs.readFileSync(process.argv[2], "utf8").split("\n").map(s => s.trim()).filter(Boolean);
const key = requireServiceKey();
const SEL = "id,name,area_id,discipline,grade,pitches,pitch_detail,rappel_detail,rappels,descent_text,approach,overview,beta,gear,fa,face";
const CHUNK = 25;
let n = 0;
for (let i = 0; i < ids.length; i += CHUNK) {
  const part = ids.slice(i, i + CHUNK);
  const rows = await selectAll("routes", SEL, `id=in.(${part.map(encodeURIComponent).join(",")})`, { key, pageSize: 200 });
  for (const r of rows) {
    fs.writeFileSync(path.join(dir, `${r.id}.json`), JSON.stringify(r, null, 1));
    n++;
  }
}
console.log(`wrote ${n} context files of ${ids.length} ids to ${dir} (${SUPABASE_URL ? "live" : "no url"})`);
