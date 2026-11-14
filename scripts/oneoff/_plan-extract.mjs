// node scripts/oneoff/_plan-extract.mjs <parent> [--keep A,B] [--lib lib/x.js] — prints a lift plan for a parent file:
// one `lib` line moving every page-local helper that MORE than one component (or the parent's kept code) reads,
// then one `component` line per inner component, smallest first, with its own helpers `--with`.
// Components named in --keep stay in the parent (the parent's own default export always does).
// Review the plan before running it: it is only as good as `extract-from-parent.mjs deps`.
import { execFileSync } from "node:child_process";
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const parent = argv[0];
const keep = new Set((opt("--keep") || "").split(",").filter(Boolean));
const census = execFileSync("node", ["scripts/oneoff/census-parent-components.mjs", parent], { encoding: "utf8" })
  .split("\n").filter(Boolean).map((l) => { const m = /^(\d+) (\w+) L\d+( exp)?/.exec(l); return m && { size: +m[1], name: m[2], exp: !!m[3], line: l }; }).filter(Boolean);
const top = census.find((c) => / exp /.test(c.line) && /usedBy=\[\?\]/.test(c.line) && c.size === Math.max(...census.filter((x) => x.exp).map((x) => x.size)));
const comps = census.filter((c) => c !== top && !keep.has(c.name));
const compNames = new Set(comps.map((c) => c.name));
const own = new Map(), shared = new Set();
for (const c of comps) {
  const out = execFileSync("node", ["scripts/oneoff/extract-from-parent.mjs", "deps", c.name, "--parent", parent], { encoding: "utf8" });
  const mine = [];
  for (const l of out.split("\n").filter(Boolean)) {
    const m = /^(\S+)\s+\d+b\s+(.*)$/.exec(l); if (!m) continue;
    const names = m[1].split("+");
    if (names.some((n) => compNames.has(n))) continue; // another component: it is lifted on its own, and imported
    if (/^only here/.test(m[2])) mine.push(...names); else names.forEach((n) => shared.add(n));
  }
  own.set(c.name, mine);
}
// a helper "only here" for two different components is shared too
const count = new Map();
for (const [, hs] of own) for (const h of hs) count.set(h, (count.get(h) || 0) + 1);
for (const [h, n] of count) if (n > 1) shared.add(h);
const lib = opt("--lib") || parent.replace(/^lib\//, "lib/").replace(/\.jsx?$/, "Shared.js");
console.log(`# plan for ${parent} (top: ${top ? top.name : "?"}; kept: ${[...keep].join(",") || "none"})`);
if (shared.size) console.log(`X lib ${lib} ${[...shared].join(",")}`);
for (const c of [...comps].sort((a, b) => a.size - b.size)) {
  const w = own.get(c.name).filter((h) => !shared.has(h));
  console.log(`X component ${c.name}${w.length ? " --with " + w.join(",") : ""}`);
}
