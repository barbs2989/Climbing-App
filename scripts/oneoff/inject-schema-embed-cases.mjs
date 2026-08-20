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

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/top-contributors-photo-crew-resume";
const DB = ROOT + "/lib/db.js";
const original = fs.readFileSync(DB, "utf8");
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);

const CASES = [
  { name: "the real defect: guide_documents.created_at (it is uploaded_at)",
    expect: "fail",
    edit: (s) => s.replace("guide_documents(id, doc_type, storage_path, credential_id, deleted_at, uploaded_at)",
                           "guide_documents(id, doc_type, storage_path, credential_id, deleted_at, created_at)") },
  { name: "a bad column in a plain embed — profiles(name, avatar)",
    expect: "fail",
    edit: (s) => s.replace("profiles(name, avatar)", "profiles(name, avatar, nickname)") },
  { name: "a bad column in an aliased embed",
    expect: "fail",
    edit: (s) => s.replace("comment_reactions(user_id,reaction)", "comment_reactions(user_id,reaction,emoji_code)") },
  { name: "an aggregate inside an embed is not a column — reviews(rating) -> reviews(count)",
    expect: "pass",
    edit: (s) => s.replace("reviews(rating)", "reviews(count)") },
  { name: "untouched source",
    expect: "pass",
    edit: (s) => s },
];

let failures = 0;
for (const c of CASES) {
  const edited = c.edit(original);
  const landed = c.name === "untouched source" ? true : edited !== original;
  if (!landed) { console.log(`  HARNESS  ${c.name}\n           edit never landed (pattern moved) — not a guard verdict`); failures++; continue; }
  fs.writeFileSync(DB, edited);
  let out = "", code = 0;
  try { out = execFileSync("node", ["scripts/check-schema-drift.mjs"], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(DB, original);
  const got = code === 0 ? "pass" : "fail";
  const okay = got === c.expect;
  if (!okay) failures++;
  console.log(`  ${okay ? "ok  " : "MISS"}  [${sum(edited)}] expected ${c.expect}, got ${got} — ${c.name}`);
  if (!okay) console.log("        " + out.split("\n").filter((l) => l.trim()).slice(0, 3).join("\n        "));
}

const restored = fs.readFileSync(DB, "utf8") === original;
console.log(`\n  lib/db.js restored: ${restored}`);
if (!restored) { console.log("  RESTORE FAILED"); failures++; }
console.log(failures ? `\n${failures} case(s) did not behave` : "\nall injection cases behave");
process.exit(failures ? 1 : 0);
