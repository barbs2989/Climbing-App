// Batch-104 repairs. Each is a copy of a value that already exists -- in the row, or in a donor row
// proven to describe the SAME trailhead by coordinate. Nothing is composed.
//
// ------------------------------------------------------------------------------------------------
// 1. BOTH Chair Peak rows charge the wrong agency's parking fee
//
//   access.fees        "Summit at Snoqualmie parking fee for the Alpental lot"
//   access.passRequired "Summit at Snoqualmie parking permit"
//   trailhead pin       "Alpental parking lot / Snow Lake TH #1013" @ 47.4454,-121.4236, 3,100 ft
//
// The live USFS page for Snow Lake Trailhead -- at 47.44565/-121.42365 and 3,100 ft, i.e. the row's
// own pin to within 28 m -- requires $5/day or $30/year and accepts a Northwest Forest Pass or an
// Interagency pass. "Summit at Snoqualmie parking" is the ski area's winter programme and buys
// nothing at that lot in the climbing season, so a climber who reads this row and buys one arrives
// with no valid pass. One enrichment error carried on two rows.
//
// THE VALUE IS COPIED FROM A DONOR ROW, NEVER TYPED, and the donor is chosen BY COORDINATE.
// "Snow Lake" at Alpental and "Snow Lakes" in the Enchantments are DIFFERENT trailheads sixty miles
// apart, and a name search returns both -- 77 WA rows mention one or the other. Picking a donor by
// name would have a real chance of importing Leavenworth's Enchantment-permit regime onto a
// Snoqualmie Pass route. So the donor must carry a trailhead pin within 500 m of the Chair Peak
// pin, which no Enchantments row can satisfy.
//
// ------------------------------------------------------------------------------------------------
// 2. wa_chair_peak_west_ridge.season -- 62 characters in the header strap
//
//   "Spring-mid-summer (light crampons/axe useful until mid-summer)"
//
// The parenthetical is already carried TWICE elsewhere on the row -- best_season says "light
// crampons and a light axe are recommended until mid-summer per Pro Guiding Service", and `gear`
// lists "Light crampons" and "Light ice axe (early/mid-season)". So the truncation loses nothing.
// "Spring-mid-summer" is a season-word window rather than a month window, which seasonShort()
// already handles (CLAUDE.md records 38% of windows having season-word ends), and it is 17
// characters, inside the strap's budget.
//
// NOT REPAIRED HERE, and recorded so the silence is not read as a pass. wa_chair_peak_voie_de_chaise
// asks for "two 60m ropes tied together (several stations leave under 5 ft of rope to spare)" in
// five fields, where Mountain Project -- the first-ascent party's own posting and the only source --
// specifies "1x 60m rope" and station-to-station raps off the ascent anchors. The row's own
// arithmetic refutes it: two joined 60 m ropes give a 60 m rappel against a longest pitch of 36.6 m,
// i.e. 23 m spare, not 5 ft; the 5 ft margin is true only of a SINGLE 60 m doubled, which is exactly
// what MP warns about. But repairing it means WRITING a rack line and a descent sentence, so it is a
// ledger finding rather than a write.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGETS = ["wa_chair_peak_voie_de_chaise", "wa_chair_peak_west_ridge"];
const rad = x => x * Math.PI / 180;
const metres = (a, b) => { const R = 6371000, dLat = rad(b[0]-a[0]), dLon = rad(b[1]-a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h)); };
const thOf = r => (r.waypoints || []).find(w => /trailhead/i.test(String(w.type||"")+String(w.name||"")));

const all = await selectAll("routes", "id,access,waypoints,season,best_season,gear,areas!inner(name,path)",
  "areas.path=cd.usa.washington", { pageSize: 500, key: requireServiceKey() });
if (all.length < 5000) { console.error("SHORT READ — refusing to act on a partial read."); process.exit(1); }
const R = Object.fromEntries(all.filter(r => TARGETS.includes(r.id)).map(r => [r.id, r]));
if (Object.keys(R).length !== TARGETS.length) { console.error("FAIL: target rows not read."); process.exit(1); }

const anchor = thOf(R.wa_chair_peak_west_ridge);
if (!anchor || anchor.lat == null) { console.error("REFUSING: the Chair Peak trailhead pin has no coordinate to match a donor against."); process.exit(1); }
const A = [Number(anchor.lat), Number(anchor.lng)];

// a donor: a DIFFERENT row whose own trailhead pin is within 500 m, and which states a USFS fee
const NWFP = /northwest forest pass/i;
const donors = all.filter(r => {
  if (TARGETS.includes(r.id)) return false;
  const t = thOf(r);
  if (!t || t.lat == null) return false;
  if (metres(A, [Number(t.lat), Number(t.lng)]) > 500) return false;
  const a = r.access || {};
  return NWFP.test(String(a.fees || "")) && NWFP.test(String(a.passRequired || ""));
});
console.log(`donor candidates within 500 m of the Chair Peak trailhead pin, stating a Northwest Forest Pass in BOTH fields: ${donors.length}`);
for (const d of donors) console.log(`  ${d.id}  [${d.areas.name}]  ${Math.round(metres(A, [Number(thOf(d).lat), Number(thOf(d).lng)]))} m`);

const plan = [];
let refused = 0, skipped = 0;

if (!donors.length) {
  console.error("\nREFUSED (fees): no donor row shares this trailhead by coordinate AND states the pass in both fields. Typing a fee is out of scope for this script.");
  refused++;
} else {
  const d = donors[0], da = d.access;
  for (const id of TARGETS) {
    const r = R[id], a = r.access || {};
    // IDEMPOTENCE BY EQUALITY, NOT BY A PHRASE. The phrase test matched the donor's own text (see
    // the note at the verify step below), so it could never report a row as done.
    if (String(a.fees || "") === String(da.fees)) { console.log(`\n== ${id}.access\n   already applied — no-op.`); skipped++; continue; }
    if (!/^Summit at Snoqualmie parking fee/i.test(String(a.fees || ""))) { console.error(`\n== ${id}.access\n   REFUSED: fees no longer OPENS with the wrong claim this repair is about; it now reads ${JSON.stringify(String(a.fees || "").slice(0, 70))}. Re-read the row.`); refused++; continue; }
    const next = Object.assign({}, a, { fees: da.fees, passRequired: da.passRequired });
    console.log(`\n== ${id}.access.fees / passRequired   [EVIDENCE — copied from ${d.id}, same trailhead by coordinate]`);
    console.log(`   BEFORE fees : ${JSON.stringify(String(a.fees).slice(0, 90))}`);
    console.log(`   AFTER  fees : ${JSON.stringify(String(da.fees).slice(0, 120))}`);
    console.log(`   BEFORE pass : ${JSON.stringify(String(a.passRequired).slice(0, 90))}`);
    console.log(`   AFTER  pass : ${JSON.stringify(String(da.passRequired).slice(0, 120))}`);
    plan.push({ id, patch: { access: next }, check: v => String(v.access?.fees) === String(da.fees) && String(v.access?.passRequired) === String(da.passRequired) });
  }
}

// --- season truncation --------------------------------------------------------------------------
{
  const r = R.wa_chair_peak_west_ridge, cur = String(r.season || ""), to = "Spring-mid-summer";
  if (cur === to) { console.log(`\n== wa_chair_peak_west_ridge.season\n   already applied — no-op.`); skipped++; }
  else if (cur.length <= 20) { console.error(`\n== wa_chair_peak_west_ridge.season\n   REFUSED: already ${cur.length} chars.`); refused++; }
  else if (!cur.startsWith(to)) { console.error(`\n== wa_chair_peak_west_ridge.season\n   REFUSED: the stored value does not start with ${JSON.stringify(to)}, so this is not a pure truncation.`); refused++; }
  else {
    const gear = (Array.isArray(r.gear) ? r.gear : []).join(" | ");
    if (!/crampon/i.test(String(r.best_season || "")) || !/crampon/i.test(gear)) {
      console.error(`\n== wa_chair_peak_west_ridge.season\n   REFUSED: the dropped parenthetical is no longer carried in BOTH best_season and gear — truncating would LOSE it.`); refused++;
    } else {
      console.log(`\n== wa_chair_peak_west_ridge.season   [EVIDENCE]`);
      console.log(`   BEFORE (${cur.length} chars): ${JSON.stringify(cur)}`);
      console.log(`   AFTER:  ${JSON.stringify(to)}   (the parenthetical is already in best_season AND gear)`);
      plan.push({ id: r.id, patch: { season: to }, check: v => v.season === to });
    }
  }
}

console.log(`\nplanned ${plan.length}, already-applied ${skipped}, refused ${refused}`);
if (refused) { console.error("one or more entries were refused — nothing will be written."); process.exit(1); }
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

const byId = new Map();
for (const p of plan) byId.set(p.id, Object.assign(byId.get(p.id) || {}, p.patch));
for (const [id, patch] of byId) await patchRow("routes", id, patch);

// VERIFY BY RE-READ, WITH A RETRY.
//
// A NOTE ON A WRONG DIAGNOSIS, KEPT BECAUSE IT WAS NEARLY SHIPPED AS FACT. The first run wrote all
// three fields CORRECTLY and then reported two FAILs, and I attributed that to a read issued too
// soon after a large jsonb PATCH coming back stale. That was wrong. The cause was this script's own
// guard: it tested for the phrase "summit at snoqualmie" to decide whether a row still needed
// repair -- and the DONOR's own value contains "During ski season the Alpental lot now uses Summit
// at Snoqualmie's paid parking", because it correctly distinguishes the winter resort fee from the
// summer Forest Service one. So the guard matched its own replacement: the row could never report
// as applied, and the verify clause could never pass. A GUARD THAT MATCHES WHAT IT WRITES IS AN
// IDEMPOTENCE CHECK THAT CAN NEVER BE SATISFIED.
//
// The retry stays anyway, and on its own merits rather than as a fix for a problem that did not
// exist: a false FAIL is as corrosive as a false pass, because it teaches whoever runs these
// appliers that a red line means nothing. It says which attempt succeeded when it is not the first,
// since absorbing a transient failure silently would hide the behaviour worth knowing about.
let bad = 0, attempt = 0;
for (attempt = 1; attempt <= 3; attempt++) {
  const after = await selectAll("routes", "id,access,season", `id=in.(${[...byId.keys()].join(",")})`, { pageSize: 20 });
  bad = 0;
  const failed = [];
  for (const p of plan) {
    const got = after.find(x => x.id === p.id);
    if (!got || !p.check(got)) { failed.push(p.id); bad++; }
  }
  if (!bad) { if (attempt > 1) console.log(`\n(re-read agreed on attempt ${attempt}; attempt 1 came back stale)`); break; }
  if (attempt === 3) { for (const id of failed) console.error(`FAIL: ${id} re-read does not match what was written, after 3 attempts.`); }
  else await new Promise(r => setTimeout(r, 1200));
}
if (bad) process.exit(1);
console.log(`\nverified by re-read: ${plan.length} field-group(s) across ${byId.size} row(s) corrected.`);
