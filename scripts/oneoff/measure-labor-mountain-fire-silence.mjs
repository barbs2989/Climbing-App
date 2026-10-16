// WHICH TEANAWAY ROUTES APPROACH THROUGH THE LABOR MOUNTAIN FIRE CLOSURE, AND SAY NOTHING?
//
// The 2025 Labor Mountain Fire burned ~43,000 acres in the Teanaway. The 2026 closure order runs
// 20 May - 31 Dec 2026 and closes, among others, Beverly Turnpike Trail #1391, Long's Pass Trail
// #1229, Ingall's Way Trail #1390, Standup Creek #1369, Bean Creek #1391.1/.2, Stafford Creek #1359
// and Bear Creek #1351, plus the Beverly Creek and North Fork Teanaway roads.
//
// Four routes in the catalog record it. This asks how many OTHERS describe an approach up one of
// those trails and mention nothing — the Spider Gap question, in a drainage where the closure has
// four months left to run.
//
// A NEAR MISS TO NOT REPEAT. A first search returned the trail list from the *2025* order PDF
// (06-17-03-25-30), which does NOT name Longs Pass or Ingalls Way — and on that list
// wa_argonaut_peak_east_ridge, which says both are closed, looked like it was overstating a closure.
// Deleting that claim would have removed a TRUE one. The 2026 order does name them.
// A partial source list reads exactly like a complete one. Check which ORDER you are holding.
//
// Report-only, read-only, anon key. Fails closed on an empty read.
import { selectAll } from "../lib/supabase-env.mjs";

// Named in the order. Matched on the trail NAME, since the catalog rarely carries trail numbers.
const CLOSED = [
  { name: "Beverly Turnpike", re: /beverly turnpike|beverly creek/i },
  { name: "Long's Pass #1229", re: /long'?s pass/i },
  { name: "Ingall's Way #1390", re: /ingalls? way/i },
  { name: "Standup Creek #1369", re: /stand ?up creek/i },
  { name: "Bean Creek #1391.1/.2", re: /bean creek/i },
  { name: "Stafford Creek #1359", re: /stafford creek/i },
  { name: "Bear Creek #1351", re: /bear creek trail/i },
  { name: "Miller Peak #1379", re: /miller peak trail/i },
  { name: "County Line #1226", re: /county line trail/i },
];
// Does the row say ANYWHERE that this is shut? Per-ROW, not per-value — the measurement of
// recommended alternatives was per-value and reported the unqualified half of an honest row.
const KNOWS = /labor mountain|fire[- ]damage closure|fire closure|closed under a USFS|9737-112.*clos|clos\w+.*9737-112/i;

const rows = await selectAll("routes", "id,name,road,access,approach", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

const textOf = r => {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  return [rd.name, rd.status, rd.seasonalGate, rd.driveNote, ac.closures, ac.seasonal, r.approach]
    .filter(v => typeof v === "string").join(" — ");
};

const aware = [], silent = [];
for (const r of rows) {
  const t = textOf(r);
  const hits = CLOSED.filter(c => c.re.test(t));
  if (!hits.length) continue;
  (KNOWS.test(t) ? aware : silent).push({ id: r.id, name: r.name, hits: hits.map(h => h.name), t });
}

const total = aware.length + silent.length;
if (!total) { console.error("FAIL — no route names any closed trail; the needles broke"); process.exit(1); }

console.log(`${total} WA route(s) describe an approach up a trail or road named in the Labor Mountain Fire order.`);
console.log(`   ${aware.length} record the closure.`);
console.log(`   ${silent.length} say nothing.\n`);

console.log("SILENT — approach runs through the closure, row does not mention it:\n");
for (const s of silent) {
  const snip = (s.t.match(new RegExp(`[^—]*(?:${CLOSED.filter(c => s.hits.includes(c.name)).map(c => c.re.source).join("|")})[^—]*`, "i")) || [s.t])[0];
  console.log(`   ${s.id}  (${s.hits.join(", ")})`);
  console.log(`      ${snip.replace(/\s+/g, " ").trim().slice(0, 180)}\n`);
}

console.log(`AWARE — already record it: ${aware.map(a => a.id).join(", ") || "(none)"}\n`);
console.log(`READ BEFORE ACTING. Naming a closed trail is not the same as routing a party up it: a row
may mention Bean Creek as a landmark, or describe the drainage rather than the approach. And the
order runs only to 31 Dec 2026, so anything written here is a claim with four months of life —
exactly the shelf-life defect audit:expiring-closures exists for, which is why any repair must state
the order's own end date rather than saying "currently".`);
