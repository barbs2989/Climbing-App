// order-from-mp.mjs — fill `routes.sort_order` (left-to-right on the wall) for ONE of our areas from the
// Mountain Project area page it corresponds to. Run under the owner's written permission from onX to
// crawl mountainproject.com (2026-09-24), paced by scripts/lib/paced-fetch.mjs.
//
// An MP area page's route table carries each route's left-to-right index as `data-lr` (999999 = not
// placed). The cached tree walk (catalog/_mp/_tree) kept the table's rows but not that attribute, so the
// page is read again.
//
//   node scripts/pipeline/order-from-mp.mjs --area ny_a1_the_uberfall_left --mp 107037539 [--state new_york] [--apply]
//
// Without --apply it prints the plan and writes nothing. The plan, per route:
//   MATCHED   MP's route is ours — by the import's exact MP-id map (catalog/_mp/_map/<state>.json), else by
//             name on this wall. It takes MP's position.
//   ADD       MP lists a sport / trad / top-rope route this wall lacks: it is added (grade and type from the
//             page), in MP's position. A name contained in, or containing, one of our routes NOT already
//             matched to another MP route is REVIEW instead — it may be ours under another spelling.
//   ANCHORED  ours, not on MP, but OpenBeta's older copy of MP's order places it: it goes directly right of
//             its nearest left-hand neighbour there that MP still places.
//   UNPLACED  nobody places it: sort_order stays empty, and the app lists it last, by name.
// Positions are then renumbered 1..n along the wall, so "#n in this area" reads as a count.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { mpGet } from "../lib/paced-fetch.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const arg = k => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const AREA = arg("area"), MP = arg("mp"), STATE = arg("state"), APPLY = process.argv.includes("--apply");
if (!AREA || !MP) { console.error("usage: --area <our area id> --mp <MP area id> [--state <mp state slug>] [--apply]"); process.exit(1); }
const DIR = "catalog/_mp", PAGES = DIR + "/_pages", MAPS = (process.env.MP_DIR || DIR) + "/_map";
mkdirSync(PAGES, { recursive: true });

const unent = s => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
// The route table, in left-to-right order. Each row: data-lr, the route link, its type tags, its YDS grade.
export function mpRows(html) {
  const table = html.split('id="left-nav-route-table"')[1]?.split("</table>")[0] || "";
  return table.split("<tr ").slice(1).map(row => {
    const lr = row.match(/data-lr="(-?\d+)"/), a = row.match(/route\/(\d+)\/[^"]*">([^<]*)<\/a>\s*<span class="route-type ([^"]*)">/);
    const yds = row.match(/class='rateYDS'>([^<]+)</);
    return lr && a ? { lr: +lr[1], mpId: a[1], name: unent(a[2]), tags: a[3].trim().split(/\s+/), yds: yds ? unent(yds[1]) : null } : null;
  }).filter(Boolean).sort((x, y) => x.lr - y.lr);
}
// A name as a key: case, accents, punctuation and a leading/trailing "The" do not count ("Brat, The" = "The Brat").
const key = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9']+/g, " ").split(" ").filter(w => w && w !== "the").join(" ").replace(/'/g, "");
const loose = s => key(s).replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const PLACED = r => r.lr < 999999;

const k = requireServiceKey();
const rest = async (p, init) => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { ...init, headers: headers(k, { "Content-Type": "application/json", ...init?.headers }) }); const t = await r.text(); if (!r.ok) throw new Error(p + ": HTTP " + r.status + " " + t); return t ? JSON.parse(t) : null; };

// 1. MP's page (cached, so a re-run asks nothing).
const pf = `${PAGES}/${MP}.html`;
let html;
if (existsSync(pf)) html = readFileSync(pf, "utf8");
else { const r = await mpGet(`https://www.mountainproject.com/area/${MP}`); if (r.status !== 200) throw new Error(`MP area ${MP}: HTTP ${r.status}`); html = r.body; writeFileSync(pf, html); }
const mp = mpRows(html);
if (!mp.length) throw new Error(`MP area ${MP}: no route table — a parent area, or the page changed`);

// 2. Ours.
const [area] = await rest(`areas?select=id,name,lat,lng&id=eq.${encodeURIComponent(AREA)}`);
if (!area) throw new Error("no area " + AREA);
const ours = await rest(`routes?select=id,name,discipline,grade,sort_order&area_id=eq.${encodeURIComponent(AREA)}`);
const idMap = STATE && existsSync(`${MAPS}/${STATE}.json`) ? JSON.parse(readFileSync(`${MAPS}/${STATE}.json`, "utf8")) : {};

// 3. Match.
const byId = new Map(ours.map(r => [r.id, r])), byKey = new Map();
for (const r of ours) { const kk = key(r.name); if (!byKey.has(kk)) byKey.set(kk, []); byKey.get(kk).push(r); }
const taken = new Set(), plan = [];
for (const m of mp) {
  let r = idMap[m.mpId] && byId.get(idMap[m.mpId]);
  let how = r ? "id" : null;
  if (!r) { const c = (byKey.get(key(m.name)) || []).filter(x => !taken.has(x.id)); if (c.length === 1) { r = c[0]; how = "name"; } }
  if (r && !taken.has(r.id)) { taken.add(r.id); plan.push({ ...m, kind: "MATCHED", how, ours: r }); }
  else plan.push({ ...m, kind: "MISSING" });
}
const ROPED = t => t.includes("Trad") || t.includes("Sport") || t.includes("TR") || t.includes("Toprope");
const usedIds = new Set(ours.map(r => r.id));
for (const p of plan.filter(p => p.kind === "MISSING")) {
  if (!ROPED(p.tags) || !p.yds) { p.kind = "SKIP"; p.why = !ROPED(p.tags) ? "not sport, trad or top rope" : "no YDS grade on the page"; continue; }
  const nn = loose(p.name);
  const near = ours.find(r => !taken.has(r.id) && nn.length >= 4 && loose(r.name).length >= 4 && (loose(r.name).includes(nn) || nn.includes(loose(r.name))));
  if (near) { p.kind = "REVIEW"; p.why = "may be our " + JSON.stringify(near.name); continue; }
  const disc = p.tags.includes("Trad") ? "trad" : p.tags.includes("Sport") ? "sport" : "toprope";
  let id = AREA + "_" + slug(p.name), n = 2; while (usedIds.has(id)) id = AREA + "_" + slug(p.name) + "_" + n++; usedIds.add(id);
  const disciplines = [...new Set([disc, ...(p.tags.includes("Trad") ? ["trad"] : []), ...(p.tags.includes("Sport") ? ["sport"] : []), ...(p.tags.includes("TR") || p.tags.includes("Toprope") ? ["toprope"] : [])])];
  p.kind = "ADD"; p.row = { id, area_id: AREA, name: p.name, discipline: disc, grade: p.yds, grade_system: "yds", grade_num: gradeNumFrom(p.yds, "yds"), pitches: 0, disciplines, auto_generated: false };
}

// 4. Ours that MP does not list: anchor by OpenBeta's older copy of MP's order, when it has one.
const extra = ours.filter(r => !taken.has(r.id));
let ob = [];
if (extra.length) {
  const q = `{ areas(filter:{area_name:{match:${JSON.stringify(area.name)}}}) { areaName metadata{lat lng} climbs { name metadata{leftRightIndex} } } }`;
  const j = await (await fetch("https://api.openbeta.io/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) })).json();
  const mpKeys = new Set(mp.map(m => key(m.name)));
  const best = (j.data?.areas || []).map(a => ({ a, hit: a.climbs.filter(c => mpKeys.has(key(c.name))).length })).sort((x, y) => y.hit - x.hit)[0];
  if (best && best.hit >= 3) ob = best.a.climbs.filter(c => c.metadata.leftRightIndex < 999999).sort((x, y) => x.metadata.leftRightIndex - y.metadata.leftRightIndex);
}
const seq = plan.filter(p => PLACED(p) && (p.kind === "MATCHED" || p.kind === "ADD"));
const anchored = [], unplaced = [];
for (const r of extra) {
  const i = ob.findIndex(c => key(c.name) === key(r.name));
  let at = -1;
  for (let j = i - 1; i >= 0 && j >= 0 && at < 0; j--) at = seq.findIndex(s => key(s.name) === key(ob[j].name));
  if (i >= 0 && (at >= 0 || i === 0)) { anchored.push({ r, after: at >= 0 ? seq[at].name : "(left end)" }); seq.splice(at + 1, 0, { kind: "ANCHORED", name: r.name, ours: r }); }
  else unplaced.push(r);
}

// 5. Report, and write when asked.
const pos = new Map(); seq.forEach((s, i) => pos.set(s.ours ? s.ours.id : s.row.id, i + 1));
console.log(`${area.name} (${AREA})  <-  MP area ${MP}: ${mp.length} MP routes (${mp.filter(PLACED).length} placed), ${ours.length} ours`);
for (const s of seq) console.log(String(pos.get(s.ours ? s.ours.id : s.row.id)).padStart(3), s.kind.padEnd(8), s.name, s.kind === "MATCHED" ? `(by ${s.how})` : s.kind === "ADD" ? `[new ${s.row.discipline} ${s.row.grade}]` : "");
for (const p of plan.filter(p => !PLACED(p) && (p.kind === "MATCHED" || p.kind === "ADD"))) console.log("  -", p.kind.padEnd(8), p.name, "(MP does not place it)");
for (const a of anchored) console.log("  ANCHORED", a.r.name, "-> right of", a.after);
for (const r of unplaced) console.log("  UNPLACED", r.name, "(ours; neither MP nor OpenBeta places it)");
for (const p of plan.filter(p => p.kind === "REVIEW" || p.kind === "SKIP")) console.log("  " + p.kind.padEnd(8), p.name, "—", p.why);
const writes = ours.filter(r => (pos.get(r.id) ?? null) !== r.sort_order);
console.log(`\nplan: ${plan.filter(p => p.kind === "ADD").length} to add, ${writes.length} sort_order changes, ${plan.filter(p => p.kind === "REVIEW").length} for review`);
if (!APPLY) { console.log("dry run — nothing written (pass --apply)"); process.exit(0); }

const adds = plan.filter(p => p.kind === "ADD").map(p => ({ ...p.row, sort_order: pos.get(p.row.id) ?? null }));
if (adds.length) {
  const got = await rest("routes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(adds) });
  if (got.length !== adds.length) throw new Error(`added ${got.length} of ${adds.length}`);
}
for (const r of writes) await patchRow("routes", r.id, { sort_order: pos.get(r.id) ?? null });
// Read back: a 200 is not evidence the data changed.
const after = await rest(`routes?select=id,sort_order&area_id=eq.${encodeURIComponent(AREA)}`);
const want = new Map([...ours.map(r => [r.id, pos.get(r.id) ?? null]), ...adds.map(a => [a.id, a.sort_order])]);
const bad = after.filter(r => want.has(r.id) && want.get(r.id) !== r.sort_order);
console.log(`written: ${adds.length} added, ${writes.length} re-ordered; read back ${after.length} rows, ${bad.length} disagree`);
if (bad.length) { console.log(bad); process.exit(1); }
