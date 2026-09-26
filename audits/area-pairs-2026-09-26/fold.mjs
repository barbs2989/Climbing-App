// Plan the FOLD of every remaining same-name area pair into ONE area (user: "fold into 1 area, same
// for everything else, i don't want duplicates"). Simulates in memory on top of 0221 part A, then
// writes $J/fold.json (ops) and $J/fold-log.txt (every decision, for reading).
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers } from "../../scripts/lib/supabase-env.mjs";
import { searchCanon } from "../../lib/search.js";
const key = requireServiceKey();
const get = async p => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(key) }); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); };
const J = process.env.CLAUDE_JOB_DIR + "/tmp/";
const P = JSON.parse(fs.readFileSync(J + "pairs.json", "utf8"));
const V = [0, 1, 2, 3].flatMap(n => JSON.parse(fs.readFileSync(J + "verdict" + n + ".json", "utf8")));
const A = JSON.parse(fs.readFileSync(J + "m0221.json", "utf8"));
const raw = fs.readFileSync(J + "sub.out", "utf8"); const rows = JSON.parse(raw.slice(raw.indexOf("{"))).rows;
const log = []; const L = s => log.push(s);

// ── state ──
const chunk = (a, n) => a.reduce((o, x, j) => (j % n ? o[o.length - 1].push(x) : o.push([x]), o), []);
const area = new Map(rows.map(r => [r.id, { ...r }]));
for (const c of chunk([...area.keys()], 80)) for (const r of await get(`areas?select=id,name,parent_id,path&parent_id=in.(${c.map(encodeURIComponent).join(",")})`))
  if (!area.has(r.id)) area.set(r.id, { ...r, ext: true, k: null, c: null });
const kids = id => [...area.values()].filter(a => a.parent_id === id);
const leafIds = [...area.keys()].filter(id => !area.get(id).ext && kids(id).length === 0);
const routes = new Map();   // id -> route
for (const c of chunk(leafIds, 80)) for (const r of await get(`routes?select=id,name,area_id,discipline,grade,fa&area_id=in.(${c.map(encodeURIComponent).join(",")})`)) routes.set(r.id, r);
const rin = id => [...routes.values()].filter(r => r.area_id === id);
const rk = n => { const t = String(n ?? "").trim(); const b = searchCanon(t).split(" ").filter(w => w && w !== "the").join(" ") || t.toLowerCase();
  return b + "|" + (t.match(/[\s'’′"+?!\[\]-]*$/) || [""])[0].replace(/\s/g, "").replace(/[’′]/g, "'"); };
const STOP = new Set(["the", "mount", "mountain", "mountains", "peak", "peaks", "area", "areas", "climbing", "climbs", "crag", "crags", "ice", "route", "via", "and", "of",
  "bouldering", "boulders", "mixed", "problems"]);
const ckey = n => { const c = searchCanon(n); return c.split(" ").filter(w => w && !STOP.has(w)).join(" ") || c; };
for (const a of area.values()) if (!a.ext) a.k = ckey(a.name);   // the WIDER key: "X Bouldering" is X
const fam = r => /ice|mixed/i.test(r.discipline || "") || /^(WI|AI|M)\d/.test(r.grade || "") ? "ice" : /boulder/i.test(r.discipline || "") || /^V[\d-]/.test(r.grade || "") ? "boulder" : "rock";
const PLACEHOLDER = /^(unknown|unnamed|name unknown|no name|project|open project|\?)/i;
const subtreeRoutes = id => { const out = [], st = [id]; while (st.length) { const x = st.pop(); out.push(...rin(x)); st.push(...kids(x).map(k => k.id)); } return out; };
const domFam = id => { const c = {}; for (const r of subtreeRoutes(id)) c[fam(r)] = (c[fam(r)] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; };
const LABEL = { ice: "Ice Climbs", boulder: "Bouldering", rock: "Routes" };
const LABELS = new Set([...Object.values(LABEL), "Other Climbs"]);

// ── part A (0221 as verified) applied in memory ──
for (const m of A.merges) routes.delete(m.drop);
for (const m of A.moves) if (routes.has(m.id)) routes.get(m.id).area_id = m.to;
for (const r of A.reparents) for (const k of kids(r.from)) k.parent_id = r.to;
for (const d of A.dropAreas) area.delete(d.id);

// ── ops ──
const ops = [];
const touched = new Set(), emptied = new Set();
const setParent = (id, to, why) => { const a = area.get(id); emptied.add(a.parent_id); ops.push({ t: "parent", id, to, from: a.parent_id }); a.parent_id = to; touched.add(id); L(`    parent ${id} -> ${to}${why ? "  (" + why + ")" : ""}`); };
const relabelled = new Set();
const rename = (id, name, isLabel) => { const a = area.get(id); if (a.name === name) return; if (isLabel) relabelled.add(id); ops.push({ t: "rename", id, name, was: a.name }); L(`    rename ${id} "${a.name}" -> "${name}"`); a.name = name; a.k = ckey(name); a.c = searchCanon(name); };
const delArea = id => { const a = area.get(id); ops.push({ t: "delete", id }); emptied.add(a.parent_id); area.delete(id); L(`    delete ${id}`); };
const mergeRoute = (keep, drop) => { ops.push({ t: "merge", keep: keep.id, drop: drop.id }); routes.delete(drop.id); L(`    merge  ${drop.name} (${drop.grade}) into ${keep.id} (${keep.grade})`); };
const moveRoute = (r, to, note) => { ops.push({ t: "move", id: r.id, from: r.area_id, to }); touched.add(r.area_id); r.area_id = to; touched.add(to); if (note) L(`    keep both: ${r.name} (${r.grade}) — ${note}`); };

function leafMerge(K, D) {
  for (const r of rin(D)) {
    const same = rin(K).filter(x => rk(x.name) === rk(r.name));
    const m = same.find(x => fam(x) === fam(r));
    if (m && (!PLACEHOLDER.test(r.name.trim()) || m.grade === r.grade)) mergeRoute(m, r);
    else moveRoute(r, K, same.length ? (m ? "placeholder name" : `different climb: ${same.map(x => x.grade).join("/")} vs ${r.grade}`) : "");
  }
}
function place(X, Pid) {       // make area X a child of non-leaf (or empty) Pid, folding into a same-named child
  const p = area.get(Pid), x = area.get(X);
  const twin = kids(Pid).find(c => c.id !== X && c.k === x.k);
  if (twin) return fold(twin.id, X);
  if (x.c === p.c) {
    const f = domFam(X), label = p.name.replace(/^(.*), The$/, "The $1") + " " + (f === domFam(Pid) ? "Other Climbs" : LABEL[f || "rock"]);
    const t2 = kids(Pid).find(c => c.id !== X && c.k === ckey(label));
    rename(X, label, true);
    if (t2) return fold(t2.id, X);
  }
  if (x.parent_id !== Pid) setParent(X, Pid);
}
function fold(K, D) {
  const k = area.get(K), d = area.get(D);
  if (!k || !d || K === D) return;
  L(`  fold ${D} "${d.name}" into ${K} "${k.name}"`);
  const kl = kids(K).length === 0, dl = kids(D).length === 0, kEmpty = kl && rin(K).length === 0;
  if (kEmpty && !dl) { for (const c of kids(D)) place(c.id, K); delArea(D); return; }
  if (!kl && !dl) { for (const c of kids(D)) place(c.id, K); delArea(D); return; }
  if (!kl && dl) { place(D, K); return; }
  if (kl && !dl) {               // keep K's place in the tree, but D is the one with structure
    const kname = k.name; setParent(D, k.parent_id, "takes the kept area's place"); if (MARK.test(d.name)) rename(D, kname);
    place(K, D); return;
  }
  leafMerge(K, D); delArea(D);
}
// keeper: the side NOT in a discipline tree (bouldering / ice / mixed / removed), else the bigger
const anc = id => { const out = []; let a = area.get(id); while (a && a.parent_id) { a = area.get(a.parent_id); if (a) out.push(a); } return out; };
const MARK = /bouldering|boulders|\bice\b|mixed|removed/i;
const marked = (id, other) => { const oa = new Set(anc(other).map(a => a.id)); return MARK.test(area.get(id).name) || anc(id).some(a => !oa.has(a.id) && MARK.test(a.name)); };
const HELD_MERGE = new Set([120, 75, 212, 214, 215, 128]);
const SUF = JSON.parse(fs.readFileSync(J + "suffix-pairs.json", "utf8"));
const depth = x => (area.get(x)?.path || "").split(".").length;
const todo = [
  ...V.filter(v => v.verdict === "DISCIPLINE_TREE" || v.verdict === "UNSURE" || HELD_MERGE.has(v.i)).map(v => ({ xid: P[v.i].xid, yid: P[v.i].yid, st: P[v.i].st, tag: "#" + v.i })),
  ...SUF,
].sort((a, b) => Math.min(depth(a.xid), depth(a.yid)) - Math.min(depth(b.xid), depth(b.yid)));
let done = 0, skipped = [];
for (const T of todo) { const i = T.tag;
  // a side already relabelled ("Ice Climbs") under its twin stands for that twin
  const rep = id => { const a = area.get(id); return a && relabelled.has(id) && a.parent_id && area.get(a.parent_id) ? a.parent_id : id; };
  const xid = rep(T.xid), yid = rep(T.yid);
  if (xid === yid) { skipped.push(`${i} (already one area)`); continue; }
  if (!area.get(xid) || !area.get(yid)) { skipped.push(`${i} (one side already folded/deleted)`); continue; }
  if (anc(xid).some(a => a.id === yid) || anc(yid).some(a => a.id === xid)) { skipped.push(`${i} (now nested)`); continue; }
  const mx = marked(xid, yid), my = marked(yid, xid);
  const bigger = subtreeRoutes(xid).length >= subtreeRoutes(yid).length ? xid : yid;
  const K = mx !== my ? (mx ? yid : xid) : bigger, D = K === xid ? yid : xid;
  L(`${i} ${T.st} keep ${K} [${anc(K).map(a => a.name).reverse().slice(1).join(" › ")}]`);
  fold(K, D); done++;
}
// walk up: areas this emptied (had content before) are deleted
let n; do { n = 0; for (const id of [...emptied]) { const a = area.get(id); if (a && !a.ext && a.path.split(".").length > 2 && !kids(id).length && !rin(id).length) { L(`  emptied: ${id} "${a.name}"`); delArea(id); n++; } emptied.delete(id); } } while (n);
fs.writeFileSync(J + "fold.json", JSON.stringify({ ops, touched: [...touched] }, null, 1));
fs.writeFileSync(J + "fold-log.txt", log.join("\n") + "\n\nSKIPPED:\n" + skipped.join("\n") + "\n");
const c = {}; for (const o of ops) c[o.t] = (c[o.t] || 0) + 1;
console.log("pairs folded", done, "skipped", skipped.length, c, "keep-both", log.filter(l => l.includes("keep both")).length);
