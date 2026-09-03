// One Ingalls route says dogs must be leashed. They are prohibited.
//
// wa_ingalls_peak_south_ridge's access.rules ends "...dogs must be leashed (and are discouraged near
// the fragile lake basin)." That tells a party they may bring a dog if it is on a lead. They may not.
//
// VERIFIED FROM THE AGENCY DIRECTLY THIS SESSION. The Forest Service's Esmeralda Trailhead page
// (fs.usda.gov/r06/okanogan-wenatchee/recreation/esmeralda-trailhead) states under Restrictions:
// "Dogs prohibited on Ingalls Way and Longs Pass trails." That is the trail this route uses, named.
//
// THE DONOR IS THE SIBLING ROW, so nothing is composed. wa_ingalls_peak_east_route's access.rules
// already reads "Dogs prohibited on the Ingalls Way and Longs Pass Trails and at Lake Ingalls", and
// that row's own waypoint note says "dogs are not allowed past this fork toward Ingalls". So two rows
// on one peak disagree, the agency settles it, and the correct wording is already in the catalog.
//
// This is worth repairing rather than reporting because it is not a matter of degree: a party that
// drives two hours with a dog on the strength of "must be leashed" is turned round at a 0.4-mile
// junction, and the rule is enforceable. Unlike a grade or an aspect, there is no reading under which
// both fields can be right.
//
// The edit is a single clause substitution, matched exactly and asserted unique, and the script
// re-checks that the donor sibling still carries the prohibition before using its wording.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_ingalls_peak_south_ridge";
const DONOR = "wa_ingalls_peak_east_route";
const FIND = "dogs must be leashed (and are discouraged near the fragile lake basin)";
const REPLACE = "dogs are prohibited on the Ingalls Way and Longs Pass Trails and at Lake Ingalls";
const PROHIBIT = /dogs prohibited on the ingalls way and longs pass trails/i;

const rows = await selectAll("routes", "id,access", "id=like.wa_ingalls_peak*", { pageSize: 50 });
const t = rows.find(x => x.id === TARGET), d = rows.find(x => x.id === DONOR);
if (!t || !d) { console.error("target or donor row not found — refusing"); process.exit(1); }

const cur = String(t.access?.rules || "");
if (!cur.includes(FIND)) { console.log("nothing to do — the leashed claim is already gone."); process.exit(0); }
if (cur.split(FIND).length - 1 !== 1) { console.error("the clause appears more than once — refusing"); process.exit(1); }
if (!PROHIBIT.test(String(d.access?.rules || ""))) { console.error(`${DONOR} no longer states the prohibition — the donor is gone, refusing`); process.exit(1); }

const after = cur.replace(FIND, REPLACE);
console.log(`donor ${DONOR}.access.rules:\n  ${JSON.stringify(String(d.access.rules).slice(0, 150))}\n`);
console.log(`  ${TARGET}.access.rules`);
console.log(`     from ${JSON.stringify(cur)}`);
console.log(`     to   ${JSON.stringify(after)}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { access: { ...t.access, rules: after } });
const a = (await selectAll("routes", "id,access", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
console.log(String(a.access?.rules || "") === after
  ? "verified: the row no longer says a leashed dog is allowed on a trail where dogs are prohibited"
  : "NOT APPLIED");
