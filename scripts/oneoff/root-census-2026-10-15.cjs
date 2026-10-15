// The census behind docs/archive/root-2026-07/: which tracked files at the repo ROOT are referenced
// anywhere that could break if they moved? Read-only. Scans scripts/**, docs/**, .github/**,
// supabase/**, lib/**, public/** and the root config files for each root file's basename.
//
// Run it again before archiving anything else from the root — a file that is named nowhere is safe to
// move; one that a one-off script reads or a migration cites stays, with the reason recorded.
//   node scripts/oneoff/root-census-2026-10-15.cjs            # prints both lists
//   node scripts/oneoff/root-census-2026-10-15.cjs --json out.json
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..", "..");
const tracked = execFileSync("git", ["-C", ROOT, "ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
const rootFiles = tracked.filter((f) => !f.includes("/"));
const KEEP = new Set(["CLAUDE.md", "README.md", "ARCHITECTURE.md", "CURRENT_STATE.md", "index.html", "main.jsx", "ClimbMatch.jsx",
  "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx", "AppErrorBoundary.jsx", "package.json", "package-lock.json",
  "vite.config.js", "tsconfig.json", ".gitignore"]);
const candidates = rootFiles.filter((f) => !KEEP.has(f));

// Corpus: everything that could NAME a file. Big data JSON under scripts/ (rollbacks) hold rows, not paths.
const TEXT = /\.(mjs|js|cjs|jsx|tsx|ts|sh|py|md|yml|yaml|json|sql|html|txt)$/;
const corpus = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name === "dist" || (e.name.startsWith(".") && e.name !== ".github")) continue;
    if (e.isDirectory()) walk(rel);
    else if (TEXT.test(e.name) && !(dir.startsWith("scripts") && e.name.endsWith(".json") && fs.statSync(path.join(ROOT, rel)).size > 200_000)) corpus.push(rel);
  }
};
for (const d of ["scripts", "docs", ".github", "supabase", "lib", "public"]) if (fs.existsSync(path.join(ROOT, d))) walk(d);
for (const f of KEEP) if (fs.existsSync(path.join(ROOT, f)) && f !== "package-lock.json") corpus.push(f);
const texts = new Map(corpus.map((f) => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]));

// A file is referenced if its full name appears anywhere, OR its stem appears in an import-like
// position (`from "./enrichment-db"`, `require('../x')`). The first run of this census matched the
// full name only and archived enrichment-db.js, which EnrichmentPanels.jsx imports WITHOUT the
// extension — every guard that bundles core then failed to resolve it. An extensionless import is
// the normal ESM/bundler form in this codebase, so a name-only search under-counts references.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const referenced = [], unreferenced = [];
for (const c of candidates) {
  const stem = c.replace(/\.[^.]+$/, "");
  const ext = c.slice(stem.length);
  // Relative-path-prefixed (`./x`, `../x`, `../../x` — the only ways a ROOT file is reached from
  // inside the tree), and the extension, if written, must be THIS file's. Three looser forms were
  // tried — a bare stem, any extension, any `/` prefix — and each flagged a root script against
  // files that never name it (a word `"audit"`, another folder's `audit.json`, a `…/audit` path).
  const importLike = new RegExp(`(?:\\.\\.?/)+${esc(stem)}(?:${esc(ext)})?['"\`]`);
  const hits = [];
  for (const [f, t] of texts) if (f !== c && (t.includes(c) || importLike.test(t))) hits.push(f);
  (hits.length ? referenced : unreferenced).push({ c, hits });
}
console.log(`root tracked files: ${rootFiles.length}; kept (app/config): ${KEEP.size}; candidates: ${candidates.length}`);
console.log(`\nREFERENCED somewhere (${referenced.length}) — keep, redirect, or move with the reference:`);
for (const r of referenced) console.log(`  ${r.c}  ← ${r.hits.slice(0, 3).join(", ")}${r.hits.length > 3 ? ` (+${r.hits.length - 3})` : ""}`);
console.log(`\nUNREFERENCED (${unreferenced.length}) — safe to archive:`);
for (const u of unreferenced) console.log(`  ${u.c}`);
const out = process.argv.indexOf("--json");
if (out > -1) fs.writeFileSync(process.argv[out + 1], JSON.stringify({ referenced, unreferenced: unreferenced.map((u) => u.c) }, null, 1));
