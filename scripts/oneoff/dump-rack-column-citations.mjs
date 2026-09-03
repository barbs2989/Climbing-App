// Dump every citation hit in the four rack columns, in FULL, for classification by reading.
//
// #1422 made audit:prose-citations see these columns. The audit is report-only and says why: a
// citation is five different defects wearing one pattern, and only one of them is a deletion. So
// this prints whole values, never snippets — the repair class cannot be decided from a match.
//
// Needles and column list are LIFTED from the audit, same as the measuring script, so this cannot
// disagree with the thing that reports the backlog.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\ndump FAILED — ${w}. Nothing below was dumped.\n`); process.exit(1); };

const audit = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const liftRe = (name) => {
  const m = new RegExp("^const " + name + " = (/.*/[gimsuy]*);$", "m").exec(audit);
  if (!m) dead(`ANCHOR LOST: const ${name}`);
  return new Function("return " + m[1])();
};
const NAMED = liftRe("NAMED"), ACT = liftRe("ACT"), LIVE = liftRe("LIVE");
if (!NAMED.test("per Mountain Project")) dead("the lifted NAMED pattern is wrong");
if (!ACT.test("sources describe it")) dead("the lifted ACT pattern is wrong");

const COLS = (process.argv[2] || "sling_rack,detailed_rack,pro_needs,rope_note").split(",");
const LIMIT = Number(process.argv[3] || 200);

// Walk to string leaves, keeping the PATH so a repair can be addressed precisely.
function leaves(v, at = "", out = []) {
  if (typeof v === "string") out.push({ at, s: v });
  else if (Array.isArray(v)) v.forEach((x, i) => leaves(x, `${at}[${i}]`, out));
  else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => leaves(x, at ? `${at}.${k}` : k, out));
  return out;
}

let total = 0;
for (const col of COLS) {
  const rows = await selectAll("routes", `id,${col}`, `${col}=not.is.null`, { pageSize: 1000 })
    .catch((e) => dead(`read of ${col} failed: ` + (e && e.message)));
  if (!rows) dead(`read of ${col} returned nothing`);
  const hits = [];
  for (const r of rows) {
    for (const { at, s } of leaves(r[col])) {
      const named = NAMED.test(s), act = ACT.test(s);
      if (!named && !act) continue;
      hits.push({ id: r.id, at, s, live: LIVE.test(s), tags: [named && "NAMED", act && "ACT"].filter(Boolean).join("+") });
    }
  }
  console.log(`\n${"=".repeat(78)}\n${col}  —  ${hits.length} hit(s) across ${rows.length} rows\n${"=".repeat(78)}`);
  // Shortest first: a trailing-tag citation is usually a short value, and those are the
  // mechanically separable class. Reading them in that order front-loads the fixable ones.
  hits.sort((a, b) => a.s.length - b.s.length);
  for (const h of hits.slice(0, LIMIT)) {
    console.log(`\n[${h.tags}${h.live ? "+LIVE" : ""}] ${h.id}  ${col}${h.at ? "." + h.at : ""}  (${h.s.length}ch)`);
    console.log(`  ${h.s}`);
  }
  if (hits.length > LIMIT) console.log(`\n… ${hits.length - LIMIT} more in ${col}`);
  total += hits.length;
}
console.log(`\n${total} hit(s) total. A LIVE tag means the value also carries a land-manager URL or`);
console.log(`a ranger number — that is the thing a climber is told to go and check, and it STAYS.`);
