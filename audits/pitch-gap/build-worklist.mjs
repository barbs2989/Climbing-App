// Intersect the gap census (census.json) with the saved per-pitch source texts and write one context file per
// route for the research batches (BRIEF.md). Source texts and contexts live OUTSIDE the repo (licensed text,
// public repo): PITCH_TEXT_DIR (default ~/dev/mp-data/_mp/_pitchtext).
// Usage: MPTEXT=/path/mptext.json node audits/pitch-gap/build-worklist.mjs
//   reads the full rows for the worklist by id (service key, chunks of 100), writes
//   $PITCH_TEXT_DIR/<id>.txt, $PITCH_TEXT_DIR/ctx/<id>.json, and audits/pitch-gap/worklist.json (ids, ranked).
import fs from "fs";
import os from "os";
import path from "path";
import { requireServiceKey, SUPABASE_URL, headers } from "../../scripts/lib/supabase-env.mjs";
const DIR = process.env.PITCH_TEXT_DIR || path.join(os.homedir(), "dev/mp-data/_mp/_pitchtext");
fs.mkdirSync(path.join(DIR, "ctx"), { recursive: true });
const texts = JSON.parse(fs.readFileSync(process.env.MPTEXT, "utf8"));
const census = JSON.parse(fs.readFileSync(new URL("./census.json", import.meta.url), "utf8"));
const PER = /\bP(?:itch)?\s*\.?\s*2\b|second pitch|2nd pitch/i;
const RAPS = /\b(?:rap(?:pel)?\s*(?:#|no\.?)?\s*2|second rap(?:pel)?|2nd rap(?:pel)?)\b/i;
const want = census.filter((c) => {
  const t = texts[c.id]; if (!t) return false;
  const d = [t.Description, t.Location, t.Protection].filter(Boolean).join("\n");
  const pitchWant = (c.pitches > c.pd || c.thin > 0) && PER.test(t.Description || "");
  const rapWant = c.rapGap && RAPS.test(d);
  return pitchWant || rapWant;
});
// most-used first: classic, then guide stars, then MP stars
want.sort((a, b) => (+!!b.classic - +!!a.classic) || ((b.gs || 0) - (a.gs || 0)) || ((b.stars || 0) - (a.stars || 0)));
const key = requireServiceKey();
const SEL = "id,name,area_id,discipline,grade,pitches,length_m,pitch_detail,rappel_detail,rappels,descent_text";
let n = 0;
for (let i = 0; i < want.length; i += 100) {
  const chunk = want.slice(i, i + 100).map((x) => `"${x.id}"`).join(",");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${encodeURIComponent(chunk)})`, { headers: headers(key) });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  for (const row of await res.json()) {
    const t = texts[row.id];
    const txtPath = path.join(DIR, `${row.id}.txt`);
    fs.writeFileSync(txtPath, ["Description", "Protection", "Location"].filter((k) => t[k]).map((k) => `${k}:\n${t[k]}`).join("\n\n"));
    const url = t.mp ? `https://www.mountainproject.com/route/${t.mp}` : `local:${row.id}`;
    fs.writeFileSync(path.join(DIR, "ctx", `${row.id}.json`), JSON.stringify({ row, source_url: url, source_text_path: txtPath }, null, 1));
    n++;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
fs.writeFileSync(new URL("./worklist.json", import.meta.url), JSON.stringify(want.map((w) => ({ id: w.id, disc: w.disc, pitches: w.pitches, pd: w.pd, thin: w.thin, rapGap: w.rapGap })), null, 0));
console.log(`worklist ${want.length} routes, ${n} contexts written to ${DIR}`);
