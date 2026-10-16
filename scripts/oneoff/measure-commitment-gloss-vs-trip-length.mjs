// "COMMITMENT · Grade II — Half a day, retreat is straightforward" rendered two lines under prose
// saying "Most parties make it a 2-3 day trip". Both are true of DIFFERENT things: the NCCS
// commitment grade describes the technical ROUTE, the prose describes the TRIP including a 14-mile
// approach. The gloss never says half a day OF WHAT.
//
// The same panel already draws that distinction for the other numbers — "Scramble section is the
// climbing itself. Approach gain and distance are the hike in to the base — kept separate so the
// climb is not buried in approach numbers." — so the omission is inconsistent with its neighbours
// rather than a matter of taste.
//
// This measures how often the collision is on screen. Report-only: the fix under consideration is
// four words of COPY, never a change to the stored grade, which would be a data claim with no source.
import { selectAll } from "../lib/supabase-env.mjs";

// The app's own mapping (RouteDetail.jsx COMMITMENT_EXPLAINERS), abbreviated to the time clause.
const SHORT = { I: "A few hours", II: "Half a day", III: "Most of a day" };
// Prose that says the outing runs beyond a day.
const MULTIDAY = /\b(\d\s*[-–]\s*\d|two|three|2|3|4)\s*[-–]?\s*day\b|\bmulti[- ]day\b|\bovernight\b|\bbivou?ac\b|\bbivy\b|\bcamp\b/i;

const rows = await selectAll("routes",
  "id,name,commitment,dist_km,overview,beta,approach", "commitment=not.is.null",
  { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

let short = 0;
const hits = [];
for (const r of rows) {
  const g = String(r.commitment || "").trim().toUpperCase().replace(/^GRADE\s+/, "");
  if (!SHORT[g]) continue;
  short++;
  const prose = [r.overview, r.beta, r.approach].filter((x) => typeof x === "string").join(" ");
  const m = MULTIDAY.exec(prose);
  if (!m) continue;
  // The straight-line one-way distance is corroboration: a long approach is what makes the TRIP
  // longer than the CLIMB, which is exactly the case the gloss reads wrongly in.
  const mi = Number.isFinite(Number(r.dist_km)) ? Number(r.dist_km) / 1.609 : null;
  hits.push({ id: r.id, g, gloss: SHORT[g], phrase: m[0], mi: mi == null ? null : Math.round(mi * 10) / 10 });
}

hits.sort((a, b) => (b.mi || 0) - (a.mi || 0));
console.log(`${rows.length} route(s) store a commitment grade; ${short} store I, II or III — the grades whose gloss promises a day or less.`);
console.log(`${hits.length} of those have prose describing a longer outing:\n`);
for (const h of hits.slice(0, 20)) {
  console.log(`  ${h.g.padEnd(3)} "${h.gloss}"  vs prose "${h.phrase}"   ${h.mi == null ? "" : h.mi + " mi one-way"}   ${h.id}`);
}
if (hits.length > 20) console.log(`  … and ${hits.length - 20} more`);
console.log("\nA hit is NOT a wrong grade. Both statements are true of different things; the gloss");
console.log("simply does not say which. Read a few before deciding the copy is worth changing.");
