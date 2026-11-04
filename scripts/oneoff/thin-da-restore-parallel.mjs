// Undo the fields where a second, parallel thin-descent pass (2026-10-31, oos/session-2026-10-31b/) overwrote
// text that #3099 had already written. Its applier checked thinness when the contexts were built, not at write
// time. A field counts as overwritten when its value BEFORE that pass's write (from that pass's own rollback)
// was 150+ characters. Each such field is put back to that before value — but ONLY where the live value is still
// exactly that pass's text, so a later edit by anyone is never undone. Paced; rollback first; every row re-read.
//   node scripts/oneoff/thin-da-restore-parallel.mjs           dry run
//   node scripts/oneoff/thin-da-restore-parallel.mjs --write   (hold a dbslot)
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const WRITE = process.argv.includes("--write");
const KEY = requireServiceKey();
const R = new URL("../../audits/thin-descent-approach/rollback/", import.meta.url);
const B = new URL("../../audits/thin-descent-approach/oos/session-2026-10-31b/", import.meta.url);
const ROLLBACKS = ["rollback-1793405595646.json", "rollback-1793407703339.json", "rollback-1793438630048.json", "rollback-1793438787838.json"];
const FIELDS = ["approach", "descent_text"];
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(KEY) }); const t = await r.text(); if (!r.ok) throw new Error(`${p.slice(0, 80)} ${r.status} ${t.slice(0, 160)}`); return JSON.parse(t); };
const sleep = ms => new Promise(s => setTimeout(s, ms));

// what this pass wrote: its batch files' `set` values, first file wins (the applier's order)
const wrote = new Map();
for (const f of fs.readdirSync(B).filter(f => /^batch-.*\.json$/.test(f)).sort()) for (const [id, e] of Object.entries(JSON.parse(fs.readFileSync(new URL(f, B), "utf8")))) if (e && e.set && !wrote.has(id)) wrote.set(id, e.set);

// the before values of every field it set, from its own rollbacks
const before = new Map();
for (const f of ROLLBACKS) for (const [id, b] of Object.entries(JSON.parse(fs.readFileSync(new URL(f, R), "utf8")))) {
  for (const k of FIELDS) if (k in b && String(b[k] ?? "").length >= 150) (before.get(id) || before.set(id, {}).get(id))[k] = b[k];
}
const ids = [...before.keys()];
const live = new Map();
for (let i = 0; i < ids.length; i += 40) { for (const r of await get(`routes?select=id,approach,descent_text&id=in.(${ids.slice(i, i + 40).map(encodeURIComponent).join(",")})`)) live.set(r.id, r); await sleep(600); }

const plan = [], kept = [];
for (const [id, fields] of before) {
  const now = live.get(id), mine = wrote.get(id) || {};
  const body = {};
  for (const [k, v] of Object.entries(fields)) {
    if (now && mine[k] !== undefined && now[k] === mine[k]) body[k] = v;   // still this pass's text: restore
    else kept.push(`${id}.${k}`);                                           // changed since: leave it
  }
  if (Object.keys(body).length) plan.push({ id, body, prior: Object.fromEntries(Object.keys(body).map(k => [k, now[k]])) });
}
const nFields = plan.reduce((s, p) => s + Object.keys(p.body).length, 0);
console.log(`overwritten fields found ${[...before.values()].reduce((s, f) => s + Object.keys(f).length, 0)} on ${before.size} routes; to restore ${nFields} on ${plan.length}; left alone (live text changed since) ${kept.length}`);
for (const k of kept.slice(0, 10)) console.log("  left alone:", k);
if (!WRITE) { console.log("Dry run. Re-run with --write."); process.exit(0); }

const rb = new URL(`../../audits/thin-descent-approach/rollback/restore-parallel-${Date.now()}.json`, import.meta.url);
fs.writeFileSync(rb, JSON.stringify({ at: new Date().toISOString(), note: "values just before the restore (the parallel pass's text); restore with patchRow(routes, id, before)", rows: plan.map(p => ({ id: p.id, before: p.prior })) }, null, 1));
console.log("rollback saved", rb.pathname);
let failed = 0;
for (const p of plan) {
  for (let a = 1; ; a++) { try { await patchRow("routes", p.id, p.body); break; } catch (e) { console.log(`WRITE FAILED ${p.id} (${a}): ${e.message.slice(0, 120)}`); if (a >= 3) { failed++; break; } await sleep(60000); } }
  await sleep(500);
}
let bad = 0;
for (let i = 0; i < plan.length; i += 40) {
  const rows = await get(`routes?select=id,approach,descent_text&id=in.(${plan.slice(i, i + 40).map(p => encodeURIComponent(p.id)).join(",")})`);
  for (const p of plan.slice(i, i + 40)) { const r = rows.find(x => x.id === p.id); for (const [k, v] of Object.entries(p.body)) if (!r || r[k] !== v) { bad++; console.log("NOT RESTORED", p.id, k); } }
  await sleep(600);
}
console.log(`restored ${nFields} fields on ${plan.length} routes; write failures ${failed}; re-read problems ${bad}`);
