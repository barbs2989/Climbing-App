// Which overlays can LIE about emptiness under an outage? -- v4, and the version history is the
// point: every earlier version printed a SMALL, reassuring number and was blind.
//
//   v1  "1 of 53"  -- an overlay rendered `if(x)return <>...` has no `x&&`/`x?` marker, and the
//                     copy lives in the COMPONENT, not the region.
//   v2  "1 of 53"  -- brace-balancing FROM that early return meets `{_toastEl}` and closes at
//                     once, so the rendered component is never seen.
//   v3  "7 of 53"  -- better, and still missing the Inbox: `function Inbox({...})` has
//                     DESTRUCTURED PARAMS, whose braces open and close before the body, so the
//                     balancer returned 150 characters of parameter list. That is the exact trap
//                     memory records as "a guard scanned 13% of its subject and reported GREEN".
//
// Each was caught only by a fail-closed assertion that a KNOWN instance must appear. Without it
// the first number would have been reported as a finding.
import fs from "node:fs";
import path from "node:path";
import { overlayStates } from "../lib/overlay-scaffold.mjs";

import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

const CLAIMS = /no .{0,30}? yet|nothing here|none yet|no results|no custom lists|\bno(?: \w+){0,2} (?:climbs?|crews?|routes?|areas?|objectives?|friends?|groups?|invites?|lists?|reports?|catches|vouches|chats?|messages?|photos?)\b|\b0 (?:climb|crew|route|area|objective|logged|joined|friend|group|invite)/gi;
const FLAGS = [...new Set([...(app + core).matchAll(/([A-Za-z_$][\w$]*Unavailable)/g)].map((m) => m[1]))];

// Skip the PARAMETER LIST before balancing the body, or a destructured signature ends the walk
// before the body starts.
function bodyOf(src, name) {
  const m = new RegExp("function\\s+" + name + "\\s*\\(").exec(src);
  if (!m) return null;
  let k = m.index + m[0].length - 1, paren = 0;
  for (; k < src.length; k++) {
    if (src[k] === "(") paren++;
    else if (src[k] === ")") { paren--; if (paren === 0) { k++; break; } }
  }
  while (k < src.length && src[k] !== "{") k++;
  let depth = 0, started = false;
  for (let j = k; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") { depth++; started = true; }
    else if (ch === "}") { depth--; if (started && depth === 0) return src.slice(m.index, j + 1); }
  }
  return null;
}

const states = overlayStates(app, core);
const rows = [];
for (const st of states) {
  const n = st.name.replace(/[$]/g, "\\$");
  const re = new RegExp("\\b" + n + "\\s*(?:&&|\\?)|if\\s*\\(\\s*" + n + "\\s*\\)\\s*return", "g");
  re.lastIndex = st.at;
  const m = re.exec(app);
  if (!m) continue;
  const win = app.slice(m.index, m.index + 3000);
  const comps = [...new Set([...win.matchAll(/<([A-Z][\w$]*)[\s/>]/g)].map((x) => x[1]))];
  let text = win;
  const followed = [];
  for (const c of comps) {
    const b = bodyOf(core, c) || bodyOf(app, c);
    if (b && b.length > 200) { text += "\n" + b; followed.push(`${c}(${b.length})`); }
  }
  const claims = [...new Set((text.match(CLAIMS) || []).map((s) => s.trim()))];
  if (!claims.length) continue;
  rows.push({
    name: st.name, claims: claims.slice(0, 4),
    gated: FLAGS.filter((f) => text.includes(f)), followed: followed.slice(0, 4),
  });
}

// Fail closed on a KNOWN instance. Three versions of this measurement printed a small number and
// were blind; the only thing that caught each was this assertion.
if (!rows.some((r) => r.name === "inboxOpen")) {
  console.error("FAIL — the Inbox is absent and it demonstrably says \"No friend chats yet\".");
  console.error("The measurement is still blind. Do not read any number from this run.");
  process.exit(1);
}

const ungated = rows.filter((x) => !x.gated.length);
console.log(`${states.length} overlay states; ${rows.length} assert absence; ${ungated.length} ungated\n`);
console.log("UNGATED — nothing reachable in that text names an xUnavailable flag:");
for (const r of ungated) {
  console.log(`  ${r.name.padEnd(20)} ${JSON.stringify(r.claims)}`);
  console.log(`  ${" ".repeat(20)} via ${r.followed.join(", ") || "(inline)"}`);
}
console.log("\nREAD THE ATTRIBUTION, NOT THE COUNT. Components are collected from a 3000-char");
console.log("window after the render site, so an overlay rendered NEXT TO others picks up their");
console.log("copy as well as its own -- `dashOpen` listing Inbox is that, not a finding. The rows");
console.log("with ONE followed component are the clean ones. The count is an upper bound.");
console.log(`\nGATED (${rows.length - ungated.length}): `
  + (rows.filter((x) => x.gated.length).map((r) => `${r.name}[${r.gated.join(",")}]`).join(", ") || "(none)"));
