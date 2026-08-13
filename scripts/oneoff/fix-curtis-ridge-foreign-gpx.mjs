// `wa_mount_rainier_curtis_ridge` carries a gpx that is not its track.
//
// Five points beside Rattlesnake Lake — 734 m from a bouldering crag, ~65 km north of Mount
// Rainier. The route's three waypoints are all CORRECT (Columbia Crest sits exactly on the peak
// coordinate; White River Campground and Camp Schurman are the real approach), so the audit's
// six findings on this route all blamed the waypoints for the track's fault. That is the whole
// reason `trackOffItsPeak` exists.
//
// It is REMOVED rather than corrected, on the same rule #799 used for unsourced rappel counts:
// there is no way to derive a real Curtis Ridge track from what is on file, and inventing a line
// up a glaciated 14er is worse than having none. Afterwards the route joins the 437 WA routes
// that honestly have no track, and its correct waypoints still render.
//
// Prints the old value before writing, so the change is reversible from this script's own output.
// Pass --apply to write; the default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_mount_rainier_curtis_ridge";
const key = requireServiceKey();

const [r] = await selectAll("routes", "id,name,area_id,gpx,waypoints", `id=eq.${ID}`, { pageSize: 5, key });
if (!r) { console.error(`${ID} not found — refusing to guess`); process.exit(1); }

console.log(`${r.id}  "${r.name}"  area=${r.area_id}`);
console.log(`current gpx (${(r.gpx || []).length} pts): ${JSON.stringify(r.gpx)}`);
console.log(`waypoints kept: ${(r.waypoints || []).map(w => w.name).join(" | ")}`);

/* A track that is wrong for this route may have been copied onto others — the Colfax pair share
   one byte-identical array. Confirm this one is unique before removing it, because if it is
   shared the same removal is owed to every holder and doing one is a half repair. */
const all = await selectAll("routes", "id,name,gpx", "id=like.wa_*", { pageSize: 120, key });
const mine = JSON.stringify(r.gpx);
const sharers = all.filter(x => x.id !== r.id && JSON.stringify(x.gpx) === mine);
console.log(`\nother routes carrying this identical track: ${sharers.length}`);
sharers.forEach(s => console.log(`   ${s.id}  ${s.name}`));
if (sharers.length) {
  console.error("\nThis track is shared. Removing it from one route only would be a half repair — stopping.");
  process.exit(1);
}

if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", ID, { gpx: null });

// A 200 is not evidence. Re-read and confirm.
const [after] = await selectAll("routes", "id,gpx", `id=eq.${ID}`, { pageSize: 5, key });
if (after && (after.gpx === null || (Array.isArray(after.gpx) && !after.gpx.length))) {
  console.log(`\nreconciled: ${ID} gpx is now ${JSON.stringify(after.gpx)}`);
} else {
  console.error(`\nRECONCILE FAILED — gpx is still ${JSON.stringify(after && after.gpx)}`);
  process.exit(1);
}
