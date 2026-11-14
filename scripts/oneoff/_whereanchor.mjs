// node scripts/oneoff/_whereanchor.mjs — every ROTTED case check:injection-anchors reports, and which app file holds its anchor now.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
const out = spawnSync("node", ["scripts/check-injection-anchors.mjs"], { encoding: "utf8", maxBuffer: 64 << 20 }).stdout;
const lines = out.split("\n");
const files = ["ClimbMatch.jsx", ...fs.readdirSync("src/components").map(f => "src/components/" + f), ...fs.readdirSync("lib").filter(f => /\.jsx?$/.test(f)).map(f => "lib/" + f)];
const text = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, "utf8")]));
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].startsWith("ROTTED")) continue;
  const m = /: (".*")$/.exec(lines[i + 1]); if (!m) continue;
  const a = JSON.parse(m[1]);
  const hits = files.filter(f => text[f].includes(a));
  console.log(lines[i].replace(/^ROTTED\s+/, "").slice(0, 90) + "\n    -> " + (hits.join(", ") || "NOWHERE: " + a.slice(0, 120)));
}
