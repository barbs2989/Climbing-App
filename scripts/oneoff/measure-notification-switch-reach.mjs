// WHAT DOES EACH "NOTIFICATIONS" SWITCH ACTUALLY SUPPRESS?
//
// Settings offers four switches under a Notifications heading — Crew updates, Messages, Condition
// reports, Requests & vouches — and each names the events it governs ("New direct & crew
// messages", "New trip reports on your saved climbs", "Friend / crew requests and vouches").
//
// The filter is one line: `notifAllowed = n => !n.cat || notifPrefs[n.cat] !== false`. So a
// notification carrying no `cat` is shown WHATEVER the four switches are set to, and a switch
// whose category no notification carries suppresses nothing at all. Neither fact is visible from
// the Settings screen, which renders four identical-looking working switches.
//
// This counts, per switch, how many notifications in the merged list it can reach — and splits
// them by whether the notification reports something ANOTHER CLIMBER did (the thing each label
// names) or a receipt for something YOU just did.
//
// Read-only, no DB, no browser: every notification in the list is an object literal in
// ClimbMatch.jsx, so the question is answerable from the source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

const dead = (m) => { console.error("FAIL: " + m); process.exit(1); };

// ── The four switches, read off the control group rather than typed here. A fifth added to the
//    UI and not to this list would otherwise be measured as though it did not exist.
const li = src.indexOf('<SL>Notifications</SL>');
if (li < 0) dead("the Notifications section heading moved — this run would measure nothing");
const arr = src.slice(li, src.indexOf(".map(", li));
const SWITCHES = [...arr.matchAll(/\["([a-z]+)","([^"]+)","([^"]+)"\]/g)].map((m) => ({ key: m[1], label: m[2], sub: m[3] }));
if (SWITCHES.length < 3) dead(`parsed ${SWITCHES.length} switches — the control group's shape moved`);

// ── The filter itself, so this measures the app's rule rather than a copy of it.
const filt = src.match(/const notifAllowed=([^;]+);/);
if (!filt) dead("notifAllowed moved — the rule below would be a guess");
const RULE = filt[1].trim();

// ── Every notification-shaped literal, with its cat and its text. `notifs` is CLEARED on sign-in
//    (`if(uid){…setNotifs([])…}`), so the seeded ones are what a signed-out visitor sees and a
//    signed-in climber does not — the two are counted separately rather than pooled.
function balanced(from, o, c) {
  let d = 0;
  for (let i = from; i < src.length; i++) {
    if (src[i] === o) d++;
    else if (src[i] === c && --d === 0) return src.slice(from, i + 1);
  }
  return null;
}
const si = src.indexOf("[notifs,setNotifs]=useState(");
if (si < 0) dead("the notifs state moved");
const seed = balanced(src.indexOf("(", si), "(", ")") || "";
if (!/setNotifs\(\[\]\)/.test(src)) dead("nothing clears notifs on sign-in — the seeded/live split below is wrong");

const catOf = (t) => (t.match(/cat:"([a-z]+)"/) || [])[1] || null;
const textOf = (t) => ((t.match(/text:"([^"]{0,90})/) || [])[1] || "").replace(/\s+/g, " ");

const rows = [];
for (const m of seed.matchAll(/\{id:"[a-z_0-9]+"[^{}]*?\}/g)) {
  const txt = textOf(m[0]);
  if (txt) rows.push({ where: "seeded (signed out only)", cat: catOf(m[0]), text: txt });
}
// Everything a signed-in climber can actually receive: the derived reminder lists, and whatever
// the session pushes into `notifs` after the reset.
for (const name of ["_anniv", "_eventReminders", "_climbReminders", "_crewFollow", "_nrem"]) {
  const j = src.indexOf("const " + name + "=");
  if (j < 0) dead(`${name} moved — a whole source of notifications would go uncounted`);
  const chunk = src.slice(j, j + 2600);
  const c = (chunk.match(/cat:"([a-z]+)"/) || [])[1] || null;
  rows.push({ where: "derived", cat: c, text: name + " — " + (textOf(chunk) || "(computed)") });
}
for (const m of src.matchAll(/setNotifs\(/g)) {
  const chunk = balanced(m.index + "setNotifs".length, "(", ")") || "";
  const txt = textOf(chunk) || ((chunk.match(/text:([^,)]{0,46})/) || [])[1] || "").replace(/\s+/g, " ");
  if (txt) rows.push({ where: "pushed in-session", cat: catOf(chunk), text: txt });
}
if (rows.length < 20) dead(`only ${rows.length} notifications parsed — the scan broke`);

// ── INCOMING vs RECEIPT. A receipt starts by telling you what YOU did; that is the app's own
//    wording, not a classification invented here.
const receipt = (t) => /^(You |Did your crew|Climbed recently|Log your|Heading out|Finish )/.test(t);

console.log("The rule every notification passes through:\n  " + RULE + "\n");
console.log(`${rows.length} notifications reach the merged list.\n`);
console.log("  SWITCH               reaches  of which INCOMING (what the label names)");
for (const s of SWITCHES) {
  const mine = rows.filter((r) => r.cat === s.key);
  const inc = mine.filter((r) => !receipt(r.text));
  const flag = mine.length === 0 ? "   <-- suppresses NOTHING" : inc.length === 0 ? "   <-- only your own receipts" : "";
  console.log(`  ${s.label.padEnd(20)} ${String(mine.length).padStart(5)}  ${String(inc.length).padStart(23)}${flag}`);
}

const untagged = rows.filter((r) => !r.cat);
console.log(`\n${untagged.length} of ${rows.length} carry no cat at all, so NO switch can hide them:`);
for (const r of untagged) console.log(`  [${r.where}] ${r.text.slice(0, 88)}`);

console.log("\nper switch, in full:");
for (const s of SWITCHES) {
  console.log(`\n  ${s.label} — "${s.sub}"`);
  const mine = rows.filter((r) => r.cat === s.key);
  if (!mine.length) console.log("    (nothing)");
  for (const r of mine) console.log(`    ${receipt(r.text) ? "receipt " : "INCOMING"}  ${r.text.slice(0, 84)}`);
}
