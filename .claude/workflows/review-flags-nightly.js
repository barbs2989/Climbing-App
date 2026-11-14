export const meta = {
  name: "review-flags-nightly",
  description: "AI-check each held route edit / climber flag for the owner's Review desk (verdicts only, never approves)",
  whenToUse: "Nightly, after `node scripts/review-queue-export.mjs --out q.json`; pass q.json's items as args, write the returned verdicts with scripts/review-verdicts-write.mjs",
  phases: [
    { title: "Research", detail: "one researcher per item" },
    { title: "Verify", detail: "a separate skeptic re-opens every cited source" },
  ],
};

// INPUT (args): the `items` array from scripts/review-queue-export.mjs (or the whole export object).
// OUTPUT: { verdicts: [...] } in the shape scripts/review-verdicts-write.mjs validates; the caller
// writes it to a file and runs that script. This workflow has no file or database access, and it
// NEVER approves, rejects or resolves anything — the owner does that on review.html.
//
// Rules (owner's research verification ledger, 2026-11-14):
//   * 'agree'/'disagree' at '2-source' only when TWO INDEPENDENT sources say so. Sites that copy one
//     guidebook, or two pages of the same site, count ONCE. An official land-manager page (.gov,
//     .us, .gc.ca) alone is enough for official-only facts (permits, fees, closures, road status).
//   * Never use or open AllTrails, Gaia, CalTopo, Strava, Wikiloc, Peakbagger or Mountain Project
//     for track/geometry questions. Sites that answer 403 are skipped, not guessed at.
//   * The owner owns no guidebooks — never claim a guidebook says something you did not read online.
//   * Quote the exact words that support the verdict; no quote, no source.
let _a = args;
if (typeof _a === "string") { try { _a = JSON.parse(_a); } catch { _a = null; } }
const ITEMS = Array.isArray(_a) ? _a : (_a && Array.isArray(_a.items) ? _a.items : []);
if (!ITEMS.length) { log("No items to check."); }

const SRC = { type: "object", additionalProperties: false, required: ["url", "quote"],
  properties: { url: { type: "string" }, title: { type: "string" }, quote: { type: "string" } } };
const VERDICT = {
  type: "object", additionalProperties: false,
  required: ["verdict", "confidence", "sources", "reasoning"],
  properties: {
    verdict: { type: "string", enum: ["agree", "disagree", "partly", "unsure"] },
    confidence: { type: "string", enum: ["2-source", "1-source", "none"] },
    ai_value: {},
    sources: { type: "array", items: SRC },
    reasoning: { type: "string", maxLength: 1200 },
  },
};

const RULES = `Rules:
- "agree"/"disagree" at confidence "2-source" ONLY when two INDEPENDENT sources (different sites, not copying the same guidebook) support it. One official land-manager page (.gov/.us/.gc.ca) is enough for permits, fees, closures, road status.
- One good open source → "1-source". Nothing usable → verdict "unsure", confidence "none".
- Never open AllTrails, Gaia, CalTopo, Strava, Wikiloc, Peakbagger or Mountain Project. Skip any site that refuses access (403); do not guess what it says.
- Every source needs its exact supporting words in "quote" (under 300 characters). No quote → not a source.
- "ai_value" = the value you believe belongs in the field, in the SAME JSON shape as the current/suggested value (number stays number, array of rows stays array of rows). Omit it (null) when unsure, or when the climber's value is already right and verdict is "agree" — then use the climber's value.
- "reasoning": 1–4 plain sentences the owner reads before deciding. Mention if the edit removes something.`;

function itemText(it) {
  const where = it.route ? `${it.route.name} (${it.route.discipline || "?"}, grade ${it.route.grade || "?"}) in ${it.route.area || "?"}, ${String(it.route.state || "").toUpperCase()}` : it.area ? `area ${it.area.name || it.area.id}` : it.route_id;
  return `ROUTE/AREA: ${where}  [id ${it.route_id || it.area_id}]
FIELD: ${it.field_label} (${it.field || "whole route"})
ON THE PAGE NOW: ${JSON.stringify(it.current_value)}
${it.item_kind === "flag" ? `A CLIMBER FLAGGED THIS AS WRONG, without giving a value. Their note: "${it.climber_note}"` : `A CLIMBER SUGGESTS (${it.climbers} climber(s)): ${JSON.stringify(it.suggested_value)}${it.climber_note ? `\nTheir reason: "${it.climber_note}"` : ""}${it.removes_something ? "\nNOTE: this edit REMOVES something from the page." : ""}`}`;
}

const results = await pipeline(
  ITEMS,
  (it, _o, i) => agent(
    `You check one climber report for a climbing app's owner. Research it on the open web (WebSearch/WebFetch) and decide whether the climber is right.

${itemText(it)}

${it.item_kind === "flag" ? "Decide: is the value on the page wrong? verdict agree = the climber is right that it is wrong (give the correct value in ai_value); disagree = the page is right; partly = some of it is wrong." : "Decide: is the climber's suggested value correct? agree = yes; disagree = no (put the right value in ai_value if you found it); partly = some of it (put the corrected value in ai_value)."}

${RULES}`,
    { label: `research:${(it.route && it.route.name) || it.route_id || i}:${it.field || "route"}`, phase: "Research", schema: VERDICT }),
  (draft, it, i) => draft && agent(
    `You are a skeptical second checker. Another agent judged a climber report. Re-open EVERY cited url yourself and confirm the quote is really on that page and really supports the claim. Drop any source you cannot open or whose quote you cannot find. Merge sources from the same site or that copy one guidebook. Then re-grade: keep "2-source" only if two independent sources survive (or one official land-manager page for an official-only fact); otherwise lower the confidence, and if nothing survives set verdict "unsure", confidence "none". You may correct ai_value if the surviving sources show a different value. Do NOT search for new sources beyond a quick check.

THE REPORT:
${itemText(it)}

THE FIRST CHECKER'S VERDICT:
${JSON.stringify(draft)}

${RULES}`,
    { label: `verify:${(it.route && it.route.name) || it.route_id || i}:${it.field || "route"}`, phase: "Verify", schema: VERDICT }),
  (final, it) => final && ({
    item_kind: it.item_kind, item_id: it.item_id, item_hash: it.item_hash,
    route_id: it.route_id || null, area_id: it.area_id || null, field: it.field || null,
    current_value: it.current_value ?? null, suggested_value: it.suggested_value ?? null,
    ai_value: final.ai_value ?? (final.verdict === "agree" && it.item_kind === "contribution" ? it.suggested_value : null),
    verdict: final.verdict, confidence: final.confidence, sources: final.sources || [],
    reasoning: final.reasoning, model: "claude (review-flags-nightly)",
  }),
);

const verdicts = results.filter(Boolean);
const dropped = ITEMS.length - verdicts.length;
if (dropped) log(`${dropped} item(s) produced no verdict (agent skipped or failed); they stay unchecked and are retried next run.`);
log(`${verdicts.length} verdict(s): ` + ["agree", "disagree", "partly", "unsure"].map((k) => k + " " + verdicts.filter((v) => v.verdict === k).length).join(", "));
return { verdicts };
