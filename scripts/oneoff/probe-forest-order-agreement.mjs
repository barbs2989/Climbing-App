#!/usr/bin/env node
// Routes citing the SAME forest order — do they agree about whether it is still in effect?
//
// audit:trailhead-road asks the neighbouring question and structurally cannot reach this one: it
// clusters routes by TRAILHEAD COORDINATE, and one closure order routinely covers a whole road
// serving several trailheads on several different peaks. Those routes land in different clusters,
// so a disagreement between them is invisible there.
//
// A forest order NUMBER is an exact identifier — no road-name normalising, no place tokens, none
// of the six tightenings audit:trailhead-road needed. Two rows citing #06-05-25-02 are two
// recordings of one legal instrument, and it is either in effect or it is not.
import { selectAll } from "../lib/supabase-env.mjs";

const FIELDS = [["road", "status"], ["road", "seasonalGate"], ["road", "driveNote"],
                ["access", "closures"], ["access", "seasonal"], ["access", "permit"]];

// "Forest Order #06-05-25-02", "order 06-17-07-2026-11", "#06-05-25-02"
const ORDER_RE = /#?\b(\d{2}-\d{2}-\d{2}(?:-\d{2,4})?(?:-\d{2,4})?)\b/g;
const NEAR_ORDER = /(?:forest\s+order|closure\s+order|order)\s*(?:no\.?|number|#)?\s*$/i;

const rows = await selectAll("routes", "id,name,road,access", "or=(road.not.is.null,access.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

const byOrder = new Map();
for (const r of rows) {
  for (const [col, key] of FIELDS) {
    const t = r[col]?.[key];
    if (typeof t !== "string" || !t.trim()) continue;
    ORDER_RE.lastIndex = 0;
    for (const m of t.matchAll(ORDER_RE)) {
      // Only count a number the prose actually calls an order — a bare hyphenated number is a
      // milepost range or a phone fragment as often as a citation.
      if (!NEAR_ORDER.test(t.slice(Math.max(0, m.index - 24), m.index))) continue;
      const k = m[1];
      if (!byOrder.has(k)) byOrder.set(k, []);
      byOrder.get(k).push({ id: r.id, col, key, t });
    }
  }
}

console.log(`${rows.length} routes carry road/access.`);
console.log(`${byOrder.size} distinct forest order number(s) cited.\n`);

// Does the value claim the order is CURRENT, or that it has LAPSED / been superseded?
const CURRENT = /\bstill (?:active|in effect)\b|\bremains? (?:active|in effect|closed)\b|\bis (?:currently )?closed\b|\bas of (?:the )?20\d\d(?:[ -]\d\d)? season\b/i;
const LAPSED = /\bthrough (?:at least )?[a-z]{3,9}\.?\s*\d{0,2},?\s*20\d\d\b|\bexpired?\b|\brescinded\b|\breopened\b/i;

let disputed = 0;
for (const [order, uses] of [...byOrder.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const routes = new Set(uses.map((u) => u.id));
  const stances = new Map();
  for (const u of uses) {
    const s = CURRENT.test(u.t) ? "current" : LAPSED.test(u.t) ? "states-an-end" : "unstated";
    if (!stances.has(s)) stances.set(s, []);
    stances.get(s).push(u);
  }
  const clash = stances.has("current") && stances.has("states-an-end");
  if (clash) disputed++;
  console.log(`${clash ? "** DISPUTED " : "   "}order ${order} — ${routes.size} route(s), ${uses.length} value(s): ${[...stances.keys()].join(" / ")}`);
  if (clash) {
    for (const [s, us] of stances) {
      for (const u of us) {
        console.log(`      [${s}] ${u.id} ${u.col}.${u.key}`);
        console.log(`         ${u.t.replace(/\s+/g, " ").slice(0, 300)}`);
      }
    }
  }
  console.log("");
}
console.log(`${disputed} order(s) where one route says still in effect and another states an end.`);
