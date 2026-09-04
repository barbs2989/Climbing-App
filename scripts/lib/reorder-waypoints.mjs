// The applier contract for the summit-before-approach reordering, extracted rather than copied a
// third time. Batches 1 (#1588) and 2 (#1590) keep their own copies deliberately: they are SPENT —
// their rows have already moved, so re-running either now REFUSES, and rewriting a spent script to
// use a module it never used is churn that changes no behaviour.
//
// WHY THE CONTRACT IS SHAPED THIS WAY. #1583 proved this class is not bulk-fixable: 83% of it
// shares one of three shapes, and both routes CLAUDE.md names as descent sequences sit inside that
// fingerprint. So every entry is a per-route judgement, and the machinery exists to make a
// judgement it cannot express a judgement it cannot make:
//
//   * `order` is a list of indices into the CURRENT array, and the new array is built by MOVING the
//     existing objects — so no waypoint can be added, removed or edited. Only the order changes.
//   * that it is a permutation is ASSERTED, not assumed.
//   * `expect` declares every pin's type and name prefix in current order; a row that has moved is
//     REFUSED rather than reordered.
//   * all-or-nothing: one refusal aborts before any write.
//   * writes go through patchRow, and every row is re-read afterwards — a 200 is not evidence.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "./supabase-env.mjs";

export const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;

const matches = (w, e) => {
  const i = e.indexOf("|");
  const t = e.slice(0, i), n = e.slice(i + 1);
  return ((w && w.type) || "") === t && String((w && w.name) || "").trim().startsWith(n);
};

export async function runReorder(EDITS, { apply }) {
  if (!EDITS.length) { console.error("FAIL - no edits declared; nothing to do is not a clean run."); process.exit(1); }
  const KEY = apply ? requireServiceKey() : anonKey();
  const ids = EDITS.map((e) => e.id);
  const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,name,waypoints`;
  const r = await fetch(url, { headers: headers(KEY) });
  if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
  const rows = await r.json();
  if (rows.length !== ids.length) {
    console.error(`read returned ${rows.length} row(s) for ${ids.length} id(s) - refusing`);
    process.exit(1);
  }
  const byId = new Map(rows.map((x) => [x.id, x]));

  const refusals = [], staged = [];
  for (const e of EDITS) {
    const w = Array.isArray((byId.get(e.id) || {}).waypoints) ? byId.get(e.id).waypoints : null;
    if (!w) { refusals.push(`${e.id}: waypoints is not an array`); continue; }
    if (w.length !== e.expect.length) { refusals.push(`${e.id}: ${w.length} pin(s) live, declaration expects ${e.expect.length}`); continue; }
    const bad = e.expect.map((x, i) => (matches(w[i], x) ? null : `#${i} expected ${x}, live ${sig(w[i])}`)).filter(Boolean);
    if (bad.length) { refusals.push(`${e.id}: the row has MOVED - ` + bad.join("; ")); continue; }
    const seen = new Set(e.order);
    if (e.order.length !== w.length || seen.size !== w.length || e.order.some((i) => !(i >= 0 && i < w.length))) {
      refusals.push(`${e.id}: order ${JSON.stringify(e.order)} is not a permutation of ${w.length} index(es)`);
      continue;
    }
    if (e.order.every((v, i) => v === i)) { refusals.push(`${e.id}: order is the identity — this entry changes nothing`); continue; }
    staged.push({ e, row: byId.get(e.id), before: w, after: e.order.map((i) => w[i]) });
  }
  if (refusals.length) {
    console.error(`REFUSED - ${refusals.length} entr(ies) did not match the live row:\n  ` + refusals.join("\n  "));
    console.error("\nNothing was written. Re-read the row before changing the declaration.");
    process.exit(1);
  }

  for (const s of staged) {
    console.log(`\n### ${s.e.id}  —  ${s.row.name}`);
    console.log(`   why: ${s.e.why}`);
    console.log(`   was: ${s.before.map(sig).join("  ->  ")}`);
    console.log(`   now: ${s.after.map(sig).join("  ->  ")}`);
  }
  console.log(`\n${staged.length} route(s) reordered; every new list is a PERMUTATION of the old one — no pin added, removed or edited.`);
  if (!apply) { console.log("\nDRY RUN - pass --apply to write."); return 0; }

  let wrote = 0;
  for (const s of staged) { await patchRow("routes", s.e.id, { waypoints: s.after }); wrote++; }
  console.log(`\nwrote ${wrote} row(s).`);

  const v = await fetch(url, { headers: headers(KEY) });
  const after = new Map((await v.json()).map((x) => [x.id, x]));
  let bad = 0;
  for (const s of staged) {
    const live = (after.get(s.e.id) || {}).waypoints || [];
    if (s.after.map(sig).join("|") !== live.map(sig).join("|")) { console.error(`NOT APPLIED: ${s.e.id}`); bad++; }
    if (live.length !== s.before.length) { console.error(`LOST A PIN: ${s.e.id} — ${s.before.length} -> ${live.length}`); bad++; }
  }
  console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${staged.length} row(s) re-read in the new order, with every pin still present.`);
  return bad ? 1 : 0;
}
