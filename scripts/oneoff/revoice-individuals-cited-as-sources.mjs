// Five rendered values credit a PERSON as their authority. Re-voice; the facts all survive.
//
// audit:prose-citations lists PUBLISHERS, so these slipped it — measured in #1491 as a class of
// seven, now five after another session's widening (#1498) caught two. The needles were left
// alone then because #1484 was open on them; it has since merged, so this acts on the values.
//
// FOUR OF THE FIVE CREDIT FRED BECKEY, and the audit's near-miss is precise: NAMED carries
// `Beckey(?:'s)?\s+(?:guide|guidebook)` deliberately, because a bare /Beckey/ matches "Beckey
// Route" — a ROUTE NAME on many rows. So the pattern cannot simply be widened, and that is why
// this is a data repair rather than a needle change.
//
// TWO ARE SAFETY-BEARING and their facts are unchanged: the arête's shaky rock and fragile
// flakes, and Garfield's twelve-hour minimum with ascents past 11 p.m. Only the attribution goes.
// A hedge that says the rack is INFERRED ("implied by route descriptions") is kept — it tells a
// climber the rack was not confirmed, which is content, and it names no publisher.
//
// Declared find -> replace pairs, refused unless the text occurs EXACTLY ONCE in the live leaf,
// re-read afterwards. The acceptance test is the AUDIT'S OWN needles plus the person frames, both
// lifted from source: a repair counts only if neither can still see a credit.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DRY = process.argv.includes("--dry");
const dead = (w) => { console.error(`\nREFUSED — ${w}. Nothing was written.\n`); process.exit(1); };
requireServiceKey();

const audit = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const liftRe = (n) => {
  // Whitespace-tolerant: another session reformatted `const ACT =/…` with no space after the
  // `=`, and a pattern requiring " = " failed ANCHOR LOST on a file that was perfectly fine.
  const m = new RegExp("^const " + n + "\\s*=\\s*(/.*/[gimsuy]*);$", "m").exec(audit);
  if (!m) dead(`ANCHOR LOST: const ${n} in audit-prose-citations.mjs`);
  return new Function("return " + m[1])();
};
const NAMED = liftRe("NAMED"), ACT = liftRe("ACT");
if (!NAMED.test("per Mountain Project")) dead("the lifted NAMED pattern is wrong");

// The person frames, kept in step with measure-individuals-cited-in-prose.mjs.
const PERSON = [
  /\b(?:account|report|description|beta|topo|trip report)[^.()]{0,60}\([A-Z][a-z]{3,}\)/,
  /\bper [A-Z][a-z]{3,}(?:'s)?\b/,
  /\baccording to [A-Z][a-z]{3,}(?:'s)?\b/,
  /\b[A-Z][a-z]{3,}(?:'s)? (?:reports?|describes?|notes?|writes?|lists?) \b/,
];
const NOT_A_PERSON = /^(Reports?|Climbers?|Several|Multiple|Independent|Text|Hikers?|Club|Condition|June|Parties|Party|Sources?|Guidebooks?|Descriptions?|Accounts?)$/;
const creditsAPerson = (s) => PERSON.some((re) => {
  const m = re.exec(s);
  if (!m) return false;
  const who = (/\(([A-Z][a-z]{3,})\)/.exec(m[0]) || /\b([A-Z][a-z]{3,})/.exec(m[0]) || [])[1];
  return who ? !NOT_A_PERSON.test(who) : true;
});

const EDITS = [
  // The alternative heavier rack is real content; only the credit goes.
  { id: "wa_liberty_crack_free", col: "sling_rack", path: "other",
    find: "an alternate account from the free ascent (Herrington) lists doubles",
    replace: "an alternative, heavier rack for the free ascent is doubles" },

  // SAFETY-BEARING: insecure protection on fragile flakes. Fact unchanged.
  { id: "wa_golden_horn_northeast_arete", col: "pro_needs", path: null,
    find: "Fred Beckey notes protection can be insecure on fragile flakes",
    replace: "Protection can be insecure on fragile flakes" },

  // SAFETY-BEARING: shaky rock behind a classic reputation. Fact unchanged.
  { id: "wa_golden_horn_northeast_arete", col: "watch_out", path: "0",
    find: "Fred Beckey describes the arête's rock as shaky despite its classic appearance",
    replace: "The arête's rock is shaky despite its classic appearance" },

  { id: "wa_sherpa_peak_east_ridge", col: "beta", path: null,
    find: "Beckey describes the balanced-rock move itself as a shoulder-stand",
    replace: "The balanced-rock move itself is a shoulder-stand" },

  // SAFETY-BEARING: the twelve-hour minimum and the 11 p.m. finishes both stay.
  { id: "wa_garfield_mountain_south_route", col: "hazards", path: "2",
    find: "Beckey lists twelve hours as an absolute minimum",
    replace: "twelve hours is an absolute minimum" },
];

function owner(obj, p) {
  if (p == null) return null;
  const parts = String(p).split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    if (o == null) return null;
    o = o[k];
  }
  const last = parts[parts.length - 1];
  return o == null ? null : { o, k: /^\d+$/.test(last) ? Number(last) : last };
}

const planned = [];
for (const e of EDITS) {
  const rows = await selectAll("routes", `id,${e.col}`, `id=eq.${e.id}`, { pageSize: 5 })
    .catch((err) => dead(`read of ${e.id}.${e.col} failed: ${err && err.message}`));
  if (!rows || rows.length !== 1) dead(`${e.id}: read ${rows ? rows.length : 0} row(s), expected 1`);
  const whole = JSON.parse(JSON.stringify(rows[0][e.col]));
  const own = owner(whole, e.path);
  const cur = own ? own.o[own.k] : whole;
  if (typeof cur !== "string") dead(`${e.id} ${e.col}${e.path ? "." + e.path : ""} is ${typeof cur}, not a string`);
  const n = cur.split(e.find).length - 1;
  if (n !== 1) dead(`${e.id} ${e.col}: the declared text occurs ${n} time(s), expected exactly 1 — the value has changed`);
  const next = cur.replace(e.find, e.replace);
  if (next === cur) dead(`${e.id}: no-op`);
  // The audit AND the person frames must both be satisfied by the result.
  if (NAMED.test(next) || ACT.test(next)) dead(`${e.id}: the audit still reads a citation:\n  ${next}`);
  if (creditsAPerson(next)) dead(`${e.id}: a person is still credited:\n  ${next}`);
  // A re-voice, not a deletion.
  if (next.length < cur.length * 0.6) dead(`${e.id}: ${next.length}ch against ${cur.length}ch — too much removed`);
  if (own) own.o[own.k] = next;
  planned.push({ e, before: cur, after: next, whole: own ? whole : next });
}

console.log(`all ${planned.length} edit(s) validated; neither the audit's needles nor the person frames read a credit in any result.\n`);
for (const p of planned) {
  console.log(`${p.e.id}  ${p.e.col}${p.e.path ? "." + p.e.path : ""}`);
  console.log(`  -  ${p.before}`);
  console.log(`  +  ${p.after}\n`);
}
if (DRY) { console.log("--dry: nothing written."); process.exit(0); }

for (const p of planned) {
  const body = {}; body[p.e.col] = p.whole;
  await patchRow("routes", p.e.id, body).catch((err) => dead(`${p.e.id}: write failed — ${err && err.message}`));
}
console.log(`wrote ${planned.length} row-column(s). re-reading…`);

let bad = 0;
for (const p of planned) {
  const rows = await selectAll("routes", `id,${p.e.col}`, `id=eq.${p.e.id}`, { pageSize: 5 })
    .catch(() => null);
  if (!rows || !rows.length) { console.error(`  RE-READ FAILED ${p.e.id}`); bad++; continue; }
  const own = owner(rows[0][p.e.col], p.e.path);
  const got = own ? own.o[own.k] : rows[0][p.e.col];
  if (got !== p.after) { console.error(`  MISMATCH ${p.e.id} ${p.e.col}: ${JSON.stringify(String(got).slice(0, 120))}`); bad++; }
}
console.log(bad ? `\n${bad} did not reconcile.` : `\nall ${planned.length} reconciled — no rendered value credits a person any more.`);
process.exit(bad ? 1 : 0);
