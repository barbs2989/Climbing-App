// A route tells climbers they need a lottery permit for a wilderness they are not entering.
//
// wa_ingalls_peak_south_ridge stores permit = "Enchantment permit area: overnight stays May 15-Oct 31
// require a quota permit (Recreation.gov advance lottery); day trips need the free self-issued day-use
// permit at the trailhead." Ingalls Peak is approached from the Teanaway via the Esmeralda Trailhead
// and is entirely OUTSIDE the Enchantment Permit Area. This is the one defect in the batch that would
// cost somebody a trip: a party reads it, finds the lottery closed, and does not go — or applies for a
// permit that has nothing to do with where they are going.
//
// VERIFIED FROM THE AGENCY DIRECTLY THIS SESSION, not from a report. The Forest Service's own Esmeralda
// Trailhead page (fs.usda.gov/r06/okanogan-wenatchee/recreation/esmeralda-trailhead) says under Passes
// and Permits: "Wilderness permits required: the self-issuing permits are free and available at
// trailhead", files the trailhead under the Cle Elum Ranger District, and mentions the Enchantments
// nowhere — zero occurrences of the word on the page. The Enchantments overnight-permit page describes
// an area of five zones, all entered from Icicle Creek Road near Leavenworth, and names neither Ingalls
// nor the Teanaway nor Esmeralda.
//
// AND THE ROW ALREADY KNOWS. Its own access.permit reads "Free self-issue wilderness permit at the
// trailhead, required for all entry into the Alpine Lakes Wilderness", and its own bivy text says the
// Ingalls group "sits entirely OUTSIDE the Enchantment Permit Area". Of the five Ingalls routes in the
// catalog this is the only one with a `permit` value at all; the other four leave it empty and carry
// the correct statement in access.permit.
//
// SO THE REPAIR IS TO CLEAR THE FIELD, NOT TO REWRITE IT. `permit` and `access.permit` are separate
// records that both render, so emptying the false one leaves the true one on screen and makes this row
// match its four siblings exactly. Nothing is typed and no permit claim is authored — which matters,
// because a permit rule is exactly the kind of fact this catalog's standing rule says must be read off
// a live agency page rather than inferred.
//
// The script re-asserts both halves at apply time: the stored value must still make the Enchantment
// claim, and access.permit must still carry a free self-issue statement to fall back on.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_ingalls_peak_south_ridge";
const CLAIM = /enchantment/i;
const FALLBACK = /free[- ]?self[- ]?issue/i;

const rows = await selectAll("routes", "id,permit,access", "id=like.wa_ingalls_peak*", { pageSize: 50 });
const r = rows.find(x => x.id === TARGET);
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }
if (typeof r.permit !== "string" || !CLAIM.test(r.permit)) { console.log("nothing to do — the Enchantment claim is already gone."); process.exit(0); }

const fallback = String(r.access?.permit || "");
if (!FALLBACK.test(fallback)) { console.error("the row's access.permit does not carry a free self-issue statement to fall back on — refusing"); process.exit(1); }

const sibs = rows.filter(x => x.id !== TARGET);
const empty = sibs.filter(x => !String(x.permit || "").trim());
console.log(`Ingalls routes in the catalog: ${rows.length}`);
console.log(`  ...with an empty top-level permit field: ${empty.length} of ${sibs.length} siblings`);
if (empty.length !== sibs.length) { console.error("a sibling also carries a top-level permit — this row is not the lone outlier, refusing"); process.exit(1); }

console.log(`\n  ${TARGET}.permit`);
console.log(`     removing ${JSON.stringify(r.permit)}`);
console.log(`     leaving  access.permit = ${JSON.stringify(fallback)}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { permit: "" });
const a = (await selectAll("routes", "id,permit,access", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
console.log(!String(a.permit || "").trim() && FALLBACK.test(String(a.access?.permit || ""))
  ? "verified: the Enchantment claim is gone and the free self-issue statement remains"
  : `NOT APPLIED — permit is now ${JSON.stringify(a.permit)}`);
