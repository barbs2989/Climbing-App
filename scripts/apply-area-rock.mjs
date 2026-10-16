// Writes the MAPPED rock (scripts/derive-area-rock.mjs's cache) into `areas.rock`, as SQL files.
//
//   node scripts/apply-area-rock.mjs <areas.csv id,lat,lng> <cache.jsonl> <outdir>
//   then: for f in <outdir>/*.sql; do npx supabase db query --linked -f "$f"; done
//
// Only fills an area that has NO rock yet (`where a.rock is null`), so a STATED rock — from the
// area's own routes — is never overwritten by a mapped one. Prints how many rows it expects to
// change; re-count afterwards (a clean exit from the SQL is not evidence any row changed).
// A man-made wall (research-data/crag-aspects/audit/man-made.json) is never filled: the bedrock
// under a concrete or synthetic wall is not what is climbed, and its rock was cleared on purpose.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAN_MADE = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../research-data/crag-aspects/audit/man-made.json"), "utf8"));
const [, , csvPath, cachePath, outDir] = process.argv;
if (!outDir) { console.error("usage: apply-area-rock.mjs <areas.csv> <cache.jsonl> <outdir>"); process.exit(2); }
const cell = (lat, lng) => `${(+lat).toFixed(3)},${(+lng).toFixed(3)}`;
const byCell = new Map();
for (const l of fs.readFileSync(cachePath, "utf8").split("\n")) { if (!l) continue; const r = JSON.parse(l); if (r.rock) byCell.set(r.cell, r.rock); }

const rows = [];
let noAnswer = 0, notCrawled = 0;
const crawled = new Set(fs.readFileSync(cachePath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).cell));
for (const l of fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1)) {
  const [id, lat, lng] = l.split(",");
  if (!lat || !lng || MAN_MADE[id]) continue;
  const c = cell(lat, lng);
  if (!crawled.has(c)) { notCrawled++; continue; }
  const rock = byCell.get(c);
  if (!rock) { noAnswer++; continue; }
  if (!/^[a-z ]{1,40}$/.test(rock)) throw new Error(`unexpected rock value ${JSON.stringify(rock)} for ${id}`);
  rows.push([id, rock]);
}
fs.mkdirSync(outDir, { recursive: true });
const q = (s) => "'" + s.replace(/'/g, "''") + "'";
const BATCH = 4000;
for (let i = 0; i < rows.length; i += BATCH) {
  const vals = rows.slice(i, i + BATCH).map(([id, r]) => `(${q(id)},${q(r)})`).join(",\n");
  fs.writeFileSync(path.join(outDir, `area-rock-${String(i / BATCH).padStart(3, "0")}.sql`),
    `update public.areas a set rock = v.rock, rock_basis = 'mapped'\nfrom (values\n${vals}\n) as v(id, rock)\nwhere a.id = v.id and a.rock is null;\n`);
}
const tally = {};
for (const [, r] of rows) tally[r] = (tally[r] || 0) + 1;
console.log(JSON.stringify({ areasWithMappedRock: rows.length, noBedrockAnswer: noAnswer, notCrawledYet: notCrawled, files: Math.ceil(rows.length / BATCH) }));
console.log(Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${n}`).join(", "));
