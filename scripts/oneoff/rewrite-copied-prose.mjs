// Rewrites route/area prose that reproduced somebody else's words — a quoted trip report, a guidebook
// line, a first-person sentence lifted from a forum — into the app's own wording, fact for fact.
//
//   node scripts/oneoff/rewrite-copied-prose.mjs edits.json          # dry run: prints every splice
//   node scripts/oneoff/rewrite-copied-prose.mjs edits.json --apply  # writes, with a rollback file
//
// edits.json: [{ id, path, text, edits:[{old,new}] }] where `path` is the column plus a JSON path
// inside it (`pitch_detail[0].notes`, `seasonal_guidance.monthBreakdown.July.reason`), `areas.blurb`
// for an area, and `text` is the string as it was when audited. Each splice is an EXACT substring
// swap that must occur once, so nothing outside the copied clause can change. A row whose live
// string no longer equals `text` is REFUSED — somebody edited it since the audit — not overwritten.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const edits = JSON.parse(fs.readFileSync(file, "utf8"));

const tokens = (p) => [...p.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map((m) => (m[2] != null ? Number(m[2]) : m[1]));
function getAt(obj, toks) { return toks.reduce((o, t) => (o == null ? o : o[t]), obj); }
function setAt(obj, toks, v) { const last = toks[toks.length - 1]; getAt(obj, toks.slice(0, -1))[last] = v; }

// group by (table,id,column) so two splices in one jsonb column land in ONE patch
const groups = new Map();
for (const e of edits) {
  const isArea = e.path === "areas.blurb";
  const table = isArea ? "areas" : "routes";
  const toks = isArea ? ["blurb"] : tokens(e.path);
  const col = toks[0];
  const k = `${table}|${e.id}|${col}`;
  if (!groups.has(k)) groups.set(k, { table, id: e.id, col, items: [] });
  groups.get(k).items.push({ ...e, toks });
}

// the rollback file is rewritten BEFORE every patch, so a crash mid-batch still leaves every prior value
const rollback = [];
const rbFile = `scripts/rollback-rewrite-copied-prose-${Date.now()}.json`;
let ok = 0, refused = 0;
for (const g of groups.values()) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${g.table}?id=eq.${encodeURIComponent(g.id)}&select=id,${g.col}`, { headers: headers(key) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`REFUSED ${g.id}: ${rows.length ?? "?"} rows`); refused++; continue; }
  const before = rows[0][g.col];
  const wrap = { [g.col]: structuredClone(before) };
  let bad = null;
  for (const it of g.items) {
    let s = getAt(wrap, it.toks);
    if (s !== it.text) { bad = `${it.path}: live string differs from the audited one`; break; }
    for (const { old, new: nw } of it.edits) {
      const n = s.split(old).length - 1;
      if (n !== 1) { bad = `${it.path}: splice occurs ${n} times — ${old.slice(0, 60)}`; break; }
      s = s.replace(old, () => nw);
    }
    if (bad) break;
    setAt(wrap, it.toks, s);
    console.log(`\n${g.id} ${it.path}`); for (const { old, new: nw } of it.edits) console.log(`  - ${old}\n  + ${nw}`);
  }
  if (bad) { console.log(`REFUSED ${g.id} ${bad}`); refused++; continue; }
  if (APPLY) {
    rollback.push({ table: g.table, id: g.id, col: g.col, before });
    fs.writeFileSync(rbFile, JSON.stringify(rollback));
    await patchRow(g.table, g.id, { [g.col]: wrap[g.col] }, { filter: "select=id" });
    const chk = await (await fetch(`${SUPABASE_URL}/rest/v1/${g.table}?id=eq.${encodeURIComponent(g.id)}&select=${g.col}`, { headers: headers(key) })).json();
    if (JSON.stringify(chk[0][g.col]) !== JSON.stringify(wrap[g.col])) throw new Error(`${g.id}.${g.col}: re-read does not match what was written`);
  }
  ok++;
}
if (APPLY && rollback.length) console.log(`\nrollback: ${rbFile}`);
console.log(`\n${APPLY ? "WRITTEN and re-read" : "DRY RUN"}: ${ok} columns ok, ${refused} refused, ${edits.reduce((n, e) => n + e.edits.length, 0)} splices`);
if (refused) process.exitCode = 1;
