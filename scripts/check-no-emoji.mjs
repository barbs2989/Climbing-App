#!/usr/bin/env node
// check:no-emoji — the app draws no emoji. Owner, 2026-10-25: "i dont want emojis".
//
// Every icon the app shows is a line icon (`ActionIcon`, src/components/ActionIcon.tsx) or no icon
// at all. An emoji is drawn by the phone's own font, so it looks different on every device, sits
// at a different size from the text beside it, and was the one thing on a screen that did not
// match the rest. Polish round 3 removed ~330 of them; this keeps them out.
//
// What counts as an emoji: the pictograph planes (U+1F000–1FAFF) and the BMP symbol blocks phones
// draw as emoji (U+2600–27BF Misc Symbols + Dingbats, U+2B00–2BFF, the ⏩–⏺ media keys, ⌚⌛).
// What does NOT: the typographic marks the app uses as glyphs on purpose — ✓ ✔ ✕ ✖ ✗ ✦ ★ ☆ ☾ —
// and everything outside those blocks (← → ↗ ⌂ ⇢ ◈ ● ▪ • ›).
//
// Two places may still hold one:
//   1. A LOOKUP KEY — `{"🏆":"award"}`, after `{` or `,` (a ternary's `?"☀":` is NOT a key). Lists a climber saved before this change (lists.icon) and
//      `Lbl` strings carry an emoji that a map turns into an icon NAME; the key is never drawn.
//   2. The START of a string handed straight to `<Lbl s=…>`. Lbl draws a leading emoji as the
//      ActionIcon `EMOJI_ICON` names for it, and DROPS one it has no icon for, so it never
//      reaches the screen as a glyph.
//   3. src/components/Lbl.tsx, whose regex RECOGNISES a leading emoji in order to swap it.
// Comments are stripped first: a comment may quote what a screen used to say.
//
// Static — no browser, no DB, no network — so it sits in `npm run build`.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const APP = /^(ClimbMatch\.jsx|ClimbMatchCore\.jsx|RouteDetail\.jsx|EnrichmentPanels\.jsx|main\.jsx|lib\/.*\.(jsx?|tsx?)|src\/.*\.(jsx?|tsx?))$/;
const EXEMPT = new Set(["src/components/Lbl.tsx"]);
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{23E9}-\u{23FA}\u{231A}\u{231B}]/gu;
const TYPOGRAPHIC = new Set([..."✓✔✕✖✗✦★☆☾"]);

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => APP.test(f) && !EXEMPT.has(f));
// Fails CLOSED: "nothing found" is also what a broken walk prints.
if (files.length < 100 || !files.includes("ClimbMatchCore.jsx")) {
  console.error(`check:no-emoji FAILED — only ${files.length} app file(s) found; a broken walk, not a small app.`);
  process.exit(1);
}

// Blank comments out (keeping newlines, so line numbers hold). `//` counts only after whitespace or
// at a line start, so the `//` inside "https://" is left alone.
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, pre) => pre + " ".repeat(m.length - pre.length));

const hits = [];
let keys = 0, lbls = 0;
for (const f of files) {
  let src;
  try { src = readFileSync(ROOT + f, "utf8"); } catch { continue; }
  const lines = stripComments(src).split("\n");
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(EMOJI)) {
      if (TYPOGRAPHIC.has(m[0])) continue;
      // A lookup key: the quoted string holding this emoji is followed by `:`.
      const before = ln.slice(0, m.index), after = ln.slice(m.index);
      const open = Math.max(before.lastIndexOf('"'), before.lastIndexOf("'"));
      const q = open >= 0 ? before[open] : null;
      const close = q ? after.indexOf(q) : -1;
      // The start of a string literal passed directly to <Lbl s={…}> or <Lbl s="…">.
      if (q && /<Lbl\s+s=\{?\s*$/.test(before.slice(0, open)) && /^[\u{FE0F}\u{200D}]*$/u.test(before.slice(open + 1).replace(EMOJI, ""))) { lbls++; continue; }
      if (q && close >= 0 && !(before.slice(open + 1) + after.slice(0, close)).replace(EMOJI, "").replace(/[\u{FE0F}\u{200D}]/gu, "") && /^\s*:/.test(after.slice(close + 1)) && /[{,]\s*$/.test(before.slice(0, open))) { keys++; continue; }
      hits.push({ f, line: i + 1, ch: m[0], ctx: ln.slice(Math.max(0, m.index - 50), m.index + 40).trim() });
    }
  });
}

if (hits.length) {
  const per = {};
  for (const h of hits) per[h.f] = (per[h.f] || 0) + 1;
  console.error(`check:no-emoji FAILED — ${hits.length} emoji the app would draw, in ${Object.keys(per).length} file(s):\n`);
  const all = process.argv.includes("--all");
  for (const h of all ? hits : hits.slice(0, 60)) console.error(`  ${h.f}:${h.line}  ${h.ch}   …${h.ctx}…`);
  if (!all && hits.length > 60) console.error(`  …and ${hits.length - 60} more`);
  console.error("\nUse an ActionIcon (aria-hidden) beside the words, or drop the glyph and keep the words.");
  console.error("An emoji may stay only as a lookup KEY that a map turns into an icon name (\"🏆\":\"award\").");
  process.exit(1);
}
console.log(`check:no-emoji ok — ${files.length} app files, 0 drawn emoji (${keys} lookup key(s) that map to an icon name, ${lbls} Lbl string(s) that open on one).`);
