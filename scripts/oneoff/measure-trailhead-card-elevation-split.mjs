// ONE CARD, TWO ELEVATIONS FOR ONE TRAILHEAD.
//
// TrailheadCard renders the PIN's `elev` as a tile and `approach_logistics.trailheadDirection` as
// prose directly beneath it. On wa_mount_stuart_north_ridge those disagree by 340 ft — the tile
// says 3,200 ft, the sentence under it says "~3,540 ft" — and the DEM at that coordinate reads
// ~3,399 ft, so BOTH stored records are wrong and the reader sees the disagreement.
//
// This is the facts-stored-twice class arriving on a single card rather than across two screens,
// so no cross-screen count check can see it, and audit:waypoint-elevations' flat 2,000 ft tolerance
// is far too loose to notice a 200 ft error.
//
// REPORT-ONLY, and it does not adopt the prose number. Reading a fact out of English is exactly what
// this repo refuses to do for rappel counts and permits; the prose figure is used ONLY to detect a
// disagreement with the tile, never to replace it. Which record is right needs the ground.
//
// PRECISION, MEASURED ON A READ SAMPLE RATHER THAN ASSUMED:
//   first version (nearest figure anywhere in the prose)  55 candidates, 2 of 5 read were real
//   bound to a trailhead noun (below)                     22 candidates, 3 of 4 read were real
// The three false positives the first version produced were a BIVY at ~6,000 ft, a Wonderland Trail
// junction at ~5,600 ft and a ridge toe at ~1,600 ft — every one a real elevation of a real place
// that is not the trailhead.
//
// THE FOURTH CANDIDATE IN THE SECOND SAMPLE WAS A WORSE DEFECT, NOT A FALSE POSITIVE:
// wa_mount_logan_r1's pin and `approach_logistics.trailhead` both say "Thunder Creek Trailhead
// (Colonial Creek Campground)" while its trailheadDirection says "From the PCT North trailhead
// parking at Rainy Pass on SR-20 (~4,860 ft)" — a different trailhead ~20 miles away, and the
// string is byte-identical to wa_goode_mountain_megalodon_ridge's. Copied from a neighbour, which
// is the mechanism audit:trailhead-road section 2 exists for, arriving inside trailheadDirection.
// So read a large gap as "these may be different PLACES", not as "this elevation is wrong".
//
// Worth knowing: three routes store three different heights for ONE trailhead — Stuart Lake TH is
// 3,200 ft on wa_mount_stuart_north_ridge, 2,930 ft on wa_sherpa_glacier, and ~3,540 ft in both
// their prose. The DEM reads ~3,399 ft, so no stored record is right. audit:cross-route-pins
// section 2 cannot see it: that one keys on an IDENTICAL coordinate, and these pins differ.
import { selectAll } from "../lib/supabase-env.mjs";

const M2FT = 3.28084;
/* AN APPROACH NARRATIVE NAMES SEVERAL ELEVATIONS, AND ONLY ONE IS THE TRAILHEAD'S. The first
   version took the figure NEAREST the tile from anywhere in the prose and scored 2 of 5 on a read
   sample: it matched a BIVY at ~6,000 ft (wa_north_ridge_4), a Wonderland Trail junction at
   ~5,600 ft (tahoma_glacier) and a ridge toe at ~1,600 ft (bald_eagle) — every one a real
   elevation of a real place that is not the trailhead. Same shape as "a drive has several named
   legs", one field over.

   So a figure counts only when it is BOUND to the trailhead: inside the `trailhead` name itself
   ("Olney Creek Road gate (~2,100 ft)"), or within a short window after a trailhead noun in the
   prose ("From the Downey Creek Trailhead (~1,450 ft)"). Everything else is another place. */
const FT = "(\\d{1,2},?\\d{3})\\s*(?:ft\\b|feet\\b|')";
const TH_NOUN = "(?:trailhead|\\bTH\\b|\\bgate\\b|pullout|parking|trail\\s*head)";
const BOUND_RE = new RegExp(TH_NOUN + "[^.;]{0,40}?[\\s(~]" + FT, "gi");
// Requires a THOUSANDS-scale number so a trail number (#1599) or road number (FR 7601) cannot read
// as an altitude.
const FT_RE = BOUND_RE;

const rows = await selectAll("routes", "id,name,waypoints,approach_logistics", "waypoints=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

let withBoth = 0;
const findings = [];
for (const r of rows) {
  const al = r.approach_logistics || {};
  const prose = [al.trailheadDirection, al.trailhead].filter((x) => typeof x === "string").join(" ");
  if (!prose) continue;
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const th = wps.find((w) => /^trailhead$/i.test(String(w && w.type || "")));
  if (!th) continue;
  // The tile shows `elev` (feet); the legacy `elevM` spelling is metres and is converted on read.
  const tile = th.elev != null ? Number(th.elev)
    : th.elevM != null ? Number(th.elevM) * M2FT : null;
  if (!Number.isFinite(tile) || tile <= 0) continue;

  const stated = [...prose.matchAll(FT_RE)].map((m) => Number(m[1].replace(",", ""))).filter((n) => n > 500 && n < 15000);
  if (!stated.length) continue;
  withBoth++;

  // Nearest stated figure — prose often names several (trailhead, pass, summit); only the closest
  // can plausibly be about the trailhead, and if even that one is far off, the card disagrees.
  const near = stated.reduce((a, b) => Math.abs(b - tile) < Math.abs(a - tile) ? b : a);
  const gap = Math.abs(near - tile);
  if (gap >= 150) findings.push({ id: r.id, name: r.name, tile: Math.round(tile), stated: near, gap: Math.round(gap) });
}

findings.sort((a, b) => b.gap - a.gap);
console.log(`${rows.length} routes with waypoints; ${withBoth} render BOTH a trailhead elevation tile and a stated figure in the prose beside it.`);
console.log(`${findings.length} disagree by 150 ft or more:\n`);
for (const f of findings.slice(0, 25)) {
  console.log(`  ${String(f.gap).padStart(5)} ft   tile ${String(f.tile).padStart(6)}   prose ${String(f.stated).padStart(6)}   ${f.id}`);
}
if (findings.length > 25) console.log(`  … and ${findings.length - 25} more`);
console.log("\nA gap is NOT a verdict on which record is wrong — the Stuart case had the DEM between");
console.log("the two. Check each against the ground before changing anything.");
