#!/usr/bin/env node
// run: node --experimental-websocket scripts/oneoff/probe-thin-list-select.mjs
// VERIFY the thin list select lib/db.js useAreaRoutes ships, against the live database: PostgREST
// accepts every column and the areas embed, the rows come back in the same order as the full
// select, and the bytes are what the measurement promised. Reads the literal OUT OF lib/db.js so
// it tests what ships, not a copy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const db = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const m = db.match(/: supabase\.from\("routes"\)\.select\("([^"]+)"\);\n\s+const rows = await allRows/);
if (!m) { console.log("FAIL: the thin select literal was not found in lib/db.js useAreaRoutes"); process.exit(1); }
const THIN = m[1];
const FULL = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,approach,approach_min,rock,rock_basis,aspect,parking_lat,parking_lng,parking_name,parent:parent_id(name))";
const supabase = createClient(SUPABASE_URL, anonKey());
const bytes = (v) => Buffer.byteLength(JSON.stringify(v));
let bad = 0;
for (const area of ["wa_mount_baker", "wa_liberty_bell", "tn_stone_fort_bouldering_climbs"]) {
  const sel = (s) => supabase.from("routes").select(s).eq("area_id", area).order("sort_order", { ascending: true, nullsFirst: false }).order("name");
  const [t, f] = await Promise.all([sel(THIN), sel(FULL)]);
  if (t.error) { console.log(`FAIL ${area}: thin select rejected — ${t.error.message}`); bad++; continue; }
  if (f.error) { console.log(`FAIL ${area}: full select rejected — ${f.error.message}`); bad++; continue; }
  const sameOrder = t.data.length === f.data.length && t.data.every((r, i) => r.id === f.data[i].id);
  const embedOk = t.data.every((r) => r.areas && typeof r.areas.name === "string" && "area_type" in r.areas);
  const ok = sameOrder && embedOk;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${area}: ${t.data.length} rows, thin ${(bytes(t.data) / 1024).toFixed(1)} KB vs full ${(bytes(f.data) / 1024).toFixed(1)} KB, same order: ${sameOrder}, areas(name,area_type) on every row: ${embedOk}`);
}
console.log(`thin select: ${THIN}`);
process.exit(bad ? 1 : 0);
