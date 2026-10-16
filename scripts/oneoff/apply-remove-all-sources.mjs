// Removes every source citation left in climber-facing text (routes + area blurbs), 2026-09-24.
//
// The owner's rule is that the app never names where its information came from. audit:prose-citations
// only reads WA routes and a fixed column list, so grade fields ("5.2 (5.5 at the overhanging band per
// SummitPost)"), camp notes, crowd estimates and area blurbs were outside its reach. A whole-catalog scan
// of every RENDERED string found 946 on 583 rows. Each was rewritten by hand to keep the fact AND its
// uncertainty ("trip reports describe a loose gully" -> "parties describe a loose gully", never "the
// gully is loose") — rules in the road-access-prose-cites-sources memory hub.
//
//   remove-all-sources-edits.json   [table, id, path, find, replace]   (applied in order per value)
//
// Refuses the whole run unless every find matches EXACTLY ONCE in the live value as it stands after the
// edits before it, and — the post-condition — unless every rewritten string passes BOTH needles:
// audit:prose-citations' own NAMED (lifted by anchor, never retyped) and the generic sourcing needle in
// audit:misplaced-prose. Writes through patchRow, then re-reads every row.
//
//   node scripts/oneoff/apply-remove-all-sources.mjs --dry
//   node scripts/oneoff/apply-remove-all-sources.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const lift = (file, name) => {
  const src = fs.readFileSync(path.join(HERE, "..", file), "utf8");
  const m = src.match(new RegExp(`^const ${name} = (\\/.*\\/[a-z]*);$`, "m"));
  if (!m) throw new Error(`ANCHOR LOST: ${name} in ${file}`);
  return eval(m[1]);
};
const NAMED = lift("audit-prose-citations.mjs", "NAMED");
// "a known peakbagger objective" is PEOPLE, not the website — the citations audit strips the common noun
// before matching, and so must this, or the post-condition refuses correct text.
const COMMON_NOUN = lift("audit-prose-citations.mjs", "COMMON_NOUN");
const SOURCING = lift("audit-misplaced-prose.mjs", "SOURCING");
// A needle that matches nothing proves nothing: both must fire on a known citation and stay quiet on water.
if (!NAMED.test("5.5 per SummitPost") || !SOURCING.test("trip reports describe a loose gully") || SOURCING.test("Scatter Lake is the last reliable source"))
  throw new Error("needle self-test failed — the post-condition would be vacuous");

// Round 1 is remove-all-sources-edits.json (1,068 edits, applied 2026-09-24). Round 2 is -2.json: the 17
// values holding a SECOND sourcing phrase the first scan pointed nobody at. Pass the file to apply.
const EDITS_FILE = process.argv.find((a) => a.endsWith(".json")) || "remove-all-sources-edits.json";
const EDITS = JSON.parse(fs.readFileSync(path.join(HERE, path.basename(EDITS_FILE)), "utf8"));
// Named but not a source: an agency issuing a permit/closure/forecast, or a club as the OPERATOR of
// trips/outings/courses or the owner of a grading scale (either word order).
const KEEP_NAMED = /\b(?:NPS|USFS|NWAC|WSDOT|Ranger District)\b|\bThe Mountaineers(?:'s?)?\b.{0,40}\b(?:run|runs|lead|leads|offer|outings?|trips?|courses?|scramble rating|rate|rating|classif)|\b(?:outings?|trips?|courses?|club|group)\b.{0,30}\bThe Mountaineers\b/i;

const parse = (p) => p.split(".").flatMap((seg) => { const m = seg.match(/^([^[]+)((?:\[\d+\])*)$/); return [m[1], ...[...m[2].matchAll(/\[(\d+)\]/g)].map((x) => +x[1])]; });
const count = (s, sub) => s.split(sub).length - 1;

const want = {}; for (const [t, id] of EDITS) (want[t] ||= new Set()).add(id);
const live = {};
for (const [t, ids] of Object.entries(want)) {
  const list = [...ids];
  for (let i = 0; i < list.length; i += 40) {
    const chunk = list.slice(i, i + 40);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&id=in.(${chunk.map((x) => encodeURIComponent(`"${x}"`)).join(",")})`, { headers: headers(key) });
    if (!res.ok) throw new Error(`read ${t} ${res.status} ${await res.text()}`);
    for (const r of await res.json()) live[t + "|" + r.id] = r;
  }
}
const missing = EDITS.filter(([t, id]) => !live[t + "|" + id]).map(([t, id]) => `${t}.${id}`);
if (missing.length) throw new Error(`not in the live DB (refusing): ${[...new Set(missing)].join(", ")}`);

const next = {}; const touched = new Map(); const problems = [];
for (const [t, id, p, find, repl] of EDITS) {
  const k = t + "|" + id; const [c, ...rest] = parse(p);
  next[k] ||= {}; if (!(c in next[k])) next[k][c] = structuredClone(live[k][c]);
  let parent = next[k], last = c;
  for (const s of rest) { parent = parent[last]; last = s; }
  const s = parent?.[last];
  if (typeof s !== "string") { problems.push(`${t}.${id} ${p}: not a string`); continue; }
  const n = count(s, find);
  if (n !== 1) { problems.push(`${t}.${id} ${p}: find matches ${n}x — ${JSON.stringify(find).slice(0, 90)}`); continue; }
  parent[last] = s.replace(find, () => repl).replace(/ {2,}/g, " ").replace(/\s+([,.;:)])/g, "$1").trim();
  touched.set(`${k}|${p}`, () => parent[last]);
}
for (const [kp, get] of touched) {
  const v = get();
  if (/^\s*$/.test(v)) continue;
  const n = v.replace(COMMON_NOUN, "").match(NAMED), g = v.match(SOURCING);
  if ((n && !KEEP_NAMED.test(v)) || g) problems.push(`${kp}: STILL names a source after rewrite ["${(n || g)[0]}"] — ${v.slice(0, 160)}`);
}
if (problems.length) { console.error(`REFUSING — ${problems.length} problem(s):\n  ` + problems.join("\n  ")); process.exit(1); }
console.log(`edits ${EDITS.length} · strings ${touched.size} · rows ${Object.keys(next).length}`);

if (DRY) {
  for (const [kp, get] of touched) console.log(`\n${kp}\n  + ${get().slice(0, 500)}`);
  console.log("\n--dry: nothing written"); process.exit(0);
}
for (const [k, cols] of Object.entries(next)) { const [t, id] = k.split("|"); await patchRow(t, id, cols, { key }); }
let bad = 0;
for (const [k, cols] of Object.entries(next)) {
  const [t, id] = k.split("|");
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=${Object.keys(cols).join(",")}&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) })).json())[0];
  for (const [c, v] of Object.entries(cols)) if (JSON.stringify(r[c]) !== JSON.stringify(v)) { bad++; console.error(`MISMATCH ${k}.${c}`); }
}
console.log(bad ? `${bad} column(s) did not read back as written` : `re-read: all ${Object.keys(next).length} rows read back exactly as written`);
process.exit(bad ? 1 : 0);
