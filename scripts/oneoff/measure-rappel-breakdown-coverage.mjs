// How many routes that rappel have a rap-by-rap breakdown covering every rappel, with something
// written for each one? Read-only. Writes the per-row list to the path given as argv[2].
import fs from "fs";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { rappelSummary, rappelNumbersIn } from "../../lib/rappels.js";

const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id,pitches,discipline,rappels,rappel_count_note,rappel_detail,descent_text", "rappels=not.is.null", { key, pageSize: 200 });

const NONE = /^\s*(?:none|no\b|n\/a|not required|zero|0)\b/i;
const WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const wordCounts = (t) => [...String(t || "").matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:\w+\s+)?(?:rappels|raps)\b/gi)].map((m) => WORD[m[1].toLowerCase()]);
const thin = (s) => { const txt = [s && s.station, s && s.anchor, s && s.notes].filter((x) => typeof x === "string" && x.trim().length > 15); return txt.length === 0; };
const multiInOne = (s) => /\b(?:two|three|four|\d)\s*(?:or\s+(?:two|three|four|\d)\s*)?(?:rappels|raps)\b/i.test([s && s.station, s && s.notes].join(" ")) && !/\b(?:first|second|third|last) of\b/i.test(s && s.notes || "");

const out = [];
const t = { total: rows.length, none: 0, rappelling: 0, multipitch: 0, withTable: 0, noTable: 0, tableShort: 0, thinStations: 0, multiStation: 0, gradeArtifact: 0 };
for (const r of rows) {
  const v = String(r.rappels).trim();
  const d = Array.isArray(r.rappel_detail) ? r.rappel_detail : [];
  if (!d.length && (NONE.test(v) && !/\d+\s*(?:raps?|rappels?)/i.test(v))) { t.none++; continue; }
  t.rappelling++;
  if ((r.pitches || 0) > 1) t.multipitch++;
  const cam = { ...r, rappelDetail: d, rappelCountNote: r.rappel_count_note, descentText: r.descent_text };
  const s = rappelSummary(cam);
  const words = wordCounts([r.rappels, r.rappel_count_note, r.descent_text].join(" "));
  const proseMax = Math.max(0, ...(rappelNumbersIn([r.rappels, r.rappel_count_note, r.descent_text].join(" "))), ...words);
  const row = { id: r.id, name: r.name, pitches: r.pitches, discipline: r.discipline, stations: d.length, proseMax: proseMax || null, rappels: v.slice(0, 160), flags: [] };
  if (!d.length) { t.noTable++; row.flags.push("NO_TABLE"); }
  else {
    t.withTable++;
    if (proseMax > d.length) { t.tableShort++; row.flags.push("TABLE_SHORTER_THAN_PROSE"); }
    const th = d.filter(thin).length; if (th) { t.thinStations++; row.flags.push(`THIN_STATIONS:${th}/${d.length}`); }
    const mi = d.filter(multiInOne).length; if (mi) { t.multiStation++; row.flags.push(`STATION_IS_SEVERAL:${mi}`); }
  }
  if (/\b5\.\d+\s*(?:raps?|rappels?)\b/i.test([r.rappels, r.rappel_count_note, r.descent_text].join(" "))) { t.gradeArtifact++; row.flags.push("GRADE_READ_AS_COUNT"); }
  out.push(row);
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(t);
const pre = {}; for (const r of out) { const k = r.id.split("_")[0]; pre[k] = (pre[k] || 0) + 1; } console.log("by id prefix:", pre);
