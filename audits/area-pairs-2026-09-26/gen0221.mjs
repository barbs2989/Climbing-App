// 0221: merge the same-named area pairs that READING showed are one place stored twice.
// Pair numbers are indexes into $CLAUDE_JOB_DIR/tmp/pairs.json (247 live pairs, 2026-09-26).
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers } from "../../scripts/lib/supabase-env.mjs";
import { searchCanon } from "../../lib/search.js";
const key = requireServiceKey();
const get = async p => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(key) }); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); };
const J = process.env.CLAUDE_JOB_DIR + "/tmp/";
const P = JSON.parse(fs.readFileSync(J + "pairs.json", "utf8"));
const rk = n => { const t = String(n ?? "").trim(); const b = searchCanon(t).split(" ").filter(w => w && w !== "the").join(" ") || t.toLowerCase();
  return b + "|" + (t.match(/[\s'’′"+?!\[\]-]*$/) || [""])[0].replace(/\s/g, "").replace(/[’′]/g, "'"); };
const side = (p, id) => (id === p.xid ? p.xr : p.yr);

// [pair, keep area, drop area, how, why]
//   routes : merge same-named climbs (keeper side's row kept), move the rest, delete the drop area
//   reparent: move the drop area's CHILD areas under the keeper, delete the drop area
//   dupsonly: merge the same-named climbs only; the drop area keeps its unique climbs and stays
const PAIRS = [
  [21, "ar_southern_cross_wall", "ar_southern_cross_wall_2", "routes", "one wall, one climb (Southern Cross, same FA), 80 m apart"],
  [52, "ca_little_stuff_crags_2", "ca_little_stuff_crags", "routes", "the copy holds only Short but Sweet, which the keeper has (same FA)"],
  [116, "co_kody_block", "co_kody_block_2", "routes", "one block, one problem (Corn on the Knob V2), 260 m apart"],
  [58, "ca_pin_cushion_wall_2", "ca_pin_cushion_wall", "routes", "the copy holds only Mild Steel, which the keeper has"],
  [218, "ut_needles_2", "ut_needles", "routes", "the copy holds only Needles Nirvana (same FA), which the keeper has"],
  [219, "ut_mt_ogden_2", "ut_mt_ogden", "routes", "the copy holds only The Gray Slabs (same FA), which the keeper has"],
  [176, "mn_quarry_boulder", "mn_quarry_boulder_2", "routes", "all 9 problems of the copy are on the keeper, same coordinate"],
  [127, "co_pike_s_peak_2", "co_pikes_peak", "routes", "Front Range › Pikes Peak holds only East Slopes; one peak"],
  [136, "co_torrey_s_peak", "co_torreys_peak", "routes", "one peak, 20 m apart (Kelso Ridge / South Slopes)"],
  [117, "co_la_plata", "co_la_plata_peak", "routes", "one peak, 10 m apart"],
  [132, "co_snowdon_peak_2", "co_snowdon_peak", "routes", "one San Juans peak; the keeper is filed under the West Needle Mountains"],
  [173, "mn_carlton_peak", "mn_carlton_peak_2", "reparent", "one peak; the copy's only child (Carlton Boulder) moves under the keeper"],
  [214, "tx_emerald_pools_sector_2", "tx_emerald_pools_sector", "dupsonly", "flat copy of the sector: 17 of its 18 climbs are on the walls (same FAs); Unnamed 3 stays"],
  [215, "tx_painted_canyon_sector_2", "tx_painted_canyon_sector", "dupsonly", "flat copy: 8 of its 9 climbs are on the walls (same FAs); Picnic (2022) stays"],
  [208, "nc_whiteside_ice", "nc_starshine_area", "routes", "Starshine, Junior, Mother Russia stored as ice climbs in both trees; the ice tree keeps them"],
];
// Same climb under a spelling the key does not join (same FA and grade, read by hand).
const EXTRA = { 214: [["tx_candy_land", "tx_candyland"], ["tx_hi_ho_cherry_o", "tx_hi_ho_cherrio"]] };

const merges = [], moves = [], reparents = [], dropAreas = [];
for (const [i, keep, drop, how, why] of PAIRS) {
  const p = P[i];
  // the drop may be a sub-area of one side (#208: Whiteside Mountain › Starshine area)
  const dropSide = [p.xid, p.yid].includes(drop) ? side(p, drop) : [p.xr, p.yr].find(s => s.some(r => r.area === drop));
  if (![p.xid, p.yid].includes(keep) || !dropSide || dropSide === side(p, keep)) throw new Error(`#${i} ids`);
  const keepAll = side(p, keep), dropDirect = dropSide.filter(r => r.area === drop);
  const byKey = new Map(); for (const r of keepAll) { const k = rk(r.name); if (byKey.has(k)) throw new Error(`#${i} keeper has two ${r.name}`); byKey.set(k, r); }
  const extra = new Map((EXTRA[i] || []).map(([k, d]) => [d, k]));
  for (const r of dropDirect) {
    const m = extra.get(r.id) ? { id: extra.get(r.id) } : byKey.get(rk(r.name));
    if (m) merges.push({ i, keep: m.id, drop: r.id });
    else if (how === "routes") moves.push({ i, id: r.id, from: drop, to: keep });
  }
  if (how === "reparent") reparents.push({ i, from: drop, to: keep });
  if (how !== "dupsonly") dropAreas.push({ i, id: drop, keep, why });
}
// state of every touched row, for the header check and the rollback file
const chunk = (a, n) => a.reduce((o, x, j) => (j % n ? o[o.length - 1].push(x) : o.push([x]), o), []);
const rows = async (t, ids) => (await Promise.all(chunk([...new Set(ids)], 50).map(c => get(`${t}?select=*&id=in.(${c.map(encodeURIComponent).join(",")})`)))).flat();
const R = Object.fromEntries((await rows("routes", [...merges.flatMap(m => [m.keep, m.drop]), ...moves.map(m => m.id)])).map(r => [r.id, r]));
for (const m of merges) { if (!R[m.keep] || !R[m.drop]) throw new Error(`missing ${m.keep}/${m.drop}`); }
const kids = (await Promise.all(reparents.map(r => get(`areas?select=*&parent_id=eq.${r.from}`)))).flat();
const areaRows = await rows("areas", [...dropAreas.map(a => a.id), ...PAIRS.map(p => p[1])]);

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const cols = JSON.parse(fs.readFileSync(J + "cols.json", "utf8")).rows;
const SKIP = new Set(["id", "area_id", "name", "name_search", "sort_order", "verif", "auto_generated"]);
const blank = c => {
  const x = `k.${c.column_name}`;
  if (c.column_name === "pitches") return `coalesce(${x}, 0) = 0`;
  if (c.data_type === "text") return `nullif(btrim(${x}), '') is null`;
  if (c.data_type === "jsonb") return `(${x} is null or ${x} in ('null'::jsonb, '{}'::jsonb, '[]'::jsonb))`;
  if (c.data_type === "ARRAY") return `coalesce(cardinality(${x}), 0) = 0`;
  return `${x} is null`;
};
const fill = cols.filter(c => !SKIP.has(c.column_name));
// part B: the FOLD plan from .scratch/fold.mjs (reads m0221.json, so run this file first, then fold, then this again)
const B = fs.existsSync(J + "fold.json") ? JSON.parse(fs.readFileSync(J + "fold.json", "utf8")) : { ops: [], touched: [] };
const bMerge = B.ops.filter(o => o.t === "merge"), bDel = B.ops.filter(o => o.t === "delete").map(o => o.id);
const bSeq = B.ops.filter(o => ["rename", "parent", "move"].includes(o.t));
const bIds = [...new Set([...B.touched, ...bDel, ...B.ops.filter(o => o.t === "parent").flatMap(o => [o.id, o.to, o.from]),
  ...B.ops.filter(o => o.t === "move").flatMap(o => [o.from, o.to])].filter(Boolean))];
const bDelRows = bDel.length ? await rows("areas", bDel) : [];
const refTables = ["contributions", "topo_lines", "gps_submissions", "content_reports", "route_base_checkins", "objectives", "hazard_votes", "climb_logs", "crew_listings", "user_itineraries", "crews"];

const sql = `-- 0221: fold every same-named AREA pair that is one place into ONE area.
--
-- Asked: "do those" — the ~250 same-named area pairs (same state, <3 km, different parent, both
-- holding climbs) left after 0215 — then "fold into 1 area, same for everything else, i don't
-- want duplicates". Refreshed live: 247 pairs, every one read:
--   * 86 are DIFFERENT features sharing a generic name (the West Face of Daff Dome and of Fairview
--     Dome; a Warm-Up Boulder in two canyons). Not duplicates; left alone.
--   * PART A, ${PAIRS.length} pairs, one place stored twice (read one by one):
${PAIRS.map(([i, k, d, how, why]) => `--     #${String(i).padEnd(4)} keep ${k.padEnd(28)} ${how === "dupsonly" ? "merge dup climbs of" : "drop"} ${d.padEnd(26)} ${why}`).join("\n")}
--   * PART B, the rest (137 Mountain Project PARALLEL DISCIPLINE TREES — a crag's bouldering or ice
--     filed under "*Joshua Tree Bouldering*" / "* NH Ice and Mixed" — plus the held pairs, plus 112
--     pairs the name key missed because MP names the copy "<X> Bouldering" / "<X> Boulders"
--     ("Hidden Valley Area Bouldering" beside "Hidden Valley Area"); 9 such look-alikes are
--     DIFFERENT places and stay (Cathedral Boulders / Cathedral Peak, Kraft Boulders / Kraft Crags,
--     Dark Side Boulders / Flagstaff's Dark Side, Beach Boulders / The Beach 2.2 km off ...): the copy
--     in the discipline tree is FOLDED into the one in the main tree. A same-named wall folds into
--     its twin; anything else moves under the kept area; a moved area whose name would repeat its
--     parent's is renamed "Ice Climbs" / "Bouldering" / "Rock Climbs" / "Other Climbs". Climbs
--     sharing a name across the trees are nearly all DIFFERENT climbs (Thresher 5.10 / WI3, Planet
--     X 5.8 / V6) and are kept both. ${B.ops.filter(o => o.t === "parent").length} re-parents, ${B.ops.filter(o => o.t === "move").length} climbs moved, ${B.ops.filter(o => o.t === "rename").length} renames, ${bMerge.length} merge,
--     ${bDel.length} folded-away areas deleted once empty. Plan: .scratch/fold.mjs (log reviewed).
--
-- Mechanics:
--   1. ${merges.length} climbs stored on both sides: the KEEPER fills each BLANK column from the
--      other row (nothing it holds is overwritten, 0220's rule) and the other row is deleted.
--   2. ${moves.length} other climbs move into the keeper area; ${kids.length} child area(s) re-parented.
--   3. ${dropAreas.length} copy areas are deleted, only once empty.
--   4. route_count recounted on every ancestor of every touched area.
-- The migration ABORTS if any climber data (contributions cascade!) points at a row it deletes.
-- Rollback snapshot: audits/area-pairs-2026-09-26/rollback.json.

begin;

create temp table m_merge(keep text not null, drop_id text primary key) on commit drop;
insert into m_merge values
${[...merges, ...bMerge].map(m => `  (${q(m.keep)}, ${q(m.drop)})`).join(",\n")};

create temp table m_move(id text primary key, from_area text not null, to_area text not null) on commit drop;
insert into m_move values
${moves.map(m => `  (${q(m.id)}, ${q(m.from)}, ${q(m.to)})`).join(",\n")};

create temp table m_drop_area(id text primary key) on commit drop;
insert into m_drop_area values ${[...dropAreas.map(a => a.id), ...bDel].map(id => `(${q(id)})`).join(", ")};

create temp table m_recount on commit drop as
  select distinct a.id from areas a, areas t
   where t.id in (${[...new Set([...PAIRS.flatMap(p => [p[1], p[2]]), ...kids.map(k => k.id), ...bIds])].map(q).join(", ")})
     and a.path @> t.path;

-- 0. refuse to cascade-delete anybody's data
do $$ declare n int; begin
  select ${refTables.map(t => `(select count(*) from ${t} where route_id in (select drop_id from m_merge))`).join("\n       + ")}
       + (select count(*) from user_lists where route_ids && (select array_agg(drop_id) from m_merge))
       + (select count(*) from contributions where area_id in (select id from m_drop_area))
       + (select count(*) from topos where area_id in (select id from m_drop_area))
    into n;
  if n > 0 then raise exception '0221: % climber rows point at a row this deletes — stop and repoint them', n; end if;
end $$;

-- 1. merge climbs stored on both sides
update routes k set
${fill.map(c => `  ${c.column_name} = case when ${blank(c)} then o.${c.column_name} else k.${c.column_name} end`).join(",\n")}
from m_merge m join routes o on o.id = m.drop_id
where k.id = m.keep;

delete from routes o using m_merge m
 where o.id = m.drop_id and exists (select 1 from routes k where k.id = m.keep);

-- 2. move the rest, and re-parent
update routes r set area_id = m.to_area from m_move m where r.id = m.id and r.area_id = m.from_area;
${reparents.map(r => `update areas set parent_id = ${q(r.to)} where parent_id = ${q(r.from)};`).join("\n")}

-- 3. the copy areas, once empty
delete from areas a using m_drop_area d
 where a.id = d.id
   and not exists (select 1 from routes where area_id = a.id)
   and not exists (select 1 from areas s where s.parent_id = a.id);

-- ── PART B: fold every remaining same-name pair into ONE area ──────────────────────────
-- A climb that shares a name with a DIFFERENT climb (Centerfold 5.4 trad / Centerfold WI3) now
-- sits in the same area as it, which the duplicate trigger would refuse; both are real, so the
-- trigger is bypassed for this transaction only. Renames/re-parents/moves run in planned order.
set local catalog.allow_duplicate = 'on';
${bSeq.map(o => o.t === "rename" ? `update areas set name = ${q(o.name)} where id = ${q(o.id)} and name = ${q(o.was)};`
  : o.t === "parent" ? `update areas set parent_id = ${q(o.to)} where id = ${q(o.id)};`
  : `update routes set area_id = ${q(o.to)} where id = ${q(o.id)} and area_id = ${q(o.from)};`).join("\n")}

-- path is set per row by trg_areas_set_path and does NOT cascade: re-derive every descendant
do $$ declare n int; begin
  loop
    update areas c set path = p.path || text2ltree(c.id) from areas p
     where c.parent_id = p.id and c.path is distinct from p.path || text2ltree(c.id);
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

-- folded-away areas, once empty, deepest first
do $$ declare n int; begin
  loop
    delete from areas a using m_drop_area d
     where a.id = d.id
       and not exists (select 1 from routes where area_id = a.id)
       and not exists (select 1 from areas s where s.parent_id = a.id);
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

insert into m_recount
  select distinct a.id from areas a, areas t
   where t.id in (${bIds.map(q).join(", ") || "''"}) and a.path @> t.path
  ;

-- 4. recount
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select id from m_recount where id in (select id from areas));

commit;
`;
fs.writeFileSync("supabase/migrations/0221_merge_same_place_area_pairs.sql", sql);
fs.mkdirSync("audits/area-pairs-2026-09-26", { recursive: true });
fs.writeFileSync("audits/area-pairs-2026-09-26/rollback.json", JSON.stringify({
  taken: new Date().toISOString(), pairs: PAIRS.map(([i, keep, drop, how, why]) => ({ pair: i, keep, drop, how, why })),
  merges: merges.map(m => ({ ...m, keep_row: R[m.keep], drop_row: R[m.drop] })), moves, reparented_children: kids, areas: areaRows,
  fold: { ops: B.ops, deleted_area_rows: bDelRows, merged_route_rows: bMerge.length ? await rows("routes", bMerge.flatMap(m => [m.keep, m.drop])) : [] },
}, null, 1));
fs.writeFileSync(J + "m0221.json", JSON.stringify({ merges, moves, reparents, dropAreas, kids: kids.map(k => k.id) }, null, 1));
console.log("merges", merges.length, "moves", moves.length, "reparent kids", kids.length, "drop areas", dropAreas.length);
for (const m of merges) console.log(` #${m.i} ${R[m.keep].name} (${R[m.keep].grade}) <= ${R[m.drop].name} (${R[m.drop].grade})`);
for (const m of moves) console.log(` move #${m.i} ${R[m.id].name} ${m.from} -> ${m.to}`);
