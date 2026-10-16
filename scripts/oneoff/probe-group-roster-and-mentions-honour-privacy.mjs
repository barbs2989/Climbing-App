#!/usr/bin/env node
// THE GROUP ROSTER SPOKE A NAME THE CLIMBER HAD HIDDEN — to every member of the group.
//
// `_asMember` resolves a DB group's members through `useProfilesByIds`, which returns `username`
// and a mapped `showName` (#1619). It used neither:
//
//     return p ? {id:p.id, name:p.name||"Climber", avatar:p.avatar||"", _profile:true} : null;
//
// That object is the group's WHOLE VOCABULARY for a person — the roster row, the moderator chips,
// the mention picker, the text a mention INSERTS, and the "Notified X" toast all read `.name`.
//
// GATING ONLY THE RENDERED ROWS WOULD NOT HAVE BEEN A FIX. The picker inserts
// `"@" + m.name.split(" ")[0]`, so a partial fix leaves the real name being typed into a post
// body that every member reads — worse than the row it repaired. It is the whole path or none.
//
// ...AND THE WHOLE PATH BREAKS MENTIONS IF DONE NAIVELY. `extractMentionIds` builds
// `new RegExp("@" + firstToken + "\\b")`. With a handle-shaped name that token already starts with
// "@", giving "@@robinb" — the inserter and the extractor would agree with each other on that
// doubled form while a human typing `@robinb` resolved to nobody. One shared `mentionToken()`
// strips the leading "@" for both, so they cannot drift.
//
// The blocked-climbers screen had the same bare `.name`. It is your own list, but it is reachable
// without consent: block somebody you only ever saw as a handle and their real name appears.
//
//   node scripts/oneoff/probe-group-roster-and-mentions-honour-privacy.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

// Bundle INSIDE the project (node resolves deps from the nearest node_modules) and clean up on
// exit rather than at the end of the happy path, so a throw cannot leave a stray directory in the
// working tree for somebody to commit by accident.
const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-roster-probe-"));
process.on("exit", () => { try { fs.rmSync(outdir, { recursive: true, force: true }); } catch {} });
const out = path.join(outdir, "b.cjs");
await build({
  stdin: {
    contents: `export { pubNameRow, mentionToken, groupMentionMatch, extractMentionIds } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`,
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { pubNameRow, mentionToken, groupMentionMatch, extractMentionIds } = require_(out);

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");
const app = strip(fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8"));

// ---- 1. THE MAPPING, as source. Executing `_asMember` is not available (it is a closure over
// component state), so this half is a source assertion and says so.
if (/name:pubNameRow\(p\)\|\|"Climber"/.test(app)) ok("_asMember names a group member through the gate");
else fail("_asMember still takes a bare p.name — a hidden name reaches every group member");

if (/name:pubNameRow\(r\.profile\)\|\|"Climber"/.test(app)) ok("the blocked list names people through the gate");
else fail("the blocked list still takes a bare .name");

if (!/name:\(r\.profile&&r\.profile\.name\)/.test(app)) ok("...and no bare-name form survives in it");
else fail("the blocked list's bare-name form survives");

// ---- 2. THE INSERTER AND THE EXTRACTOR SHARE ONE TOKEN. This is the half that breaks silently:
// a mention that inserts fine and resolves to nobody looks like nothing at all.
if (/\+"@"\+mentionToken\(m\)\+" "/.test(app)) ok("the mention chip inserts the shared token");
else fail("the mention chip builds its own token — it can drift from the extractor");

// ---- 3. THE ROUND TRIP, EXECUTED. Source cannot show that a mention still resolves.
const REAL = { id: "a", name: "Robin Belay" };          // chose to show their name
const HIDDEN = { id: "b", name: "@robinb" };            // chose not to — pubNameRow gave a handle
const members = [REAL, HIDDEN];

for (const [who, m] of [["a real name", REAL], ["a handle", HIDDEN]]) {
  const inserted = "nice lead @" + mentionToken(m) + " ";
  const ids = extractMentionIds(inserted, members);
  if (ids.includes(m.id)) ok(`a mention written for ${who} resolves back to that member`);
  else fail(`a mention written for ${who} inserted "${inserted.trim()}" and resolved to nobody`);
}

// ...and it must not resolve to the WRONG member, or the fix would be trading one defect for a
// misdirected notification.
const only = extractMentionIds("nice lead @" + mentionToken(HIDDEN) + " ", members);
if (only.length === 1) ok("...and to exactly one member, not both");
else fail(`a handle mention resolved to ${only.length} member(s)`);

// The picker must still FIND a member as you type. Its regex demands a letter after "@", so a
// handle-shaped name is only reachable because the match is a substring test.
const typed = groupMentionMatch("nice lead @rob", members);
if (typed && typed.matches.some((x) => x.id === HIDDEN.id)) ok("typing @rob still offers the handle member");
else fail("the picker cannot find a member whose public name is a handle");

// ---- 4. THE TOKEN'S OWN CONTRACT, both directions.
if (mentionToken(HIDDEN) === "robinb") ok("mentionToken strips the leading @");
else fail(`mentionToken(handle) = ${JSON.stringify(mentionToken(HIDDEN))}`);
if (mentionToken(REAL) === "Robin") ok("...and leaves a first name alone");
else fail(`mentionToken(real) = ${JSON.stringify(mentionToken(REAL))}`);
if (mentionToken(null) === "") ok("...and answers empty for a member that did not resolve");
else fail("mentionToken(null) is not empty");

// ---- 5. THE GATE ITSELF, so a broken pubNameRow cannot make section 1 vacuous.
if (pubNameRow({ name: "Robin Belay", username: "robinb", showName: false }) === "@robinb")
  ok("pubNameRow still hides a name the climber did not choose to show");
else fail("pubNameRow no longer hides a hidden name — section 1 asserts nothing");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
