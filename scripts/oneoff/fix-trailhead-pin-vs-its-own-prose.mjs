// A REVIEWED BATCH, never a sweep: five trailhead pins whose elevation chip and whose own
// "Getting here" line state two different heights, where the USGS DEM — which derives from neither
// record — separates them by ratio.
//
// audit:pin-elev-vs-own-prose reports 11. SIX are deliberately left, and the reasons are the
// reason this cannot be a transform:
//   wa_magic_mountain_northwest_ridge   the sentence names CASCADE PASS at 5,392 ft
//   wa_osceola_peak_scramble            ...SLATE PASS at 6,900 ft
//   wa_sherpa_peak_east_ridge           ...LONGS PASS at 6,200 ft
//   wa_esmeralda_peaks_scramble         ...a SWITCHBACK at ~5,600 ft
//     -- four sentences that are CORRECT and merely name a second feature. The repair is nothing.
//   wa_mount_stuart_north_ridge         ground 3,399: nearer neither 3,200 nor 3,540
//   wa_mount_baker_easton_glacier       ground 3,337: the prose is 23 ft out and the pin 137, which
//                                       is not the separation this batch demands. A threshold
//                                       widened to admit the case it is judging proves nothing.
//
// NOTHING HERE IS TYPED. A pin repair copies the figure that pin's OWN sentence states; a prose
// repair copies that pin's OWN stored elevation. So a fix needing a height the row does not hold
// cannot be expressed at all — the declare-a-donor contract the trailhead-disagreement appliers use.
//
// The ground is RE-MEASURED at apply time rather than quoted, so the argument has to still hold
// when the write runs, and every entry re-asserts the live value first.
//
// AND THE NEIGHBOURING FIELD WAS CHECKED BEFORE ANYTHING WAS WRITTEN, because lowering a trailhead
// RAISES the trailhead-to-summit rise and can arm `gainBelowOwnPins` — the caveat that tells a
// climber their route's stored gain is impossible. Measured on both pin repairs: Cashmere's implied
// rise goes 3,864 -> 5,214 against a stored gain of 5,300, so the caveat stays silent and the gain
// becomes MORE consistent rather than less; Blue Lake's goes 2,560 -> 2,360 against 2,400 with 689
// ft of climbing credited, also silent. Changing which record wins must not strand the field
// beside it.
import { requireServiceKey, anonKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
import { elevationAt, selfTest } from "../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");

// kind: "pin"   the stored elevation is the wrong half — take the figure from its own sentence
//       "prose" the sentence is the wrong half — take the figure from its own stored elevation
const BATCH = [
  { route: "wa_cashmere_mountain_west_ridge", pin: "Eightmile Lake Trailhead", kind: "pin",
    elev: 4650, stated: 3300,
    find: "ending at the Eightmile Lake Trailhead at about 3,300 feet",
    why: "the pin is 1,347 ft above its own ground while the sentence matches it to 3 ft; and the\n"
       + "          route's own gain_ft of 5,300 against a summit of 8,514 implies a start at 3,214 —\n"
       + "          a FOURTH record, written by a different pass, agreeing with the other two" },

  { route: "wa_the_west_face", pin: "Blue Lake TH", kind: "pin",
    elev: 5200, stated: 5400,
    find: "at roughly 5,400 ft",
    why: "the same trailhead is stored 5,400 on wa_north_face_3, and the ground reads 5,380" },

  { route: "wa_lichtenberg_mountain_se_route", pin: "Smithbrook Trailhead", kind: "prose",
    elev: 4000, stated: 3800,
    find: "to the Smithbrook Trailhead at roughly 3,800 ft",
    repl: "to the Smithbrook Trailhead at roughly 4,000 ft",
    why: "the ground reads 3,981 — 19 ft from the pin and 181 from the sentence" },

  { route: "wa_north_face_3", pin: "Blue Lake Trailhead", kind: "prose",
    elev: 5400, stated: 5200,
    find: "west of Washington Pass at roughly 5,200 feet",
    repl: "west of Washington Pass at roughly 5,400 feet",
    why: "the ground reads 5,380 — 20 ft from the pin and 180 from the sentence" },

  { route: "wa_prusik_peak_solid_gold", pin: "Stuart Lake Trailhead", kind: "prose",
    elev: 3400, stated: 3600,
    find: "at the end of FS Road 7601, at about 3,600 feet",
    repl: "at the end of FS Road 7601, at about 3,400 feet",
    why: "the ground reads 3,386 — 14 ft from the pin and 214 from the sentence" },
];

const key = APPLY ? requireServiceKey() : anonKey();
console.log("terrain self-test:\n" + (await selfTest()) + "\n");

const rows = await selectAll("routes", "id,waypoints",
  `id=in.(${BATCH.map(b => b.route).join(",")})`, { key, pageSize: 100 });
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = 0, refused = 0;
for (const b of BATCH) {
  const row = byId[b.route];
  if (!row) { console.log(`REFUSED ${b.route}: no such row`); refused++; continue; }
  const wps = Array.isArray(row.waypoints) ? row.waypoints.slice() : [];
  const idx = wps.findIndex(w => w && w.name === b.pin && /trailhead/i.test(String(w.type || "")));
  if (idx < 0) { console.log(`REFUSED ${b.route}: pin "${b.pin}" not found`); refused++; continue; }
  const w = wps[idx];

  // DECLARED STATE: the row must still say what this entry was written against.
  if (Number(w.elev) !== b.elev) {
    console.log(`REFUSED ${b.route}: pin stores ${w.elev}, this entry was written against ${b.elev} — the row has moved`);
    refused++; continue;
  }
  const prose = [w.directions, w.note].filter(x => typeof x === "string" && x).join("  ");
  const hits = prose.split(b.find).length - 1;
  if (hits !== 1) {
    console.log(`REFUSED ${b.route}: its find string matched ${hits} times, expected exactly 1`);
    refused++; continue;
  }

  // THE ARGUMENT MUST STILL HOLD AT APPLY TIME, not merely when it was written.
  const g = await elevationAt(w.lat, w.lng, 10);
  if (g == null) { console.log(`REFUSED ${b.route}: the ground could not be read — not a verdict`); refused++; continue; }
  const keep = b.kind === "pin" ? b.stated : b.elev;
  const drop = b.kind === "pin" ? b.elev : b.stated;
  const dKeep = Math.abs(g - keep), dDrop = Math.abs(g - drop);
  if (!(dKeep <= 50 && dDrop >= 3 * Math.max(dKeep, 50))) {
    console.log(`REFUSED ${b.route}: ground ${Math.round(g)} does not separate ${keep} (off ${Math.round(dKeep)}) from ${drop} (off ${Math.round(dDrop)})`);
    refused++; continue;
  }

  const verb = b.kind === "pin"
    ? `pin elev ${b.elev} -> ${b.stated}  (copied from its own sentence)`
    : `sentence "${b.stated}" -> "${b.elev}"  (copied from its own pin)`;
  console.log(`${APPLY ? "APPLY " : "WOULD "}${b.route}\n   ${verb}; ground ${Math.round(g)}\n   ${b.why}`);
  // PRINT THE RESULTING SENTENCE, never just the find/repl pair. A deletion or substitution leaves a
  // dangling connective or a doubled space that is invisible from the edit alone, and this repo has
  // stranded an "and that" clause exactly so. Three of these five rewrite ENGLISH, so the only way
  // to see what a climber will read is to render it.
  if (b.kind === "prose") {
    const before = [w.directions, w.note].filter(x => typeof x === "string" && x)
      .find(x => x.includes(b.find));
    console.log(`   was: ...${before.slice(Math.max(0, before.indexOf(b.find) - 60), before.indexOf(b.find) + b.find.length + 40)}...`);
    const after = before.replace(b.find, b.repl);
    console.log(`   now: ...${after.slice(Math.max(0, after.indexOf(b.repl) - 60), after.indexOf(b.repl) + b.repl.length + 40)}...`);
  }

  if (!APPLY) { ok++; continue; }

  let body;
  if (b.kind === "pin") {
    wps[idx] = Object.assign({}, w, { elev: b.stated });
    body = { waypoints: wps };
  } else {
    const patch = {};
    for (const f of ["directions", "note"]) {
      if (typeof w[f] === "string" && w[f].includes(b.find)) patch[f] = w[f].replace(b.find, b.repl);
    }
    wps[idx] = Object.assign({}, w, patch);
    body = { waypoints: wps };
  }
  await patchRow("routes", b.route, body);

  // A 200 IS NOT EVIDENCE THE DATA CHANGED. Read it back.
  const [back] = await selectAll("routes", "id,waypoints", `id=eq.${b.route}`, { key, pageSize: 1 });
  const bw = (back.waypoints || [])[idx];
  const good = b.kind === "pin"
    ? Number(bw.elev) === b.stated
    : ![bw.directions, bw.note].filter(x => typeof x === "string").join("  ").includes(b.find);
  if (!good) { console.log(`   !! READ-BACK FAILED for ${b.route}`); refused++; continue; }
  console.log("   verified by read-back");
  ok++;
}

console.log(`\n${ok} ${APPLY ? "applied" : "would apply"}, ${refused} refused, of ${BATCH.length} declared.`);
console.log("Six further findings are deliberately NOT in this batch; the header says why for each.");
if (!APPLY) console.log("Dry run. Pass --apply to write.");
