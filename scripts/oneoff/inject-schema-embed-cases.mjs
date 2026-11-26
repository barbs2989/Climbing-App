// Injection cases for check:schema's embedded-resource column checking.
//
// The widening exists because a phantom column inside an embed sailed through a full
// `npm run build`. So the first case is not synthetic: it is that exact defect, restored.
//
// Every case proves its edit LANDED (by checksum) before judging the guard — an edit whose
// pattern silently failed to match reads as "the guard missed it" and sends you to rewrite a
// guard that was working.
//
//   node scripts/oneoff/inject-schema-embed-cases.mjs
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// lib/db.js re-exports lib/db-*.js since 2026-11-25; each case names the domain file its embed lives in.
const DB = ROOT + "/lib/db-groups.js";
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);

const CASES = [
  // The first case restored the real defect (guide_documents.created_at, which is uploaded_at). That
  // embed went with the guide feature (2026-11-14), so the same shape is restored on a live embed:
  // a plausible-but-absent column at the END of a multi-column embed.
  { name: "a phantom column in a multi-column embed — routes(name, area_id, discipline)",
    file: "lib/db-moderation.js", expect: "fail",
    edit: (s) => s.replace("routes(name, area_id, discipline)", "routes(name, area_id, discipline, created_by_name)") },
  { name: "a bad column in a plain embed — groups(name)",
    file: "lib/db-groups.js", expect: "fail",
    edit: (s) => s.replace("groups(name)", "groups(name, nickname)") },
  { name: "a bad column in an aliased embed",
    file: "lib/db-comments.js", expect: "fail",
    edit: (s) => s.replace("comment_reactions(user_id,reaction)", "comment_reactions(user_id,reaction,emoji_code)") },
  { name: "an aggregate inside an embed is not a column — group_event_rsvps(user_id) -> group_event_rsvps(count)",
    file: "lib/db-groups.js", expect: "pass",
    edit: (s) => s.replace("group_event_rsvps(user_id)", "group_event_rsvps(count)") },
  { name: "untouched source",
    expect: "pass",
    edit: (s) => s },
];

let failures = 0;
let allRestored = true;
for (const c of CASES) {
  const F = c.file ? ROOT + "/" + c.file : DB;
  const original = fs.readFileSync(F, "utf8");
  const edited = c.edit(original);
  const landed = c.name === "untouched source" ? true : edited !== original;
  if (!landed) { console.log(`  HARNESS  ${c.name}\n           edit never landed (pattern moved) — not a guard verdict`); failures++; continue; }
  fs.writeFileSync(F, edited);
  let out = "", code = 0;
  try { out = execFileSync("node", ["scripts/check-schema-drift.mjs"], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(F, original);
  if (fs.readFileSync(F, "utf8") !== original) allRestored = false;
  const got = code === 0 ? "pass" : "fail";
  const okay = got === c.expect;
  if (!okay) failures++;
  console.log(`  ${okay ? "ok  " : "MISS"}  [${sum(edited)}] expected ${c.expect}, got ${got} — ${c.name}`);
  if (!okay) console.log("        " + out.split("\n").filter((l) => l.trim()).slice(0, 3).join("\n        "));
}

const restored = allRestored;
console.log(`\n  lib/db-*.js restored: ${restored}`);
if (!restored) { console.log("  RESTORE FAILED"); failures++; }
console.log(failures ? `\n${failures} case(s) did not behave` : "\nall injection cases behave");
process.exit(failures ? 1 : 0);
