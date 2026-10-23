// Can you get out of every dialog without guessing?
//
// Reported against the log-a-climb picker: "the x disappears when you scroll, also add a back
// button to everything, I don't see one there." That screen did have a Back button — it was
// scrolling off the top with the header — but the question it raises is general, and nothing
// asked it before: does every overlay in the app offer a visible way out?
//
// Tapping the backdrop usually closes these, but that is an affordance you have to already
// know about, and it does not exist at all on a dialog that fills the screen.
//
// Static. Finds each role="dialog" element, takes its own JSX subtree, and looks for a
// dismiss control inside it: aria-label Close/Back, a Back label, or a bare x/times glyph.
import fs from "fs";
import path from "path";
import url from "url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
// .jsx only. lib/dialogA11y.js is the central focus-trap/Escape helper and mentions
// role="dialog" in prose and in a querySelector string; those are not dialogs, and treating
// them as unclosable ones is noise. Dialogs are authored in JSX.
const files = appSources(ROOT, "check:dialog-dismiss").filter(f => /\.[jt]sx$/.test(f)).map(f => path.join(ROOT, f));

// The region must be THIS dialog's subtree and nothing else. A fixed character window is not
// good enough, and that is not a theoretical objection: the first draft took 60,000 characters
// from the opening tag, which on these dense lines runs straight into the next component. With
// it, stripping BOTH the Back button and the close X out of the log-a-climb picker still
// reported "every dialog offers a visible way out" — it was reading a neighbour's close
// button. Only the injection found that.
//
// So: read the element's tag name, then walk forward counting opening and closing tags of the
// same name until depth returns to zero. Over RAW source, never a comment/string-blanked copy
// — JSX body text is full of apostrophes, so a blanker desynchronises and eats delimiters,
// which is the reason check:overlay-discovery gives for reading raw as well.
function endOfTag(src, from) {
  let q = null;
  for (let z = from; z < src.length; z++) {
    const ch = src[z];
    if (q) { if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === ">") return z;
  }
  return -1;
}

function elementRegion(src, at) {
  const start = src.lastIndexOf("<", at);
  if (start < 0) return null;
  const m = /^<([A-Za-z][A-Za-z0-9.]*)/.exec(src.slice(start, start + 40));
  if (!m) return null;
  const name = m[1];
  const openEnd = endOfTag(src, start + 1);
  if (openEnd < 0) return null;
  if (src[openEnd - 1] === "/") return src.slice(start, openEnd + 1); // self-closing
  const open = new RegExp("<" + name + "(?=[\\s/>])", "g");
  const close = new RegExp("</" + name + "\\s*>", "g");
  let depth = 1, j = openEnd + 1;
  while (depth > 0 && j < src.length) {
    open.lastIndex = j; close.lastIndex = j;
    const o = open.exec(src), c = close.exec(src);
    if (!c) return src.slice(start, j); // unbalanced source; report what we have
    if (o && o.index < c.index) {
      const e = endOfTag(src, o.index + 1);
      if (e < 0) return src.slice(start, j);
      if (src[e - 1] !== "/") depth++;   // a self-closing <div … /> opens nothing
      j = e + 1;
    } else {
      depth--;
      j = c.index + c[0].length;
    }
  }
  return src.slice(start, j);
}

// The vocabulary is wider than it looks like it needs to be, and both additions were found by
// running it: "Blocked climbers" uses "‹ Back" (U+2039, not the U+2190 arrow every other
// screen uses) and Onboarding's way out is "Skip for now". Both were real exits reported as
// missing.
//
// But the words alone are not the test, and the injection is why. Searching the whole dialog
// subtree for "Close|Cancel|Back|Done" matches ordinary copy — the log-a-climb picker says
// "Includes climbs from before you joined", and a dozen dialogs discuss closures, cancelling a
// crew, or being done for the day. With a word scan, stripping the picker's Back button AND
// its X still passed. So a candidate only counts when it is the label of an actual BUTTON.
const BACK_GLYPH = "←|‹|❮|&larr;|&lsaquo;";
// The CLOSE glyph was matched ONLY on its own (`>✕<`), while the back glyph was already allowed
// as a prefix to a word (`>← Back<`). That asymmetry reported a real, discoverable control as
// missing: the full-screen route map's exit reads `✕ Close`, which is the clearest dismiss
// control in the app and matched nothing here. Found when giving that view a dialog role pulled
// it into this guard for the first time. Allowing the glyph as an optional PREFIX makes the two
// symmetric and loosens nothing else -- the words still only count as a BUTTON's own label, which
// is the property the injection in this file's header exists to protect.
const CLOSE_GLYPH = "×|✕|✖|&times;";
const WORDS = "Cancel|Done|Close|Back|Skip(?: for now)?|Not now|Maybe later|Dismiss";
const GLYPH = `${BACK_GLYPH}|${CLOSE_GLYPH}`;
const BUTTON_LABEL = [
  new RegExp(`aria-label\\s*=\\s*"\\s*(?:${GLYPH})?\\s*(?:${WORDS})`, "i"),
  new RegExp(`>\\s*(?:${GLYPH})?\\s*(?:${WORDS})\\s*<`),
  new RegExp(`\\{\\s*"\\s*(?:${GLYPH})?\\s*(?:${WORDS})\\s*"\\s*\\}`),
  /aria-label\s*=\s*"[^"]*\b(?:close|back|cancel|dismiss)\b/i,
  new RegExp(`>\\s*(?:${CLOSE_GLYPH})\\s*<`),
  new RegExp(`\\{\\s*"(?:${CLOSE_GLYPH})"\\s*\\}`),
];

// Every <button> in the region, as its own subtree, so a label is tested against the control
// that carries it rather than against the surrounding prose.
function buttonsIn(region) {
  const out = [];
  let i = 0;
  for (;;) {
    i = region.indexOf("<button", i);
    if (i < 0) break;
    const sub = elementRegion(region, i + 1);
    if (sub) out.push(sub);
    i += 7;
  }
  return out;
}

function hasDismiss(region) {
  return buttonsIn(region).some(b => BUTTON_LABEL.some(re => re.test(b)));
}

// SECTION 2 — every dialog has a NAME. A screen reader announces a dialog by its name when focus
// moves in; without one VoiceOver says only "dialog", and the climber has to explore it to learn
// what opened. axe-core (check:axe) found the "Vouches you've given" sheet like this on
// 2026-10-22, and a scan here then found six more: the route filter, the line drawer, the topo,
// the share sheet, the photo lightbox and the photo picker. The name must sit on the dialog's
// OWN opening tag: a heading inside it does not name it unless aria-labelledby points there.
// endOfTag() stops at the first ">", which inside an opening tag is usually the arrow of an
// onClick={()=>…}: the attributes AFTER it, aria-label included, would never be read. So this
// one counts braces, and only a ">" outside every {…} and every string ends the tag.
function openingTag(src, at) {
  const start = src.lastIndexOf("<", at);
  if (start < 0) return "";
  let depth = 0, q = null;
  for (let z = start + 1; z < src.length; z++) {
    const ch = src[z];
    if (q) { if (ch === "\\") z++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") q = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return src.slice(start, z + 1);
  }
  return "";
}
const NAMED = /\saria-(?:label|labelledby)\s*=/;

let dialogs = 0;
const missing = [], unnamed = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  let i = 0;
  for (;;) {
    i = src.indexOf('role="dialog"', i);
    if (i < 0) break;
    dialogs++;
    // `role="dialog"` in backticks is prose about a dialog (TermsReaccept explains why it is NOT one).
    if (src[i - 1] !== "`" && !NAMED.test(openingTag(src, i))) unnamed.push(`${path.basename(f)}:${src.slice(0, i).split("\n").length}`);
    const region = elementRegion(src, i);
    if (region != null && !hasDismiss(region)) {
      const line = src.slice(0, i).split("\n").length;
      const label = (region.match(/aria-label\s*=\s*"([^"]{0,60})"/) || [])[1] || "(unlabelled)";
      missing.push(`${path.basename(f)}:${line}  ${label}`);
    }
    i += 12;
  }
}

console.log(`check:dialog-dismiss — read ${files.length} file(s), ${dialogs} dialog(s)`);
// Zero dialogs means the scan broke, not that the app has no modals: check:overlay-discovery
// counts 50. Treat a near-empty scan as a failure, never as a pass.
if (dialogs < 10) {
  console.error(`FAIL: only ${dialogs} dialogs found — the scan is not reading the app.`);
  process.exit(1);
}
if (unnamed.length) {
  console.error(`\nFAIL: ${unnamed.length} dialog(s) with no aria-label or aria-labelledby on the dialog itself.`);
  console.error("A screen reader announces an unnamed dialog as just \"dialog\" (WCAG 4.1.2).\n");
  unnamed.forEach(m => console.error("  " + m));
}
if (!missing.length) {
  console.log("ok — every dialog offers a visible way out.");
  if (!unnamed.length) console.log("ok — every dialog has a name.");
  process.exit(unnamed.length ? 1 : 0);
}
console.error(`\nFAIL: ${missing.length} dialog(s) with no visible close or back control.`);
console.error("Backdrop-tap is not an answer: it is undiscoverable, and absent on a full-screen sheet.\n");
missing.forEach(m => console.error("  " + m));
process.exit(1);
