import fs from "node:fs";
const d = (process.env.BATCH_DIR || ".") + "/";
const P = JSON.parse(fs.readFileSync(d + "prose.json", "utf8"));
const F = JSON.parse(fs.readFileSync(d + "facts-verified.json", "utf8"));
const lines = fs.readFileSync(d + (process.argv[2] || "copy1.txt"), "utf8").split("\n").filter((l) => l.startsWith("REFUSING"));
const out = [];
for (const l of lines) {
  const m = /REFUSING (\S+) — (\w+) repeats its source word for word: "([^"]+)"/.exec(l);
  if (!m) continue;
  const field = m[2] === "pro_needs" ? "detailed_rack" : m[2];
  out.push({ id: m[1], field, refused_run: m[3], current: P[m[1]][field], facts: F[m[1]].facts });
}
fs.writeFileSync(d + "rewrite.json", JSON.stringify(out, null, 1));
console.log(out.length, "to rewrite");
