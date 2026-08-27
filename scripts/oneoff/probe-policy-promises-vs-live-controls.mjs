// Does a legal surface describe a privacy CONTROL the app does not render?
//
// PRIVACY_CONTROLS_LIVE=false is documented as open BY DESIGN — the controls behind it are not
// server-enforced, and shipping them would promise protection the backend does not deliver. That
// decision stands and this does not touch it. The open question counsel was left with is a WORDING
// one, and nothing had measured it: the flag renders those controls as `null`, so they are ABSENT
// from the app, while the Privacy Policy and the in-app sheet may still describe them as settings a
// climber has.
//
// Same shape as F1 and F7 in the lawyer packet — "the documents describe an operator with
// capabilities nobody built" — pointed at the USER's capabilities instead.
//
// Reads the shipped legal text and the settings screen from source. No DB, no browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

const flag = /const PRIVACY_CONTROLS_LIVE\s*=\s*(true|false)/.exec(core);
if (!flag) { console.error("ANCHOR LOST: `const PRIVACY_CONTROLS_LIVE=` is not in ClimbMatchCore.jsx"); process.exit(1); }
const live = flag[1] === "true";
console.log(`PRIVACY_CONTROLS_LIVE = ${flag[1]}\n`);

// Which settings controls sit behind the flag? Each `{PRIVACY_CONTROLS_LIVE?<...>:null}` block —
// note `:null`, so a false flag REMOVES the control rather than disabling it.
const gated = [];
for (const m of app.matchAll(/\{PRIVACY_CONTROLS_LIVE\?/g)) {
  const w = app.slice(m.index, m.index + 900);
  const label = /aria-label="([^"]+)"/.exec(w) || /letterSpacing:0\.3\}\}>([A-Z][A-Z ]{4,})</.exec(w);
  gated.push(label ? label[1] : "(unlabelled)");
}
if (!gated.length) { console.error("no PRIVACY_CONTROLS_LIVE-gated blocks found in ClimbMatch.jsx — scan broken"); process.exit(1); }
console.log(`${gated.length} control(s) behind the flag${live ? "" : " — currently RENDERED AS null, i.e. absent"}:`);
for (const g of gated) console.log(`   · ${g}`);

// Extract the two shipped legal surfaces and the in-app sheet's own text.
const lift = (anchor) => {
  const i = core.indexOf(anchor);
  if (i < 0) throw new Error(`ANCHOR LOST: ${anchor}`);
  let d = 0, e = -1, inStr = null;
  for (let k = core.indexOf("[", i); k < core.length; k++) {
    const c = core[k];
    if (inStr) { if (c === "\\") k++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "[") d++; else if (c === "]" && --d === 0) { e = k + 1; break; }
  }
  if (e < 0) throw new Error(`unbalanced literal for ${anchor}`);
  return core.slice(i, e);
};
const surfaces = [["Terms of Service", lift("const TERMS=")], ["Privacy Policy", lift("const PRIVACY=")]];

/* What a PROMISE looks like: the document telling the reader they have a control. Deliberately
   narrow — "we use approximate location" is a statement about PROCESSING and is fine; "you control
   location sharing" is a claim about a switch. Matching the mere WORD would flag every correct
   sentence, the too-broad-needle trap this repo records throughout. */
const PROMISES = [
  { control: "Share approximate location only",
    re: /you control location sharing|&ldquo;?approximate location only&rdquo;? shares|"Approximate location only" shares|approximate location only”? shares/i },
  { control: "Who can see my full profile",
    re: /governed by your privacy settings|the fields you choose to make visible|choose who can see your (?:full )?profile/i },
  { control: "Show my online status", re: /online status/i },
  { control: "Who can invite me to crews", re: /who can invite you|crew invites? settings?/i },
];

let found = 0;
console.log("");
for (const [name, text] of surfaces) {
  for (const p of PROMISES) {
    const m = p.re.exec(text);
    if (!m) continue;
    // Only a finding while the control is absent.
    const isGated = gated.some(g => g.toLowerCase().includes(p.control.toLowerCase().slice(0, 14))
      || p.control.toLowerCase().includes(g.toLowerCase().slice(0, 14)));
    if (!isGated || live) continue;
    found++;
    const at = Math.max(0, m.index - 90);
    console.log(`>> ${name} describes "${p.control}", which the app does not render:`);
    console.log(`   …${text.slice(at, m.index + m[0].length + 110).replace(/\s+/g, " ")}…\n`);
  }
}

console.log(found
  ? `${found} promise(s) of a control a climber does not have.\n\nThis is a WORDING question, not an argument for flipping the flag: the controls are not\nserver-enforced, so rendering them would promise more, not less. Either the sentence goes, or it\nstops describing a switch and describes what the app actually does with the data.`
  : `No legal surface promises a control the app withholds.`);
process.exit(0);
