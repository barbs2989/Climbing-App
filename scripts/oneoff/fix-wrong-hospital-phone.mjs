// Five routes give the wrong phone number for the nearest hospital.
//
// `emergency.nearestHospital` is the field a party reads when something has gone wrong, which makes a
// wrong number the worst kind of defect in this catalog — worse than a bad grade or a displaced pin,
// because it fails at exactly the moment it is needed.
//
// VERIFIED TWO WAYS, and the external check came first because this project's standing rule is that a
// phone number is never reported wrong on internal evidence alone:
//   * Cascade Medical Center's own site, read directly this session: (509) 548-5815,
//     817 Commercial Street, Leavenworth WA 98826, listed for both the main line and the ER.
//   * The catalog's own majority: of 134 values naming Cascade Medical, 56 carry (509) 548-5815 and
//     5 carry (509) 548-3420. So the correct string is already present verbatim, on eleven times as
//     many rows as the wrong one.
//
// The repair is an exact find/replace of the digits inside each value, asserted to match exactly once,
// so the surrounding prose (address, "24-hr ER", trauma level, drive notes) is preserved untouched and
// nothing is composed. Refuses on any value where the wrong number appears more than once.
//
// NOT TOUCHED: one row carries (509) 548-5807 for the same hospital. The site lists 548-5815 for the
// main line and the ER but does not rule out a department line, and a single differing value is not
// evidence of an error the way five identical ones against a 56-row majority are. Left alone
// deliberately rather than swept in.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const ORG = /cascade medical/i;
const WRONG = "(509) 548-3420";
const RIGHT = "(509) 548-5815";
// The same digits may be written 509-548-3420 or (509) 548-3420; handle both, replacing in kind.
const WRONG_RE = /\(?509\)?[\s.-]?548[\s.-]?3420/g;

const rows = await selectAll("routes", "id,emergency", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

// Establish the majority from the catalog itself, and refuse if it is not overwhelming — if the
// "wrong" number were in fact the common one, this script would be the thing that is wrong.
let right = 0, wrong = 0;
for (const r of rows) {
  const e = r.emergency; if (!e || typeof e !== "object") continue;
  for (const v of Object.values(e)) {
    if (typeof v !== "string" || !ORG.test(v)) continue;
    if (v.includes(RIGHT)) right++;
    if (WRONG_RE.test(v)) wrong++;
    WRONG_RE.lastIndex = 0;
  }
}
console.log(`values naming Cascade Medical: ${RIGHT} on ${right}, ${WRONG} on ${wrong}`);
if (right < 20 || wrong === 0 || right < wrong * 5) {
  console.error("the catalog's own majority does not clearly favour the verified number — refusing");
  process.exit(1);
}

const plan = [];
for (const r of rows) {
  const e = r.emergency; if (!e || typeof e !== "object") continue;
  const changes = {};
  for (const [k, v] of Object.entries(e)) {
    if (typeof v !== "string" || !ORG.test(v)) continue;
    const hits = v.match(WRONG_RE);
    if (!hits) continue;
    if (hits.length > 1) { console.error(`REFUSING ${r.id}.${k}: the number appears ${hits.length} times`); process.exit(1); }
    changes[k] = v.replace(WRONG_RE, RIGHT);
  }
  if (Object.keys(changes).length) plan.push({ id: r.id, changes, premise: e });
}
console.log(`\nrows to repair: ${plan.length}\n`);
for (const p of plan)
  for (const [k, v] of Object.entries(p.changes)) {
    console.log(`  ${p.id}.${k}`);
    console.log(`      from ${JSON.stringify(String(p.premise[k]).slice(0, 100))}`);
    console.log(`      to   ${JSON.stringify(String(v).slice(0, 100))}`);
  }
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, refused = 0;
const live = new Map((await selectAll("routes", "id,emergency", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id)?.emergency;
  if (!cur || Object.keys(p.changes).some(k => cur[k] !== p.premise[k])) {
    console.log(`  REFUSED ${p.id}: the row has changed since it was read`); refused++; continue;
  }
  await patchRow("routes", p.id, { emergency: { ...cur, ...p.changes } });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

const after = new Map((await selectAll("routes", "id,emergency", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) {
  const e = after.get(p.id)?.emergency;
  if (e && Object.entries(p.changes).every(([k, v]) => e[k] === v)) ok++;
  else console.log(`  NOT APPLIED: ${p.id}`);
}
console.log(`verified ${ok} of ${plan.length}`);
let left = 0;
for (const r of after.values())
  for (const v of Object.values(r.emergency || {})) {
    if (typeof v === "string" && ORG.test(v) && WRONG_RE.test(v)) left++;
    WRONG_RE.lastIndex = 0;
  }
console.log(`values still carrying ${WRONG}: ${left}`);
