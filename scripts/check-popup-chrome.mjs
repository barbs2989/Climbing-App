// check:popup-chrome — every popup's way out looks the same.
//
// Reported 2026-09-24: "the back button and x out buttons need to be clearer ... it's not
// consistent with popups". Measured before the fix: ~65 popup dismiss controls drawn in at
// least EIGHT close styles (a bare muted "×" at 22px with no visible hit area; 36px circles and
// squares in three fills; 32px and 34px variants; a bordered 16px "×") and SIX back styles (a
// blue text link with zero padding, bordered pills at 13/15/16/17px, spelled "← Back" or
// "‹ Back"). They now all use the tokens in lib/popupChrome.js. This asserts it stays that way.
//
// Static; milliseconds; in build. Three rules:
//   1. A <button> whose OWN label is a lone close glyph (✕ or ×) and whose aria-label starts
//      with "Close" is a popup's close control, and must be styled POP_CLOSE / POP_CLOSE_MEDIA.
//      The aria-label is what separates it from the many chip-remove ×'s (aria-label "Remove…",
//      "Dismiss…", "Delete…"), which are deliberately small and are NOT this control.
//      Since 2026-09-25 an aria-label starting "Dismiss" counts too (a card's or banner's ✕), as
//      does title="Close" — three map info panels closed on a muted 17px × with only a title.
//   2. ANY <button> whose label starts with "←" — "← Back", "← Back to crews", "← Countries" —
//      must be styled POP_BACK / POP_BACK_MEDIA. This used to cover only buttons that closed a
//      popup, and in-page back kept "its own look": a blue text link in Safety, a 12.5px pill in
//      the country picker, a bare blue "←" span with no button in chat, a solid blue bar in the
//      area browser. Reported 2026-09-25: "make back and x button consistent among the whole app
//      for every instance". So every back is now the same control.
//   3. "‹ Back" is not a spelling. One back glyph, everywhere. And a back arrow is a <button>:
//      a clickable <span>/<div> whose whole label is "←" fails (chat's header did this).
//   4. A <button> whose OWN label is a lone ✕/× and whose aria-label or title starts with Remove,
//      Delete, Withdraw or Clear removes ONE item, and must be styled POP_REMOVE /
//      POP_REMOVE_MEDIA (32px). Added 2026-09-25: 21 of them were drawn 21 ways, 18px to 36px, most
//      a bare muted glyph. A clickable <span>/<div> whose whole label is ✕/× fails too — two photo
//      removers were spans with no name at all. A ✕ INSIDE a chip that is itself the button (the
//      filter chips) is decoration, not a control, and is not matched: its <span> has no handler.
//   5. Added 2026-09-26. (a) A map's full-screen toggle — any <button> whose aria-label or title
//      says "full screen" — is the same round control as a ✕, styled POP_CLOSE / POP_CLOSE_MEDIA:
//      ⤢ to enter, ✕ to leave. The area map drew it as a small "✕ Exit full screen" text button
//      and the route map as a bare ⤤/⤢ square with no name. (b) The ✕ drawn inside a chip that is
//      itself the button — a <span> holding only ✕/× — must be styled POP_CHIP_X (a small ring in
//      the same edge and fill), not a bare faded glyph. Floor: 3 POP_CHIP_X uses.
//
// Fails closed: fewer than 45 POP_CLOSE / 30 POP_BACK / 18 POP_REMOVE / 3 POP_CHIP_X uses means the scan is not reading the app
// (see the counts it prints), and that must never read as a clean pass.
import fs from "fs";
import path from "path";
import url from "url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const files = appSources(ROOT, "check:popup-chrome").filter(f => f.endsWith(".jsx"));

// End of an opening tag, skipping quoted strings and {…} expressions (a style object or an
// arrow function in onClick holds ">" characters that are not the tag's end).
function endOfTag(src, from) {
  let q = null, d = 0;
  for (let z = from; z < src.length; z++) {
    const ch = src[z];
    if (q) { if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "{") d++; else if (ch === "}") d--; else if (ch === ">" && d === 0) return z;
  }
  return -1;
}

// Every <button …> opening tag, with the text that immediately follows it.
function* buttons(src) {
  let i = 0;
  for (;;) {
    i = src.indexOf("<button", i);
    if (i < 0) return;
    if (!/[\s>]/.test(src[i + 7] || "")) { i += 7; continue; }
    const e = endOfTag(src, i + 1);
    if (e < 0) return;
    yield { at: i, tag: src.slice(i, e + 1), after: src.slice(e + 1, e + 40) };
    i = e + 1;
  }
}

const LONE_CLOSE = /^\s*(?:✕|×|\{\s*"(?:✕|×)"\s*\})\s*</;
const BACK_LABEL = /^\s*(?:←|\{\s*"←|\{\s*<Lbl\s+s=\{\s*"←|<span[^>]*>\s*\{\s*"←")/;
const USES_CLOSE = /style=\{\s*(?:POP_CLOSE(?:_MEDIA)?\b|Object\.assign\(\s*\{\s*\}\s*,\s*POP_CLOSE(?:_MEDIA)?\b)/;
const USES_REMOVE = /style=\{\s*(?:POP_REMOVE(?:_MEDIA)?\b|Object\.assign\(\s*\{\s*\}\s*,\s*POP_REMOVE(?:_MEDIA)?\b)/;
const USES_BACK = /style=\{\s*(?:POP_BACK(?:_MEDIA)?\b|Object\.assign\(\s*\{\s*\}\s*,\s*POP_BACK(?:_MEDIA)?\b|\{\s*\.\.\.POP_BACK(?:_MEDIA)?\b)/;

const bad = [];
let closeUses = 0, backUses = 0, removeUses = 0, chipXUses = 0;
for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const lineOf = at => src.slice(0, at).split("\n").length;
  for (const b of buttons(src)) {
    if (USES_CLOSE.test(b.tag)) closeUses++;
    if (USES_BACK.test(b.tag)) backUses++;
    if (USES_REMOVE.test(b.tag)) removeUses++;
    const aria = (b.tag.match(/aria-label\s*=\s*"([^"]*)"/) || [])[1] || "";
    const title = (b.tag.match(/title\s*=\s*"([^"]*)"/) || [])[1] || "";
    if (LONE_CLOSE.test(b.after) && (/^(?:Close|Dismiss)\b/i.test(aria) || /^Close$/i.test(title)) && !USES_CLOSE.test(b.tag))
      bad.push(`${rel}:${lineOf(b.at)}  close control "${aria}" is not styled POP_CLOSE`);
    const ariaExpr = (b.tag.match(/aria-label\s*=\s*\{\s*"([^"]*)"/) || [])[1] || "";
    const removes = /^(?:Remove|Delete|Withdraw|Clear)\b/i.test(aria || ariaExpr) || /^(?:Remove|Delete|Clear)\b/i.test(title);
    if (LONE_CLOSE.test(b.after) && removes && !USES_REMOVE.test(b.tag))
      bad.push(`${rel}:${lineOf(b.at)}  remove control "${aria || ariaExpr || title}" is not styled POP_REMOVE`);
    if (/full screen/i.test(b.tag) && !USES_CLOSE.test(b.tag))
      bad.push(`${rel}:${lineOf(b.at)}  full-screen toggle is not styled POP_CLOSE / POP_CLOSE_MEDIA`);
    if (BACK_LABEL.test(b.after) && !USES_BACK.test(b.tag))
      bad.push(`${rel}:${lineOf(b.at)}  back button is not styled POP_BACK`);
  }
  let k = -1;
  while ((k = src.indexOf("‹ Back", k + 1)) >= 0) bad.push(`${rel}:${lineOf(k)}  "‹ Back" — spell it "← Back"`);
  const bareArrow = /<(?:span|div)\b[^<]*\{\.\.\.clickable\([^<]*>\s*(?:←|\{\s*"←"\s*\})\s*<\//g;
  let m;
  const bareX = /<(?:span|div)\b[^<]*\{\.\.\.clickable\([^<]*>\s*(?:✕|×|\{\s*"(?:✕|×)"\s*\})\s*<\//g;
  while ((m = bareX.exec(src))) bad.push(`${rel}:${lineOf(m.index)}  a clickable ✕ that is not a <button> — use <button aria-label="Remove …" style={POP_REMOVE}>✕</button>`);
  const chipX = /<span\b([^<>]*)>\s*(?:✕|×|\{\s*"(?:✕|×)"\s*\})\s*<\/span>/g;
  while ((m = chipX.exec(src))) {
    if (/clickable\(|onClick/.test(m[1])) continue;
    if (/style=\{\s*POP_CHIP_X\b/.test(m[1])) chipXUses++;
    else bad.push(`${rel}:${lineOf(m.index)}  a ✕ inside a chip is not styled POP_CHIP_X`);
  }
  while ((m = bareArrow.exec(src))) bad.push(`${rel}:${lineOf(m.index)}  a clickable "←" that is not a <button> — use <button style={POP_BACK}>← Back</button>`);
}

console.log(`check:popup-chrome — read ${files.length} file(s): ${closeUses} POP_CLOSE, ${backUses} POP_BACK, ${removeUses} POP_REMOVE, ${chipXUses} POP_CHIP_X`);
if (closeUses < 45 || backUses < 30 || removeUses < 18 || chipXUses < 3) {
  console.error(`FAIL: only ${closeUses} POP_CLOSE / ${backUses} POP_BACK / ${removeUses} POP_REMOVE / ${chipXUses} POP_CHIP_X uses found — the scan is not reading the app.`);
  process.exit(1);
}
if (!bad.length) { console.log("ok — every popup's close and back controls use lib/popupChrome.js."); process.exit(0); }
console.error(`\nFAIL: ${bad.length} popup control(s) drawn in their own style:\n`);
bad.forEach(m => console.error("  " + m));
console.error("\nUse POP_CLOSE / POP_CLOSE_MEDIA / POP_BACK from lib/popupChrome.js, so every popup's way out looks the same.");
process.exit(1);
