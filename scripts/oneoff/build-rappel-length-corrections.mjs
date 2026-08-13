// Build the rope-capacity correction batch for the 8 routes the rule-3 triage confirmed.
// See research-data/RAPPEL-RULE3-TRIAGE-2026-08-13.md for the evidence behind each one.
//
// It generates rather than hand-writes the batch for one reason: the apply script's station-level
// path is guarded on `from` (the stored value) and `expect` (text from the station itself), and
// those guards are worth nothing if they are copied from a report. Read from the live row they
// prove the correction is landing on the rappel it was researched against. A station is identified
// by its index, and indexes move — wa_ellation's table was re-sequenced earlier in this sweep.
//
//   node scripts/oneoff/build-rappel-length-corrections.mjs
//   npm run enrich:apply -- --from research-data/rappel-rule3-corrections-2026-08-13.json --dry
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;

// station is 1-BASED, matching how the tables read on screen and in the triage.
// `to: null` is the correct value for a distance no source publishes. Halving a rope's capacity
// would only replace one fabricated number with another.
const FIX = {
  wa_east_ridge_4: {
    why: "Station 14 stores the rope, not the rappel: its own text says a party 'used every bit of a 70 m rope', and a 70 doubled reaches 35 m. Stations 1-13 at 30 m are consistent with the stated single 60-70 m rope and stand.",
    stations: [{ station: 14, to: null }],
  },
  wa_east_ridge_9: {
    why: "Station 2 calls itself a 'full-rope-length' rappel on a single 60 m rope, which is 30 m of descent, while storing 60. Stations 1 (25) and 3 (30) stand.",
    stations: [{ station: 2, to: null }],
  },
  wa_ingalls_peak_south_ridge: {
    why: "Station 2 stores 55 m on a rappel its own text brackets at 34.5-35 m ('a 60 m comes up about 5 m short ... a 70 m only just makes it'). Going in as null rather than 35: deriving 35 from 'a 70 only just makes it' is the rope-capacity arithmetic this sweep exists to remove. The bracket is recorded in the count note instead.",
    stations: [{ station: 2, to: null }],
  },
  wa_liberty_bell_nw_face: {
    why: "Stations 2 and 3 look transposed. Station 2 says 'a 60m rope reaches' (so <=30 m) while storing 55; station 3 calls itself a double-rope rappel to the notch while storing 30. The same notch rappel is stored as 55 m on wa_liberty_bell_east_face.",
    stations: [{ station: 2, to: null }, { station: 3, to: null }],
  },
  wa_mount_rainier_kautz_glacier: {
    why: "The count note says the table is a middle count 'for a party on a single 60m rope', which cannot reach the 45 m stored at stations 1 and 2. NPS publishes only '1-3 rappels' over '300+ ft', so 45 is 300 ft halved.",
    stations: [{ station: 1, to: null }, { station: 2, to: null }],
  },
  wa_mount_torment_south_ridge: {
    why: "The count note admits the method in words: 'estimated near-max for a 60m rope used double'. Six identical 55 m stations is 330 m of rappel. The note is rewritten too, or the next pass re-derives the same numbers.",
    stations: [{ station: 1, to: null }, { station: 2, to: null }, { station: 3, to: null },
               { station: 4, to: null }, { station: 5, to: null }, { station: 6, to: null }],
  },
  wa_pernod_spire_standard: {
    why: "Station 1 stores 65 m with a note that brackets it at 30-35 m ('a single 70m rope reaches, a 60m leaves you short of the notch'). 65 is the 70 m rope's capacity. Stations 2-3 at 30 m stand.",
    stations: [{ station: 1, to: null }],
  },
  wa_sharkfin_tower_southeast_ridge: {
    why: "Stations 3-5 store 35 m while the row says 'a single 60 m rope is generally enough for any individual station' (so <=30 m). Stored total 145 m on a route of length_m 61. The published 20/10/30 m figures belong to the 3-station two-rope count and must not be mapped onto this 5-station one; stations 1-2 at 20 m are backed by that party's '20 m into the gully'.",
    stations: [{ station: 3, to: null }, { station: 4, to: null }, { station: 5, to: null }],
  },
  wa_south_face_5: {
    why: "Stations 1-6 are a genuine 7-rappel double-rope sequence and stand. Station 7 stores 60 m while its own text says the final rappel is 'short - about 100 ft in one account'. This is the one place a NUMBER is right to write, because a source published one.",
    stations: [{ station: 7, to: 30 }],
  },
};

const ids = Object.keys(FIX);
const rows = await selectAll("routes", "id,name,area_id,length_m,rappel_count_note,rappel_detail",
  `id=in.(${ids.join(",")})`, { pageSize: 50 });
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

// A distinctive slice of the station's own text, used as the apply script's `expect` guard. It is
// taken from the LIVE row, so it cannot drift from what is stored; its job is to make the
// correction refuse if the table is re-ordered before it is applied.
const fingerprint = st => {
  const s = String(st.notes || st.note || st.station || st.anchor || "").replace(/\s+/g, " ").trim();
  return s.slice(0, 40);
};

const out = {
  _README: [
    "Rope-capacity corrections for the 8 routes confirmed by the rule-3 triage.",
    "Evidence and the 13 false alarms: research-data/RAPPEL-RULE3-TRIAGE-2026-08-13.md",
    "",
    "A rope doubled through an anchor reaches HALF its length. Every station below stored a rope's",
    "capacity where a distance belongs. null is the correct replacement where no source publishes a",
    "figure - halving would swap one fabricated number for another. The single exception is",
    "wa_south_face_5 station 7, where a source gives 'about 100 ft'.",
    "",
    "Generated by scripts/oneoff/build-rappel-length-corrections.mjs so that `from` and `expect` are",
    "read from the live rows rather than copied from a report.",
  ],
};
let missing = 0;
for (const id of ids) {
  const r = byId[id];
  if (!r) { console.error(`MISSING ${id} — not returned by the read`); missing++; continue; }
  const raps = r.rappel_detail || [];
  const entry = { area: r.area_id, _why: FIX[id].why, rappel_lengths: [] };
  for (const f of FIX[id].stations) {
    const st = raps[f.station - 1];
    if (!st) { console.error(`MISSING ${id} station ${f.station} — table has ${raps.length}`); missing++; continue; }
    entry.rappel_lengths.push({ station: f.station, from: st.lengthM, to: f.to, expect: fingerprint(st) });
    console.log(`  ${id} st${f.station}: ${JSON.stringify(st.lengthM)} -> ${JSON.stringify(f.to)}`);
  }
  if (entry.rappel_lengths.length) out[id] = entry;
}
// The count note has to change with the table wherever it states the METHOD that produced the wrong
// number - otherwise the next enrichment pass reads the note and re-derives exactly what was removed.
if (out.wa_mount_torment_south_ridge) {
  const cur = String(byId.wa_mount_torment_south_ridge.rappel_count_note || "");
  out.wa_mount_torment_south_ridge.set = {
    rappel_count_note: cur.replace(/,?\s*estimated near-max for a 60m rope used double\.?/i, ".")
      .replace(/\s+/g, " ").trim() + " Per-station distances are not published for this descent and are recorded as unknown rather than estimated from a rope's length.",
  };
}
if (out.wa_ingalls_peak_south_ridge) {
  const cur = String(byId.wa_ingalls_peak_south_ridge.rappel_count_note || "");
  out.wa_ingalls_peak_south_ridge.set = {
    rappel_count_note: (cur + " Reported rope behaviour brackets the second rappel at roughly 35 m — a 60 m rope comes up about 5 m short of the ledge and a 70 m only just reaches — but no source states the distance, so it is recorded as unknown.").replace(/\s+/g, " ").trim(),
  };
}

const dest = `${ROOT}research-data/rappel-rule3-corrections-2026-08-13.json`;
if (missing) { console.error(`\nREFUSING to write — ${missing} station(s)/route(s) did not resolve. The tables have moved since the triage; re-read before correcting.`); process.exitCode = 1; }
else { fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n"); console.log(`\nwrote ${dest}`); }
