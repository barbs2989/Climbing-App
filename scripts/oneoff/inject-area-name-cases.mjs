// Injection cases for check:area-name-embed.
//
// The guard's healthy output is "no findings", which is exactly what a broken guard prints. Each
// case edits a real app file, proves the edit LANDED BY CHECKSUM before judging the guard, and
// restores the original afterwards — the discipline this repo records after an injection reported
// "not caught" while the file had never been modified.
//
// Two cases must PASS, and they are the ones that matter: a comment naming `areas(path)` is
// documentation (RouteDetail.jsx carries exactly such a comment now), and the offline.js
// exemption must hold while its drop is in place.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
const read = (r) => fs.readFileSync(path.join(ROOT, r), "utf8");
const write = (r, s) => fs.writeFileSync(path.join(ROOT, r), s);

function runGuard() {
  try {
    const out = execFileSync("node", [path.join(ROOT, "scripts/check-area-name-embed.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
}

const CASES = [
  {
    name: "narrow an embed back to areas(path)",
    file: "lib/db.js",
    edit: (s) => s.replace("areas(path,name,area_type", "areas(path____name,area_type"),
    expect: (r) => r.code !== 0 && /lib\/db\.js:\d+ areas\(path____name/.test(r.out),
    want: "FAIL naming lib/db.js and the line",
  },
  {
    name: "revert the name-aware header fallback",
    file: "RouteDetail.jsx",
    edit: (s) => s.replace(
      /const mtn=\(function\(\)\{const _s=MOUNTAINS\.find[\s\S]*?\}\)\(\)/,
      'const mtn=(MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{name:"this area"})'),
    expect: (r) => r.code !== 0 && /still renders the word undefined/.test(r.out),
    want: "FAIL on the rendered section",
  },
  {
    name: "a COMMENT mentioning areas(path) — must PASS",
    file: "lib/db.js",
    edit: (s) => s.replace("export function useScopedWishlistRoutes",
      "// note: an older revision of this used areas(path) and that is why the guard exists\nexport function useScopedWishlistRoutes"),
    expect: (r) => r.code === 0,
    want: "PASS — documentation is not a regression",
  },
  {
    name: "remove offline.js's drop, so its exemption is stale",
    file: "lib/offline.js",
    edit: (s) => s.replace(/const \{ areas: _drop, \.\.\.row \} = r;/, "const row = r;"),
    expect: (r) => r.code !== 0 && /NO LONGER TRUE/.test(r.out),
    want: "FAIL as a stale exemption",
  },
  {
    name: "break the embed pattern so nothing matches",
    file: "scripts/check-area-name-embed.mjs",
    edit: (s) => s.replace(/\/\\bareas\\s\*\(\?:!inner\)\?\\s\*\\\(/, "/\\bZZZZ\\s*(?:!inner)?\\s*\\("),
    expect: (r) => r.code !== 0 && /no areas\(\) embed found at all/.test(r.out),
    want: "FAIL as a broken scan, never a clean tree",
  },
];

console.log("check:area-name-embed — injection cases\n");
let bad = 0;
for (const c of CASES) {
  const abs = path.join(ROOT, c.file);
  const before = read(c.file);
  const beforeSum = sum(abs);
  write(c.file, c.edit(before));
  const landed = sum(abs) !== beforeSum;
  let r = { code: 0, out: "" };
  if (landed) r = runGuard();
  write(c.file, before);
  if (sum(abs) !== beforeSum) { console.log(`  RESTORE FAILED for ${c.file} — stop and fix by hand`); process.exit(1); }

  if (!landed) { console.log(`  EDIT NEVER LANDED  ${c.name} — the case is wrong, not the guard`); bad++; continue; }
  const ok = c.expect(r);
  console.log(`  ${ok ? "ok  " : "MISS"} ${c.name}  (want: ${c.want}; got exit ${r.code})`);
  if (!ok) { bad++; console.log("      " + r.out.split("\n").filter((l) => /FAIL|ok +\S/.test(l)).slice(0, 3).join("\n      ")); }
}
console.log(bad ? `\n${bad} case(s) did not behave as expected` : "\nall cases behaved as expected");
process.exit(bad ? 1 : 0);
