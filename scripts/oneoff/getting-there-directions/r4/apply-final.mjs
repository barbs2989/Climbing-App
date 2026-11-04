// Write round 4's closure re-check (final.json, built by build-final.cjs). --dry by default; --apply writes.
// field "road.status" is key `status` of the jsonb column `road`; "access.closures" is key `closures` of
// `access`. Each row is compare-and-swapped on the exact OLD text live today, paced by patchRow, and re-read.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, requireServiceKey, selectAll } from "../../../lib/supabase-env.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(path.join(here, "final.json"), "utf8"));
const SOURCE_RE = /\b(https?:|www\.|\.com|\.org|\.gov|mountainproject|openbeta|summitpost|peakbagger|wta|wtahikers|onx)\b|\bper (a|the) |according to/i;
for (const x of fixes) if (SOURCE_RE.test(x.text) || /[A-Z]{6,}/.test(x.text.replace(/WSDOT/g, ""))) throw new Error(`${x.id} ${x.field}: names a source or shouts`);

const ids = [...new Set(fixes.map(x => x.id))];
const read = async () => new Map((await selectAll("routes", "id,road,access", `id=in.(${ids.map(encodeURIComponent).join(",")})`, { key })).map(r => [r.id, r]));
let rows = await read();
let ok = 0, moved = 0;
for (const x of fixes) {
  const [col, k] = x.field.split(".");
  const cur = rows.get(x.id)?.[col]?.[k];
  if (cur !== x.old) { moved++; console.log(`  MOVED ${x.id} ${x.field} — live text differs from the one checked; not written`); x.skip = true; } else ok++;
}
console.log(`${fixes.length} changes; ${ok} hold the checked text, ${moved} moved`);
if (!APPLY) process.exit(0);

let written = 0;
for (const id of ids) {
  const mine = fixes.filter(x => x.id === id && !x.skip);
  if (!mine.length) continue;
  const r = rows.get(id), body = {};
  for (const x of mine) { const [col, k] = x.field.split("."); body[col] = Object.assign({}, body[col] || r[col], { [k]: x.text }); }
  await patchRow("routes", id, body);
  written += mine.length;
  console.log(`  wrote ${id} (${mine.map(x => x.field).join(", ")})`);
}
rows = await read();
let bad = 0;
for (const x of fixes) { if (x.skip) continue; const [col, k] = x.field.split("."); if (rows.get(x.id)?.[col]?.[k] !== x.text) { bad++; console.error(`NOT LANDED ${x.id} ${x.field}`); } }
console.log(`written ${written}, moved ${moved}, not landed ${bad}`);
if (bad) process.exit(1);
