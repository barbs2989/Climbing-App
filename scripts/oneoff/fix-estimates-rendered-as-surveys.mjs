// Rows that render an ESTIMATE as though it were a survey, plus two unsupported numbers and a
// hazard list that warns about terrain the route does not cross.
//
// The pattern in the two rappel tables is the one the rappel-length work already documented:
// the row's OWN count note says the figure is a representative midpoint or an estimate, and the
// station table beside it prints per-station numbers and named anchors in the app's own red
// numerals, which reads as a measurement. Clearing the table leaves the honest prose standing.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// wa_snowking_mountain_standard.beta carries two numbers nothing supports. "roughly
// three-quarters of parties" is a traffic statistic on a peak whose own `crowds` field says the
// traffic is unknown and that it is rarely climbed; "Snowking's FOUR standard lines" names a
// count no source gives and the catalog holds two of. The qualitative claim — that this is the
// usual line and the one essentially every documented party takes — is supported and stays.
const SNOWKING_BETA = "This is the most-used of Snowking's standard lines and the one essentially every documented party takes, chosen for its directness, though it starts low (about 2,300 ft) and doesn't tour the whole mountain. Most groups treat it as a two-day trip with a bivy near Cyclone Lake, though strong parties have done it car-to-car in a long day (9-14 hrs) on firm spring snow. It is glacier travel, not technical climbing — ice axe, crampons, and a rope with basic crevasse-rescue gear are standard, and parties are advised to stay roped through the upper snowfield/glacier, especially once blue ice and crevasses open up in high summer.";

// ---------------------------------------------------------------------------------------------
// wa_north_ridge_7.watch_out warns about snow climbing on a route with no snow on it — the
// published description is two to three pitches of almost-level ridge with a single 50-60 ft
// 4th-class pitch as its crux — and about water availability at a notch, which nothing supports.
// The exposure line is real and is the whole point of the route. The column is a newline-joined
// string that lib/db.js splits with toWarnArr(), so one line is a valid value.
const NR7_WATCH = "Ridge traverse creates exposure hazard";

// ---------------------------------------------------------------------------------------------
// wa_nooksack_tower_south_face: ten stations, nine of them with null lengths and identical
// generic anchor text, one carrying a real fixed titanium knifeblade. Its own note says "10 is
// used as the representative count" and "Per-station lengths are estimated". Research traced the
// one real detail to its source, and it belongs to a different descent: "We used 2 60m 9mms for
// the rappelling descent TO THE COL... There were 4 raps... one from a Ti knife blade equalized
// with a stopper." So the knifeblade is station 4-of-4 on a two-rope descent to the col, not
// station 5 of ten 30 m rappels to the glacier.
const NOOKSACK_SF_NOTE = "The one first-hand account of this descent records four rappels on two 60 m ropes, ending at the col rather than continuing to the glacier, with one station off a fixed titanium knifeblade equalised with a stopper. Other reports vary from four to ten or more depending on the line taken and how much snow is on it. No per-station distance is published and no station positions are documented, so plan to find or build anchors rather than to work down a fixed list.";

const REPAIRS = [
  { kind: "set", route: "wa_snowking_mountain_standard", path: "beta",
    expect: "be147f7a9ef8ab09", value: SNOWKING_BETA,
    why: "a traffic fraction on a peak its own crowds field calls rarely climbed, and a count of standard lines no source gives" },

  { kind: "set", route: "wa_north_ridge_7", path: "watch_out",
    expect: "f1d3d059c26bd480", value: NR7_WATCH,
    why: "warned about snow climbing on a route with no snow, and water at a notch nothing supports" },

  // The row's own note: "Source estimates 4-6 rappels ... 5 used as a representative midpoint."
  // Five identical 30 m stations with named anchors is that midpoint dressed as a survey.
  { kind: "set", route: "wa_lincoln_peak_north_ridge", path: "rappel_detail",
    expect: "3d29a69114c15c63", value: null,
    why: "five uniform 30 m stations are the row's own admitted midpoint estimate rendered as a measured table" },

  { kind: "set", route: "wa_nooksack_tower_south_face", path: "rappel_detail",
    expect: "7e6da378f7892cc0", value: null,
    why: "ten stations the row's own note calls a representative count, with the one real anchor belonging to a different, four-rappel descent" },
  { kind: "set", route: "wa_nooksack_tower_south_face", path: "rappel_count_note",
    expect: "1613617693eea6ba", value: NOOKSACK_SF_NOTE,
    why: "the note asserted 10 as a documented floor; the one first-hand account records four, to the col" },

  // The notch at 1.2 mi and the summit at 1.4 mi are both SHORTER than the row's own dist_km of
  // 4 km (2.49 mi), and the approach reaches the base before either. No cumulative mileage is
  // published for these points, so null rather than a substituted approximation.
  { kind: "set", route: "wa_liberty_bell_beckey_route", path: "waypoints.1.distMi",
    expect: "77ac319bfe1979e2", value: null,
    why: "1.2 mi is shorter than the row's own approach distance to a point above the climb" },
  { kind: "set", route: "wa_liberty_bell_beckey_route", path: "waypoints.2.distMi",
    expect: "1a948f1b4374f4e3", value: null,
    why: "the summit rung has the same problem and no published cumulative figure to replace it" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
