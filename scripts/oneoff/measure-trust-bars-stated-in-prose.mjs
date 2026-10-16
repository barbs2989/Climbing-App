#!/usr/bin/env node
/* HOW MANY COPY STRINGS NAME A TRUST NUMBER, and which of them can a climber ever be shown?
 *
 * check:trust-breakdown section 7 bounds the four bars that only ever SPEAK -- but it walks
 * TRUST_TIERS, so a bar stated in PROSE, outside that array, is invisible to it by construction.
 * This is the evidence for section 8: it sizes the class before a rule is written for it, and it
 * is what makes the figures in CLAUDE.md RE-DERIVABLE rather than typed. A measurement written
 * into prose rots -- this file records that under half a dozen names.
 *
 * THE PRECISION QUESTION IS THE POINT. The naive rule -- flag any number in a sentence mentioning
 * trust -- is 50% noise on this tree, because one of the two live hits is a DATE ("Did your crew
 * make Schoolroom on May 24? ... reliability feeds your trust score"). A guard that flags correct
 * work is one people learn to ignore. So each hit is classified against the model's own scale
 * rather than against a vocabulary of threshold words:
 *
 *   REACHABLE   n <= earnable ceiling      a date, a count, or a bar an account can actually hit
 *   UNREACHABLE ceiling < n <= model cap   score-shaped and impossible -- the finding
 *   OFF-SCALE   n > model cap              a year or a row count; not a trust score at all
 *
 * Both bounds are DERIVED (the model's own arithmetic, and which verification types a definer can
 * set to 'verified'), so the band moves by itself the day one of them becomes earnable.
 *
 * Parsed with Babel rather than grepped, for the reason check:profile-claims section 3 records:
 * three separate checkers here were fooled in one day by the comment written to explain the very
 * fix they were checking. An AST sees no comments -- and no CONCATENATION either, which is what
 * makes the group gate's own repair, "Trust " + GROUP_TRUST_MIN + "+", correctly invisible: that
 * literal carries no digit, so the derived form cannot be reported as a hardcoded bar.
 *
 * No browser, no database.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { reachableVerificationTypes, earnableCeiling, dayOneScore } from "../lib/verification-reach.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Inside the repo, not /tmp: react and friends are external and must resolve from node_modules.
const out = path.join(ROOT, `.trustbars-${process.pid}.mjs`);

execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
  "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  // lib/supabase.js reads import.meta.env at module scope; without this the import throws.
  "--define:import.meta.env={}",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });

let mod;
try {
  mod = await import(pathToFileURL(out).href);
} finally {
  fs.rmSync(out, { force: true });
}

const { SERVER_TRUST_CAP, serverTrustScore } = mod;
const { types, scanned: migs } = reachableVerificationTypes(path.join(ROOT, "supabase", "migrations"));
const ceiling = earnableCeiling(serverTrustScore, types);
const dayOne = dayOneScore(serverTrustScore, types);

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"].concat(
  fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.(jsx|js)$/.test(f)).map((f) => "lib/" + f),
);

let scanned = 0, literals = 0, trustLiterals = 0;
const hits = [];
for (const rel of FILES) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { continue; }
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false }); }
  catch (e) { console.log("PARSE FAIL " + rel + ": " + (e && e.message)); continue; }
  scanned++;
  const seen = new Set();
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { for (const c of n) walk(c); return; }
    let v = null;
    if (n.type === "StringLiteral") v = n.value;
    else if (n.type === "TemplateElement") v = (n.value && n.value.cooked) || "";
    if (v !== null) {
      literals++;
      if (/trust/i.test(v)) {
        trustLiterals++;
        const nums = (v.match(/\d+/g) || []).map(Number);
        if (nums.length) hits.push({ rel, v, nums });
      }
    }
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "leadingComments" || k === "trailingComments" || k === "innerComments") continue;
      const c = n[k];
      if (c && typeof c === "object" && !seen.has(c)) { seen.add(c); walk(c); }
    }
  })(ast.program);
}

const band = (n) => (n <= ceiling ? "REACHABLE  " : n <= SERVER_TRUST_CAP ? "UNREACHABLE" : "OFF-SCALE  ");

console.log("migrations scanned                : " + migs);
console.log("verification types earnable       : " + ([...types].join(", ") || "(none)"));
console.log("day one (email confirmed)         : " + dayOne);
console.log("EARNABLE CEILING                  : " + ceiling);
console.log("model cap (SERVER_TRUST_CAP)      : " + SERVER_TRUST_CAP);
console.log("unreachable band                  : " + (ceiling + 1) + ".." + SERVER_TRUST_CAP);
console.log("");
console.log("rendering sources walked          : " + scanned);
console.log("string literals walked            : " + literals);
console.log("  of those, mentioning trust      : " + trustLiterals);
console.log("  of those, also carrying a number: " + hits.length);
console.log("");

let unreachable = 0;
for (const h of hits) {
  for (const n of h.nums) if (band(n).trim() === "UNREACHABLE") unreachable++;
  console.log("  " + h.rel);
  for (const n of h.nums) console.log("      " + band(n) + "  " + n);
  console.log("      " + JSON.stringify(h.v).slice(0, 220));
}
console.log("\nnumbers in the unreachable band: " + unreachable
  + "   (a naive 'any number' rule would report " + hits.length + " string(s))");

/* FAIL CLOSED. Zero files, a walk that saw almost no literals, a needle that matched no trust
   string at all, or an unread migration tree each print the same reassuring "no findings" shape
   as a clean tree -- and an unread migration tree WIDENS the band, so it manufactures findings
   rather than losing them. */
let broken = null;
if (scanned < 4) broken = scanned + " rendering source(s) walked";
else if (literals < 5000) broken = literals + " string literal(s) walked";
else if (!trustLiterals) broken = "no literal mentions trust at all, so the needle cannot fire";
else if (migs < 20) broken = "only " + migs + " migration(s) scanned";
else if (!types.size) broken = "no verification type parsed as reachable";
if (broken) {
  console.log("\nBROKEN SCAN - " + broken + ". This measured nothing.");
  process.exit(1);
}
