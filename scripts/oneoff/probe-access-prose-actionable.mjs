// How much of the access-prose backlog is actually a DEFECT, rather than prose that mentions
// a road?
//
// audit:access-prose reports 192 sentences and labels 114 of them MISFILED. Reading a sample
// of that bucket, most are not misfiled at all: a `best_season` value saying "roughly late
// June through September, once Cascade River Road opens" is a SEASON statement that uses the
// road as its boundary, which is the correct and useful answer to that column's own question.
// The audit's own header already says so about `season`; the same defence applies to
// `best_season`, and to approach narrative in `beta`, and to a descent hazard in `watch_out`.
//
// So the count overstates the work, in the way every headline count in this backlog has. The
// question worth asking is narrower and is the one the original report was actually about:
//
//     is the fact REACHABLE from the section that should carry it?
//
// A climber planning a trip taps ROAD ACCESS or PERMITS. If that section is EMPTY while the
// route's own prose knows the road is gated, the page is withholding what it knows — and that
// is true whether or not the prose sentence is well filed. The repair there is to POPULATE the
// road/permit block from the route's own words, never to delete the prose.
//
// This probe measures that set. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const k = anonKey();

const ROAD_NOUN = /\b(road|highway|hwy|sr[- ]?\d+|fr[- ]?\d+|forest road|us[- ]?\d+|i-\d+|milepost|mp \d+|trailhead)\b/i;
const ROAD_VERB = /\b(open(s|ed|ing)?|clos(e|es|ed|ure|ing)|gate[sd]?|gated|access(ible)?|plow(ed|ing)?|wash(ed)?[- ]?out|snow[- ]?free|drivable|driveable|impassab|reopen)\b/i;
const PERMIT = /\b(permit|permits|reservation|recreation\.gov|quota|wilderness information center|northwest forest pass|discover pass|sno-?park pass|entrance fee|self[- ]register|bear canister required)\b/i;
const COLS = ["season", "best_season", "overview", "beta", "turnaround", "watch_out", "description"];

const sentences = (t) => String(t || "").split(/(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);

/* Every string leaf of a jsonb value, so a nested road note counts as the block speaking. */
function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}

async function readAll() {
  const sel = ["id", "name", "road", "access", "permit", "approach_logistics", ...COLS].join(",");
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=like.wa_*&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes; not a clean catalog"); process.exit(1); }

let proseKnowsRoad = 0, proseKnowsPermit = 0;
const roadSilent = [], permitSilent = [];
for (const r of rows) {
  const roadTxt = leaves(r.road).join(" ");
  /* approach_logistics carries road prose on a lot of rows and renders on the Plan tab, so a
     road fact recorded there is reachable and this route is not withholding anything. */
  const logisticsTxt = leaves(r.approach_logistics).join(" ");
  const accessTxt = leaves(r.access).join(" ");
  const permitTxt = [String(r.permit || ""), accessTxt].join(" ");

  const roadSaysSomething = ROAD_NOUN.test(roadTxt) || ROAD_NOUN.test(logisticsTxt);
  const permitSaysSomething = PERMIT.test(permitTxt);

  for (const c of COLS) {
    for (const s of sentences(typeof r[c] === "string" ? r[c] : leaves(r[c]).join(" "))) {
      const road = ROAD_NOUN.test(s) && ROAD_VERB.test(s);
      const perm = PERMIT.test(s);
      if (road) {
        proseKnowsRoad++;
        if (!roadSaysSomething) roadSilent.push({ id: r.id, name: r.name, col: c, s });
      }
      if (perm) {
        proseKnowsPermit++;
        if (!permitSaysSomething) permitSilent.push({ id: r.id, name: r.name, col: c, s });
      }
    }
  }
}

const uniq = (a) => [...new Set(a.map((x) => x.id))];
console.log(`\n=== is the access fact REACHABLE from the section that should carry it? ===`);
console.log(`${rows.length} WA routes read\n`);
console.log(`prose sentences that know a ROAD fact:   ${proseKnowsRoad}`);
console.log(`   ... on a route whose road/logistics block says NOTHING about a road: ${roadSilent.length} sentence(s) on ${uniq(roadSilent).length} route(s)`);
console.log(`prose sentences that know a PERMIT fact: ${proseKnowsPermit}`);
console.log(`   ... on a route whose permit/access block says NOTHING about a permit: ${permitSilent.length} sentence(s) on ${uniq(permitSilent).length} route(s)`);

for (const [label, list] of [["ROAD BLOCK SILENT", roadSilent], ["PERMIT BLOCK SILENT", permitSilent]]) {
  if (!list.length) { console.log(`\n--- ${label}: none ---`); continue; }
  console.log(`\n--- ${label}: ${list.length} ---`);
  for (const f of list.slice(0, 60)) console.log(`  ${f.id}  [${f.col}]\n     "${f.s.slice(0, 220)}"`);
  if (list.length > 60) console.log(`  … ${list.length - 60} more`);
}
console.log(`\nRead-only. The repair for anything above is to POPULATE the silent block from the route's own words — never to delete the prose.`);
