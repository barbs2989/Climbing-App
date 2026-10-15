#!/usr/bin/env node
// check:feature-docs — every docs/features/*.md still describes code that EXISTS.
//
// docs/features/ holds one "how this area works now" note per area of the app, indexed by
// CURRENT_STATE.md at the root. They exist so the next session does not have to re-derive an area
// from 10,000 lines of JSX — which means the next session will TRUST them, and a doc that names a
// function that was renamed last week is worse than no doc. The owner asked for these to stay
// current all the time; this is the part of "all the time" a build can enforce.
//
// What it asserts, per doc:
//   1. every row of the "Files" table names a file (or migration numbers) that exists, and every
//      backticked identifier in that row appears as a whole word in that file;
//   2. every backticked repo path anywhere in the doc exists;
//   3. the index and the folder agree: CURRENT_STATE.md links every docs/features/*.md, and every
//      docs/features/*.md it links exists.
//
// What it CANNOT see: a doc whose words are all still true names but whose description of the
// behaviour is wrong. That half is the CLAUDE.md rule — a PR that changes how an area works edits
// that area's doc in the same PR. This guard catches the rename/move/delete half, which is the
// half that rots silently.
//
// Fails CLOSED: a Files table that parses to almost nothing reads as a clean doc.
// Static — no browser, no DB, milliseconds — so it sits in `npm run build`.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "docs/features");
const INDEX = path.join(ROOT, "CURRENT_STATE.md");
const MIGR = path.join(ROOT, "supabase/migrations");

let bad = 0;
const fail = (m) => { console.error("  FAIL  " + m); bad++; };
const dead = (m) => { console.error(`check:feature-docs FAILED — ${m}. Nothing was checked.`); process.exit(1); };

if (!fs.existsSync(DIR)) dead("docs/features/ does not exist");
if (!fs.existsSync(INDEX)) dead("CURRENT_STATE.md does not exist");
const docs = fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).sort();
if (docs.length < 4) dead(`docs/features/ holds only ${docs.length} doc(s) — the layout moved`);
const migrations = fs.readdirSync(MIGR);

const IDENT = /^[A-Za-z_$][\w$]*(?:\(\))?$/;
const PATHLIKE = /^(?:[\w.-]+\/)*[\w.-]+\.(?:mjs|jsx|json|yml|sql|js|md)$/;
const BARE_DIRS = ["", "lib", "docs", "docs/guards", "docs/codebase", "docs/features"];
const fileText = new Map();
const read = (rel) => {
  if (!fileText.has(rel)) fileText.set(rel, fs.readFileSync(path.join(ROOT, rel), "utf8"));
  return fileText.get(rel);
};
const has = (text, id) => new RegExp(`(?<![\\w$])${id.replace(/[$]/g, "\\$")}(?![\\w$])`).test(text);

let symbols = 0;
for (const doc of docs) {
  const rel = `docs/features/${doc}`;
  const src = fs.readFileSync(path.join(DIR, doc), "utf8");

  // 1. The Files table: the section headed "Files", rows of `| \`path\` | ...symbols... |`.
  const sec = src.split(/^## /m).find((s) => /^(?:\d+\.\s*)?Files\b/.test(s));
  if (!sec) { fail(`${rel} has no "## Files" section — the table this guard reads`); continue; }
  const rows = sec.split("\n").filter((l) => /^\|\s*`/.test(l));
  if (rows.length < 2) { fail(`${rel}'s Files table parsed to ${rows.length} row(s) — the table broke`); continue; }
  for (const row of rows) {
    const cells = row.split("|").slice(1, -1);
    const target = (cells[0].match(/`([^`]+)`/) || [])[1];
    if (!target) continue;
    const nums = target.startsWith("supabase/migrations/") && target.slice(20).match(/\b\d{4}\b/g);
    if (nums) {
      for (const n of nums) if (!migrations.some((m) => m.startsWith(n))) fail(`${rel} cites migration ${n}, which does not exist`);
      continue;
    }
    if (!fs.existsSync(path.join(ROOT, target))) { fail(`${rel} lists ${target} in its Files table, which does not exist`); continue; }
    if (fs.statSync(path.join(ROOT, target)).isDirectory()) continue;
    const text = read(target);
    for (const cell of cells.slice(1)) {
      for (const [, tok] of cell.matchAll(/`([^`]+)`/g)) {
        for (const part of tok.split("/")) {
          const id = part.trim();
          if (!IDENT.test(id)) continue; // wildcards (CMAX_*), expressions, prose
          symbols++;
          if (!has(text, id.replace(/\(\)$/, ""))) fail(`${rel}: \`${id}\` is listed under ${target}, but ${target} no longer contains it`);
        }
      }
    }
  }

  // 2. Every backticked repo path anywhere in the doc. A bare name (`honesty-claims.md`,
  //    `BestDayTile.jsx`) is how prose naturally cites a sibling, so it resolves against the
  //    folders that hold the app and its docs; it fails only if it is in none of them.
  for (const [, tok] of src.matchAll(/`([^`\s]+)`/g)) {
    if (!PATHLIKE.test(tok) || !tok.includes("/") && !/\.(?:jsx|md)$/.test(tok)) continue;
    const where = tok.includes("/") ? [""] : BARE_DIRS;
    if (!where.some((d) => fs.existsSync(path.join(ROOT, d, tok)))) fail(`${rel} names \`${tok}\`, which does not exist`);
  }
}

// 3. Index and folder agree, both directions.
const idx = fs.readFileSync(INDEX, "utf8");
const linked = new Set([...idx.matchAll(/docs\/features\/([\w.-]+\.md)/g)].map((m) => m[1]));
for (const d of docs) if (!linked.has(d)) fail(`docs/features/${d} is not linked from CURRENT_STATE.md — an unindexed doc is one nobody reads`);
for (const d of linked) if (!docs.includes(d)) fail(`CURRENT_STATE.md links docs/features/${d}, which does not exist`);

if (symbols < 40) dead(`parsed only ${symbols} symbol(s) across ${docs.length} doc(s) — the Files tables could not be read`);
console.log(`check:feature-docs — ${docs.length} docs, ${symbols} symbol(s) checked against the files that hold them.`);
if (bad) { console.error(`check:feature-docs FAILED — ${bad} finding(s). Update the doc in the same PR as the code.`); process.exit(1); }
console.log("ok — every feature doc names files and symbols that exist, and CURRENT_STATE.md indexes them all.");
