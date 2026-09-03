// Two rows telling a day party no permit is needed, on a row that requires one two fields away.
//
// wa_little_annapurna_south_slopes access.permit opens "No permit is required for a day scramble."
// wa_dragontail_peak_r2 access.notes says "No permit required for day climbing."
// Both rows' own `permit` column reads: "Enchantment permit area: overnight stays May 15-Oct 31 require
// a quota permit (Recreation.gov advance lottery); DAY TRIPS NEED THE FREE SELF-ISSUED DAY-USE PERMIT AT
// THE TRAILHEAD."
//
// Both render. The denial is the sentence a day party reads and acts on, and it is the false one — the
// Forest Service issues a free self-issued day-use permit at the Enchantments trailheads and requires
// it. Free is not the same as optional, which is the confusion this sentence encodes.
//
// SETTLED FROM INSIDE THE ROW. The permit column already carries the requirement in the form the agency
// uses, so the repair deletes the false sentence and nothing is typed: no permit rule, agency or fee.
// The truth was already on screen beside it.
//
// THE SCOPE IS TWO, MEASURED, and the narrowness is deliberate. A denial scoped to DAY use beside a
// requirement scoped to OVERNIGHT is one correct sentence, not a contradiction — that distinction took
// an earlier no-permit sweep this session from 41 rows to 2, and it is why this gate demands the
// requirement itself be about day use. It also demands the requiring sentence not be a denial, because
// this catalog has now produced four separate detectors that read "No X required" as a claim that X is
// required.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const SENTS = s => String(s || "").split(/(?<=[.;])\s+/);
const DENY = /\bno\s+(?:day[- ]use\s+)?permits?\s+(?:is|are)?\s*(?:required|needed)|\bno permit is required/i;
const DAYSCOPE = /\bday\b/i;
// the requirement must itself be about DAY use, and must not be a denial
const REQ = /day[- ]use permits?\s+(?:is|are)?\s*required|day trips?\s+need[^.;]{0,40}day[- ]use permit|requires?\s+a\s+(?:free\s+)?(?:self[- ]issued?\s+)?day[- ]use permit/i;

const rows = await selectAll("routes", "id,permit,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [];
for (const r of rows) {
  const a = r.access || {};
  const col = String(r.permit || "");
  const req = SENTS(col).find(s => REQ.test(s) && !DENY.test(s));
  if (!req) continue;
  for (const [k, v] of Object.entries(a)) {
    if (typeof v !== "string") continue;
    for (const s of SENTS(v)) {
      if (!DENY.test(s) || !DAYSCOPE.test(s)) continue;
      const trimmed = s.trim();
      if (v.split(trimmed).length - 1 !== 1) { console.error(`REFUSING ${r.id}.${k}: the sentence appears more than once`); process.exit(1); }
      const after = v.replace(trimmed, "").replace(/\s{2,}/g, " ").trim();
      if (!after) { console.error(`REFUSING ${r.id}.${k}: deleting it would empty the field`); process.exit(1); }
      if (after.length >= v.length) { console.error(`REFUSING ${r.id}.${k}: the edit did not shorten the value`); process.exit(1); }
      plan.push({ id: r.id, access: a, k, from: v, to: after, sent: trimmed, req: req.trim() });
    }
  }
}

console.log(`\nvalues to repair: ${plan.length}`);
for (const p of plan) {
  console.log(`\n  ${p.id}  access.${p.k}`);
  console.log(`     deleting : ${JSON.stringify(p.sent.slice(0, 120))}`);
  console.log(`     leaving  : ${JSON.stringify(p.to.slice(0, 130))}`);
  console.log(`     the row's own permit column already says: ${JSON.stringify(p.req.slice(0, 130))}`);
}
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const byRow = new Map();
for (const p of plan) { if (!byRow.has(p.id)) byRow.set(p.id, { ...p.access }); byRow.get(p.id)[p.k] = p.to; }
for (const [id, acc] of byRow) await patchRow("routes", id, { access: acc });
const after = await selectAll("routes", "id,permit,access", `id=in.(${[...byRow.keys()].join(",")})`, { pageSize: 20 });
let left = 0;
for (const r of after) for (const v of Object.values(r.access || {})) {
  if (typeof v !== "string") continue;
  for (const s of SENTS(v)) if (DENY.test(s) && DAYSCOPE.test(s)) left++;
}
console.log(`\nwrote ${byRow.size} row(s); day-use denials remaining on them: ${left}  (expected 0)`);
