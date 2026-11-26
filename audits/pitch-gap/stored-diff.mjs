// For every batch route that REPLACES a stored pitch table: which stored labels it drops and which stored values
// (grade, lengthM, bolts, anchor) it changes. Guidebook research may sit behind a stored value (guidebooks are the source
// of truth), so a change is restored to the stored value unless --report-only.  Usage:
//   node audits/pitch-gap/stored-diff.mjs [--restore] batches/*.json
import fs from "fs";
import os from "os";
import path from "path";
const CTX = path.join(os.homedir(), "dev/mp-data/_mp/_pitchtext/ctx");
const RESTORE = process.argv.includes("--restore");
const KEYS = ["grade", "lengthM", "bolts", "anchor"];
for (const f of process.argv.slice(2).filter((a) => !a.startsWith("--"))) {
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  let touched = false;
  for (const [id, e] of Object.entries(d)) {
    if (id === "skip_reasons" || !e.pitch_detail) continue;
    const stored = JSON.parse(fs.readFileSync(path.join(CTX, id + ".json"), "utf8")).row.pitch_detail || [];
    if (!stored.length) continue;
    const byLabel = new Map(e.pitch_detail.map((p) => [String(p.pitch), p]));
    for (const s of stored) {
      const lab = String(s.pitch ?? s.label ?? "");
      const n = byLabel.get(lab);
      if (!n) { console.log(`${f} ${id}: drops stored label "${lab}"`); continue; }
      for (const k of KEYS) {
        if (s[k] == null || s[k] === "") continue;
        if (String(n[k] ?? "") !== String(s[k])) {
          console.log(`${f} ${id} P${lab}: ${k} ${JSON.stringify(s[k])} -> ${JSON.stringify(n[k])}`);
          if (RESTORE) { n[k] = s[k]; touched = true; }
        }
      }
    }
  }
  if (touched) fs.writeFileSync(f, JSON.stringify(d, null, 1));
}
