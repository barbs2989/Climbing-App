#!/usr/bin/env node
// Injection suite for scripts/check-write-readers.mjs.
//
// Each case reverts ONE link, proves by CHECKSUM that the edit landed, runs the guard, and restores
// the file byte-identically. Two cases must stay SILENT: an EXTRA name in a reader list (the
// RPC-backed readers are named by hand), and a writer that refreshes through ONE other writer it
// calls.
//
// IT EDITS lib/db.js AND THE GUARD IN PLACE. Do not commit, and do not run the build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB = "lib/db.js", GUARD = "scripts/check-write-readers.mjs";
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  // The 2026-10-08 shape: a writer that updates its own screen and refreshes nothing.
  { name: "writer-drops-its-refresh", file: DB, expect: "fail",
    find: "  invalidateKeys(blockedUsersReaders);\n  return data || null;\n",
    repl: "  return data || null;\n",
    says: /blockUser\(\) writes blocked_users and does not refresh: my-blocked/ },
  // A reader list that forgets one of the table's readers — the objectives list did (objectives-of-users).
  { name: "list-forgets-a-reader", file: DB, expect: "fail",
    find: 'const kudosReaders = [["kudos-given"], ["kudos-received"]];',
    repl: 'const kudosReaders = [["kudos-given"]];',
    says: /giveKudosRow\(\) writes kudos and does not refresh: kudos-received/ },
  // A NEW writer of a table with readers, added with no refresh at all.
  { name: "new-writer-no-refresh", file: DB, expect: "fail",
    find: 'const routeBaseCheckinsReaders = [["route-base-checkins"]];',
    repl: 'export async function _injDropVouch(id) { const { error } = await supabase.from("vouches").delete().eq("id", id); if (error) throw error; return true; }\nconst routeBaseCheckinsReaders = [["route-base-checkins"]];',
    says: /_injDropVouch\(\) writes vouches and does not refresh: user-vouches, climber-vouches/ },
  // A DECLARED exception naming a writer that does not exist must not pass silently.
  { name: "declared-names-nobody", file: GUARD, expect: "fail",
    find: "const DECLARED = {};",
    repl: 'const DECLARED = { noSuchWriter: "a reason" };',
    says: /DECLARED names noSuchWriter, which no lib\/ file declares/ },
  // MUST STAY SILENT — an extra name (an RPC-backed reader, stated by hand) is accepted.
  { name: "extra-name-in-list", file: DB, expect: "pass",
    find: 'const kudosReaders = [["kudos-given"], ["kudos-received"]];',
    repl: 'const kudosReaders = [["kudos-given"], ["kudos-received"], ["leaderboard"]];',
    says: null },
  // MUST STAY SILENT — a writer that refreshes through one other writer it calls.
  { name: "refresh-through-a-callee", file: DB, expect: "pass",
    find: 'const routeBaseCheckinsReaders = [["route-base-checkins"]];',
    repl: 'export async function _injRegiveKudos(giver, receiver, id) { const { error } = await supabase.from("kudos").delete().eq("id", id); if (error) throw error; return giveKudosRow(giver, receiver, null, null); }\nconst routeBaseCheckinsReaders = [["route-base-checkins"]];',
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const f = path.join(ROOT, c.file);
  const before = fs.readFileSync(f, "utf8");
  const beforeSum = sum(f);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the guard`); bad++; continue; }
  fs.writeFileSync(f, before.replace(c.find, c.repl));
  if (sum(f) === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(f, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, GUARD)], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(f, before);
  if (sum(f) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    if (caught && c.says.test(out)) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code\n${out.split("\n").slice(-4).join("\n")}`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
