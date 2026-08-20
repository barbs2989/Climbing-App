// Do the 88 impossible gains have a CAUSE, or are they 88 unrelated typos?
//
// Two hypotheses, and they point at opposite repairs:
//
//   (A) CONTAMINATION — one route's gain was copied across its siblings, the duplicate-field-value
//       fingerprint `audit:identity` looks for. Repair: find the right value per route.
//   (B) ROUND ESTIMATE — somebody wrote a plausible round number rather than measuring. Repair:
//       the column is an estimate everywhere and the finding is that these estimates are too low.
//
// The tell that separates them is roundness measured AGAINST THE PASSING POPULATION. A catalog
// where every gain is round says nothing; a catalog where the FAILING gains are round and the
// passing ones are not says the failures were guessed.
//
// This deliberately re-reads the routes rather than trusting the audit's --json, because the
// denominator (the routes that PASS) is exactly what the audit does not emit — and a claim about
// over-representation that only looks at the findings is the vacuous-denominator shape CLAUDE.md
// records repeatedly.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const k = anonKey();
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const elevFt = (w) => {
  const ft = num(w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft));
  if (ft != null) return ft;
  const m = num(w.elevM != null ? w.elevM : w.elev_m);
  return m == null ? null : m * 3.28084;
};
const SLACK_FT = 300, START_TOL_FT = 400;

async function readAll() {
  const sel = "id,name,gain_ft,waypoints";
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=like.wa_*&waypoints=not.is.null&gain_ft=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes. Broken query, not a clean catalog."); process.exit(1); }

const fail = [], pass = [];
for (const r of rows) {
  const wps = (r.waypoints || []).filter(Boolean);
  const we = wps.map((w) => ({ w, ft: elevFt(w) })).filter((x) => x.ft != null);
  if (we.length < 2) continue;
  const th = we.find((x) => /trailhead/i.test(String(x.w.type || "")));
  const sum = we.find((x) => /summit|topout/i.test(String(x.w.type || "")));
  let lo, hi;
  if (th && sum && sum.ft > th.ft) { lo = th; hi = sum; }
  else { lo = we.reduce((a, b) => (b.ft < a.ft ? b : a)); hi = we.reduce((a, b) => (b.ft > a.ft ? b : a)); }
  const rise = hi.ft - lo.ft;
  if (rise <= 0) continue;
  const gain = num(r.gain_ft);
  if (gain == null) continue;
  if (gain >= rise - SLACK_FT) { pass.push({ id: r.id, gain }); continue; }
  const implied = hi.ft - gain;
  if (we.some((x) => Math.abs(x.ft - implied) <= START_TOL_FT && x.ft > lo.ft + SLACK_FT)) continue;
  fail.push({ id: r.id, gain });
}

/* "Round" is tested at several grains because a guess is round at whatever grain the guesser
   thought in. 1000 is the coarsest; 100 the finest still worth calling round for a figure that
   routinely runs to four digits. */
const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : "n/a";
const roundAt = (arr, m) => arr.filter((x) => x.gain % m === 0).length;

console.log(`\n=== are the impossible gains ROUND ESTIMATES or COPIED values? ===`);
console.log(`${rows.length} WA routes read · ${pass.length} pass the invariant · ${fail.length} fail it\n`);
console.log(`                       FAIL (${fail.length})            PASS (${pass.length})`);
for (const m of [1000, 500, 100]) {
  const f = roundAt(fail, m), p = roundAt(pass, m);
  console.log(`  multiple of ${String(m).padStart(4)}    ${String(f).padStart(4)} (${pct(f, fail.length).padStart(6)})      ${String(p).padStart(4)} (${pct(p, pass.length).padStart(6)})`);
}

/* The contamination hypothesis, tested the same comparative way: sharing a value with ANOTHER
   route is only evidence if failing routes share more than passing ones do. */
const shareRate = (arr) => {
  const by = {}; for (const x of arr) (by[x.gain] = by[x.gain] || []).push(x.id);
  return arr.filter((x) => by[x.gain].length > 1).length;
};
const fs_ = shareRate(fail), ps_ = shareRate(pass);
console.log(`\n  shares its gain with`);
console.log(`  another route in the`);
console.log(`  same bucket        ${String(fs_).padStart(4)} (${pct(fs_, fail.length).padStart(6)})      ${String(ps_).padStart(4)} (${pct(ps_, pass.length).padStart(6)})`);

const nonRoundFail = fail.filter((x) => x.gain % 100 !== 0);
console.log(`\n${nonRoundFail.length} failing routes carry a NON-round gain — those are the ones a round-estimate story does not explain:`);
for (const x of nonRoundFail.slice(0, 15)) console.log(`   ${x.id.padEnd(48)} ${x.gain}`);
