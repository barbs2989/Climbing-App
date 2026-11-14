#!/usr/bin/env node
// Write the nightly AI checker's verdicts into review_ai_verdicts (0436). Validates every row
// first and writes NOTHING if any row is malformed, so a half-wrong batch never half-lands.
//
//   node scripts/review-verdicts-write.mjs <verdicts.json> [--dry]
//
// Input: a JSON array (or {verdicts:[…]}) of
//   {item_kind:'contribution'|'flag', item_id, item_hash, route_id?, area_id?, field?,
//    current_value?, suggested_value?, ai_value?, verdict:'agree'|'disagree'|'partly'|'unsure',
//    confidence:'2-source'|'1-source'|'none', sources:[{url, title?, quote}], reasoning, model?}
//
// Rules enforced here, not just asked of the agent (owner's verification ledger, 2026-11-14):
//   * agree / disagree / partly need at least one source with a url AND a quote;
//   * confidence '2-source' needs two sources on DIFFERENT sites (an official land-manager page
//     — .gov / .us / nps / usda / blm / state parks — may stand alone, flagged official:true);
//   * 'unsure' is always allowed, with or without sources;
//   * reasoning is 1–1200 characters.
// This is advice only: nothing here approves, rejects or resolves an item.

import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const FILE = args.find((a) => !a.startsWith("--"));
const DRY = args.includes("--dry");
if (!FILE) { console.error("usage: node scripts/review-verdicts-write.mjs <verdicts.json> [--dry]"); process.exit(2); }

let input = JSON.parse(fs.readFileSync(FILE, "utf8"));
if (!Array.isArray(input)) input = input.verdicts;
if (!Array.isArray(input)) { console.error("review-verdicts-write: expected an array of verdicts"); process.exit(2); }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
// US federal/state/county (.gov, .us) and Canadian federal/provincial (.gc.ca, bcparks.ca) land managers.
export const isOfficial = (u) => /(\.gov|\.us|\.gc\.ca|(^|\.)bcparks\.ca)$/.test(host(u) || "");

export function check(v) {
  const errs = [];
  if (!["contribution", "flag"].includes(v.item_kind)) errs.push("item_kind");
  if (!UUID.test(String(v.item_id || ""))) errs.push("item_id");
  if (!v.item_hash || typeof v.item_hash !== "string") errs.push("item_hash");
  if (!["agree", "disagree", "partly", "unsure"].includes(v.verdict)) errs.push("verdict");
  if (!["2-source", "1-source", "none"].includes(v.confidence)) errs.push("confidence");
  const src = Array.isArray(v.sources) ? v.sources : null;
  if (!src) errs.push("sources must be an array");
  const good = (src || []).filter((s) => s && host(s.url) && typeof s.quote === "string" && s.quote.trim().length >= 3);
  if (v.verdict !== "unsure" && !good.length) errs.push("a verdict other than unsure needs a source with url + quote");
  if (v.confidence === "2-source") {
    const hosts = new Set(good.map((s) => host(s.url)));
    if (hosts.size < 2 && !good.some((s) => isOfficial(s.url))) errs.push("2-source needs two different sites (or one official land-manager page)");
  }
  if (v.confidence === "none" && v.verdict !== "unsure") errs.push("confidence none only goes with unsure");
  const why = String(v.reasoning || "").trim();
  if (!why || why.length > 1200) errs.push("reasoning 1–1200 chars");
  return errs;
}

const bad = [];
input.forEach((v, i) => { const e = check(v); if (e.length) bad.push(`#${i} ${v.item_kind}:${v.item_id} — ${e.join("; ")}`); });
if (bad.length) { console.error(`review-verdicts-write: ${bad.length} malformed verdict(s), nothing written:\n  ` + bad.join("\n  ")); process.exit(1); }

const rows = input.map((v) => ({
  item_kind: v.item_kind, item_id: v.item_id, item_hash: v.item_hash,
  route_id: v.route_id || null, area_id: v.area_id || null, field: v.field || null,
  current_value: v.current_value ?? null, suggested_value: v.suggested_value ?? null, ai_value: v.ai_value ?? null,
  verdict: v.verdict, confidence: v.confidence,
  sources: v.sources.map((s) => ({ url: s.url, title: s.title || host(s.url), quote: String(s.quote || "").slice(0, 500), official: isOfficial(s.url) })),
  reasoning: String(v.reasoning).trim(), model: v.model || null, checked_at: new Date().toISOString(),
}));

if (DRY) { console.log(`review-verdicts-write: ${rows.length} verdict(s) valid (dry run, nothing written).`); process.exit(0); }

const KEY = requireServiceKey();
for (let i = 0; i < rows.length; i += 50) {
  const chunk = rows.slice(i, i + 50);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/review_ai_verdicts?on_conflict=item_kind,item_id`, {
    method: "POST",
    headers: headers(KEY, { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(chunk), signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) { console.error(`review-verdicts-write: write failed at row ${i}: ${res.status} ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  if (i + 50 < rows.length) await new Promise((r) => setTimeout(r, 1000));
}
console.log(`review-verdicts-write: wrote ${rows.length} verdict(s).`);
