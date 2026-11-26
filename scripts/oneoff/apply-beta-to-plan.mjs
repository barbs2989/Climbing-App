#!/usr/bin/env node
/* BETA → PLAN SECTION (owner note 2026-11-26: "Audit the beta section and see where things might
   overlap to the plan section and move to the plan section where you recommend per route").

   Reads the per-route decisions in audits/beta-to-plan/out-*.json (one object per route:
   {id, beta_new, moves:[{to, action, from, value, replace?, evidence?}]}) and writes them:
   the moved text leaves `routes.beta` and lands in the column the Plan body draws it from —
   approach, descent (the longer of descent / descent_text, the one descentBeta() prints),
   the RACK source the card already reads (rack_items rows, else detailed_rack, else rack,
   else new rack_items rows), bolts, anchor, location, or a new bivy site.

   Safety:
   - the LIVE row is re-read with the service key; a route whose live beta is not the beta
     the decision was made from is skipped (another session changed it).
   - a route with any contribution on file for `beta` is skipped (a climber's edit outranks us).
   - beta_new may only DROP text: more than 3 words not in the old beta refuses the route.
   - every written string is linted (no sources, no URLs, no shouting).
   - full before-values go to a rollback JSON before the first write; patchRow paces 1 write/s
     and stops on a struggling database; every row is re-read after its write.

   usage: node scripts/oneoff/apply-beta-to-plan.mjs [--apply] audits/beta-to-plan/out-000.json ...
*/
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!files.length) { console.error("usage: apply-beta-to-plan.mjs [--apply] out-*.json"); process.exit(2); }
const KEY = requireServiceKey();
const COLS = "id,beta,approach,descent,descent_text,rack_items,detailed_rack,rack,pro_needs,bolts,anchor,location,bivy,discipline,pitches";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(q) {
  const t0 = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(KEY), signal: AbortSignal.timeout(30000) });
  const ms = Date.now() - t0;
  if (!r.ok) throw new Error(`GET ${q.slice(0, 80)} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  if (ms > 10000) throw new Error(`GET took ${ms} ms — database slow; STOP (throttle rule)`);
  return r.json();
}

const BAD = /(https?:\/\/|www\.|mountain ?project|summitpost|the ?crag\b|peakbagger|supertopo|guide ?book|trip report|according to|\bper (the|a|an)\b|\bsource[sd]?\b|auto-?generated|\bI\b|\bwe\b|\bmy\b)/i;
const SHOUT = /\b[A-Z]{5,}\b/;
function lint(s, where) {
  if (typeof s !== "string") return null;
  if (BAD.test(s)) return `${where}: names a source / pipeline / first person: ${s.match(BAD)[0]}`;
  const m = s.match(SHOUT); if (m && !/^(YDS|UIAA|NCCS|USGS|GPS)$/.test(m[0])) return `${where}: shouts "${m[0]}"`;
  return null;
}
const words = (s) => String(s || "").toLowerCase().match(/[a-z0-9.#'-]+/g) || [];
const joinProse = (a, b) => { a = String(a || "").trim(); b = String(b || "").trim(); if (!a) return b; if (!b) return a; return /[.!?)"]$/.test(a) ? a + " " + b : a + ". " + b; };
const hasText = (v) => v != null && String(v).trim() !== "";

const stamp = Date.now();
const rollback = [], report = { written: [], skipped: [], held: [], resolved: [] };
const rbPath = path.join("scripts", `rollback-beta-to-plan-${stamp}.json`);

for (const f of files) {
  const decisions = JSON.parse(fs.readFileSync(f, "utf8"));
  const inF = f.replace(/out-(\d+)\.json$/, "in-$1.json");
  const packets = new Map(JSON.parse(fs.readFileSync(inF, "utf8")).map((p) => [p.id, p]));
  for (const d of decisions) {
    const p = packets.get(d.id);
    if (!p) { report.skipped.push([d.id, "no packet"]); continue; }
    const moves = (d.moves || []).filter((m) => m && m.to);
    for (const m of moves) if (m.action === "conflict-held") report.held.push([d.id, m.to, m.from, m.evidence || ""]);
    const writes = moves.filter((m) => ["add", "copy", "conflict-resolved"].includes(m.action));
    const betaChanged = (d.beta_new ?? p.beta).trim() !== String(p.beta).trim();
    if (!betaChanged && !writes.length) continue;
    if (!p.allowed_targets) { report.skipped.push([d.id, "no allowed targets"]); continue; }
    const bad = moves.find((m) => m.action !== "covered" && m.action !== "conflict-held" && m.action !== "drop" && !p.allowed_targets.includes(m.to));
    if (bad) { report.skipped.push([d.id, `target ${bad.to} not drawn on this page`]); continue; }
    // beta_new only drops text
    const old = new Set(words(p.beta));
    const novel = words(d.beta_new).filter((w) => !old.has(w));
    if (novel.length > 3) { report.skipped.push([d.id, `beta_new adds words: ${novel.slice(0, 6).join(" ")}`]); continue; }
    if (betaChanged && !moves.some((m) => m.action !== "copy" && m.action !== "conflict-held")) { report.skipped.push([d.id, "beta changed with no move recorded"]); continue; }

    const [live] = await get(`routes?select=${COLS}&id=eq.${encodeURIComponent(d.id)}`);
    if (!live) { report.skipped.push([d.id, "route gone"]); continue; }
    if (String(live.beta || "").trim() !== String(p.beta).trim()) { report.skipped.push([d.id, "live beta changed since the snapshot"]); continue; }
    const contribs = await get(`contributions?select=id,field,status&route_id=eq.${encodeURIComponent(d.id)}&field=eq.beta`);
    if (contribs.some((c) => c.status !== "rejected")) { report.skipped.push([d.id, "a climber's beta contribution is on file"]); continue; }

    const patch = {}; const errs = [];
    if (betaChanged) { const nb = String(d.beta_new || "").trim(); patch.beta = nb || null; }
    let rackItems = Array.isArray(live.rack_items) ? live.rack_items.slice() : null;
    for (const m of writes) {
      const v = m.value; const rep = m.action === "conflict-resolved" && m.replace === true;
      if (m.to === "approach" || m.to === "descent") {
        if (typeof v !== "string" || !v.trim()) { errs.push(`${m.to}: empty value`); continue; }
        const e = lint(v, m.to); if (e) { errs.push(e); continue; }
        if (m.to === "approach") patch.approach = rep ? v.trim() : joinProse(patch.approach ?? live.approach, v);
        else {
          const a = String(live.descent || "").trim(), b = String(live.descent_text || "").trim();
          const col = b.length > a.length ? "descent_text" : "descent";
          patch[col] = rep ? v.trim() : joinProse(patch[col] ?? live[col], v);
          if (a && a === b) patch[col === "descent" ? "descent_text" : "descent"] = patch[col];
        }
      } else if (m.to === "rack") {
        const rows = (v && Array.isArray(v.rows) ? v.rows : []).filter((x) => x && typeof x.item === "string" && x.item.trim())
          .map((x) => { const o = { item: x.item.trim() }; if (x.qty != null && isFinite(+x.qty)) o.qty = +x.qty; if (hasText(x.sizes)) o.sizes = String(x.sizes).trim(); return o; });
        const text = v && typeof v.text === "string" ? v.text.trim() : "";
        const e = lint(text, "rack") || rows.map((x) => lint(x.item + " " + (x.sizes || ""), "rack row")).find(Boolean); if (e) { errs.push(e); continue; }
        if (rackItems && rackItems.length) { if (!rows.length) { errs.push("rack: no rows for a counted rack"); continue; } rackItems = rackItems.concat(rows); patch.rack_items = rackItems; }
        else if (hasText(live.detailed_rack)) { if (!text) { errs.push("rack: no text"); continue; } patch.detailed_rack = joinProse(patch.detailed_rack ?? live.detailed_rack, text); }
        else if (Array.isArray(live.rack) && live.rack.length) { if (!text) { errs.push("rack: no text"); continue; } patch.rack = (patch.rack || live.rack).concat([text]); }
        else if (hasText(live.pro_needs)) { if (!text) { errs.push("rack: no text"); continue; } patch.detailed_rack = joinProse(patch.detailed_rack ?? live.pro_needs, text); }
        else { if (!rows.length) { errs.push("rack: no rows"); continue; } rackItems = (rackItems || []).concat(rows); patch.rack_items = rackItems; }
      } else if (m.to === "bolts") {
        const n = Math.round(+v); if (!(n >= 1 && n <= 500)) { errs.push(`bolts: ${v}`); continue; }
        if (live.bolts != null && !rep) { if (live.bolts !== n) errs.push(`bolts: live ${live.bolts} vs ${n}`); continue; }
        patch.bolts = n;
      } else if (m.to === "anchor" || m.to === "location") {
        const s = String(v || "").trim().replace(/\.$/, ""); const max = m.to === "anchor" ? 80 : 160;
        if (!s || s.length > max) { errs.push(`${m.to}: length ${s.length}`); continue; }
        const e = lint(s, m.to); if (e) { errs.push(e); continue; }
        if (hasText(live[m.to]) && !rep) continue; // already filled since the snapshot: leave it
        patch[m.to] = s.charAt(0).toUpperCase() + s.slice(1);
      } else if (m.to === "bivy") {
        if (!v || !hasText(v.name)) { errs.push("bivy: no name"); continue; }
        const e = lint(v.name + " " + (v.notes || ""), "bivy"); if (e) { errs.push(e); continue; }
        const cur = Array.isArray(patch.bivy) ? patch.bivy : (Array.isArray(live.bivy) ? live.bivy.slice() : []);
        if (cur.some((x) => x && String(x.name || "").toLowerCase() === v.name.trim().toLowerCase())) continue;
        const site = { name: v.name.trim(), type: v.type === "bivy" ? "bivy" : "camp" }; if (hasText(v.notes)) site.notes = String(v.notes).trim(); if (+v.elev > 0 && +v.elev < 21000) site.elev = Math.round(+v.elev);
        patch.bivy = cur.concat([site]);
      }
      if (m.action === "conflict-resolved") report.resolved.push([d.id, m.to, m.value, m.evidence || ""]);
    }
    if (errs.length) { report.skipped.push([d.id, errs.join("; ")]); continue; }
    if (!Object.keys(patch).length) continue;
    const before = {}; for (const k of Object.keys(patch)) before[k] = live[k] ?? null;
    rollback.push({ id: d.id, before });
    console.log(`${APPLY ? "WRITE" : "dry"} ${d.id}: ${Object.keys(patch).join(", ")}`);
    if (!APPLY) { report.written.push([d.id, patch]); continue; }
    fs.writeFileSync(rbPath, JSON.stringify(rollback, null, 1));
    const after = await patchRow("routes", d.id, patch);
    for (const k of Object.keys(patch)) if (JSON.stringify(after[k] ?? null) !== JSON.stringify(patch[k] ?? null)) throw new Error(`${d.id}.${k} did not land`);
    report.written.push([d.id, patch]);
    await sleep(200);
  }
}
const outDir = path.dirname(files[0]);
fs.writeFileSync(path.join(outDir, `apply-report-${APPLY ? "apply" : "dry"}-${stamp}.json`), JSON.stringify(report, null, 1));
console.log(`\n${APPLY ? "written" : "would write"} ${report.written.length} · skipped ${report.skipped.length} · held ${report.held.length} · conflicts resolved ${report.resolved.length}`);
for (const s of report.skipped) console.log("  skip", s[0], "—", s[1]);
if (APPLY && rollback.length) console.log("rollback:", rbPath);
