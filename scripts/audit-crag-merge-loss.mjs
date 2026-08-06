// Loss audit for crag-copy merges performed by another session.
// My archives in research/crag-merges/ hold the only surviving copy of the
// deleted duplicate rows. For each deleted copy, report which of its non-empty
// fields have no equivalent content on the survivor. Read-only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireServiceKey, headers, SUPABASE_URL } from "./lib/supabase-env.mjs";

// Both paths used to be absolute: the import reached into the main checkout, and the
// archives were read out of a sibling worktree (`crew-tab-badge`). Worktrees are
// disposable -- they are removed with the session that made them -- so this script was
// one cleanup away from failing, while the same five archives sit committed in this
// repo at research/crag-merges. Resolving from import.meta.url instead means the script
// reads the checkout it is running in, rather than whichever copy happens to survive.
const ARCH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "research", "crag-merges");
const PAIRS = [
  ["chair-peak-pre-merge.json", "wa_east_face_8", "wa_chair_peak_east_face"],
  ["chair-peak-pre-merge.json", "wa_northwest_ridge_3", "wa_chair_peak_northwest_ridge"],
  ["garfield-pre-merge.json", "wa_infinite_bliss", "wa_garfield_mountain_infinite_bliss"],
  ["garfield-pre-merge.json", "wa_preiss_route", "wa_garfield_mountain_preiss_route"],
  ["mcmillan-pre-merge.json", "wa_southwest_ridge", "wa_mcmillan_spire_west_southwest_ridge"],
  ["mcmillan-pre-merge.json", "wa_west_ridge_6", "wa_mcmillan_spire_west_west_ridge"],
  ["castle-pre-merge.json", "wa_la_villa_1", "wa_castle_peak_tatoosh_la_villa"],
  ["castle-pre-merge.json", "wa_southeast_face_2", "wa_castle_peak_tatoosh_southeast_face"],
  ["baring-pre-merge.json", "wa_baring_mountain_vanishing_point", "wa_vanishing_point"],
];
const key = requireServiceKey();
const live = async (id) => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=*`, { headers: headers(key) })).json())[0];
// A placeholder is not content, and this audit exists to tell someone what to restore.
// The only finding it produced was `fa: "unknown"` on a deleted McMillan Spire copy where
// the survivor holds `fa: null` -- so acting on it would have replaced an honest null with
// a fabricated first ascent, which is strictly worse than the "loss".
//
// Deliberately NOT reusing audit-route-identity's PLACEHOLDER regex: that one is built for
// route NAMES, where "v2" and "5.12 face" are import artifacts. They are perfectly real
// values for a grade column, and treating them as blank here would hide genuine loss.
// Scalars only -- an array or object is judged by the emptiness rules above.
const PLACEHOLDER_VALUE = /^\s*(unknown|unspecified|none|n\/?a|tbd|null|undefined|-{1,2}|\?+)\s*$/i;
const empty = (v) => v === null || v === "" || (typeof v === "string" && PLACEHOLDER_VALUE.test(v)) || (Array.isArray(v) && !v.length) || (v && typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
const SKIP = new Set(["id", "area_id", "created_at", "updated_at", "name", "source"]);

for (const [file, copyId, survId] of PAIRS) {
  const dump = JSON.parse(fs.readFileSync(`${ARCH}/${file}`, "utf8"));
  const cp = dump.routes.find((r) => r.id === copyId);
  const stillThere = await live(copyId);
  const sv = await live(survId);
  if (!sv) { console.log(`\n### ${survId} — SURVIVOR MISSING, investigate`); continue; }
  const lost = [], carried = [];
  for (const [f, v] of Object.entries(cp)) {
    if (SKIP.has(f) || empty(v)) continue;
    if (empty(sv[f])) lost.push(f);
    else if (JSON.stringify(sv[f]) === JSON.stringify(v)) carried.push(f);
  }
  const state = stillThere ? "copy STILL PRESENT (unmerged)" : "copy DELETED";
  console.log(`\n### ${survId}  [${state}]`);
  console.log(`    copy fields: ${Object.entries(cp).filter(([f, v]) => !SKIP.has(f) && !empty(v)).length} | verbatim on survivor: ${carried.length} | survivor blank where copy had content: ${lost.length}`);
  if (lost.length) console.log("    BLANK ON SURVIVOR:", lost.join(", "));
}
