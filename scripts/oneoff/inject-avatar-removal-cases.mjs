// Injection cases for section 3 of check:photo-removal — the AVATAR.
//
// The section's healthy output is a column of "ok", which is also what a section asserting nothing
// prints. Each case reverts ONE property, proves the edit landed BY CHECKSUM, restores the file
// byte-identically, and is judged on the guard's OWN FAILURE TEXT rather than on an exit code —
// several cases perturb more than one assertion, so an exit status cannot tell them apart.
//
// EVERY `must` MATCHES A FAILURE MESSAGE, NEVER THE TEXT AN ASSERTION PRINTS WHEN IT PASSES.
// The first version of this suite matched the ok-lines and reported WRONG FAILURE on all three
// cases against a guard firing perfectly — the mistake CLAUDE.md already records twice, made a
// third time. The harness below refuses any expectation that appears in the CLEAN run, so it
// cannot happen again in this file.
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const run = () => {
  try { return { out: execSync("npm run check:photo-removal 2>&1", { encoding: "utf8" }), code: 0 }; }
  catch (e) { return { out: String(e.stdout || "") + String(e.stderr || ""), code: e.status || 1 }; }
};

const CASES = [
  {
    file: "lib/db.js", name: "order-reversed",
    why: "deletes the storage object BEFORE clearing the column. A refused write then destroys the " +
         "file while profiles.avatar still points at it — a broken image, and an unrecoverable one",
    edit: (s) => s.replace(
      `  const { error } = await supabase
    .from("profiles").update({ avatar: null }).eq("id", userId).select("id").single();
  if (error) throw error;`,
      `  const key0 = photoStorageKey(url);
  if (key0) await supabase.storage.from("topo-photos").remove([key0]).catch(() => {});
  const { error } = await supabase
    .from("profiles").update({ avatar: null }).eq("id", userId).select("id").single();
  if (error) throw error;`),
    expect: "fail", must: /FAILED avatar removal deleted/,
  },
  {
    file: "lib/db.js", name: "payload-widened",
    why: "the removal sends a second column. saveProfile PATCHes whatever object it is handed, and " +
         "check:profile-edit-gate exists because a caller once sent fields it had never loaded",
    edit: (s) => s.replace('.update({ avatar: null }).eq("id", userId)', '.update({ avatar: null, bio: null }).eq("id", userId)'),
    expect: "fail", must: /the write sent \d+ column/,
  },
  {
    file: "lib/db.js", name: "refusal-swallowed",
    why: "a refused write resolves instead of throwing, so the editor clears the photo on a write " +
         "that never landed — the swallowed-write-failure shape this repo keeps finding",
    edit: (s) => s.replace(
      `    .from("profiles").update({ avatar: null }).eq("id", userId).select("id").single();
  if (error) throw error;`,
      `    .from("profiles").update({ avatar: null }).eq("id", userId).select("id").single();
  if (error) { /* swallowed */ }`),
    expect: "fail", must: /refused avatar write resolved|FAILED avatar removal deleted/,
  },
  {
    file: "ClimbMatchCore.jsx", name: "gate-dropped",
    why: "the Remove control renders with no photo to remove, offering a destructive action against " +
         "nothing",
    edit: (s) => s.replace("{(avaPreview||draft.avatar)?<button onClick={removeAva}", "{true?<button onClick={removeAva}"),
    expect: "fail", must: /Remove control is not gated/,
  },
  {
    file: "ClimbMatch.jsx", name: "uid-not-passed",
    why: "App stops handing the editor a uid, so every removal refuses with 'Sign in to change your " +
         "profile photo' for a climber who IS signed in. NEITHER DIRECTION of check:dead-props sees " +
         "this: the component reads the prop, and the call site passes nothing unread",
    edit: (s) => s.replace("onCancel={()=>setEditDraft(null)} uid={uid}", "onCancel={()=>setEditDraft(null)}"),
    expect: "fail", must: /App no longer passes uid/,
  },
  {
    file: "lib/db.js", name: "SILENT-comment-naming-the-shape",
    why: "MUST STAY SILENT — a comment quoting the forbidden ordering is documentation, and a guard " +
         "that failed on it would forbid explaining itself",
    edit: (s) => s.replace("export async function removeProfileAvatar(userId, url) {",
      "// NOT: remove([key]) before the update — that destroys the file on a refused write.\nexport async function removeProfileAvatar(userId, url) {"),
    expect: "pass",
  },
];

// The clean run first: an expectation that already matches it is testing nothing.
const clean = run();
if (clean.code !== 0) { console.error("REFUSING: the guard is not green on an unmodified tree.\n" + clean.out); process.exit(1); }
for (const c of CASES) {
  if (c.expect === "fail" && c.must.test(clean.out)) {
    console.error(`REFUSING: ${c.name}'s expectation ${c.must} matches the CLEAN run, so it proves nothing.`);
    process.exit(1);
  }
}

let bad = 0;
for (const c of CASES) {
  const orig = fs.readFileSync(c.file, "utf8");
  const before = sum(orig);
  const mut = c.edit(orig);
  const landed = sum(mut) !== before;
  let r = { out: "", code: 0 };
  try { fs.writeFileSync(c.file, mut); r = run(); }
  finally { fs.writeFileSync(c.file, orig); }
  const restored = sum(fs.readFileSync(c.file, "utf8")) === before;
  const failed = r.code !== 0;
  const wanted = c.expect === "fail";
  const failLines = r.out.split("\n").filter((l) => l.includes("FAIL")).join("\n");
  let verdict;
  if (!landed) verdict = "EDIT NEVER LANDED";
  else if (failed !== wanted) verdict = wanted ? "MISSED" : "FIRED WHEN IT SHOULD BE SILENT";
  else if (wanted && !c.must.test(failLines)) verdict = "WRONG FAILURE";
  else verdict = "ok";
  if (verdict !== "ok") bad++;
  console.log(`  ${verdict.padEnd(30)} ${c.name.padEnd(30)} landed=${landed} restored=${restored} guard=${failed ? "fail" : "pass"} (want ${c.expect})`);
  console.log("      " + c.why);
}

console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as specified.`);
for (const f of [...new Set(CASES.map((c) => c.file))]) {
  // A suite that damages the tree is worse than one that finds nothing.
  if (!fs.readFileSync(f, "utf8").length) { console.error("BROKEN: " + f + " is empty"); process.exit(1); }
}
if (bad) process.exit(1);
