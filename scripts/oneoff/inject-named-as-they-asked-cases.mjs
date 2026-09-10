// Injection suite for `probe-a-climber-is-named-the-way-they-asked.mjs`.
//
// Every case proves its edit landed BY CHECKSUM, restores the file byte-identically, and is judged
// on the probe's OWN failure text -- a run that died for an unrelated reason is not a catch. It
// also refuses to start unless the probe is green, because a dirty tree makes every case
// unattributable. See the note above `before` for why the sibling suites' "refuse an expectation
// that matches the clean run" check is NOT the mechanism here, and what replaces it.
//
// `hook-stops-mapping` is the case that matters most: it leaves all four call sites looking exactly
// right and drops the camelCase mapping in lib/db.js, which makes three of the four fixes INERT
// while every call site still reads as compliant. That is the shape a reviewer cannot see.
//
// Two cases must stay SILENT: a comment quoting the forged constant is documentation, and the
// snake_case read in the invite pool is CORRECT there because useProfileSearch returns raw rows.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-a-climber-is-named-the-way-they-asked.mjs");
const FILES = {
  core: path.join(ROOT, "ClimbMatchCore.jsx"),
  app: path.join(ROOT, "ClimbMatch.jsx"),
  db: path.join(ROOT, "lib/db.js"),
};
const LOCK = path.join(ROOT, ".inject-named-as-they-asked.lock");

const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
const run = () => {
  try { return execFileSync("node", [PROBE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};

let fd;
try { fd = fs.openSync(LOCK, "wx"); } catch { console.error("another run of this suite holds the lock"); process.exit(2); }
const release = () => { try { fs.closeSync(fd); fs.unlinkSync(LOCK); } catch {} };
process.on("exit", release);
process.on("SIGINT", () => { release(); process.exit(130); });

// NOTE ON THE USUAL "refuse an expectation that matches the clean run" GUARD: it does not apply
// here, because this probe prints the same LABEL on the ok line and the FAIL line, so every
// expectation legitimately appears in a green run. What protects against the mistake instead is
// that the verdict below matches FAIL LINES ONLY -- an expectation written against passing text
// simply never matches, and the case reports MISSED rather than a false catch.
const before = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, sum(p)]));
const CLEAN = run();
if (!/ok — a climber is named the way they asked/.test(CLEAN)) {
  console.error("the probe is not green on this tree; every case would be unattributable.\n" + CLEAN);
  process.exit(2);
}

const CASES = [
  // A — the forged setting, restored verbatim.
  { name: "invite-pool-forges-shownname", file: "core", expect: "invite-search pool reads the real column",
    find: "showName:!!rp.show_name", repl: "showName:true" },

  // C — the bare read on the join-request card.
  { name: "join-card-reads-name-raw", file: "core", expect: "join-request card names the climber through pubName",
    find: '<div style={{fontSize:14,fontWeight:700}}>{pubName(c)}</div>', repl: '<div style={{fontSize:14,fontWeight:700}}>{c.name}</div>' },

  // B — the dropped fields.
  { name: "crewmemberbyid-drops-fields", file: "app", expect: "crewMemberById carries username and showName",
    find: "username:pr.username,showName:!!pr.showName,", repl: "" },

  // D — the under-claim.
  { name: "organiser-chip-drops-shownname", file: "app", expect: "open-crew organiser chip carries showName",
    find: 'username:p.username||"",showName:!!p.showName,', repl: 'username:p.username||"",' },

  // The inert-fix case: every call site still looks right.
  { name: "hook-stops-mapping", file: "db", expect: "useProfilesByIds still MAPS showName",
    find: "showName: !!p.show_name", repl: "showName_disabled: !!p.show_name" },

  { name: "hook-stops-selecting", file: "db", expect: "hook still SELECTS the columns",
    find: 'select("id, name, avatar, show_name, username")', repl: 'select("id, name, avatar")' },

  // SILENT: documentation naming the forbidden constant is not the forbidden constant.
  { name: "SILENT-comment-quotes-the-forged-constant", file: "core", silent: true,
    find: "function pubName(", repl: "/* the invite pool used to pass showName:true here */function pubName(" },

  // SILENT: snake_case is CORRECT in the invite pool -- useProfileSearch returns raw rows.
  { name: "SILENT-unrelated-field-added-to-the-pool", file: "core", silent: true,
    find: "showName:!!rp.show_name,avatar:rp.avatar", repl: "showName:!!rp.show_name,online:false,avatar:rp.avatar" },
];

let pass = 0;
for (const c of CASES) {
  const p = FILES[c.file];
  const original = fs.readFileSync(p, "utf8");
  const n = original.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name} — find string matched ${n} times`); continue; }
  const s0 = sum(p);
  fs.writeFileSync(p, original.replace(c.find, c.repl));
  const s1 = sum(p);
  let verdict;
  if (s1 === s0) verdict = "EDIT NEVER LANDED";
  else {
    const out = run();
    const fails = out.split("\n").filter((l) => /^\s*FAIL /.test(l) || /BROKEN PROBE/.test(l));
    if (c.silent) verdict = fails.length === 0 ? "ok (silent)" : "WRONGLY FIRED:\n      " + fails.join("\n      ");
    else if (!fails.length) verdict = "MISSED";
    else if (fails.some((l) => l.includes(c.expect))) verdict = "ok (caught)";
    else verdict = "WRONG FAILURE:\n      " + fails.join("\n      ");
  }
  fs.writeFileSync(p, original);
  if (sum(p) !== s0) { console.error(`TREE NOT RESTORED for ${c.name}`); process.exit(2); }
  const good = verdict.startsWith("ok");
  if (good) pass++;
  console.log(`  ${good ? "ok  " : "FAIL"}  ${c.name} — ${verdict}`);
}

for (const [k, p] of Object.entries(FILES)) {
  if (sum(p) !== before[k]) { console.error(`TREE NOT RESTORED: ${k}`); process.exit(2); }
}
console.log(`\n${pass}/${CASES.length}`);
process.exit(pass === CASES.length ? 0 : 1);
