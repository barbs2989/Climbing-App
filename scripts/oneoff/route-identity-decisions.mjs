// Turns the deep identity research (audits/route-grades/deep/out/i*.json) into one decision table,
// audits/route-grades/deep/IDENTITY-DECISIONS.md. Read-only — merges and renames are owner decisions
// (docs/codebase/route-identity.md). A duplicate reported from BOTH sides is one decision.
//   node scripts/oneoff/route-identity-decisions.mjs
import fs from "fs";

const D = "audits/route-grades/deep/out/";
const all = fs.readdirSync(D).filter(f => /^i\d+\.json$/.test(f)).sort().flatMap(f => JSON.parse(fs.readFileSync(D + f, "utf8")));
const count = (k) => all.reduce((a, r) => (a[r[k]] = (a[r[k]] || 0) + 1, a), {});
const esc = s => String(s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const src = r => (r.sources || []).slice(0, 2).map((u, i) => `[${i + 1}](${u})`).join(" ");

const seen = new Set(), dup = [];
for (const r of all.filter(r => r.verdict === "DUPLICATE")) {
  const k = [r.keep_id, r.merge_id].sort().join("|");
  if (seen.has(k)) continue; seen.add(k); dup.push(r);
}
const by = v => all.filter(r => r.verdict === v);
const lines = [
  "# Route identity — researched decisions (2026-10-01)",
  "",
  `Deep online research on the ${all.length} routes the grade audit flagged. **Nothing here has been written** —`,
  "merging, deleting or renaming a route row is an owner decision (`docs/codebase/route-identity.md`).",
  `Verdicts: ${JSON.stringify(count("verdict"))}. Confidence: ${JSON.stringify(count("confidence"))}.`,
  "Per-row evidence and every source are in `out/i*.json`.",
  "",
  `## Duplicates — the same climb stored twice (${dup.length} pairs)`,
  "",
  "| keep | fold in | conf. | why | sources |", "|---|---|---|---|---|",
  ...dup.map(r => `| \`${r.keep_id}\` | \`${r.merge_id}\` | ${r.confidence} | ${esc(r.evidence)} | ${src(r)} |`),
  "",
  `## Part of another route — a variation, start or crux section (${by("PART_OF").length})`,
  "",
  "| route | part of | conf. | why | sources |", "|---|---|---|---|---|",
  ...by("PART_OF").map(r => `| \`${r.id}\` | \`${r.parent_id}\` | ${r.confidence} | ${esc(r.evidence)} | ${src(r)} |`),
  "",
  `## Misnamed — a real route under the wrong name (${by("MISNAMED").length})`,
  "",
  "| route | correct name | conf. | why | sources |", "|---|---|---|---|---|",
  ...by("MISNAMED").map(r => `| \`${r.id}\` | ${esc(r.correct_name)} | ${r.confidence} | ${esc(r.evidence)} | ${src(r)} |`),
  "",
  `## Wrong content — the page describes a different route (${by("WRONG_CONTENT").length})`,
  "",
  "| route | content belongs to | what this route is | conf. | sources |", "|---|---|---|---|---|",
  ...by("WRONG_CONTENT").map(r => `| \`${r.id}\` | ${esc(r.content_belongs_to)} | ${esc(r.what_this_route_is && [r.what_this_route_is.grade, r.what_this_route_is.fa, r.what_this_route_is.overview].filter(Boolean).join(" — "))} | ${r.confidence} | ${src(r)} |`),
  "",
  `## Flag was wrong — distinct routes (${by("DISTINCT").length}) · not found (${by("NOT_FOUND").length})`,
  "",
  ...[...by("DISTINCT"), ...by("NOT_FOUND")].map(r => `- \`${r.id}\` (${r.verdict}, ${r.confidence}): ${esc(r.evidence)}`),
  "",
];
fs.writeFileSync("audits/route-grades/deep/IDENTITY-DECISIONS.md", lines.join("\n"));
console.log(all.length, "rows |", JSON.stringify(count("verdict")), "| distinct duplicate pairs", dup.length, "|", JSON.stringify(count("confidence")));
