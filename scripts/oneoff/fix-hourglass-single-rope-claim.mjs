// The headline rappel line tells a party to bring one rope that cannot reach the rappels beside it.
//
// wa_hourglass_gully_winter stores rappels = "2-3 raps (SINGLE 30m rope) from the upper gully/East
// Ridge ...". A rope doubled through an anchor reaches HALF its length, so one 30 m rope gives 15 m
// rappels — and this row's own rappel_detail lists two stations of lengthM 30. The claim is impossible
// against the row's own table.
//
// AND THE ROW SAYS THE OPPOSITE SIX TIMES: rappel_detail (two 30 m stations), gear ("2x30m ropes"),
// rack ("2x30m ropes for rappels"), detailed_rack ("Two 30-meter ropes"), descent ("requiring two
// 30-meter ropes"), descent_text ("two 30-meter rappels"), with rope_length_m 60. One field out of
// seven disagrees, and it is the one that renders as the rappel headline.
//
// A published trip report records the consequence directly: a party carrying "a half rope (30m)" was
// "forced to down climb some of the icy snow" rather than rappel. This is the rope-off-the-end shape,
// which CLAUDE.md calls the worst thing in this dataset to get wrong.
//
// check:rappel-lengths DOES NOT CATCH IT, and the reason is a documented scoping decision rather than a
// bug: its rope-size rule is scoped to stations of 50 m or more, because "30m is both a rope size and
// the correct half of a 60m rope" and including it flagged 22 correct routes. That scoping assumes a
// 30 m station implies a 60 m rope. It does not ask what rope the row actually NAMES — and when a row
// names a SINGLE rope of known length, the bound is half that length and needs no threshold at all.
// Recorded as a coverage note; this script repairs the one row rather than widening the guard, because
// widening it is a change to a gate in the build chain and wants its own injection suite.
//
// THE REPLACEMENT IS THE ROW'S OWN WORDING. "two 30 m ropes" is what six sibling fields already say, so
// nothing is researched and nothing is invented. The script refuses unless it can find that claim in at
// least three other fields — i.e. unless the row itself is the donor.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_hourglass_gully_winter";
const FIND = "(single 30m rope)";
const REPLACE = "(two 30 m ropes)";
// the row must itself assert the two-rope configuration, in fields other than the one being repaired
const CORROB = /two 30[\s-]?m(?:eter)? ropes|2\s*[x×]\s*30\s?m ropes/i;

const rows = await selectAll("routes", "id,rappels,rappel_detail,gear,rack,detailed_rack,descent,descent_text,rope_length_m", `id=eq.${TARGET}`, { pageSize: 10 });
const r = rows[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }
if (typeof r.rappels !== "string" || !r.rappels.includes(FIND)) { console.log("nothing to do — the single-rope claim is already gone."); process.exit(0); }
if (r.rappels.split(FIND).length - 1 !== 1) { console.error("the claim appears more than once — refusing"); process.exit(1); }

// 1. the row's own stations must exceed what one 30 m rope reaches
const stations = Array.isArray(r.rappel_detail) ? r.rappel_detail.map(x => +x.lengthM).filter(n => n > 0) : [];
const longest = Math.max(0, ...stations);
if (!stations.length) { console.error("no rappel_detail stations to judge against — refusing"); process.exit(1); }
if (longest <= 15) { console.error(`the longest station is ${longest} m, which one 30 m rope CAN reach — the premise is gone, refusing`); process.exit(1); }

// 2. the row must itself assert two ropes, somewhere other than the field being repaired
const others = ["gear", "rack", "detailed_rack", "descent", "descent_text"]
  .map(k => [k, Array.isArray(r[k]) ? r[k].join(" | ") : String(r[k] || "")])
  .filter(([, v]) => CORROB.test(v));
console.log(`stations in this row's own rappel_detail: ${stations.join(", ")} m  (one 30 m rope reaches 15 m)`);
console.log(`fields asserting TWO ropes: ${others.length ? others.map(([k]) => k).join(", ") : "(none)"}`);
console.log(`rope_length_m: ${r.rope_length_m}`);
if (others.length < 3) { console.error("\nfewer than three sibling fields assert two ropes — the row is not its own donor, refusing"); process.exit(1); }

const after = r.rappels.replace(FIND, REPLACE);
console.log(`\n  rappels\n     from ${JSON.stringify(r.rappels.slice(0, 140))}\n     to   ${JSON.stringify(after.slice(0, 140))}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { rappels: after });
const now = (await selectAll("routes", "id,rappels", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
console.log(now.rappels === after
  ? "verified: the headline no longer asks for a rope that cannot reach its own rappels"
  : "NOT APPLIED");
