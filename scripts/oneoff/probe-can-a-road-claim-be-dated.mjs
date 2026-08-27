// CAN THE APP DATE A ROAD CLAIM AT ALL?
//
// audit:expiring-closures reports 129 values on 97 routes that state something with a shelf life —
// "closed indefinitely", "as of mid-2026", "no reopening estimate". Its standing instruction is
// "date it or drop the claim", and the obvious cheap fix is to show the reader WHEN the claim was
// recorded rather than researching 129 roads one at a time.
//
// That fix needs a date to exist. This checks whether one does, anywhere the road prose could reach.
// A negative result IS the finding: it would mean the instruction is currently unfollowable, and
// that the 129 values are a symptom rather than the problem.
//
// Read-only. Report-only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* ONE ROW PER TABLE, VIA A REAL `limit`. The first version used selectAll(), whose pageSize caps
   the PAGE and not the total — so it began paginating all 205k routes to read one row's column
   names, and had to be killed. A helper built for completeness is the wrong tool for a schema
   question. */
const oneRow = async (table, filter) => {
  const q = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1${filter ? "&" + filter : ""}`;
  const r = await fetch(q, { headers: headers(anonKey()) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 90)}`);
  return r.json();
};

const TS = /updated|modified|_at$|timestamp|verified|checked|recorded|asof|as_of/i;
const out = [];

async function inspect(table, filter) {
  let rows;
  try { rows = await oneRow(table, filter); }
  catch (e) { out.push([table, `unreadable — ${String(e.message).slice(0, 80)}`]); return; }
  if (!rows.length) { out.push([table, "no rows to inspect"]); return; }
  const cols = Object.keys(rows[0]);
  const ts = cols.filter(c => TS.test(c));
  out.push([table, `${String(cols.length).padStart(3)} columns · date-ish: ${ts.length ? ts.join(", ") : "NONE"}`]);
}

await inspect("routes", "id=eq.wa_kololo_peaks_standard");
await inspect("areas", "");

/* CONTRIBUTIONS IS EMPTY, so a row cannot answer whether it is datable — and an unreadable table
   is not a table without a timestamp. Read the MIGRATION instead, which is a fact about the schema
   rather than about today's data. [[an-anon-row-count-is-not-evidence-of-an-empty-table]] */
const mig = fs.readFileSync(path.join(ROOT, "supabase/migrations/0002_contributions.sql"), "utf8");
const contribDated = /created_at\s+timestamptz/i.test(mig);
out.push(["contributions", contribDated
  ? "created_at timestamptz default now()  (from 0002_contributions.sql — the table is empty, so this is read from the schema)"
  : "NO created_at in 0002_contributions.sql"]);

if (out.every(o => /unreadable|no rows/.test(o[1]))) {
  console.error("no table could be inspected — refusing to report");
  process.exit(1);
}

console.log("Where a road claim could carry a date:\n");
for (const [t, d] of out) console.log(`   ${t.padEnd(15)} ${d}`);

const routesRow = out.find(o => o[0] === "routes");
const routesHasDate = routesRow && !/date-ish: NONE/.test(routesRow[1]);
console.log(`\n${routesHasDate
  ? "routes carries a date — the reader-side fix is available and should be preferred over\nresearching 129 roads individually."
  : `THE ROUTES TABLE CANNOT DATE ANYTHING IT SAYS.

That is the root of the expiring-closures class rather than a detail of it. Every road status,
seasonal gate and closure note in the catalog is prose with no recorded write date, so the app
cannot show a reader how old a claim is — and audit:expiring-closures' own instruction, "date it
or drop the claim", has nowhere to put the date.

Three consequences worth stating plainly:
  · researching the 129 values fixes them until they go stale again, with nothing on screen to
    show a reader which state they are in;
  · a contributions row CAN be dated, so a CLIMBER's correction is datable while the enrichment
    pass that wrote the original is not — the asymmetry runs the wrong way;
  · adding one is a schema change and therefore a decision, not a task.`}`);
process.exit(0);
