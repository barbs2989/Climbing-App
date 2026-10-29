// Each approach card describes ITS OWN way in (owner note 2026-10-28, Mount Logan's Banded Glacier).
//
// The page shows one way in at a time where a route can switch, and a card is read as "the approach".
// A card that also narrates another way in — "An alternate approach comes up the Snowy Creek trail…",
// "A longer alternative from the West Fork Methow trailhead reaches the same country…" — reads as one
// approach whose description has two. Census over the 842 routes with cards: the audit's ALT_RE plus a
// wider net (alternate/fallback/"also be reached" wording, two named trailheads in one card) gave 92
// routes; each was read (plan beside this script) and 23 narrate another way in. The narrated text
// moves to that way in's own card where it has one (facts that card lacked are added, duplicates go),
// or to a NEW card where it has none — and every new card is on a route with no switcher, where all
// cards render, so none is hidden. A comparison ("the shorter of the two ways in") stays.
//
// Only `notes` changes on an existing card; every other key (trip, viaRouteId, hazards, camps, primary)
// is kept. A route whose live cards no longer match what was read is skipped.
//   node scripts/oneoff/approach-cards-one-way-each.mjs [--write | --rollback]
import fs from "node:fs";
import { SUPABASE_URL, headers, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const PLAN = JSON.parse(fs.readFileSync(new URL("./approach-cards-one-way-each.plan.json", import.meta.url), "utf8"));
const BEFORE = new URL("./approach-cards-one-way-each.before.json", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = async (id) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,approach_variants`, { headers: headers(key) }); if (!r.ok) throw new Error(id + " read " + r.status); const j = await r.json(); if (j.length !== 1) throw new Error(id + " rows " + j.length); return j[0]; };

if (process.argv.includes("--rollback")) {
  for (const [id, v] of Object.entries(JSON.parse(fs.readFileSync(BEFORE, "utf8")))) { await patchRow("routes", id, { approach_variants: v }); await sleep(1200); }
  console.log("rolled back"); process.exit(0);
}
const write = process.argv.includes("--write");
const before = fs.existsSync(BEFORE) ? JSON.parse(fs.readFileSync(BEFORE, "utf8")) : {};
let n = 0, skip = 0, bad = 0;
for (const p of PLAN) {
  const row = await read(p.id);
  const live = Array.isArray(row.approach_variants) ? row.approach_variants : [];
  const same = live.length === p.orig.length && p.orig.every((o, i) => live[i] && live[i].name === o.name && live[i].notes === o.notes);
  const done = live.length === p.cards.length && p.cards.every((c, i) => live[i] && live[i].name === c.name && live[i].notes === c.notes);
  if (done) { console.log("DONE already:", p.id); skip++; continue; }
  if (!same) { console.log("SKIP (cards changed since read):", p.id); skip++; continue; }
  const next = live.map((v) => { const c = p.cards.find((x) => !x.new && x.name === v.name); return { ...v, notes: c.notes }; });
  for (const c of p.cards.filter((x) => x.new)) next.push({ name: c.name, notes: c.notes });
  console.log(p.id, live.length, "->", next.length, "|", p.why);
  if (!write) continue;
  if (!before[p.id]) { before[p.id] = live; fs.writeFileSync(BEFORE, JSON.stringify(before, null, 1)); }
  await patchRow("routes", p.id, { approach_variants: next });
  const after = await read(p.id);
  if (JSON.stringify(after.approach_variants.map((v) => [v.name, v.notes])) !== JSON.stringify(next.map((v) => [v.name, v.notes]))) { bad++; console.log("RE-READ MISMATCH", p.id); }
  n++; await sleep(1200);
}
console.log(`${write ? "written" : "would write"} ${write ? n : PLAN.length - skip}, skipped ${skip}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
