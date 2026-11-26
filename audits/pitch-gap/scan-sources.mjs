// Pre-scan the not-yet-applied batches with enrich:apply's OWN source-name rule (SOURCE_RE / PER_SOURCE_RE, read out
// of the script), so a batch is fixed before the apply refuses part of it.  Usage: node audits/pitch-gap/scan-sources.mjs
import fs from "fs";
const src = fs.readFileSync("scripts/enrich-approach-rappel-bivy.mjs", "utf8").split("\n");
const SOURCE_RE = eval(src.find((l) => l.startsWith("const SOURCE_RE")).replace(/^const SOURCE_RE = /, "").replace(/;\s*(\/\/.*)?$/, ""));
const PER = /\b[Pp]er (?:the )?[A-Z]/;
const done = new Set(fs.readFileSync("audits/pitch-gap/applied.txt", "utf8").split("\n"));
let n = 0;
for (const f of fs.readdirSync("audits/pitch-gap/batches").sort()) {
  if (done.has(f.replace(".json", ""))) continue;
  const d = JSON.parse(fs.readFileSync("audits/pitch-gap/batches/" + f, "utf8"));
  for (const [id, e] of Object.entries(d)) {
    if (id === "skip_reasons") continue;
    for (const [kind, arr] of [["pitch_detail", e.pitch_detail || []], ["rappel_detail", e.rappel_detail || []]]) arr.forEach((p, i) => {
      for (const k of ["pitch", "grade", "notes", "note", "anchor", "belay", "station"]) {
        const v = p[k]; if (v == null) continue;
        const m = String(v).match(SOURCE_RE) || String(v).match(PER);
        if (m) { n++; console.log(`${f} ${id} ${kind}[${i}].${k} ${JSON.stringify(m[0])} | ${String(v).slice(0, 160)}`); }
      }
    });
  }
}
console.log(n ? `${n} hit(s)` : "clean");
