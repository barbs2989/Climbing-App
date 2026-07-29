// Regenerates scripts/schema-snapshot.json from the live database.
//
// Run after any migration that adds or drops a column:
//   node scripts/refresh-schema-snapshot.mjs
//
// The snapshot is what `npm run check-schema` validates lib/db.js against. It
// is deliberately NOT derived from supabase/migrations/ — that directory is not
// authoritative (migrations have been merged and never applied, applied out of
// band, quarantined unrun, and renumbered). The live database is the only
// source of truth, so the snapshot is a committed cache of it that a human
// refreshes on purpose.
//
// Needs the service key: PostgREST's OpenAPI root returns 401 to the anon key.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, requireServiceKey, headers } from "./lib/supabase-env.mjs";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "schema-snapshot.json");

const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
  headers: headers(requireServiceKey(), { Accept: "application/openapi+json" }),
});
if (!res.ok) throw new Error(`OpenAPI fetch failed: ${res.status} ${(await res.text()).slice(0, 200)}`);

const spec = await res.json();
const defs = spec.definitions || (spec.components && spec.components.schemas) || {};
const names = Object.keys(defs).sort();
if (!names.length) throw new Error("OpenAPI spec exposed no tables — refusing to write an empty snapshot.");

const tables = {};
for (const t of names) tables[t] = Object.keys(defs[t].properties || {}).sort();

const snapshot = {
  note: "Generated from the live database by scripts/refresh-schema-snapshot.mjs. Do not hand-edit.",
  generatedAt: new Date().toISOString().slice(0, 10),
  tables,
};

fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`wrote ${path.relative(process.cwd(), OUT)} — ${names.length} tables, ${Object.values(tables).reduce((n, c) => n + c.length, 0)} columns`);
