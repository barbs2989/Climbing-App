// PROSE WRITTEN FOR THE PIPELINE, NOT THE CLIMBER — 12 values, rewritten.
//
// A distinct class from the citation sweep several sessions are working. A CITATION names a third
// party; PIPELINE VOICE names no publisher at all, so every publisher-keyed needle misses it, and
// the repair differs: the clause is about OUR RECORD rather than about the mountain.
//
// The worst of them is an editorial note to the next editor, shipped to a climber:
//   "the claim that these bolts were 'replaced in 2001' is not supported by any source specific to
//    this Washington peak and should not be presented as fact"
//
// THE RULE APPLIED HERE: keep the fact and keep the uncertainty; drop only the sourcing. A hedge is
// CONTENT — "lengths are estimated" warns a party not to rig to them — and deleting it would make
// the record read as more certain than it is, which is worse than the leak. So "Trip reports vary
// 3-5 rappels" becomes "Expect 3-5 rappels", not "4 rappels".
//
// DECLARED-STATE CONTRACT, as the road/access redaction: every edit is an exact find -> replace
// pair, and the run REFUSES unless `find` matches EXACTLY ONCE in the live value. Nothing is
// invented and a value that has moved since this was reasoned about cannot be half-applied.
//
// DELIBERATELY EXCLUDED: wa_nooksack_tower_south_face rappel_count_note. It carries the same
// defect AND a named guidebook, which is exactly what the open guidebook-citation batch is
// sweeping. Two sessions rewriting one value is how a merge silently drops half of it.
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const EDITS = [
  { id: "wa_chimney_rock_west_face", path: "rappel_detail[1].notes",
    find: " Note: the claim that these bolts were 'replaced in 2001' is not supported by any source specific to this Washington peak and should not be presented as fact — it appears to describe a different, same-named Chimney Rock in North Idaho.",
    repl: "",
    why: "an editorial note about a claim the app never makes; a climber learns nothing from it" },

  { id: "wa_del_campo_peak_standard", path: "approach",
    find: "about 11-14 miles round trip (reports vary by exact approach line) with",
    repl: "about 11-14 miles round trip, depending on the exact approach line, with",
    why: "keeps the range, drops the attribution" },

  { id: "wa_diamond_in_the_rough", path: "approach",
    find: "(roughly 1.5–2.5 miles in, reports vary) below the basin",
    repl: "(roughly 1.5–2.5 miles in) below the basin",
    why: "the range already carries the uncertainty" },

  { id: "wa_fire_on_the_mountain", path: "approach",
    find: "roughly 1.5–2.5 miles in (reports vary) at a large brushy washout",
    repl: "roughly 1.5–2.5 miles in, at a large brushy washout",
    why: "the range already carries the uncertainty" },

  { id: "wa_mount_rainier_kautz_glacier", path: "gear[2]",
    find: "trip reports vary (one party ran 8 screws and 2 pickets, another carried screws they never placed), so",
    repl: "parties have carried anything from 8 screws and 2 pickets to screws they never placed, so",
    why: "keeps both ends of the real spread, drops where it came from" },

  { id: "wa_mount_terror_north_face", path: "descent_text",
    find: "Trip reports vary in exact count depending on snow coverage and route-finding — figure",
    repl: "The exact count varies with snow coverage and route-finding — figure",
    why: "keeps the variance and its cause" },

  { id: "wa_mount_terror_north_face", path: "rappel_count_note",
    find: "Trip reports vary 3-5 rappels total",
    repl: "Expect 3-5 rappels total",
    why: "keeps the range; collapsing it to one number would overstate what is known" },

  { id: "wa_mount_torment_torment_forbidden_traverse", path: "rappel_detail[9].notes",
    find: " No source found documents its exact length.",
    repl: " Its exact length is not recorded.",
    why: "the party still needs to know the length is unknown; only the sourcing goes" },

  { id: "wa_narcos", path: "rappel_count_note",
    find: "Descent text specifies exactly 4 double-rope (60m) rappels down the shared Wright-Pond descent line; the source doesn't break out per-station anchor type or individual lengths, so all 4 are treated as roughly equal-length doubled-rope rappels (length estimated, not station-confirmed).",
    repl: "Exactly 4 double-rope (60m) rappels down the shared Wright-Pond descent line. Per-station anchor type and individual lengths are not recorded, so all 4 are shown as roughly equal-length doubled-rope rappels — the lengths are estimated rather than station-confirmed.",
    why: "keeps the estimated-not-confirmed warning, which is the safety-relevant half" },

  { id: "wa_northwest_ridge_2", path: "climbing_route[2].notes",
    find: "Beyond this single account there is no route description for the crest, and it should not be treated as a repeated or verified line.",
    repl: "There is no route description for the crest beyond, and the line has not been repeated — treat it as unrepeated ground rather than an established route.",
    why: "keeps the warning that the ground is unrepeated, which is the point" },

  // wa_remmel_mountain_nw_ridge pro_needs was in this list and is GONE: a parallel session landed
  // the same repair while this was being written, and the exactly-once contract REFUSED rather
  // than clobbering it. That is the contract earning its place — the value now reads "Rope
  // requirements are not settled", which is the repair this entry intended. Its `rope_note` still
  // carries both pipeline voice and a named guidebook; left to the guidebook batch, as above.

  { id: "wa_tomyhoi_peak_southeast_ridge", path: "climbing_route[0].notes",
    find: "Reports vary on gear: some parties",
    repl: "Gear needs vary: some parties",
    why: "keeps the variance, drops the attribution" },

  { id: "wa_tomyhoi_peak_southeast_ridge", path: "climbing_route[0].notes",
    find: "There is a documented alternative —",
    repl: "There is a known alternative —",
    why: "'documented' points at a record rather than at the mountain" },
];

const key = requireServiceKey();
const H = headers(key);
const COLS = [...new Set(EDITS.map((e) => e.path.split(/[.[]/)[0]))];

const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,${COLS.join(",")}&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json();
  if (j.length !== 1) throw new Error(`${id}: ${j.length} rows`);
  return j[0];
};
// path -> value, and a setter, for "col", "col[i]" and "col[i].key" only. Anything else is an
// unsupported shape and must fail rather than guess.
const parse = (path) => {
  const m = /^([a-z_]+)(?:\[(\d+)\](?:\.([a-z_]+))?)?$/.exec(path);
  if (!m) throw new Error(`unsupported path: ${path}`);
  return { col: m[1], idx: m[2] == null ? null : Number(m[2]), key: m[3] || null };
};
const read = (row, path) => {
  const { col, idx, key: k } = parse(path);
  let v = row[col];
  if (idx != null) v = Array.isArray(v) ? v[idx] : undefined;
  if (k) v = v && typeof v === "object" ? v[k] : undefined;
  return v;
};

// ---- verify EVERY edit against the live rows before writing ANY of them --------------------
const rows = new Map();
for (const e of EDITS) if (!rows.has(e.id)) rows.set(e.id, await get(e.id));

for (const e of EDITS) {
  const v = read(rows.get(e.id), e.path);
  if (typeof v !== "string") {
    console.log(`REFUSED — ${e.id} ${e.path} is not a string (${typeof v})`); process.exit(1);
  }
  const n = v.split(e.find).length - 1;
  if (n !== 1) {
    console.log(`REFUSED — ${e.id} ${e.path}: find matches ${n} time(s), need exactly 1`);
    console.log(`  find: ${e.find.slice(0, 110)}`);
    process.exit(1);
  }
}
console.log(`all ${EDITS.length} edits match exactly once — proceeding\n`);

// ---- apply, grouping by row so a column edited twice is written once ------------------------
const byRow = new Map();
for (const e of EDITS) {
  if (!byRow.has(e.id)) byRow.set(e.id, []);
  byRow.get(e.id).push(e);
}

let wrote = 0;
for (const [id, es] of byRow) {
  const row = rows.get(id);
  const patch = {};
  for (const e of es) {
    const { col, idx, key: k } = parse(e.path);
    const cur = patch[col] !== undefined ? patch[col] : row[col];
    const next = JSON.parse(JSON.stringify(cur));
    if (idx == null) patch[col] = next.replace(e.find, e.repl);
    else if (!k) { next[idx] = next[idx].replace(e.find, e.repl); patch[col] = next; }
    else { next[idx][k] = next[idx][k].replace(e.find, e.repl); patch[col] = next; }
    console.log(`  ${id} ${e.path}`);
    console.log(`     ${e.why}`);
  }
  await patchRow("routes", id, patch);
  wrote++;
}

console.log(`\nwrote ${wrote} row(s); re-reading to reconcile`);
let ok = 0;
for (const e of EDITS) {
  const v = read(await get(e.id), e.path);
  const gone = typeof v === "string" && !v.includes(e.find);
  const has = e.repl === "" || (typeof v === "string" && v.includes(e.repl));
  if (gone && has) ok++;
  else console.log(`  MISMATCH ${e.id} ${e.path}  gone=${gone} replacement=${has}`);
}
console.log(`verified ${ok}/${EDITS.length}`);
process.exitCode = ok === EDITS.length ? 0 : 1;
