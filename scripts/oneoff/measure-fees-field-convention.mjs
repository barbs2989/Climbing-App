#!/usr/bin/env node
// What does `access.fees` MEAN -- every cost, or every cost the row does not already name?
//
// The open question (memory: open-product-decisions) is a decision about the FIELD, and it has been
// argued from the field's NAME, which cannot settle it: both readings are defensible from "fees".
//
// This asks the corpus instead. Among routes whose access block DOCUMENTS A CHARGE, what did the
// authors put in `fees`? That is the same discipline this repo already uses for coordinates --
// compare a suspect against the rows that AGREE, rather than reasoning about the schema.
//
//   node scripts/oneoff/measure-fees-field-convention.mjs [--state wa] [--all]
//
// Read-only, anon key. Fails CLOSED: an empty read, or zero routes carrying an access block, is
// reported as a broken scan rather than as a clean catalog.

import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const state = (args[args.indexOf("--state") + 1] || "wa").toLowerCase();

// A charge is DOCUMENTED when a field names a named pass, a dollar amount, or an entrance fee.
// Deliberately narrow: a bare mention of the word "fee" inside a NEGATION ("no fee") is not a charge,
// which is the deny-list trap this repo records for road status and rappel counts.
const NEG = /\b(no|none|not|without|free of|n\/?a)\b[^.;]{0,24}\b(fee|charge|pass|permit|cost)/i;
const CHARGE = /(\$\s?\d|\b\d+\s?(?:usd|dollars)\b|northwest forest pass|america the beautiful|interagency (?:annual )?pass|sno-?park|discover pass|entrance fee|day[- ]use fee|parking fee|per vehicle|per person\b)/i;
const FREE = /^\s*(n\/?a|none|no fee[s]?|free|no charge|\$?0(\.00)?|not applicable|none required|no fees? required)\s*\.?\s*$/i;

function documentsCharge(v) {
  if (v == null) return false;
  const s = String(v);
  if (NEG.test(s)) return false;
  return CHARGE.test(s);
}

// Pull ONLY the keys this needs, with ->> arrow selectors, and page by KEYSET on id.
//
// Measured rather than guessed: selecting the whole `access` blob through the shared selectAll
// helper answered 500 with an HTML Cloudflare page (not a PostgREST error), while
// `select=id,access->>fees,...&limit=500` returns in ~110ms. The blob is large and most of it is
// irrelevant here; asking for six scalars instead is both faster and smaller.
const KEYS = ["fees", "parking_pass", "permit", "permitDetails", "permit_details", "notes", "rules", "passRequired"];
const SELECT = "id," + KEYS.map((k) => `${k}:access->>${k}`).join(",");
const H = headers(anonKey());
const PAGE = 500;

async function fetchAll() {
  const out = [];
  let last = "";
  for (let guard = 0; guard < 2000; guard++) {
    const q = SUPABASE_URL + "/rest/v1/routes?select=" + encodeURIComponent(SELECT) +
      (ALL ? "" : "&id=like." + state + "\\_%25") +
      (last ? "&id=gt." + encodeURIComponent(last) : "") +
      "&order=id.asc&limit=" + PAGE;
    const r = await fetch(q, { headers: H });
    if (!r.ok) throw new Error("GET routes -> " + r.status + " " + (await r.text()).slice(0, 120));
    const batch = await r.json();
    if (!batch.length) break;
    out.push(...batch);
    last = batch[batch.length - 1].id;
    if (batch.length < PAGE) break;
  }
  return out;
}

let rows;
try {
  rows = await fetchAll();
} catch (e) {
  console.error("BROKEN SCAN: the read failed — " + String(e.message || e));
  process.exit(1);
}
if (!rows || !rows.length) {
  console.error("BROKEN SCAN: zero routes read. Not a clean catalog.");
  process.exit(1);
}

// Which OTHER fields in the blob can document a charge?
const OTHER = ["parking_pass", "permit", "permitDetails", "permit_details", "notes", "rules", "passRequired"];

let withAccess = 0, charged = 0;
const bucket = { bare: 0, scoped: 0, restates: 0, other: 0, missing: 0 };
const examples = { bare: [], scoped: [], restates: [], other: [] };

for (const ac of rows) {
  const r = ac;
  // ->> yields null for a key the blob does not have, so "has an access block" here means
  // "at least one of the keys we asked for is present".
  if (!KEYS.some((k) => ac[k] != null)) continue;
  withAccess++;
  const chargeField = OTHER.find((k) => documentsCharge(ac[k]));
  if (!chargeField) continue;
  charged++;

  const fees = ac.fees;
  if (fees == null || String(fees).trim() === "") { bucket.missing++; continue; }
  const s = typeof fees === "number" ? String(fees) : String(fees);
  // The first cut had ONE "free" bucket and 72.5% fell through to "other", which settled nothing.
  // Reading that bucket showed it holds two very different things, and the split is the finding:
  // a BARE negative ("Free") against a SCOPED one ("None - no climbing fee (National Forest, not
  // Mount Rainier NP)"), which says WHICH fee is absent and is not in conflict with a parking pass
  // named two fields away.
  const saysNone = /\b(none|no |free|n\/?a|not applicable|\$0)\b/i.test(s);
  const namesCharge = documentsCharge(s);
  if (FREE.test(s)) {
    bucket.bare++;
    if (examples.bare.length < 4) examples.bare.push({ id: r.id, fees: s, via: chargeField, txt: String(ac[chargeField]).slice(0, 78) });
  } else if (namesCharge) {
    bucket.restates++;
    if (examples.restates.length < 4) examples.restates.push({ id: r.id, fees: s.slice(0, 92), via: chargeField });
  } else if (saysNone) {
    bucket.scoped++;
    if (examples.scoped.length < 4) examples.scoped.push({ id: r.id, fees: s.slice(0, 92), via: chargeField });
  } else {
    bucket.other++;
    if (examples.other.length < 4) examples.other.push({ id: r.id, fees: s.slice(0, 92), via: chargeField });
  }
}

console.log("project: " + String(SUPABASE_URL).replace(/https:\/\/([^.]+).*/, "$1"));
console.log("scope:   " + (ALL ? "whole catalog" : state.toUpperCase()));
console.log("routes with an access block:            " + withAccess);
console.log("...of those, a field DOCUMENTS a charge: " + charged);
if (!charged) { console.error("\nBROKEN SCAN: no route documents a charge — the needle matched nothing."); process.exit(1); }

const pct = (n) => (100 * n / charged).toFixed(1).padStart(5) + "%";
console.log("\nWhat did the author put in `fees` on those " + charged + " rows?");
console.log("  BARE 'Free' / 'N/A'      " + String(bucket.bare).padStart(5) + "  " + pct(bucket.bare) + "   <- unscoped: reads as 'the day is free'");
console.log("  SCOPED negative          " + String(bucket.scoped).padStart(5) + "  " + pct(bucket.scoped) + "   <- says WHICH fee is absent");
console.log("  RESTATES the charge      " + String(bucket.restates).padStart(5) + "  " + pct(bucket.restates) + "   <- names the pass or a $ amount");
console.log("  neither                  " + String(bucket.other).padStart(5) + "  " + pct(bucket.other));
console.log("  absent / empty           " + String(bucket.missing).padStart(5) + "  " + pct(bucket.missing) + "   <- a defect under EITHER reading");
const answered = bucket.scoped + bucket.restates;
console.log("\n  rows that make themselves UNAMBIGUOUS (scoped or restated): " + answered + "  " + pct(answered));

for (const [k, label] of [["bare", "BARE negative over a documented charge"], ["scoped", "SCOPED negative"], ["restates", "RESTATES the charge"], ["other", "neither"]]) {
  if (!examples[k].length) continue;
  console.log("\n  " + label + ":");
  for (const e of examples[k]) console.log("    " + e.id.padEnd(42) + "fees=" + JSON.stringify(e.fees) + (e.txt ? "   [" + e.via + ": " + e.txt + "]" : "   [via " + e.via + "]"));
}

console.log("\nHow to read this: whichever bucket DOMINATES is the convention the authors actually");
console.log("followed. It does not make the other bucket correct -- it says which one is the outlier,");
console.log("and therefore which way a sweep would be repairing rather than destroying.");
