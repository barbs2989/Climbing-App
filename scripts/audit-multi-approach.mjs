#!/usr/bin/env node
// Which routes can be reached more than ONE way, and does the row say so?
//
// A route row stores one trailhead, one track, one camp list and one set of gain/distance/time.
// Mount Shuksan's Southeast Ridge is a summit-pyramid FINISH reached by the Sulphide Glacier OR the
// Fisher Chimneys, from two different trailheads, and the row described only the Sulphide while its
// own prose named Lake Ann — so every number on the page silently belonged to one way in. The route
// page can now switch approaches (lib/approaches.js), but only where an approach is LINKED: a variant
// carrying `viaRouteId` (a sibling route that IS the way in) or `trip` (its own trailhead/track/stats).
// This lists the rows where the catalog itself says there is more than one way in and the row
// cannot yet be switched, plus links that no longer resolve.
//
// REPORT-ONLY. A signal is a reason to READ the row and research the climb, never a repair: two
// variants on 125 routes are mostly the same trailhead with a different gully, which is a card, not
// a second approach. What decides it is whether the ways in start from different trailheads or
// arrive by different routes — and that is research, not a regex.
//
//   node scripts/audit-multi-approach.mjs [--state wa] [--json out.json] [--all] [--researched]
//
// A row already READ and judged is not a lead: the WA research verdicts live in
// audits/<state>-multi-approach/ (2026-10-01-research.json, then the batch plans in scripts/oneoff/,
// then settled.json — later files win). A route judged SINGLE, or a ROW_CONTRADICTS row whose fix
// shipped, is counted on one line instead of listed (--researched lists them). DANGLING is never
// hidden, nor is a route researched as reachable more than one way that still cannot switch, nor any
// route no file has a verdict for — a NEW row, or one the research never reached, is what to read next.
//
// Signals (a row can carry several):
//   VARIANTS   ≥2 approach_variants and none of them switchable
//   PROSE      approach/overview/beta/road prose names an alternative approach, < 2 variants
//   OTHER_TH   prose names a trailhead the stored trailhead does not
//   FINISH     a sibling route on the same peak describes this route as its finish / alternative
//   NAME       the route's name says it is a combination ("via", "Variation", "Finish", "Direct")
//   DANGLING   a viaRouteId that does not resolve to any route in the state  (a DEFECT, not a lead)
import { selectAll } from "./lib/supabase-env.mjs";
import fs from "fs";

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STATE = arg("--state", "wa");
const JSON_OUT = arg("--json", null);
const ALL = args.includes("--all");
const SHOW_RESEARCHED = args.includes("--researched");

// Recorded verdicts, oldest first so a later pass overrides an earlier one.
const verdictOf = new Map();
const readJson = (u) => { try { return JSON.parse(fs.readFileSync(new URL(u, import.meta.url), "utf8")); } catch (e) { if (e.code === "ENOENT") return null; throw e; } };
for (const f of [`../audits/${STATE}-multi-approach/2026-10-01-research.json`, "./oneoff/link-multi-approach-batch2.plan.json", "./oneoff/link-multi-approach-batch3.plan.json"]) {
  const list = readJson(f);
  if (Array.isArray(list)) for (const x of list) if (x && x.id && x.verdict && x.id.startsWith(STATE + "_")) verdictOf.set(x.id, x.verdict);
}
for (const [id, v] of Object.entries(readJson(`../audits/${STATE}-multi-approach/settled.json`) || {})) if (!id.startsWith("_")) verdictOf.set(id, String(v.verdict || v));
const SETTLED = new Set(["SINGLE", "ROW_CONTRADICTS"]);

const COLS = "id,name,area_id,discipline,approach,approach_variants,approach_logistics,overview,beta,road,description,pitch_detail,descent_text";
// 300 a page: these are the catalog's widest prose columns, and 1,000 of them per read hit the
// anon role's 3s statement timeout once the table was busy (57014 on 2026-10-01).
const rows = await selectAll("routes", COLS, `id=like.${STATE}_*`, { pageSize: 300 });
if (!rows.length) { console.error(`no routes matched ${STATE}_* — wrong state, or the read failed`); process.exit(1); }

const byId = new Set(rows.map((x) => x.id));
const txt = (v) => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
const prose = (r) => [r.approach, r.overview, r.beta, r.description, txt(r.road)].map(txt).join("\n");
const ALT_RE = /\b(?:alternate|alternative|alternatively|another|second|longer|shorter|other)\s+(?:\w+\s+){0,3}approach(?:es)?\b|\bapproach(?:ed|es)?\s+(?:\w+\s+){0,3}(?:via|from)\s+(?:either|both)\b|\b(?:either|both)\s+(?:the\s+)?[\w'’ -]{2,40}?\s+(?:or|and)\s+(?:the\s+)?[\w'’ -]{2,40}?\s+(?:approach|trailhead|route)s?\b|\breached\s+(?:via|by|from)\s+(?:either|the\s+[\w'’ -]{2,40}?\s+or)\b|\btwo\s+(?:common\s+|main\s+|standard\s+)?approaches\b|\b(?:can|may)\s+(?:also\s+)?be\s+approached\s+(?:via|from)\b/i;
const TH_RE = /\b([A-Z][\w'’.]*(?:\s+[A-Z#][\w'’.#]*){0,4})\s+(?:Trailhead|TH)\b/g;
const norm = (s) => String(s || "").toLowerCase().replace(/\btrail\s*head\b|\bth\b|\btrail\b|#\d+|\(.*?\)|[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const NAME_RE = /\bvia\b|\bvariation\b|\bvar\.|\bfinish\b|\blink-?up\b/i;
const switchable = (v) => !!(v && (v.viaRouteId || (v.trip && typeof v.trip === "object")));

const byArea = new Map();
for (const r of rows) { if (!byArea.has(r.area_id)) byArea.set(r.area_id, []); byArea.get(r.area_id).push(r); }

const out = [];
for (const r of rows) {
  const vars = Array.isArray(r.approach_variants) ? r.approach_variants.filter(Boolean) : [];
  const linked = vars.filter(switchable);
  const sig = [];
  const ev = {};
  for (const v of vars) {
    if (!v.viaRouteId) continue;
    // A linked route may sit on ANOTHER peak (the Fury ridge traverse starts on East Fury's
    // summit); RouteDetail reads it by id. Dangling means it exists nowhere in the state.
    if (!byId.has(v.viaRouteId)) { sig.push("DANGLING"); ev.DANGLING = v.viaRouteId; }
  }
  if (!linked.length) {
    if (vars.length >= 2) { sig.push("VARIANTS"); ev.VARIANTS = vars.map((v) => v.name).join(" | ").slice(0, 160); }
    const p = prose(r);
    const m = p.match(ALT_RE);
    if (m && vars.length < 2) { sig.push("PROSE"); const i = Math.max(0, m.index - 60); ev.PROSE = p.slice(i, m.index + 100).replace(/\s+/g, " "); }
    const stored = norm(r.approach_logistics && r.approach_logistics.trailhead);
    if (stored) {
      const named = [...new Set([...p.matchAll(TH_RE)].map((x) => x[1]).filter((n) => !/^(The|A|This|That|Same|Main|Upper|Lower|Our)$/.test(n)))];
      const other = named.filter((n) => { const k = norm(n); return k && k.length > 3 && !stored.includes(k) && !k.includes(stored); });
      if (other.length) { sig.push("OTHER_TH"); ev.OTHER_TH = `stored "${r.approach_logistics.trailhead}" · prose ${other.slice(0, 3).join(", ")}`; }
    }
    const stem = String(r.name || "").replace(/\(.*?\)/g, "").trim().toLowerCase();
    if (stem.length >= 8) {
      const hit = (byArea.get(r.area_id) || []).find((s) => s.id !== r.id && [txt(s.pitch_detail), txt(s.beta), txt(s.descent_text)].join(" ").toLowerCase().includes(stem));
      if (hit) { sig.push("FINISH"); ev.FINISH = `named by ${hit.id}`; }
    }
    if (NAME_RE.test(r.name || "")) { sig.push("NAME"); ev.NAME = r.name; }
  }
  if (sig.length) out.push({ id: r.id, name: r.name, area: r.area_id, discipline: r.discipline, variants: vars.length, linked: linked.length, trailhead: (r.approach_logistics && r.approach_logistics.trailhead) || null, signals: sig, evidence: ev });
}

const ALPINE = new Set(["alpine", "mountaineering", "scrambling", "ice", "mixed", "hiking"]);
const score = (o) => (o.signals.includes("DANGLING") ? 100 : 0) + o.signals.length * 10 + (ALPINE.has(o.discipline) ? 5 : 0);
out.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
const isResearched = (o) => SETTLED.has(verdictOf.get(o.id)) && !o.signals.includes("DANGLING");
const researched = out.filter(isResearched);
const leads = SHOW_RESEARCHED ? researched : out.filter((o) => !isResearched(o));

const count = (s) => leads.filter((o) => o.signals.includes(s)).length;
const linkedRoutes = rows.filter((r) => (r.approach_variants || []).some(switchable)).length;
console.log(`audit:multi-approach — ${STATE}: ${rows.length} routes read, ${linkedRoutes} already switchable, ${SHOW_RESEARCHED ? researched.length + " already researched (listed)" : leads.length + " flagged to read"}`);
if (!SHOW_RESEARCHED) console.log(`  (${researched.length} more carry a signal but were researched and judged one way in — --researched lists them)`);
for (const s of ["DANGLING", "VARIANTS", "PROSE", "OTHER_TH", "FINISH", "NAME"]) console.log(`  ${s.padEnd(9)} ${count(s)}`);
console.log("");
for (const o of ALL ? leads : leads.slice(0, 60)) {
  console.log(`${o.id}  [${o.signals.join(",")}]  ${o.name}`);
  for (const [k, v] of Object.entries(o.evidence)) console.log(`    ${k}: ${String(v).slice(0, 170)}`);
}
if (!ALL && leads.length > 60) console.log(`\n… ${leads.length - 60} more (--all, or --json)`);
if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(leads.map((o) => ({ ...o, verdict: verdictOf.get(o.id) || null })), null, 1)); console.log(`\nwrote ${JSON_OUT}`); }
process.exit(out.some((o) => o.signals.includes("DANGLING")) ? 1 : 0);
