#!/usr/bin/env node
// MEASUREMENT: what does the live PostgREST return for an UNLIMITED read (its max_rows cap), and
// how many rows does each table lib/db.js reads actually hold (service key, count=exact)?
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const tables = [...new Set([...src.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]))].sort();

// 1. the cap: an unlimited select on the biggest public table, anon key, as the app would send it
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id`, { headers: headers(anonKey(), { Prefer: "count=exact" }) });
const rows = await r.json();
console.log(`unlimited anon read of routes: status ${r.status}, ${Array.isArray(rows) ? rows.length : "?"} rows returned, Content-Range ${r.headers.get("content-range")}`);

// 2. row counts per table (service key, head request)
const svc = requireServiceKey();
console.log("\ntable rows (service key, count=exact):");
const counts = [];
for (const t of tables) {
  const h = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=id`, { method: "HEAD", headers: headers(svc, { Prefer: "count=exact" }) });
  const cr = h.headers.get("content-range") || "";
  const n = cr.includes("/") ? Number(cr.split("/")[1]) : NaN;
  counts.push({ t, n, status: h.status });
}
counts.sort((a, b) => (b.n || 0) - (a.n || 0));
for (const c of counts) console.log(`  ${String(c.n).padStart(7)}  ${c.t}${c.status !== 200 && c.status !== 206 ? `  (status ${c.status})` : ""}`);
