// Builds final.json: every closure note this round changes, after the main session's second check.
// olympic-out.json / cascades-out.json are the researchers' outputs; the overrides below are the texts the
// second (page-fetching) check rewrote, each with the reason.
const fs = require("fs");
const load = n => { const i = require(`./${n}.json`), o = require(`./${n}-out.json`); return o.map((x, k) => ({ ...x, old: i[k].text, corrected: x.corrected })); };
const all = [...load("olympic"), ...load("cascades")];
const BORDER = "The Hozomeen crossing at the international boundary has been closed to vehicles and foot traffic since 2020; enter the U.S. only at a staffed port of entry.";
const HOZ_AREA = "On the U.S. side the park has closed the entire Hozomeen area and the Hozomeen Cross-country Zone for the Border 2 Fire, with no end date given in its October 6, 2026 update.";
const SILVER = "Silver-Skagit Road in B.C. reopened October 26, 2026 after its summer wildfire closure, but Skagit Valley Provincial Park stays closed and a fire is still active near km 51.";
const BC_WINTER = "B.C. does not maintain Silver-Skagit Road from October 15 to April 15, so expect snow and winter driving then.";
// Silver-Skagit: DriveBC's advisory (opened in Chrome 2026-10-29) reads "reopened", updated Oct 26, 2026; it
// calls Oct 15 - Apr 15 unmaintained, not shut. The park's fire-closure page (fetched) is dated Oct 6, 2026.
// Quinault: the park's conditions page (Oct 27) says the temporary bridge joining the shore roads is out for
// the winter, so "either shore road reaches both trailheads" (the researcher's text) is wrong this season.
// Olson: the Forest Service fire page says every other site reopened July 8; only FS-2451 and Copper Creek stay shut.
// Berge: the Little Giant Fire order was cut back Oct 14 and ends Oct 31 (round 3); the storm order is what closes it.
const over = {
  "wa_castle_peak_pasayten_scramble|road.driveNote": "SR-20 is paved and generally in good condition but closes seasonally over Washington Pass/Rainy Pass (typically mid-November through April/May depending on snowpack). Silver-Skagit Road is a rough ~39-mile gravel road from Hope, BC, but provides no legal access to Castle Peak: the Hozomeen border crossing has been closed since 2020, with no end date given in the park's October 6, 2026 update. The road itself reopened October 26, 2026 after its summer wildfire closure.",
  "wa_hozomeen_mountain_north_peak_north_route|road.seasonalGate": `${BC_WINTER} Separately, the Hozomeen crossing at the international boundary has been closed to vehicles and foot traffic since 2020, with no end date given.`,
  "wa_hozomeen_mountain_northeast_buttress|road.seasonalGate": `${BC_WINTER} Separately and more importantly, the Hozomeen crossing at the international boundary has been closed to vehicles and foot traffic since 2020, with no end date given in the park's October 6, 2026 update; the crossing has never been staffed and is camera-monitored.`,
  "wa_hozomeen_mountain_south_peak_southwest_route|road.seasonalGate": `${BC_WINTER} Separately and more importantly, the Hozomeen crossing at the international boundary has been closed to vehicles and foot traffic since 2020, with no end date given in the park's October 6, 2026 update; the crossing has never been staffed and is camera-monitored.`,
  "wa_hozomeen_mountain_west_face|road.seasonalGate": `${BC_WINTER} The Hozomeen crossing at the international boundary has been closed to vehicles and foot traffic since 2020, with no end date given in the park's October 6, 2026 update.`,
  "wa_hozomeen_mountain_south_peak_southeast_buttress|road.status": "SR-20 is open seasonally and closes for winter avalanche danger (recent closures have run roughly early December through spring) between the Ross Dam trailhead and Silver Star Gate — check WSDOT/NPS road conditions before driving. Silver-Skagit Road in B.C. reopened October 26, 2026 after its summer wildfire closure, though Skagit Valley Provincial Park stays closed, and the border crossing into Hozomeen has been closed to travelers since 2020.",
  "wa_mount_berge_southwest_route|road.status": "Decent gravel for roughly the first 11 miles from WA-207, then narrow, rough, and high-clearance-recommended for the final ~12 miles to Trinity Trailhead; sections beyond Goose Creek have been closed in some years by flood damage and wildfire activity. Storm damage has closed the road to vehicles beyond the Atkinson Flat Campground junction under a Forest Service order in effect May 20, 2026 to December 31, 2027, cutting off the Trinity and Phelps Creek trailheads. Check with the Wenatchee River Ranger District, (509) 548-2550, before you go.",
};
for (const id of ["wa_hozomeen_mountain_north_peak_north_route", "wa_hozomeen_mountain_north_peak_south_ridge", "wa_hozomeen_mountain_northeast_buttress", "wa_hozomeen_mountain_south_peak_north_ridge", "wa_hozomeen_mountain_south_peak_southeast_buttress", "wa_hozomeen_mountain_south_peak_southwest_route", "wa_hozomeen_mountain_southwest_buttress", "wa_hozomeen_mountain_west_face"])
  over[`${id}|access.closures`] = `${BORDER} ${HOZ_AREA} ${SILVER} Check both before planning.`;
const out = [];
for (const x of all) {
  const k = `${x.id}|${x.field}`;
  const text = over[k] || (x.verdict === "fix" && x.confidence !== "low" ? x.corrected : null);
  if (text && text !== x.old) out.push({ id: x.id, field: x.field, old: x.old, text, by: over[k] ? "second check rewrote" : "researcher, second check confirmed" });
  delete over[k];
}
if (Object.keys(over).length) throw new Error("override matched no entry: " + Object.keys(over).join(", "));
fs.writeFileSync(__dirname + "/final.json", JSON.stringify(out, null, 1));
console.log(out.length + " changes"); for (const x of out) console.log(" ", x.id, x.field, "-", x.by);
