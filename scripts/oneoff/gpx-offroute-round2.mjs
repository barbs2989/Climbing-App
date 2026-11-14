// Round 2 of off-route pin removal: the researched verdicts on the 24 track/pin "disagree" routes,
// written in the shape gpx-offroute-remove.mjs reads. Usage: node scripts/oneoff/gpx-offroute-round2.mjs <evidence.json> <out.json>
import fs from "fs";

const REMOVE = {
  wa_cardinal_peak_se_slopes: [2, 3],   // junction ~3 km from where WTA's mileage puts it; "west-side" camp east of the summit (camp kept in bivy)
  wa_chockstone_route: [0, 1],          // Klipchuck + Lone Fir drive-in campgrounds, both in bivy
  wa_eldorado_peak_eldorado_glacier_nw: [0], // Marble Creek drive-in campground, in bivy
  wa_mount_fairchild_standard: [0],     // Sol Duc resort campground, in bivy
  wa_mount_herman_standard_scramble: [0], // Silver Fir drive-in campground, in bivy
  wa_sews_sw_rib: [0, 1],               // Klipchuck + Lone Fir, in bivy
  wa_sperry_peak_standard: [0],         // Red Bridge drive-in campground, in bivy
  wa_windy_peak_trail: [1, 2],          // 600-840 m off a dense recording; boundary pin ~1.5 mi short of where the Forest Service puts it
};
const [evFile, outFile] = process.argv.slice(2);
const ev = new Map(JSON.parse(fs.readFileSync(evFile, "utf8")).map(r => [r.id, r]));
const cands = Object.entries(REMOVE).map(([id, idx]) => ({ id, off: idx.map(i => ({ i, wp: ev.get(id).pins[i].name, type: ev.get(id).pins[i].type, offM: ev.get(id).pins[i].offTrackM })) }));
fs.writeFileSync(outFile, JSON.stringify({ cands }, null, 1));
for (const c of cands) console.log(c.id, c.off.map(o => `${o.i}:${o.wp} (${o.offM} m)`).join("; "));
