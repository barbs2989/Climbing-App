#!/usr/bin/env node
/* One row of route prose named an internal route id ("... the same East Face/Rebel Yell line as
   wa_east_face_rebel_yell, so the hike-in is identical."). The id names no route (no such row), and
   renderProse reads `_..._` as italic, so the sentence would print mangled. Found by the census for
   the route-text formatting change (owner note 2026-11-25). Drops that one sentence; the rest of the
   approach is untouched. Writes a rollback first. Usage: node ... [--apply] */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";

const ID = "wa_chianti_spire_east_face";
const LEAD = "This is the same East Face/Rebel Yell line as wa_east_face_rebel_yell, so the hike-in is identical. ";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const key = requireServiceKey();
const get = async () => { const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=id,area_id,approach`, { headers: headers(key) }); const j = await r.json(); if (!Array.isArray(j) || j.length !== 1) throw new Error("expected one row, got " + JSON.stringify(j).slice(0, 200)); return j[0]; };
const row = await get();
if (row.area_id !== "wa_chianti_spire") throw new Error("area_id is " + row.area_id + ", not wa_chianti_spire — refusing");
if (!row.approach.startsWith(LEAD)) { console.log("already fixed (or changed): " + row.approach.slice(0, 120)); process.exit(0); }
const next = row.approach.slice(LEAD.length);
console.log("before: " + row.approach.slice(0, 160) + "\nafter:  " + next.slice(0, 160));
if (!process.argv.includes("--apply")) { console.log("(dry run; pass --apply)"); process.exit(0); }
fs.writeFileSync(path.join(HERE, "rollback-" + Date.now() + ".json"), JSON.stringify([row], null, 2));
await patchRow("routes", ID, { approach: next });
const back = await get();
if (back.approach !== next) throw new Error("re-read does not match what was written");
console.log("written and re-read: 1 row");
