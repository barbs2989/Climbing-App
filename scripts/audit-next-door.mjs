// audit-next-door.mjs — are the climbs NEXT DOOR right? (owner note: "Are routes next door correct? Audit all")
//
// A crag climb's page shows NEXT DOOR (src/components/WallNeighbours.tsx): the climbs either side of it on the
// wall, by `routes.sort_order`, over the area's own non-boulder rows. Every sort_order came from Mountain
// Project's left-to-right index (`data-lr` on an MP area page's route table), written by
// scripts/pipeline/order-from-mp.mjs. This audit re-reads those same cached pages and asks, for every area that
// draws NEXT DOOR, whether what the card shows still agrees with them:
//
//   TIE        two climbs on one wall share a position — which one is "next door" is arbitrary
//   ORDER      ours and MP's left-to-right disagree (climbs outside the longest run they agree on)
//   FOREIGN    a climb's position is a place on ANOTHER MP wall: it was ordered there and later moved here
//   MP-UNPLACED  MP lists the climb but places it nowhere (data-lr 999999), yet ours gives it a position
//   DUPLICATE  the same climb twice on the wall (one name), so NEXT DOOR can point at a copy of itself
//   NO-SOURCE  the area has positions but no wall-order run wrote it (nothing to check against)
//   SPLIT      the area's positions came from two different MP walls (two walls have no one left-to-right)
//
//   node scripts/audit-next-door.mjs [--refresh] [--json out.json] [--state wa]
//
// MP_DIRS (default ~/dev/mp-fresh:~/dev/mp-data/_mp) holds _pages, _map and _order from the ordering runs;
// the LATER directory wins where both wrote the same area. The database read is cached in
// $TMPDIR/next-door-routes.json; --refresh reads it again (service key, keyset paged, ~170 pages).
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { selectAll, requireServiceKey } from "./lib/supabase-env.mjs";
import { stripRouteTopoLabel } from "./lib/route-topo-label.mjs";

const arg = k => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const DIRS = (process.env.MP_DIRS || `${homedir()}/dev/mp-data/_mp:${homedir()}/dev/mp-fresh`).split(":"); // oldest first
const CACHE = arg("cache") || join(process.env.CLAUDE_JOB_DIR ? process.env.CLAUDE_JOB_DIR + "/tmp" : tmpdir(), "next-door-routes.json");
const STATE = arg("state");

const unent = s => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
// The same table reader and name key order-from-mp.mjs used, so a disagreement is the data's, not the parser's.
export function mpRows(html) {
  const table = html.split('id="left-nav-route-table"')[1]?.split("</table>")[0] || "";
  return table.split("<tr ").slice(1).map(row => {
    const lr = row.match(/data-lr="(-?\d+)"/), a = row.match(/route\/(\d+)\/[^"]*">([^<]*)<\/a>\s*<span class="route-type ([^"]*)">/);
    return lr && a ? { lr: +lr[1], mpId: a[1], name: unent(a[2]).replace(/\s*\|\s*\d+$/, "") } : null;
  }).filter(Boolean).sort((x, y) => x.lr - y.lr);
}
export const key = s => String(stripRouteTopoLabel(s || "")).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9']+/g, " ").split(" ").filter(w => w && w !== "the").join(" ").replace(/'/g, "");

// ── what the ordering runs wrote: area -> MP wall, and every MP id -> our id ──
const wallOf = new Map(), wallsOf = new Map(), ourOfMp = new Map(), pageDir = new Map();
for (const dir of DIRS) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(join(dir, "_order")).filter(f => f.endsWith(".jsonl") && !f.includes(".dry"))) {
    for (const l of readFileSync(join(dir, "_order", f), "utf8").split("\n")) {
      if (!l) continue; let x; try { x = JSON.parse(l); } catch { continue; }
      if (x.status !== "written" || !x.area) continue;
      wallOf.set(x.area, x.mp);
      (wallsOf.get(x.area) || wallsOf.set(x.area, new Set()).get(x.area)).add(x.mp);
    }
  }
  for (const f of readdirSync(join(dir, "_map"))) Object.entries(JSON.parse(readFileSync(join(dir, "_map", f), "utf8"))).forEach(([m, id]) => ourOfMp.set(m, id));
  for (const f of readdirSync(join(dir, "_order")).filter(f => f.endsWith(".adds.json"))) Object.entries(JSON.parse(readFileSync(join(dir, "_order", f), "utf8"))).forEach(([m, id]) => ourOfMp.set(m, id));
  for (const f of readdirSync(join(dir, "_pages"))) pageDir.set(f.replace(/\.html$/, ""), dir);
}
const mpOfOur = new Map(); for (const [m, id] of ourOfMp) mpOfOur.set(id, m);
const pageCache = new Map();
const page = mp => { if (pageCache.has(mp)) return pageCache.get(mp); const d = pageDir.get(mp); const r = d ? mpRows(readFileSync(join(d, "_pages", mp + ".html"), "utf8")) : null; pageCache.set(mp, r); return r; };

// ── the database: every climb with a position ──
// A wall whose order a climber corrected (wall_order suggestion, approved on the Review desk, 0485) is ordered by
// that climber, not by MP: it is checked for ties and duplicates only.
let rows, climberOrdered, unplacedRows;
if (!process.argv.includes("--refresh") && existsSync(CACHE)) ({ rows, climberOrdered, unplacedRows } = JSON.parse(readFileSync(CACHE, "utf8")));
else {
  const k = requireServiceKey();
  rows = await selectAll("routes", "id,area_id,name,discipline,sort_order", "sort_order=not.is.null&or=(discipline.is.null,discipline.neq.bouldering)", { key: k, pageSize: 1000 });
  // The climbs WITHOUT a position, for GAP: only the areas that draw NEXT DOOR need them, but routes cannot be
  // filtered by "area has a placed climb" in PostgREST, so every unplaced roped row is read and filtered here.
  unplacedRows = await selectAll("routes", "id,area_id,name,discipline", "sort_order=is.null&discipline=in.(sport,trad,toprope,aid)", { key: k, pageSize: 1000 });
  climberOrdered = (await selectAll("contributions", "id,area_id", "kind=eq.wall_order&status=eq.approved", { key: k, pageSize: 1000 })).map(c => c.area_id);
  writeFileSync(CACHE, JSON.stringify({ rows, climberOrdered, unplacedRows }));
}
const byClimber = new Set(climberOrdered);
const unplacedBy = new Map(); for (const r of unplacedRows || []) (unplacedBy.get(r.area_id) || unplacedBy.set(r.area_id, []).get(r.area_id)).push(r);
if (STATE) rows = rows.filter(r => r.id.startsWith(STATE + "_"));
const byArea = new Map(); for (const r of rows) (byArea.get(r.area_id) || byArea.set(r.area_id, []).get(r.area_id)).push(r);

// Which logged wall an MP id sits on, for FOREIGN: only walls a run wrote into one of our areas.
const wallOfMpRoute = new Map(), areaOfWall = new Map();
for (const [area, mp] of wallOf) { areaOfWall.set(mp, area); for (const m of page(mp) || []) wallOfMpRoute.set(m.mpId, mp); }

// Longest increasing subsequence of positions: the climbs that agree with MP's order; the rest are ORDER.
function lisKeep(seq) {
  const tails = [], prev = new Array(seq.length), idx = [];
  seq.forEach((v, i) => { let lo = 0, hi = tails.length; while (lo < hi) { const m = (lo + hi) >> 1; if (seq[tails[m]] < v) lo = m + 1; else hi = m; } prev[i] = lo ? tails[lo - 1] : -1; tails[lo] = i; });
  for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) idx.push(i);
  return new Set(idx);
}

const out = { areas: 0, shown: 0, pairs: 0, badPairs: 0, find: { TIE: [], ORDER: [], FOREIGN: [], "MP-UNPLACED": [], DUPLICATE: [], "NO-SOURCE": [], SPLIT: [], GAP: [] } };
for (const [area, list] of byArea) {
  if (list.length < 2) continue; // WallNeighbours draws nothing for a lone placed climb
  out.areas++; out.shown += list.length;
  const placed = list.slice().sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const bad = new Set(); // ids whose card is wrong on at least one side
  // TIE
  const bySo = new Map(); for (const r of placed) (bySo.get(r.sort_order) || bySo.set(r.sort_order, []).get(r.sort_order)).push(r);
  for (const [so, t] of bySo) if (t.length > 1) { out.find.TIE.push({ area, sort_order: so, ids: t.map(r => r.id) }); t.forEach(r => bad.add(r.id)); }
  // DUPLICATE
  const byKey = new Map(); for (const r of placed) (byKey.get(key(r.name)) || byKey.set(key(r.name), []).get(key(r.name))).push(r);
  const walls = wallsOf.get(area);
  if (walls && walls.size > 1) out.find.SPLIT.push({ area, walls: [...walls] });
  const mp = wallOf.has(area) ? page(wallOf.get(area)) : null;
  // DUPLICATE only when ours holds the name MORE times than MP lists it: MP has walls with two "Unknown" or two
  // "5.7+" climbs, and those are two climbs. Each copy carries its MP id where the import kept one.
  for (const [kk, t] of byKey) if (t.length > 1) { const onMp = mp ? mp.filter(m => key(m.name) === kk).length : null; if (onMp == null || t.length > onMp) out.find.DUPLICATE.push({ area, name: t[0].name, onMp, ids: t.map(r => r.id + "@" + r.sort_order + (mpOfOur.has(r.id) ? "#mp" + mpOfOur.get(r.id) : "")) }); }
  if (byClimber.has(area)) { /* ordered by a climber: nothing of MP's to compare */ }
  else if (!mp) { out.find["NO-SOURCE"].push({ area, n: placed.length, ids: placed.slice(0, 4).map(r => r.id) }); }
  else {
    const mine = new Map(placed.map(r => [r.id, r]));
    const nameIx = new Map(); for (const r of placed) { const kk = key(r.name); nameIx.set(kk, nameIx.has(kk) ? null : r); }
    const taken = new Set(), seq = [], mpKeyN = new Map(), lrOf = new Map(), gapAt = [];
    for (const m of mp) mpKeyN.set(key(m.name), (mpKeyN.get(key(m.name)) || 0) + 1);
    // By MP id first; by name only when MP lists that name ONCE on the wall (Hassler Crag has two "Project"s).
    for (const m of mp) if (ourOfMp.has(m.mpId) && mine.has(ourOfMp.get(m.mpId))) taken.add(ourOfMp.get(m.mpId));
    const idTaken = new Set(taken); taken.clear();
    for (const m of mp) {
      let r = mine.get(ourOfMp.get(m.mpId)); if (!r && mpKeyN.get(key(m.name)) === 1) { const c = nameIx.get(key(m.name)); if (c && !idTaken.has(c.id) && !taken.has(c.id)) r = c; }
      if (!r && m.lr < 999999) {
        // GAP: MP places this climb on the wall, we hold it in this area WITHOUT a position, so NEXT DOOR steps over it.
        const u = (unplacedBy.get(area) || []).find(x => x.id === ourOfMp.get(m.mpId)) || (mpKeyN.get(key(m.name)) === 1 ? (unplacedBy.get(area) || []).find(x => key(x.name) === key(m.name)) : null);
        if (u) { out.find.GAP.push({ area, id: u.id, name: u.name, mpLr: m.lr, mpWall: wallOf.get(area) }); gapAt.push(m.lr); }
      }
      if (!r || taken.has(r.id)) continue; taken.add(r.id); lrOf.set(r.id, m.lr);
      if (m.lr >= 999999) { out.find["MP-UNPLACED"].push({ area, id: r.id, name: r.name, sort_order: r.sort_order }); bad.add(r.id); continue; }
      seq.push(r);
    }
    out.compared = (out.compared || 0) + 1; out.matched = (out.matched || 0) + seq.length; out.unmatched = (out.unmatched || 0) + placed.length - taken.size;
    // a pair of placed neighbours with a GAP climb between them on MP is a wrong pair
    for (let i = 0; i + 1 < placed.length; i++) { const a = lrOf.get(placed[i].id), b = lrOf.get(placed[i + 1].id); if (a != null && b != null && gapAt.some(g => g > Math.min(a, b) && g < Math.max(a, b))) out.gapPairs = (out.gapPairs || 0) + 1; }
    const keep = lisKeep(seq.map(r => r.sort_order));
    seq.forEach((r, i) => { if (!keep.has(i)) { out.find.ORDER.push({ area, id: r.id, name: r.name, sort_order: r.sort_order, mpRank: i + 1 }); bad.add(r.id); } });
    for (const r of placed) if (!taken.has(r.id)) {
      const m = mpOfOur.get(r.id), w = m && wallOfMpRoute.get(m);
      if (w && w !== wallOf.get(area)) { out.find.FOREIGN.push({ area, id: r.id, name: r.name, sort_order: r.sort_order, mpWall: w, wallArea: areaOfWall.get(w) }); bad.add(r.id); }
      else (out.unlisted || (out.unlisted = [])).push({ area, mpWall: wallOf.get(area), id: r.id, name: r.name, sort_order: r.sort_order, mpId: m || null, left: placed[placed.indexOf(r) - 1]?.name || null, right: placed[placed.indexOf(r) + 1]?.name || null });
    }
  }
  for (let i = 0; i + 1 < placed.length; i++) { out.pairs++; if (bad.has(placed[i].id) || bad.has(placed[i + 1].id)) out.badPairs++; }
}
const tally = Object.fromEntries(Object.entries(out.find).map(([k, v]) => [k, v.length]));
console.log(`NEXT DOOR audit${STATE ? " (" + STATE + ")" : ""}: ${out.areas} walls draw it, ${out.shown} climbs, ${out.pairs} left/right pairs; ${out.badPairs} pairs touch a finding`);
console.log(`GAP: ${out.find.GAP.length} climbs MP places that we hold unplaced on the wall; ${out.gapPairs || 0} left/right pairs step over one`);
console.log(`checked against MP: ${out.compared || 0} walls, ${out.matched || 0} climbs matched to MP's row; ${out.unmatched || 0} placed climbs MP does not list (anchored from OpenBeta's copy, or later adds); ${byClimber.size} walls ordered by a climber`);
console.log(tally);
for (const [k, v] of Object.entries(out.find)) for (const x of v.slice(0, 5)) console.log(" ", k.padEnd(11), JSON.stringify(x));
if (arg("json")) writeFileSync(arg("json"), JSON.stringify(out, null, 1));
