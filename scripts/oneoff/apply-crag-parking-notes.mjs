#!/usr/bin/env node
// Writes researched PARKING NOTES (areas.parking_note, 0282) from per-destination research files.
// Usage: node scripts/oneoff/apply-crag-parking-notes.mjs <dir> [--apply]
// <dir>/*.json: [{ area_id, note, confidence: "high"|"medium", basis }]
// A note is refused unless: the area exists; it is 20-300 characters; it names no source (the app never
// cites one); confidence is high or medium. Fill-only: an area that already has a note is left alone.
// A note is copied down the subtree only to areas that have neither a note nor a parking pin of their own
// (a sector with its own spot must not inherit its parent's words). Without --apply it writes apply.sql.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const dir = process.argv[2]; const APPLY = process.argv.includes("--apply");
if (!dir) { console.error("usage: apply-crag-parking-notes.mjs <dir> [--apply]"); process.exit(2); }
const key = requireServiceKey();
const q = async (p) => { for (let i = 0; ; i++) { try { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(key) }); if (!r.ok) throw new Error(await r.text()); return await r.json(); } catch (e) { if (i >= 4) throw e; await new Promise((z) => setTimeout(z, 3000 * (i + 1))); } } };
const SOURCEY = /mountain ?project|\bMP\b|guide ?book|coalition|access fund|openstreetmap|\bOSM\b|according|\bper\b|source|website|https?:|www\./i;
const items = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")).map((x) => ({ ...x, file: f })));
const ok = [], refused = [];
for (const it of items) {
  const why = [];
  const [a] = await q(`areas?select=id,name,path,parking_note&id=eq.${encodeURIComponent(it.area_id)}`);
  if (!a) why.push("no such area"); else if (a.parking_note) why.push("already has a note");
  if (!["high", "medium"].includes(it.confidence)) why.push("confidence " + it.confidence);
  if (typeof it.note !== "string" || it.note.length < 20 || it.note.length > 300) why.push("note length " + (it.note || "").length);
  else if (SOURCEY.test(it.note)) why.push("note names a source");
  (why.length ? refused : ok).push({ ...it, areaName: a && a.name, why });
}
const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'";
// Fill-only: what had a note before THIS run is frozen; a note goes to its area and to bare descendants only.
const sql = ["begin;", "create temp table _had_note on commit drop as select id from public.areas where parking_note is not null;",
  ...ok.map((it) => `update public.areas set parking_note=${esc(it.note)} where id=${esc(it.area_id)} and id not in (select id from _had_note);\nupdate public.areas set parking_note=${esc(it.note)} where path <@ (select path from public.areas where id=${esc(it.area_id)}) and id <> ${esc(it.area_id)} and id not in (select id from _had_note) and parking_note is null and parking_lat is null;`),
  "commit;"].join("\n");
const out = path.join(dir, "apply.sql"); fs.writeFileSync(out, sql + "\n");
for (const it of ok) console.log(`OK   ${it.confidence.padEnd(6)} ${it.area_id} (${it.areaName}) ← ${it.note}`);
for (const it of refused) console.log(`SKIP ${it.area_id}: ${it.why.join("; ")}`);
console.log(`${ok.length} accepted, ${refused.length} refused → ${out}`);
if (APPLY && ok.length) { execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", out], { stdio: "inherit" }); console.log("applied — re-read to reconcile"); }
