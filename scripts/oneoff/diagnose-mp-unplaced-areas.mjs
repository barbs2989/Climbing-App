// Report-only: for Mountain Project routes import-mp-grades.mjs refused as "area not in our
// catalog", show WHERE the descent by name stops — the deepest area we do have, and the first name
// we do not — so missing areas can be told apart from a name-matching gap.
//   node scripts/oneoff/diagnose-mp-unplaced-areas.mjs montana
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const st = process.argv[2] || "montana";
const DIR = "catalog/_mp";
const norm = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").trim().toLowerCase();
const out = execFileSync("npx", ["supabase", "db", "query", "--linked", `select a.id, a.name, a.parent_id from areas a where a.path <@ (select path from areas where id = '${st}')`], { encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"] });
const rows = JSON.parse(out.slice(out.indexOf("{"))).rows;
const kids = new Map(), byId = new Map(rows.map(r => [r.id, r]));
for (const r of rows) { const k = r.parent_id; (kids.get(k) || kids.set(k, []).get(k)).push(r); }
const stops = {};
for (const f of readdirSync(DIR).filter(f => f.startsWith(st + "_") && f.endsWith(".csv"))) {
  for (const line of readFileSync(DIR + "/" + f, "utf8").split("\n").slice(1)) {
    const m = line.match(/^"(?:[^"]|"")*","((?:[^"]|"")*)"/); if (!m) continue;
    const chain = m[1].split(" > ").map(s => s.trim()).reverse().slice(1);
    let cur = st, i = 0;
    for (; i < chain.length; i++) { const c = (kids.get(cur) || []).filter(r => norm(r.name) === norm(chain[i])); if (c.length !== 1) break; cur = c[0].id; }
    if (i === chain.length) continue;
    const key = (byId.get(cur) || { name: st }).name + "  >>  missing: " + chain[i] + "   [our children: " + (kids.get(cur) || []).slice(0, 6).map(r => r.name).join(", ") + ((kids.get(cur) || []).length > 6 ? ", …" : "") + "]";
    stops[key] = (stops[key] || 0) + 1;
  }
}
for (const [k, n] of Object.entries(stops).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(String(n).padStart(4) + "  " + k);
