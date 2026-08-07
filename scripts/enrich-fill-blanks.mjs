#!/usr/bin/env node
// Fill-blanks-only enrichment applier.
//
// Why this exists: on 2026-08-07 a hand-written PATCH set `hazards` on
// wa_dragontail_peak_r4 because the route was missing dist_km/gain_ft. The row
// already carried seven researched hazards; the assignment replaced them with
// four thinner ones and reported success. Same shape as the `hazards` clobber
// during the Triple Couloirs recovery — a plain assignment cannot tell "blank"
// from "already better".
//
// So: every write here is coalesce semantics. A field is written ONLY when the
// live value is blank (null / "" / empty array). Anything already populated is
// left alone and reported as `kept`. To deliberately correct a populated field
// -- which the enrichment rules allow only when a source contradicts it -- pass
// it in `overwrite` and state the source in `why`.
//
// Usage:
//   import { fillBlanks } from "./enrich-fill-blanks.mjs";
//   await fillBlanks({ id, areaId, fields, overwrite, why });

import { selectAll, patchRow, requireServiceKey } from "./lib/supabase-env.mjs";

const isBlank = (v) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * @param {object} o
 * @param {string} o.id        route id to patch
 * @param {string} o.areaId    the area_id the row MUST have — asserted before writing,
 *                             because ~91% of WA route ids come from the route name
 *                             alone and collide across peaks.
 * @param {object} o.fields    candidate values, applied only where the live row is blank
 * @param {object} [o.overwrite] values applied even when populated (deliberate correction)
 * @param {string} [o.why]     required when `overwrite` is non-empty: the contradicting source
 * @param {boolean} [o.dryRun]
 */
export async function fillBlanks({ id, areaId, fields, overwrite = {}, why = "", dryRun = false }) {
  requireServiceKey();
  if (!id || !areaId) throw new Error("fillBlanks needs both id and areaId");
  if (Object.keys(overwrite).length && !why) {
    throw new Error(`overwrite on ${id} requires \`why\` naming the contradicting source`);
  }

  const cols = [...new Set(["id", "name", "area_id", ...Object.keys(fields), ...Object.keys(overwrite)])];
  const pre = await selectAll("routes", cols.join(","), `id=eq.${id}`, { pageSize: 5 });
  if (pre.length !== 1) throw new Error(`expected exactly 1 row for ${id}, got ${pre.length}`);
  const row = pre[0];
  if (row.area_id !== areaId) {
    throw new Error(`${id} sits under area_id ${row.area_id}, not ${areaId} — refusing to write`);
  }

  const body = {};
  const kept = [];
  for (const [k, v] of Object.entries(fields)) {
    if (isBlank(row[k])) body[k] = v;
    else kept.push(k);
  }
  Object.assign(body, overwrite);

  const written = Object.keys(body);
  if (!written.length) {
    console.log(`${id}: nothing to fill (all ${kept.length} candidate field(s) already populated)`);
    return { id, written: [], kept };
  }
  if (dryRun) {
    console.log(`${id}: DRY RUN would write ${written.join(", ")}${kept.length ? ` | kept ${kept.join(", ")}` : ""}`);
    return { id, written, kept, dryRun: true };
  }

  await patchRow("routes", id, body);

  // Re-read and reconcile: a 200 is not evidence the data changed.
  const post = await selectAll("routes", cols.join(","), `id=eq.${id}`, { pageSize: 5 });
  const bad = written.filter((k) => JSON.stringify(post[0][k]) !== JSON.stringify(body[k]));
  if (bad.length) throw new Error(`${id}: wrote ${bad.join(", ")} but the re-read disagrees`);
  for (const k of kept) {
    if (JSON.stringify(post[0][k]) !== JSON.stringify(row[k])) {
      throw new Error(`${id}: field ${k} was supposed to be untouched but changed`);
    }
  }
  console.log(`${id}: wrote ${written.join(", ")}${kept.length ? ` | kept ${kept.join(", ")}` : ""}`);
  return { id, written, kept };
}
