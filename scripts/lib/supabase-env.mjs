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

// PATCH one row by primary key and prove it landed. PostgREST returns the rows
// it actually changed under `return=representation`, so a length of 0 means the
// filter matched nothing (wrong id) or RLS blocked it — both silent otherwise.
export async function patchRow(table, id, body, opts) {
  const key = requireServiceKey();
  const extraFilter = (opts && opts.filter) ? `&${opts.filter}` : "";
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}${extraFilter}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
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
    const res = await fetch(q, { headers: headers(key) });
    const text = await res.text();
    if (!res.ok) throw new Error(`GET ${table} -> ${res.status} ${text.slice(0, 200)}`);
    const rows = JSON.parse(text);
    if (!Array.isArray(rows)) throw new Error(`GET ${table} -> ${text.slice(0, 200)}`);
    if (!rows.length) break;
    out.push(...rows);
    last = rows[rows.length - 1].id;
    if (rows.length < pageSize) break;
  }
  return out;
}
