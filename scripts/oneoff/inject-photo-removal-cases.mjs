// Is check:photo-removal measuring anything?
//
// Its healthy output is "every assertion passed", which is exactly what a probe with a broken
// scan prints. So each defect it claims to catch is put back, one at a time, and the probe has
// to fail with a message NAMING that defect -- a run that dies for some other reason is not a
// catch, which this repo has read as one twice before.
//
// Every case proves its edit LANDED by checksum before the probe is believed, and restores the
// file byte-identically afterwards. Do not commit while this is running: it edits app sources in
// place, and #1190 shipped a branch that was not what the green run measured.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");

const CASES = [
  {
    name: "order",
    why: "delete the storage object BEFORE the array write — a refused write then leaves the profile listing a file that is gone",
    file: "lib/db.js",
    find: `  await saveProfilePhotos(userId, next);
  const key = photoStorageKey(url);`,
    repl: `  const key = photoStorageKey(url);
  if (key) { await supabase.storage.from("topo-photos").remove([key]).catch(() => {}); }
  await saveProfilePhotos(userId, next);
  const _unusedKey = photoStorageKey(url);`,
    expect: /a FAILED removal deleted/,
  },
  {
    name: "noremove",
    why: "the call site stops passing onRemove — the control silently disappears and nothing else notices",
    file: "ClimbMatch.jsx",
    find: " onRemove={function(url){",
    repl: " onRemoveZZ={function(url){",
    expect: /exactly one call site may offer removal; 0 do/,
  },
  {
    name: "someoneelse",
    why: "another climber's strip gains a remove control — you could take down a photo that is not yours",
    file: "ClimbMatchCore.jsx",
    find: "<PhotoStrip photos={climber.photos}/>",
    repl: "<PhotoStrip photos={climber.photos} onRemove={function(){}}/>",
    expect: /exactly one call site may offer removal; 2 do/,
  },
  {
    name: "noop",
    why: "a removal that matches nothing writes the array back and reports success",
    file: "lib/db.js",
    find: `  if (next.length === before.length) throw new Error("That photo is not on your profile any more`,
    repl: `  if (false) throw new Error("That photo is not on your profile any more`,
    expect: /resolved as success/,
  },
];

let failures = 0;
for (const c of CASES) {
  const p = path.join(ROOT, c.file);
  const before = fs.readFileSync(p, "utf8");
  const beforeSum = sum(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) {
    console.log(`\n${c.name}: HARNESS BUG — the anchor matched ${n} times in ${c.file}, so nothing was tested.`);
    failures++;
    continue;
  }
  fs.writeFileSync(p, before.replace(c.find, c.repl), "utf8");
  const landed = sum(c.file) !== beforeSum;

  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts/check-photo-removal.mjs")], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    out = (e.stdout || "") + (e.stderr || "");
    code = e.status || 1;
  }
  fs.writeFileSync(p, before, "utf8");
  const restored = sum(c.file) === beforeSum;

  const named = c.expect.test(out);
  const caught = code !== 0 && named;
  console.log(`\n${c.name}: ${caught ? "CAUGHT" : "MISSED"}   (edit landed: ${landed}, restored byte-identical: ${restored}, exit ${code})`);
  console.log(`   ${c.why}`);
  if (!named) console.log(`   the probe did not print anything matching ${c.expect} — a failure for a different reason is not a catch`);
  if (!caught || !landed || !restored) failures++;
}

console.log(`\n${failures ? `FAILED — ${failures} case(s)` : `ok — ${CASES.length}/${CASES.length}, the probe fails on every defect it claims to catch`}`);
process.exit(failures ? 1 : 0);
