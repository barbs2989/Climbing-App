// Do the full-screen views NO overlay guard can reach assert absence without gating it?
//
// check:overlay-discovery is BEHAVIOURAL: it wants `role="dialog"` as the region's own first
// element. 12 opaque full-screen views carry no role at all, so they are overlays to a climber
// and not overlays to any guard — outside check:zero, check:overlay-scroll, check:signed-in AND
// check:overlay-absence by construction. That is exactly how the Manage areas defect shipped: 46
// of 50 states read "Catalog coming soon" under a failed useStates() read, on the one screen
// whose purpose is working without a signal.
//
// This asks check:overlay-absence's question of the surfaces check:overlay-absence cannot see.
// It adds no role to anything: the memory note is explicit that sweeping `role="dialog"` onto
// all 12 would be WRONG (several replace the page rather than sitting over it) and changes what
// four guards walk. Measuring needs none of that.
//
// REGIONS COME FROM THE AST, NEVER A CHARACTER WINDOW. check:overlay-absence's own closing note
// records a 3000-char window running past one overlay's JSX into the next one's and crediting a
// neighbour's flag — a false pass on the only question it asks. An element's range is exact.
//
// The CLAIMS vocabulary is lifted from check:overlay-absence rather than re-typed, so the two
// cannot drift on what counts as asserting absence.
//
// RESULT, 2026-09-02: 14 opaque full-screen views, 8 now carrying role="dialog" and 6 not. Five
// assert absence; three of those name no flag; and ALL THREE ARE NON-FINDINGS:
//
//   EditProfileScreen  "No certifications added yet" / "No skills added yet" describe `editDraft`,
//                      a useState(null) seeded when the climber taps Edit. No read to fail.
//   Calendar           "No events yet" reads `events`, a useState seeded from DEMO_FILLERS.
//   AreaTree           "No areas match <query>" is FILTER copy — true of whatever loaded, the same
//                      reason FriendsList's "No friends match" is deliberately ungated — and it
//                      reads the seed MOUNTAINS array, which is dead in production anyway.
//
// The first two are already recorded as non-findings in CLAUDE.md's check:outage-copy entry; the
// third was not, and is now.
//
// THE MEMORY NOTE THIS CAME FROM IS STALE. It says "13 views, exactly 1 carries role=dialog, 12
// do not" (2026-08-27). Eight carry it now — parallel sessions have been adding them. Re-run this
// rather than quoting either number: the count of unreachable surfaces is the whole premise of
// that note, and it has moved by seven in six days.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// LIFTED, with ANCHOR LOST if it moves — a second copy of this vocabulary is the four-grade-parsers
// shape, and this repo has paid for it more than once.
const GUARD = fs.readFileSync(path.join(ROOT, "scripts", "check-overlay-absence.mjs"), "utf8");
const cm = /^const CLAIMS = (\/.+\/gi);$/m.exec(GUARD);
if (!cm) { console.error("ANCHOR LOST — check:overlay-absence's CLAIMS regex moved; refusing to invent a second one."); process.exit(1); }
const CLAIMS = eval(cm[1]);

function maskComments(src, label) {
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  const cs = ast.comments || [];
  if (cs.length < 50) { console.error(`FAIL — ${label} reported only ${cs.length} comments; a broken parse.`); process.exit(1); }
  const buf = src.split("");
  for (const c of cs) for (let i = c.start; i < c.end; i++) if (buf[i] !== "\n") buf[i] = " ";
  return { masked: buf.join(""), ast };
}

let views = 0;
const rows = [];

for (const f of FILES) {
  const raw = fs.readFileSync(path.join(ROOT, f), "utf8");
  const { masked, ast } = maskComments(raw, f);

  traverse(ast, {
    JSXOpeningElement(p) {
      const style = p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "style");
      if (!style || style.start == null) return;
      const st = raw.slice(style.start, style.end);
      // OPAQUE FULL-SCREEN = a SCREEN. A backdrop is always translucent (rgba), which is how the
      // two are told apart without a window — the memory records getting this wrong three times.
      if (!/position:\s*["']fixed["']/.test(st)) return;
      if (!/\binset:\s*0\b/.test(st)) return;
      if (!/background:\s*C\.bg\b/.test(st)) return;

      const el = p.parentPath.node;
      if (el.start == null || el.end == null) return;
      views++;

      const region = masked.slice(el.start, el.end);          // comments masked, offsets preserved
      // FROM THE AST, not a character window. A 400-char window over these dense opening tags
      // reads past a long style object on some elements and stops short on others, so it answers
      // a different question per element — the trap this file's own header criticises.
      const hasRole = p.node.attributes.some((a) => a.type === "JSXAttribute" && a.name && a.name.name === "role" &&
        a.value && a.value.type === "StringLiteral" && a.value.value === "dialog");
      const claims = [...new Set((region.match(CLAIMS) || []).map((s) => s.trim()))];
      const flags = [...new Set((region.match(/\b[A-Za-z]+Unavailable\b/g) || []))];

      rows.push({
        file: f,
        line: raw.slice(0, el.start).split("\n").length,
        chars: el.end - el.start,
        hasRole,
        claims,
        flags,
      });
    },
  });
}

if (!views) { console.error("found NO opaque full-screen views — the shape test matches nothing, which is a broken scan"); process.exit(1); }

const asserting = rows.filter((r) => r.claims.length);
const ungated = asserting.filter((r) => !r.flags.length);

console.log(`opaque full-screen views found: ${views}   (with role="dialog": ${rows.filter((r) => r.hasRole).length})`);
console.log(`  ...asserting absence: ${asserting.length}`);
console.log(`  ...asserting absence with NO xUnavailable flag anywhere in the region: ${ungated.length}\n`);

for (const r of asserting) {
  const mark = r.flags.length ? "GATED  " : "UNGATED";
  console.log(`  ${mark} ${r.file}:${r.line}  (${r.chars} chars, role=${r.hasRole ? "dialog" : "none"})`);
  console.log(`      claims: ${r.claims.slice(0, 6).join(" | ")}`);
  if (r.flags.length) console.log(`      flags:  ${r.flags.join(", ")}`);
}

console.log(`\nA flag ANYWHERE in the region is a weak test — it says the region knows about an`);
console.log(`outage, not that THIS sentence is gated on one. Read the ungated rows first, then`);
console.log(`confirm each gated row's flag actually guards the claim beside it.`);
