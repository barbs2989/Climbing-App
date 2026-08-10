// Do a route's rappel fields agree with each other?
//
// Reported against Forbidden Peak's West Ridge: the rappel table said 3 and the plan text
// beside it said 5. Neither field is wrong — rappelDetail lists 3 stations, the `rappels`
// prose describes an alternative East Ledges descent of ~5, and rappelCountNote records
// 6-7 in late-season dry conditions — but nothing reconciled them, so the screen printed two
// different counts for one climb.
//
// Read-only, report-only. Runs the same lib/rappels.js the app renders through, so a route
// listed here is exactly a route whose header now shows a range instead of a bare number.
//
//   node scripts/audit-rappels.mjs [--state wa] [--list 30]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { rappelSummary } from "../lib/rappels.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 20);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,rappels,rappel_detail,rappel_count_note,descent_text` +
    `&rappels=not.is.null` + (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (a + 1)));
  }
}

const t = { rows: 0, withDetail: 0, disagree: 0, noDetail: 0 };
const out = [];
let after = "";
for (;;) {
  const rows = await page(after);
  if (!rows.length) break;
  for (const r of rows) {
    if (STATE && !String(r.id).startsWith(STATE + "_")) continue;
    t.rows++;
    const s = rappelSummary({ ...r, rappelDetail: r.rappel_detail,
      rappelCountNote: r.rappel_count_note, descentText: r.descent_text });
    if (s.documented == null) { t.noDetail++; continue; }
    t.withDetail++;
    if (s.disagrees) {
      t.disagree++;
      if (out.length < LIST) out.push({ id: r.id, name: r.name, doc: s.documented, max: s.reportedMax,
        prose: String(r.rappels || "").slice(0, 110) });
    }
  }
  after = rows[rows.length - 1].id;
  if (rows.length < 1000) break;
}

console.log("\n=== rappel consistency audit ===");
console.log("routes with a rappels value:", t.rows);
console.log("  with a station-by-station rappel_detail:", t.withDetail, " prose only:", t.noDetail);
console.log("\nroutes whose prose reports MORE rappels than the detail table lists:", t.disagree);
if (out.length) {
  console.log("\nexamples (documented -> reported max):");
  for (const o of out) console.log(` ${o.id} — ${o.name}: ${o.doc} -> ${o.max}\n     ${o.prose}`);
}
process.exit(0);
