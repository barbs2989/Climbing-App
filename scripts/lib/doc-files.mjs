// The project's documentation set, as the guards that read prose should see it.
//
// CLAUDE.md is loaded into every session, so it keeps only the command index, the architecture
// and the working rules. Everything else lives beside it:
//
//   docs/guards/*.md    — the per-guard design notes, one file per area (README.md indexes them)
//   docs/codebase/*.md  — the working notes CLAUDE.md summarises and points at
//
// DISCOVERED, never listed. A hand-written list is how this repo kept a guard reading 24% of the
// app after #497 split it (check:refs named the entry files only), and how a new notes file would
// fall outside check:doc-paths and check:guard-wiring's section 5 without either one noticing.
//
// Fails CLOSED. A missing directory, or one that suddenly holds almost nothing, means the layout
// moved — and a guard scanning an empty document set prints the same clean result as a correct
// one. The floors sit well below today's counts (18 guard files, 6 codebase files) and well above
// a partial move.
import fs from "fs";
import path from "path";

export const DOC_DIRS = { "docs/guards": 10, "docs/codebase": 4 };

export function projectDocs(root) {
  const out = ["CLAUDE.md"];
  if (!fs.existsSync(path.join(root, "CLAUDE.md")))
    throw new Error("doc-files: CLAUDE.md does not exist — the documentation set could not be read");
  for (const [dir, floor] of Object.entries(DOC_DIRS)) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs))
      throw new Error(`doc-files: ${dir}/ does not exist — the documentation layout moved; update scripts/lib/doc-files.mjs`);
    const md = fs.readdirSync(abs).filter((f) => f.endsWith(".md")).sort();
    if (md.length < floor)
      throw new Error(`doc-files: ${dir}/ holds only ${md.length} .md file(s) (floor ${floor}) — a partial move reads as a clean document set`);
    out.push(...md.map((f) => `${dir}/${f}`));
  }
  return out;
}
