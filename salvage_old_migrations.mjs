#!/usr/bin/env node
// Extracts valid UPDATE blocks from migrations 0029-0033, corrects wa_ prefix
// and route_id->id column bugs, discards blocks whose route ID doesn't exist
// in the live DB at all. Produces one clean, correct consolidated migration.
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import fs from "fs";

const url = "https://ofuofhojhbcrcahuotya.supabase.co";
const key = "sb_publishable_Xeg2L1pOa5YK6RjTUuYvNA_7B0tfRr5";
const supabase = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: ws } });

const FILES = [
  { path: "supabase/migrations/0029_goode_ne_buttress_gear_fix.sql", whereCol: "id" },
  { path: "supabase/migrations/0030_gear_audit_batch_1.sql", whereCol: "id" },
  { path: "supabase/migrations/0042_gear_audit_test_batch.sql", whereCol: "id" },
  { path: "supabase/migrations/0032_gear_audit_batch_3_comprehensive.sql", whereCol: "id" },
  { path: "supabase/migrations/0033_gear_audit_batch_4_comprehensive.sql", whereCol: "route_id" },
];

async function loadRealIds() {
  let all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.from("routes").select("id").like("id", "wa_%").range(offset, offset + limit - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < limit) break;
    offset += limit;
  }
  return new Set(all.map(r => r.id));
}

function splitBlocks(content, whereCol) {
  // Split on "update routes set" (case-insensitive), keep delimiter
  const parts = content.split(/(?=^update routes set$)/im);
  const blocks = [];
  const wherePattern = new RegExp(`where\\s+${whereCol}\\s*=\\s*'([^']+)'\\s*;`, 'i');
  for (const part of parts) {
    if (!/^update routes set/i.test(part.trim())) continue;
    const m = part.match(wherePattern);
    if (!m) continue;
    // Trim to end right after the matched "where ... ;" clause — a block's segment
    // can carry trailing comment/blank lines belonging to the NEXT block's preamble.
    const trimmed = part.trim();
    const endIdx = trimmed.indexOf(m[0]) + m[0].length;
    blocks.push({ sql: trimmed.slice(0, endIdx), rawId: m[1] });
  }
  return blocks;
}

// Fields already freshly (re-)researched with confidence tracking in migration 0034.
// For IDs that overlap with 0034, strip these columns from the salvaged old block so
// 0034's newer, confidence-tagged data isn't clobbered by older, unlabeled research —
// but keep gear/detailed_rack/pro_needs/what_to_bring, which 0034 never touches.
const STRUCTURED_FIELDS = ['sling_rack', 'alpine_draws', 'rope_type', 'rope_length_m', 'rope_note', 'ascender', 'corrections'];

function stripStructuredFields(sql) {
  const lines = sql.split('\n');
  const kept = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isStructuredField = STRUCTURED_FIELDS.some(f => new RegExp(`^${f}\\s*=`).test(trimmed));
    if (isStructuredField) continue;
    kept.push(line);
  }
  // Fix trailing comma: the last field line before "where id = ...;" (blocks are
  // pre-trimmed at split time, so this is reliably the final line) must not end in a comma.
  const whereIdx = kept.findIndex(l => /^\s*where\s+id\s*=/i.test(l));
  let lastFieldIdx = -1;
  for (let i = whereIdx - 1; i >= 0; i--) {
    if (kept[i].trim() === '') continue;
    lastFieldIdx = i;
    break;
  }
  if (lastFieldIdx >= 0) {
    kept[lastFieldIdx] = kept[lastFieldIdx].replace(/,\s*$/, '');
  }
  return kept.join('\n');
}

function loadBatch5Ids() {
  const content = fs.readFileSync('supabase/migrations/0034_gear_audit_batch_5_real.sql', 'utf8');
  const ids = new Set();
  for (const m of content.matchAll(/WHERE id = '([^']+)'/g)) ids.add(m[1]);
  return ids;
}

async function main() {
  const realIds = await loadRealIds();
  const batch5Ids = loadBatch5Ids();
  console.log(`Loaded ${realIds.size} real wa_ route IDs from live DB.`);
  console.log(`Loaded ${batch5Ids.size} IDs already covered by migration 0034.\n`);

  const validBlocks = [];
  const discarded = [];

  for (const { path, whereCol } of FILES) {
    const content = fs.readFileSync(path, 'utf8');
    const blocks = splitBlocks(content, whereCol);
    let fileValid = 0, fileDiscarded = 0;

    for (const block of blocks) {
      let correctedId = null;
      if (realIds.has(block.rawId)) {
        correctedId = block.rawId;
      } else if (realIds.has('wa_' + block.rawId)) {
        correctedId = 'wa_' + block.rawId;
      }

      if (!correctedId) {
        discarded.push({ file: path, rawId: block.rawId });
        fileDiscarded++;
        continue;
      }

      // Rebuild the block with corrected column name (id) and corrected/prefixed ID value
      let sql = block.sql;
      // Replace the trailing WHERE clause with a normalized one
      const wherePattern = new RegExp(`where\\s+${whereCol}\\s*=\\s*'[^']+'\\s*;`, 'i');
      sql = sql.replace(wherePattern, `where id = '${correctedId.replace(/'/g, "''")}';`);

      if (batch5Ids.has(correctedId)) {
        sql = stripStructuredFields(sql);
      }

      validBlocks.push({ sql, id: correctedId, sourceFile: path, overlapsBatch5: batch5Ids.has(correctedId) });
      fileValid++;
    }
    console.log(`${path}: ${fileValid} valid, ${fileDiscarded} discarded`);
  }

  console.log(`\nTotal valid: ${validBlocks.length}`);
  console.log(`Total discarded: ${discarded.length}`);

  const out = `-- Salvaged + corrected gear-audit data from migrations 0029-0033
-- Generated: 2026-07-16
-- Every route_id below was re-verified against the live routes table.
-- Fixes applied: missing 'wa_' ID prefix (migration 0032), wrong WHERE
-- column name 'route_id' -> 'id' (migration 0033). Blocks whose route_id
-- had no match at all in the live DB (fabricated) were discarded --
-- see /tmp/discarded_ids.txt for the full list; those peaks/routes still
-- need real research under correct IDs in a future batch.
--
-- Requires migration 0028 (structured_rack_fields) + gear_confidence column
-- to be applied first. Apply via Supabase SQL editor or with the service
-- role key (see README note in 0034).

BEGIN;

${validBlocks.map(b => b.sql).join('\n\n')}

COMMIT;
`;

  fs.writeFileSync('supabase/migrations/0043_salvaged_batches_1-4_corrected.sql', out);
  fs.writeFileSync('/tmp/discarded_ids.txt', discarded.map(d => `${d.rawId}\t(${d.file})`).join('\n'));
  console.log(`\nWritten: supabase/migrations/0043_salvaged_batches_1-4_corrected.sql`);
  console.log(`Discarded IDs list: /tmp/discarded_ids.txt`);
}

main().catch(e => { console.error(e); process.exit(1); });
