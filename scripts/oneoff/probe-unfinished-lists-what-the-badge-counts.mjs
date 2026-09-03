// THE CREW BADGE AND "UNFINISHED BUSINESS" ARE A COUNT AND ITS LIST, AND THEY WERE BUILT FROM
// DIFFERENT SOURCES.
//
// `crewBadgeN` sums eight things. The Home panel that exists to SHOW you those things built rows
// from six. The two it skipped are the only ones a REAL account can have:
//
//     myCrewInvitesQ.data   crew invites from the database
//     crewNeedsMyDay        crews waiting on your day-ack
//
// Every other source is seed `useState` that the sign-in reset empties — friendReqIn is `[5]`,
// crewReqIn/crewJoinIn/groupReqs are seed literals. So a signed-in climber with a genuine pending
// invite saw a red 3 on the Crew tab and, on Home, "No requests, invites or unread messages."
// The badge was right and the list was wrong, which is the worse way round: the badge is what
// tells you to look, and the panel is where looking leads.
//
// Found in a CI `signed-in-screens` capture, by reading two numbers on one screen rather than by
// any guard — the same way #1203 was found.
//
// STRUCTURAL, NOT RENDERED, and that is a limitation worth stating: `App` needs auth, a query
// client and a session, so no SSR probe stands it up. What is checked is that the two expressions
// draw on the same set of sources. It cannot prove a row reaches the screen.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (m) => { console.error("FAIL (probe cannot report): " + m); process.exit(1); };
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

// The badge sums raw maps (dmUnread) where the list iterates a derived array (unreadDMs). Those
// are the same fact under two names, so the pairing is DECLARED rather than guessed — and a stale
// entry fails, so the map cannot rot into a description of code that is gone.
const ALIASES = {
  dmUnread: "unreadDMs",
  crewUnread: "unreadCrews",
  crewNeedsMyDay: "crewsNeedingMyDay",
};

const badgeM = /crewBadgeN=([^;]+)/.exec(src);
if (!badgeM) dead("crewBadgeN is gone — ANCHOR LOST");
const badgeExpr = badgeM[1];

const listStart = src.indexOf("var unfinished=[];");
if (listStart < 0) dead("the unfinished list is gone — ANCHOR LOST");
const listEnd = src.indexOf("var _uz=!unfinished.length;", listStart);
if (listEnd < 0) dead("could not find the end of the unfinished block — ANCHOR LOST");
const listBlock = src.slice(listStart, listEnd);

// Identifiers the badge actually sums. Anything that is not a source (Number, Object, values,
// filter, length, data) is dropped; what is left is the source list.
const NOISE = new Set(["Object", "values", "filter", "length", "Number", "v", "data", "map"]);
const badgeSources = Array.from(new Set(
  (badgeExpr.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []).filter((w) => !NOISE.has(w))
));

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};

// Without these, "every source is represented" is satisfied by an expression that parsed to
// nothing and a block that was read as empty.
ok("ANCHOR — the badge sums a plausible number of sources", badgeSources.length >= 6,
  `parsed ${badgeSources.length}: ${badgeSources.join(", ")}`);
ok("ANCHOR — the unfinished block was read", listBlock.length > 800 && listBlock.includes("unfinished.push"),
  `${listBlock.length} chars`);

for (const srcName of badgeSources) {
  const alias = ALIASES[srcName];
  const found = listBlock.includes(srcName) || (alias && listBlock.includes(alias));
  ok(`the list covers \`${srcName}\`${alias ? ` (as \`${alias}\`)` : ""}`, found,
    "the badge counts it and the panel that exists to show it does not list it");
}

// A stale alias means the map describes an expression that has moved on.
for (const k of Object.keys(ALIASES)) {
  ok(`alias \`${k}\` still names something the badge sums`, badgeExpr.includes(k),
    "stale bookkeeping — remove it or re-justify it");
}

// The count must be DERIVED from the list, or the two drift again by exactly the mechanism this
// probe exists for.
ok("the day-ack count is derived from the day-ack list",
  /crewNeedsMyDay=crewsNeedingMyDay\.length/.test(src),
  "crewNeedsMyDay is computed a second time instead of measuring the list the panel renders");

// The DB invite row must not resolve a crew through seed CLIMBERS — the class
// check:crew-member-readers exists for.
const inviteRow = /\(myCrewInvitesQ\.data\|\|\[\]\)\.forEach\([^;]*;/.exec(listBlock);
ok("the DB invite row resolves its route through the Requests screen's own resolver",
  !!inviteRow && inviteRow[0].includes("crewInviteRouteById") && !inviteRow[0].includes("CLIMBERS"),
  "a uuid resolved against seed CLIMBERS matches nothing and silently drops the row");

console.log(fail ? `\n${fail} failure(s).` : "\nall cases pass — the badge and its list are built from the same sources.");
process.exitCode = fail ? 1 : 0;
