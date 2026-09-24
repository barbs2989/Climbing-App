// Injection cases for check:trailhead-direction-shape: prove it goes RED in both directions (a walk the
// detector must catch, good directions it must not hide) and GREEN on a correct row. Each edit is
// proven landed by checksum, and the corpus is restored byte-identically even if a case throws.
//   node scripts/oneoff/inject-trailhead-direction-shape-cases.mjs
import fs from "fs"; import { spawnSync } from "child_process"; import crypto from "crypto";
const W = new URL("../../", import.meta.url).pathname;
const F = W + "scripts/trailhead-directions-reviewed.json";
const orig = fs.readFileSync(F, "utf8");
const sha = s => crypto.createHash("sha1").update(s).digest("hex");
const cases = [
  ["a walk mislabelled drive must FAIL", { text: "From Slate Pass (~6,900 ft) at the end of Harts Pass Road: hike ~13 miles along the ridge to the lakes", verdict: "drive" }, 1],
  ["good directions mislabelled walk must FAIL", { text: "From the Stuart Lake Trailhead at the end of FR-7601", verdict: "walk" }, 1],
  ["a correct new drive row must PASS", { text: "From the Stuart Lake Trailhead at the end of FR-7601", verdict: "drive" }, 0],
];
let bad = 0;
try {
  for (const [name, row, want] of cases) {
    const d = JSON.parse(orig); d.rows.push(row);
    const txt = JSON.stringify(d, null, 1) + "\n"; fs.writeFileSync(F, txt);
    if (sha(fs.readFileSync(F, "utf8")) !== sha(txt)) throw new Error("edit did not land");
    const r = spawnSync("node", ["scripts/check-trailhead-direction-shape.mjs"], { cwd: W });
    const got = r.status === 0 ? 0 : 1;
    console.log(got === want ? "CAUGHT " : "MISSED ", name, "(exit " + r.status + ")");
    if (got !== want) bad++;
  }
} finally { fs.writeFileSync(F, orig); }
console.log("restored:", sha(fs.readFileSync(F, "utf8")) === sha(orig));
process.exit(bad ? 1 : 0);
