// peek.mjs <file> <needle> [before] [after] — show context around each occurrence on
// this repo's very long lines without wedging grep's backtracker.
import fs from "fs";
const [file, needle, b = "200", a = "400"] = process.argv.slice(2);
const src = fs.readFileSync(file, "utf8");
const lines = src.split("\n");
lines.forEach((l, i) => {
  let idx = -1;
  while ((idx = l.indexOf(needle, idx + 1)) >= 0) {
    console.log(`--- ${file}:${i + 1} @${idx}`);
    console.log(l.slice(Math.max(0, idx - Number(b)), idx + Number(a)));
  }
});
