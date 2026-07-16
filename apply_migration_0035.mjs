#!/usr/bin/env node
// Parses migration 0035's UPDATE blocks (salvaged batch 1-4 data, which has different/richer
// fields than the JSON-cohort-based migrations) and applies them via the service_role key.
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import fs from "fs";

const url = "https://ofuofhojhbcrcahuotya.supabase.co";
const key = process.env.SUPABASE_SERVICE_KEY;
if (!key) { console.error("Set SUPABASE_SERVICE_KEY env var"); process.exit(1); }
const supabase = createClient(url, key, { auth: { persistSession: false }, realtime: { transport: ws } });

const content = fs.readFileSync('supabase/migrations/0035_salvaged_batches_1-4_corrected.sql', 'utf8');

// Split into UPDATE blocks
const blocks = content.split(/(?=^update routes set$)/im).filter(b => /^update routes set/i.test(b.trim()));

// Parse a single SQL value token (starting at position i in str) into a JS value.
// Returns { value, nextIndex } where nextIndex points just past the consumed value
// (before any trailing ::cast, comma, or newline).
function parseValue(str, i) {
  // skip whitespace
  while (i < str.length && /\s/.test(str[i])) i++;
  if (str.startsWith('NULL', i)) return { value: null, nextIndex: i + 4 };
  if (str.startsWith('null', i)) return { value: null, nextIndex: i + 4 };
  if (str.startsWith('false', i)) return { value: false, nextIndex: i + 5 };
  if (str[i] === "'") {
    // SQL string literal with '' escaping
    let j = i + 1;
    let out = '';
    while (j < str.length) {
      if (str[j] === "'" && str[j + 1] === "'") { out += "'"; j += 2; continue; }
      if (str[j] === "'") { j++; break; }
      out += str[j];
      j++;
    }
    return { value: out, nextIndex: j };
  }
  // number or bare token (e.g. now())
  let j = i;
  while (j < str.length && !/[,\n]/.test(str[j])) j++;
  const token = str.slice(i, j).trim();
  if (token === 'now()') return { value: '__NOW__', nextIndex: j };
  if (/^-?\d+(\.\d+)?$/.test(token)) return { value: Number(token), nextIndex: j };
  return { value: token, nextIndex: j };
}

function parseBlock(block) {
  const whereMatch = block.match(/where\s+id\s*=\s*'((?:[^']|'')+)'\s*;/i);
  if (!whereMatch) return null;
  const routeId = whereMatch[1].replace(/''/g, "'");

  const setBody = block.slice(block.indexOf('\n'), block.indexOf('where'));
  const fields = {};
  // Only match known routes-table columns as field starts — free-text prose (e.g. in
  // `corrections`) can contain "word=value"-looking substrings that aren't real assignments.
  const KNOWN_COLUMNS = ['gear', 'detailed_rack', 'pro_needs', 'what_to_bring', 'sling_rack',
    'alpine_draws', 'rope_type', 'rope_length_m', 'rope_note', 'ascender', 'corrections',
    'auto_generated', 'gear_confidence'];
  const fieldPattern = new RegExp(`(?:^|,)\\s*(${KNOWN_COLUMNS.join('|')})\\s*=\\s*`, 'gm');
  let m;
  const positions = [];
  while ((m = fieldPattern.exec(setBody)) !== null) {
    positions.push({ name: m[1], valueStart: fieldPattern.lastIndex });
  }
  for (let k = 0; k < positions.length; k++) {
    const { name, valueStart } = positions[k];
    const { value, nextIndex } = parseValue(setBody, valueStart);
    let finalValue = value;
    // check for ::jsonb cast immediately after the value
    const rest = setBody.slice(nextIndex).trimStart();
    const isJsonbCast = rest.startsWith('::jsonb');
    if (isJsonbCast && typeof finalValue === 'string') {
      try { finalValue = JSON.parse(finalValue); } catch (e) { /* leave as string */ }
    }
    if (finalValue === '__NOW__') continue; // skip now(), column may not exist
    fields[name] = finalValue;
  }
  return { routeId, fields };
}

async function main() {
  let succeeded = 0, failed = 0;
  const failures = [];
  const parsed = [];

  for (const block of blocks) {
    const result = parseBlock(block);
    if (!result) { console.warn('Could not parse block:', block.slice(0, 80)); continue; }
    parsed.push(result);
  }

  console.log(`Parsed ${parsed.length} blocks from migration 0035`);

  for (const { routeId, fields } of parsed) {
    // Drop keys not present in the routes table (auto_generated, etc. are fine since they exist)
    const { error } = await supabase.from('routes').update(fields).eq('id', routeId);
    if (error) {
      failed++;
      failures.push({ routeId, error: error.message, fields: Object.keys(fields) });
      console.error(`FAILED ${routeId}: ${error.message}`);
    } else {
      succeeded++;
    }
  }

  console.log(`\n=== MIGRATION 0035 APPLY RESULTS ===`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  if (failures.length) {
    fs.writeFileSync('/tmp/apply_0035_failures.json', JSON.stringify(failures, null, 2));
    console.log(`Failure details: /tmp/apply_0035_failures.json`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
