// node scripts/oneoff/_stitchread.cjs <guard.mjs> "<exact old expr>" "<new expr>" — replace one read of
// ClimbMatch.jsx with a stitched one (readAppFile), adding the import if the guard lacks it. PR61 helper.
const fs = require("fs");
const [f, oldE, newE] = process.argv.slice(2);
let s = fs.readFileSync(f, "utf8");
const n = s.split(oldE).length - 1;
if (n !== 1) { console.error(`${f}: expected the old expression once, found ${n}`); process.exit(1); }
s = s.replace(oldE, newE);
if (!/\breadAppFile\b[^\n]*from "\.\/lib\/guard-sources\.mjs"/.test(s) && !/import \{[^}]*\breadAppFile\b/.test(s)) {
  if (/import \{([^}]*)\} from "\.\/lib\/guard-sources\.mjs";/.test(s)) s = s.replace(/import \{([^}]*)\} from "\.\/lib\/guard-sources\.mjs";/, (m, a) => `import {${a.replace(/\s*$/, "")}, readAppFile } from "./lib/guard-sources.mjs";`);
  else { const m = [...s.matchAll(/^import [^\n]*\n/gm)].pop(); const at = m.index + m[0].length; s = s.slice(0, at) + `import { readAppFile } from "./lib/guard-sources.mjs";\n` + s.slice(at); }
}
fs.writeFileSync(f, s); console.log(`${f}: stitched`);
