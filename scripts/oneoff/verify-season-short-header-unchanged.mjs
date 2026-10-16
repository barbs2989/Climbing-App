// seasonShort() is SHARED. Widening its window pattern and changing its last-resort truncation
// was aimed at the APPROACHES pill, but the HEADER STRAP calls the same function with the default
// budget — so the strap moved too, and this measures by how much rather than assuming it did not.
//
// The repo's standard for touching a shared display helper: prove the change before shipping it.
// "I only meant to affect the other caller" is not evidence.
//
// Runs the CURRENT seasonShort and the one at a git ref over every distinct `season` value in the
// catalog, at the header's default budget, and prints every difference for reading.
import { build } from "esbuild";
import { createRequire } from "module";
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const REF = (process.argv.find((a) => a.startsWith("--ref=")) || "--ref=HEAD").split("=")[1];

async function loadSeasonShort(label) {
  const ENTRY = `export { seasonShort } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-ss-" + label + "-")), "b.cjs");
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: out, logLevel: "error",
  });
  const fn = require_(out).seasonShort;
  if (typeof fn !== "function") { console.log(`ANCHOR LOST: no seasonShort export (${label})`); process.exit(1); }
  return fn;
}

const FILE = path.join(ROOT, "RouteDetail.jsx");
const current = fs.readFileSync(FILE, "utf8");
const sum = (x) => crypto.createHash("sha1").update(x).digest("hex").slice(0, 8);

const after = await loadSeasonShort("after");

// Swap in the ref's file, load, swap back. Restoring is checked by checksum, because this file
// IS the app and a half-restored edit would be far worse than a wrong measurement.
let before;
try {
  let old = execSync(`git show ${REF}:RouteDetail.jsx`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
  // seasonShort was not EXPORTED before this change, so the ref's copy needs the export added to
  // be loadable at all. Adding a keyword cannot alter what the function computes, which is the
  // only thing being compared.
  if (!/export function seasonShort/.test(old)) {
    const n = (old.match(/function seasonShort\(/g) || []).length;
    if (n !== 1) { console.log(`ANCHOR LOST: expected 1 seasonShort at ${REF}, found ${n}`); process.exit(1); }
    old = old.replace("function seasonShort(", "export function seasonShort(");
  }
  fs.writeFileSync(FILE, old);
  before = await loadSeasonShort("before");
} finally {
  fs.writeFileSync(FILE, current);
  if (sum(fs.readFileSync(FILE, "utf8")) !== sum(current)) { console.log("FAIL: RouteDetail.jsx was NOT restored"); process.exit(1); }
}

// The header renders the top-level `season` column. Long shapes over-sampled, because an
// unordered slice is mostly short values and would prove the change harmless by never meeting a
// candidate — the same sampling trap the tick-list grade pill hid behind.
const q = async (f) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=season&${f}&limit=1000`, { headers: headers(anonKey()) });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const seasons = new Set();
for (const f of ["season=not.is.null", "season=like.*(*", "season=ilike.*through*", "season=ilike.*autumn*", "season=ilike.*summer*", "season=ilike.*winter*"]) {
  for (const row of await q(f)) if (row.season) seasons.add(String(row.season).trim().replace(/\s+/g, " "));
}
if (!seasons.size) { console.log("FAIL: read no seasons — an empty comparison proves nothing"); process.exit(1); }

let differ = 0, improved = 0;
const rows = [];
for (const s of seasons) {
  const a = before(s), b = after(s);
  if (a === b) continue;
  differ++;
  // "Improved" means the strap now shows a real window where it used to show a stump. Judged by
  // the ellipsis, which is the only honest signal available: a truncation admits it truncated.
  if (a.endsWith("…") && !b.endsWith("…")) improved++;
  rows.push({ s, a, b });
}
console.log(`${seasons.size} distinct season values compared at the HEADER budget (default 30)\n`);
console.log(`   differ: ${differ}`);
console.log(`   of those, a stump became a real window: ${improved}`);
console.log(`   still a truncation, wording changed:    ${differ - improved}\n`);
rows.slice(0, 18).forEach((r) => {
  console.log(`   ${JSON.stringify(r.s.slice(0, 96))}`);
  console.log(`      before: ${JSON.stringify(r.a)}`);
  console.log(`      after:  ${JSON.stringify(r.b)}`);
});
if (rows.length > 18) console.log(`   ... and ${rows.length - 18} more`);
