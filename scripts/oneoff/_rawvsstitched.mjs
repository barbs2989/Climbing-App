// node scripts/oneoff/_rawvsstitched.mjs — for each guard below, run it as is and again with its raw
// read of ClimbMatch.jsx swapped for the stitched one (readAppFile), and print whether the output differs.
// A guard whose output changes was reading code that moved into src/components/ (PR61).
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const CASES = [
  ["check-profile-draft-persists.mjs", 'fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8")'],
  ["check-profile-edit-gate.mjs", 'fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8")'],
  ["check-screen-lists.mjs", 'readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8")'],
  ["check-policy-claims.mjs", 'fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8")'],
  ["check-boot-shell.mjs", 'fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8")'],
  ["check-visibility-switches-persist.mjs", 'read("ClimbMatch.jsx")'],
  ["check-log-hydration.mjs", 'readFileSync(new URL("../ClimbMatch.jsx", import.meta.url), "utf8")'],
  ["check-crew-ready.mjs", 'readFileSync(new URL("../ClimbMatch.jsx", import.meta.url), "utf8")'],
  ["check-toast-reachable.mjs", null],
  ["check-verification-fallback.mjs", null],
];
const run = (f) => { const r = spawnSync("node", [f], { encoding: "utf8", maxBuffer: 64 << 20 }); return { code: r.status, out: r.stdout + r.stderr }; };
for (const [g, expr] of CASES) {
  const p = "scripts/" + g; const src = fs.readFileSync(p, "utf8");
  if (!expr) { console.log(`${g}: (manual)`); continue; }
  if (!src.includes(expr)) { console.log(`${g}: expression not found`); continue; }
  const a = run(p);
  const tmp = "scripts/.__stitched_" + g;
  let s = src.split(expr).join('readAppFile(new URL("../ClimbMatch.jsx", import.meta.url).pathname)');
  s = s.replace(/^import \{([^}]*)\breadAppFile\b,?([^}]*)\} from "\.\/lib\/guard-sources\.mjs";\n/m, (m, x, y) => (x + y).trim() ? `import {${x}${y}} from "./lib/guard-sources.mjs";\n` : "");
  { const sb = s.startsWith("#!") ? s.indexOf("\n") + 1 : 0; s = s.slice(0, sb) + `import { readAppFile } from "./lib/guard-sources.mjs";\n` + s.slice(sb); }
  fs.writeFileSync(tmp, s);
  const b = run(tmp); fs.rmSync(tmp);
  const same = a.out.replace(/\.__stitched_/g, "") === b.out.replace(/\.__stitched_/g, "");
  console.log(`${g}: raw exit=${a.code} stitched exit=${b.code} ${same ? "SAME" : "DIFFERS"}`);
  if (!same) { const al = a.out.split("\n"), bl = b.out.split("\n"); for (let i = 0; i < Math.max(al.length, bl.length); i++) if (al[i] !== bl[i] && i < 400) { console.log("   raw:      " + (al[i] || "").slice(0, 200)); console.log("   stitched: " + (bl[i] || "").slice(0, 200)); } }
}
