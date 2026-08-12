#!/usr/bin/env node
// check:enrichment-traceable — is every claim in a climbing_route batch actually traceable to
// the route's own approach text?
//
// The batches are produced by re-homing text, not by research, and that instruction is worth
// exactly nothing unless something checks it. Fabricated climbing beta is the one defect in
// this codebase that could hurt somebody, so it gets a machine check rather than a promise.
//
// What it verifies, per segment: every NUMBER (elevations, distances, classes, counts) and
// every distinctive DIRECTIONAL or FEATURE term must also appear in the source `approach`.
// Prose may be rewritten freely — that is wanted — so common words are ignored entirely and
// only the load-bearing specifics are matched.
//
// Numbers are compared with separators stripped ("7,200" vs "7200") and a class/grade token is
// matched on its own shape, because "Class 2-3" in a segment legitimately comes from "class
// 2-3 scrambling" in the source.
//
// Usage: node scripts/check-enrichment-traceable.mjs batchA.json [batchB.json ...]

import fs from "fs";
import { SUPABASE_URL, anonKey } from "./lib/supabase-env.mjs";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: check-enrichment-traceable.mjs <batch.json...>"); process.exit(1); }

const specs = {};
for (const f of files) Object.assign(specs, JSON.parse(fs.readFileSync(f, "utf8")));
const ids = Object.keys(specs);
if (!ids.length) { console.error("FAIL — batch files hold no routes; refusing to report clean."); process.exit(1); }

const key = anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,approach&id=in.(${ids.join(",")})`;
const res = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } });
if (!res.ok) { console.error("read failed", res.status); process.exit(1); }
const rows = await res.json();
const srcOf = new Map(rows.map(r => [r.id, String(r.approach || "")]));
if (srcOf.size !== ids.length) console.log(`note: ${ids.length - srcOf.size} route(s) in the batch had no row`);

// Fold accents. Climbing prose carries "arête" and "couloir" with and without diacritics
// interchangeably, and without this the source's "arête" and a segment's "arete" are different
// strings — which the checker reported as invented content on a correct route.
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[‐-―]/g, "-").replace(/[‘’]/g, "'");
const nums = s => (norm(s).match(/\d[\d,\.]*/g) || []).map(x => x.replace(/,/g, "").replace(/\.$/, ""));
// Feature/direction words worth checking. Deliberately narrow: these are the tokens a reader
// navigates by, and the ones an invented sentence tends to introduce.
const TERMS = /\b(north|south|east|west|northeast|northwest|southeast|southwest|left|right|gully|gullies|couloir|chimney|arete|arête|ridge|notch|col|saddle|slab|slabs|moat|bergschrund|schrund|cornice|glacier|snowfield|talus|scree|heather|granite|chockstone|gendarme|travers\w*|downclimb\w*|rappel\w*|belay\w*|crevasse)\b/g;
// Crude but sufficient stemmer: these are English nouns and verbs from one narrow domain, and
// the only job is to make "traversing"/"traverse", "gullies"/"gully", "slabs"/"slab" compare
// equal. Anything cleverer would be a dependency for no gain.
// The trailing-e strip is load-bearing and was missing at first: without it "traverse" stems to
// itself while "traversing" stems to "travers", so the two never compare equal and two
// correctly-reworded routes were reported as untraceable. Over-stemming is harmless here
// because the same function is applied to BOTH sides of every comparison.
const stem = w => w.replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, "").replace(/e$/, "");

let problems = 0, segs = 0;
for (const id of ids) {
  const spec = specs[id];
  const list = Array.isArray(spec.climbing_route) ? spec.climbing_route : [];
  if (!list.length) { console.log(`·  ${id} — no segments (${spec.skip_reason || "skipped"})`); continue; }
  const src = srcOf.get(id);
  if (src == null) { console.log(`!! ${id} — no source row to check against`); problems++; continue; }
  const srcN = new Set(nums(src));
  const srcStems = new Set((norm(src).match(TERMS) || []).map(stem));
  const bad = [];
  for (const seg of list) {
    segs++;
    const text = [seg.label, seg.class, seg.notes].filter(Boolean).join(" ");
    for (const n of nums(text)) {
      // A bare segment index (1,2,3) is the author's own numbering, not a claim about terrain.
      if (+n <= 5 && !/\d[\d,\.]*\s*(ft|m|mi|km|'|°)/i.test(text)) continue;
      if (!srcN.has(n)) bad.push(`${seg.n}: number ${n} not in approach`);
    }
    for (const t of new Set(norm(text).match(TERMS) || [])) {
      // Compare STEMS, not surface forms. The point of this batch is that the prose may be
      // rewritten, and rewriting changes inflection: the source said "traversing higher" and
      // the segment said "Traverse to the summit gully", which is the same fact and was
      // reported as untraceable content by the first version of this check. A guard that flags
      // correct work teaches people to ignore it, which is worse than not having it.
      if (!srcStems.has(stem(t))) bad.push(`${seg.n}: term "${t}" not in approach`);
    }
  }
  if (bad.length) { problems++; console.log(`!! ${id}`); bad.slice(0, 8).forEach(b => console.log(`     ${b}`)); }
  else console.log(`ok ${id} — ${list.length} segment(s) fully traceable`);
}

console.log(`\n${segs} segment(s) across ${ids.length} route(s) · ${problems} route(s) with untraceable content`);
if (problems) {
  console.log("Every flag above is a claim that is NOT in the route's own approach text. Read it before writing:");
  console.log("either the wording drifted (fix the wording) or a fact was invented (drop it).");
}
process.exit(problems ? 1 : 0);
