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

/* UNGATED IS NOT THE SAME AS UNCHECKED, and leaving it undifferentiated is how a count gets
   re-derived from scratch every time somebody runs this. An overlay needs a flag only if a FAILED
   READ could produce the sentence; where the copy comes from seed constants, from client state, or
   from a filter the user just set, there is no read to fail and gating it would replace correct
   copy with an error — the mistake already made once on FriendsList's "No friends match".

   Each entry is a REASON, verified by reading the component, not a pass. A name here that starts
   naming a flag is stale bookkeeping and is reported as such below. */
const CHECKED = {
  areaTreeOpen: "AreaTree is gated on `selArea`, which is written only on the SEED catalog path — dead in production (VITE_USE_DB=true renders DbAreaBrowser)",
  logPickOpen: "LogRoutePicker filters the seed ROUTES/MOUNTAINS module constants; no DB read to fail",
  contribOpen: "Contributions receives `items={contribs}`, a useState client value, not a query",
  logCatchWith: 'the copy is "No climbs match." — a statement about the filter the user just typed, true during an outage',
  giveVouchWith: 'same "No climbs match." filter copy',
  quickLogFor: 'same "No climbs match." filter copy',
  profileModal: "FullProfile's vouches/objectives come from `climber.vouches` and `climber.objectiveIds`, which a DB-derived profile NEVER carries — empty always, not because of an outage",
  eventInvite: "renders FullProfile; same reason",
  shareOpen: 'the "No route" hits are FILTER copy — "No routes match." / "No routes match these filters." — true whatever loaded',
  notifOpen: "same filter copy, picked up from AddRoute/Contributions in the 3000-char window",
  addRouteOpen: "same filter copy",
  onboardOpen: "same filter copy",
  crewListOpen: "\"no real organizer to respond yet\" is about OPEN_CREWS, the seed demo crews — no query behind it",
  feedbackOpen: 'MATCHED INSIDE A COMMENT, not rendered copy: the "nothing here" is prose in ClimbMatchCore.jsx explaining why reason formatting uses plain-text markers. See the scanner note below.',
  legal: "LegalView is static copy; the certifications/skills/events lines come from GuideDashboard, which is seed-backed (DEMO_FILLERS)",
};

/* THE SCANNER READS COMMENTS AS COPY, and `feedbackOpen` above is the proof — its only claim is a
   sentence inside a block comment. That inflates the count with rows that render nothing.
   NOT fixed with a regex strip: this repo has already had one eat real code at a URL's `//`, and a
   stateful scanner that tracks quotes desynchronises on an apostrophe in JSX text. The correct fix
   is to collect JSXText and StringLiteral values with Babel and match only those, the way
   check:no-rendered-sources does. Left undone deliberately — this is a one-off measurement, every
   current row is resolved above, and a half-safe strip would be worse than a known limitation.
   IF A NEW ROW APPEARS, check whether its claim is actually rendered before believing it. */

const ungatedAll = rows.filter((x) => !x.gated.length);
const stale = Object.keys(CHECKED).filter((n) => rows.some((r) => r.name === n && r.gated.length));
const ungated = ungatedAll.filter((r) => !CHECKED[r.name]);
const checked = ungatedAll.filter((r) => CHECKED[r.name]);
console.log(`${states.length} overlay states; ${rows.length} assert absence; ${ungatedAll.length} ungated — ${checked.length} of those CHECKED and explained, ${ungated.length} not yet read\n`);
if (stale.length) {
  console.log(`STALE: ${stale.join(", ")} now name a flag, so their CHECKED entry is describing code that has moved. Remove it.\n`);
}
console.log("CHECKED — ungated for a reason, verified by reading the component:");
for (const r of checked) console.log(`  ${r.name.padEnd(20)} ${CHECKED[r.name]}`);
console.log("\nNOT YET READ — nothing reachable in that text names an xUnavailable flag:");
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
