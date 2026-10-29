#!/usr/bin/env node
// check:dropdown-targets — every DROPDOWN toggle in the app is drawn at least 44px tall.
//
// Owner note (2026-10-29): "On route beta, it's difficult to click the dropdown to view more
// info, audit the whole app for issues on hard to click the dropdown". ROUTE BREAKDOWN's rows
// (what the owner still calls route beta: #1450 merged ROUTE BETA and PITCH-BY-PITCH into it)
// were 35-38px, the route page's "Show more" / "Read more" links 22-27px, a group post's
// "See more" 21px, and #2909's census had nearly every route-page section toggle at 29px.
// #2909 widened the TOUCH area of small controls (lib/tapSlop.js) without redrawing them, but a
// tap between two of them ties and goes to nobody, and a dropdown is the control a climber taps
// most on the route page — so a dropdown is now DRAWN at Apple's 44pt (Material asks 48dp).
//
// A dropdown is any JSX element carrying aria-expanded (the app's disclosure convention, see
// TagChip in RouteDetail.jsx). Its opening tag must set minHeight to 44 or more, inline, so the
// size cannot drift away in a shared style object nobody re-reads. An <input> combobox is a text
// field, not a toggle, and is exempt; anything else that cannot carry it is in ALLOW with why.
// Notes: docs/guards/static-code.md (check:dropdown-targets).
//
// Blind to: a dropdown that does not carry aria-expanded (a Chevron row that opens something but
// never says so), and to the drawn size of a toggle whose content is what makes it tall —
// scripts/oneoff/probe-dropdowns.mjs measures both in Chrome, and taps each one at its centre.
import fs from "node:fs";
import path from "node:path";
import { appSources, assertCovered } from "./lib/guard-sources.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const G = "check:dropdown-targets";
const MIN = 44;
// file → a substring of the opening tag → why it needs no minHeight of its own.
const ALLOW = [
  { file: "src/components/BadgeGrid.tsx", has: "setSel(sel===b.key", why: "a badge tile: a 46px medal over its label, 64px wide — taller than 44 by its content" },
  { file: "src/components/Chevron.tsx", has: "", why: "the doc comment names aria-expanded; Chevron is decoration inside the control" },
];

const files = assertCovered(appSources(ROOT, G), ROOT, G);
const tagAt = (s, i) => {
  // walk back to the "<Name" that opens the tag holding position i (braces balanced)
  let d = 0, start = -1;
  for (let k = i; k >= 0; k--) {
    const c = s[k];
    if (c === "}") d++; else if (c === "{") d--;
    else if (c === "<" && d === 0 && /[A-Za-z]/.test(s[k + 1] || "")) { start = k; break; }
  }
  if (start < 0) return null;
  // ...and forward to the ">" that closes it, skipping braces and quoted strings
  d = 0; let q = null;
  for (let k = start + 1; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === q && s[k - 1] !== "\\") q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") d++; else if (c === "}") d--;
    else if (c === ">" && d === 0) return { start, text: s.slice(start, k + 1) };
  }
  return null;
};

const fails = [], counted = [];
for (const f of files) {
  const s = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const m of s.matchAll(/aria-expanded=/g)) {
    const line = s.slice(0, m.index).split("\n").length;
    const allow = ALLOW.find((a) => a.file === f && (a.has === "" || s.slice(Math.max(0, m.index - 600), m.index + 600).includes(a.has)));
    if (allow) { counted.push(`${f}:${line} (allowed)`); continue; }
    const tag = tagAt(s, m.index);
    if (!tag) { fails.push(`${f}:${line} aria-expanded outside any JSX tag this guard can read`); continue; }
    if (/^<input\b/.test(tag.text)) continue;
    const mh = [...tag.text.matchAll(/minHeight\s*:\s*(\d+)/g)].map((x) => +x[1]);
    counted.push(`${f}:${line}`);
    if (!mh.some((v) => v >= MIN)) {
      const name = (tag.text.match(/aria-label=\{?"([^"]{0,40})/) || [])[1] || tag.text.slice(0, 60).replace(/\s+/g, " ");
      fails.push(`${f}:${line} a dropdown drawn without minHeight >= ${MIN}${mh.length ? " (it sets " + mh.join(", ") + ")" : ""}: ${name}`);
    }
  }
}
// A DROPDOWN THAT DOES NOT SAY IT IS ONE escapes the rule above, so a Chevron whose `open` is a
// live value (it turns when something opens) must sit in a control that carries aria-expanded:
// the nearest <button or clickable( before it. 19 did not (the Calendar's "Plan the day", the
// area tree's expanders, the crew chip, a list's state groups...), and they were the ones drawn
// smallest. A literal open={true}/{false} is a "go there" or a one-way "Show N more" arrow.
let chevrons = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const m of s.matchAll(/<Chevron\b[^>]*\bopen=\{([^}]*)\}/g)) {
    if (/^\s*(true|false)\s*$/.test(m[1])) continue;
    chevrons++;
    const w = s.slice(Math.max(0, m.index - 4000), m.index);
    const k = Math.max(w.lastIndexOf("<button"), w.lastIndexOf("clickable("));
    if (k < 0 || !w.slice(k).includes("aria-expanded")) fails.push(`${f}:${s.slice(0, m.index).split("\n").length} a Chevron that turns (open={${m[1]}}) inside a control with no aria-expanded — a dropdown that does not say it is one`);
  }
}
if (chevrons < 20) { console.log(`${G} FAILED: read only ${chevrons} turning Chevrons — the app has 40+, so the scan is not reaching them`); process.exit(1); }
if (counted.length < 30) { console.log(`${G} FAILED: read only ${counted.length} dropdowns — the app has 40+, so the scan is not reaching them`); process.exit(1); }
if (fails.length) {
  console.log(`${G} FAILED — ${fails.length} dropdown toggle(s) a finger can miss (owner note 2026-10-29, "difficult to click the dropdown").\nGive the toggle's own style minHeight:${MIN} (a text link: display inline-flex + alignItems center so it stays one line):\n${fails.map((x) => "  " + x).join("\n")}`);
  process.exit(1);
}
console.log(`${G} OK — ${counted.length} dropdown toggles, every one drawn at least ${MIN}px tall.`);
