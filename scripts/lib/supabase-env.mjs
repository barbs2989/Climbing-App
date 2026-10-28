// Shared Supabase credentials for one-off scripts.
//
// The credentials are split across two gitignored files:
//   .env        SUPABASE_SERVICE_KEY   (writes — bypasses RLS)
//   .env.local  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   (reads — the app's own config)
//
// A script that reads only one of them gets `undefined` for the other half.
// That is not a loud failure: PostgREST accepts a PATCH sent with the anon key
// and returns 200 with an empty array, because RLS rejected every row. The
// write reports success and changes nothing. Load both files here, and make
// the service key's absence throw rather than degrade to a read-only key.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function loadEnv() {
  const env = {};
  // .env.local last so the app's own config wins on any overlapping key.
  for (const file of [".env", ".env.local"]) {
    let raw;
    try { raw = fs.readFileSync(path.join(ROOT, file), "utf8"); } catch { continue; }
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  // Fall back to the real environment for anything the files did not supply, so a script
  // can also run in CI where the gitignored dotfiles do not exist and the values arrive as
  // repo secrets. Files still WIN where both are present: locally the dotfiles are the
  // source of truth, and a stray exported VITE_SUPABASE_URL in somebody's shell must not
  // silently redirect a script at a different project.
  for (const k of ["SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
    if (env[k] === undefined && process.env[k]) env[k] = process.env[k];
  }
  return env;
}

const env = loadEnv();

export const SUPABASE_URL = env.VITE_SUPABASE_URL;

export function anonKey() {
  if (!env.VITE_SUPABASE_ANON_KEY) throw new Error("VITE_SUPABASE_ANON_KEY missing from .env.local");
  return env.VITE_SUPABASE_ANON_KEY;
}

// Use for anything that writes. Throws rather than letting the caller fall
// through to the anon key and get silent no-op writes.
export function requireServiceKey() {
  const k = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_KEY missing — it lives in .env (not .env.local). Writes would silently affect 0 rows under RLS without it.");
  return k;
}

export function headers(key, extra) {
  if (!SUPABASE_URL) throw new Error("VITE_SUPABASE_URL missing from .env.local");
  return { apikey: key, Authorization: `Bearer ${key}`, ...(extra || {}) };
}

// THE THROTTLE RULE, ENFORCED HERE (owner, standing: bulk work must pace itself, back off a minute
// on a timeout, and STOP when the live app's reads slow — Supabase's Disk IO budget has been
// exhausted by bulk jobs more than once; on 2026-10-28 a one-row read took 105 s while several
// sessions audited at once). Every script that writes or scans through this file now gets it
// without remembering to: a 30 s request timeout; on a timeout, network error or 5xx, one
// minute's back-off and ONE retry, then a hard stop naming the rule; at least WRITE_PACE_MS
// between writes across the whole process; a short pause between scan pages, and a minute's
// back-off after a page that took longer than SLOW_PAGE_MS. Env overrides exist for a measured
// reason only (a guard on a quiet database), never to go faster during an incident.
const WRITE_PACE_MS = Number(process.env.SUPABASE_WRITE_PACE_MS || 1000);
const PAGE_PACE_MS = Number(process.env.SUPABASE_PAGE_PACE_MS || 200);
const SLOW_PAGE_MS = 10000, BACKOFF_MS = 60000, REQUEST_TIMEOUT_MS = 30000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastWriteAt = 0;
async function gatedFetch(url, init, what) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res = null, err = null;
    try { res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }); }
    catch (e) { err = e; }
    if (res && res.status < 500) return res;
    const why = err ? String(err.message || err).slice(0, 80) : `HTTP ${res.status}`;
    if (attempt === 0) { console.error(`  ${what}: ${why} — database struggling; backing off ${BACKOFF_MS / 1000} s before one retry`); await sleep(BACKOFF_MS); continue; }
    throw new Error(`${what}: ${why} twice — STOPPED. The database is not answering; per the owner's throttle rule, do not retry fast. Re-run once a one-row read answers in under 1.5 s.`);
  }
}

// PATCH one row by primary key and prove it landed. PostgREST returns the rows
// it actually changed under `return=representation`, so a length of 0 means the
// filter matched nothing (wrong id) or RLS blocked it — both silent otherwise.
export async function patchRow(table, id, body, opts) {
  const key = requireServiceKey();
  const extraFilter = (opts && opts.filter) ? `&${opts.filter}` : "";
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}${extraFilter}`;
  const wait = lastWriteAt + WRITE_PACE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastWriteAt = Date.now();
  const res = await gatedFetch(url, {
    method: "PATCH",
    headers: headers(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(body),
  }, `PATCH ${table} ${id}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH ${table} ${id} -> ${res.status} ${text.slice(0, 200)}`);
  let rows;
  try { rows = JSON.parse(text); } catch { throw new Error(`PATCH ${table} ${id} -> unparseable response: ${text.slice(0, 200)}`); }
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`PATCH ${table} ${id} changed ${Array.isArray(rows) ? rows.length : "?"} rows, expected 1 — wrong id, or RLS rejected it.`);
  }
  return rows[0];
}

// Keyset pagination. Offset paging over a filtered column with no index hits
// the statement timeout on the 200k-row routes table; walking id ascending
// does not. Also avoids the skip/duplicate bug an unordered .range() causes.
export async function selectAll(table, select, filter, opts) {
  const key = (opts && opts.key) || anonKey();
  const pageSize = (opts && opts.pageSize) || 60;
  const out = [];
  let last = "";
  for (let guard = 0; guard < 5000; guard++) {
    const q = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter ? `&${filter}` : ""}` +
      `${last ? `&id=gt.${encodeURIComponent(last)}` : ""}&order=id.asc&limit=${pageSize}`;
    if (guard) await sleep(PAGE_PACE_MS);
    const t0 = Date.now();
    const res = await gatedFetch(q, { headers: headers(key) }, `GET ${table} page ${guard + 1}`);
    const text = await res.text();
    if (!res.ok) throw new Error(`GET ${table} -> ${res.status} ${text.slice(0, 200)}`);
    if (Date.now() - t0 > SLOW_PAGE_MS) { console.error(`  GET ${table} page ${guard + 1} took ${Math.round((Date.now() - t0) / 1000)} s — database struggling; backing off ${BACKOFF_MS / 1000} s`); await sleep(BACKOFF_MS); }
    const rows = JSON.parse(text);
    if (!Array.isArray(rows)) throw new Error(`GET ${table} -> ${text.slice(0, 200)}`);
    if (!rows.length) break;
    // The keyset cursor IS the id, so a select that omits it cannot advance: `last` goes undefined,
    // the filter drops, and the loop re-reads page one until the guard — 5,000 pages of duplicates
    // returned as though they were the table. Measured doing exactly that (5,000,000 "routes" from a
    // 205k table, every count a round multiple). Fail closed rather than return it.
    if (rows[rows.length - 1].id == null) throw new Error(`selectAll(${table}): the select must include id — it is the pagination cursor`);
    out.push(...rows);
    last = rows[rows.length - 1].id;
    if (rows.length < pageSize) break;
  }
  return out;
}
