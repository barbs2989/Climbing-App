// node scripts/oneoff/_runguards.mjs [--tail N] name1 name2 ... — run scripts/check-<name>.mjs and print each one's exit code and last N lines.
import { spawnSync } from "node:child_process";
const argv = process.argv.slice(2); let tail = 8; const ti = argv.indexOf("--tail"); if (ti >= 0) { tail = +argv[ti + 1]; argv.splice(ti, 2); }
for (const n of argv) {
  const f = n.includes("/") ? n : `scripts/check-${n}.mjs`;
  const r = spawnSync("node", [f], { encoding: "utf8", maxBuffer: 64 << 20 });
  const lines = (r.stdout + r.stderr).split("\n").filter(l => l.trim());
  console.log(`=== ${n} exit=${r.status}`); for (const l of lines.slice(-tail)) console.log("  " + l.slice(0, 320));
}
