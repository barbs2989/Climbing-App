#!/usr/bin/env node
// errors:read — what broke on climbers' phones, in words a maintainer can act on.
//
// The app files every crash it sees to `app_errors` (0399, lib/errorReport.js). Until this script the
// only way to read them was the Supabase Table Editor, and what it showed was a MINIFIED stack:
// "at Xe (https://…/assets/index-B3kq9.js:1:482113)". The app's source is a few files of very long
// lines, so that position names nothing a person can open. Since this script's PR the build writes
// HIDDEN source maps (vite.config.js `sourcemap: "hidden"`), the deploy uploads them as the Actions
// artifact `sourcemaps-<entry script>` (kept 90 days, the same as app_errors' own retention) and keeps
// them off the site. This script reads the errors, groups the repeats, fetches the maps for each
// error's build, and prints every frame as `ClimbMatch.jsx:1204:3381 in saveEdit` with the code
// around that column — the column matters, because one line of ClimbMatch.jsx can be 40,000 chars.
//
// Usage:
//   npm run errors:read                       last 7 days, grouped, newest group first
//   npm run errors:read -- --days 30          a longer window
//   npm run errors:read -- --all              every row, not grouped
//   npm run errors:read -- --maps dist/assets one local build's maps (after `npm run build`), not the artifact
//   npm run errors:read -- --stack "<pasted stack>" --build index-x.js   decode one stack, no DB
//   npm run errors:read -- --selftest         proves the source-map decoder on a known mapping; no DB, no network
//
// Reads with the service key (app_errors is admin-read under RLS: the anon key sees 0 rows and a 200,
// which would read as "no errors"). Read-only. Run the DB gate first (`dbslot.mjs acquire`) as for any
// production read. Maps are fetched with `gh` (artifacts need a token) and cached under the OS temp dir.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const has = (k) => args.includes(k);

// ── source-map decoding (VLQ, source map v3) — no dependency, about 40 lines ──
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64I = Object.fromEntries([...B64].map((c, i) => [c, i]));
function vlq(str) {
  const out = []; let val = 0, shift = 0;
  for (const ch of str) {
    const d = B64I[ch]; if (d === undefined) throw new Error(`bad VLQ char ${ch}`);
    val += (d & 31) << shift;
    if (d & 32) { shift += 5; continue; }
    out.push(val & 1 ? -(val >>> 1) : val >>> 1); val = 0; shift = 0;
  }
  return out;
}
// Decodes only as far as the generated line asked for, then answers the nearest segment at or
// before the column. Lines are 1-based, columns 1-based (a JS stack's convention).
export function lookup(map, line, col) {
  const lines = map.mappings.split(";");
  let src = 0, sl = 0, sc = 0, nm = 0, best = null;
  for (let i = 0; i < lines.length && i < line; i++) {
    let gc = 0;
    for (const seg of lines[i].split(",")) {
      if (!seg) continue;
      const v = vlq(seg); gc += v[0];
      if (v.length >= 4) { src += v[1]; sl += v[2]; sc += v[3]; }
      if (v.length >= 5) nm += v[4];
      if (i === line - 1 && gc <= col - 1 && v.length >= 4) best = { source: map.sources[src], line: sl + 1, column: sc + 1, name: v.length >= 5 ? map.names[nm] : null, srcIndex: src };
    }
  }
  return best;
}
function excerpt(map, hit, width = 90) {
  const text = map.sourcesContent && map.sourcesContent[hit.srcIndex];
  if (!text) return "";
  const l = text.split("\n")[hit.line - 1] || "";
  const a = Math.max(0, hit.column - 1 - width / 2), b = Math.min(l.length, hit.column - 1 + width / 2);
  return (a > 0 ? "…" : "") + l.slice(a, b).trim() + (b < l.length ? "…" : "");
}
const tidy = (s) => String(s || "").replace(/^(\.\.\/)+/, "").replace(/^.*node_modules\//, "node_modules/");

if (has("--selftest")) {
  // Built by hand (0-based inside the map): "AAAA" gen col 0 → line 0 col 0; "KAAK" gen col +5 → col +5;
  // "KACL" gen col +5 → line +1, col -5. So generated 1:6..1:10 sit on source 1:6, and 1:11 on 2:1.
  const map = { sources: ["a.js"], names: [], sourcesContent: ["const alpha = 1;\nbeta();"], mappings: "AAAA,KAAK,KACL" };
  const t = [[1, 1, 1, 1], [1, 6, 1, 6], [1, 9, 1, 6], [1, 11, 2, 1]];
  let bad = 0;
  for (const [gl, gc, wl, wc] of t) {
    const h = lookup(map, gl, gc);
    const ok = h && h.line === wl && h.column === wc;
    console.log(`${ok ? "ok  " : "FAIL"} ${gl}:${gc} → ${h ? h.line + ":" + h.column : "none"} (want ${wl}:${wc})`);
    if (!ok) bad++;
  }
  if (!vlq("2H").length || vlq("2H")[0] !== 123) { console.log("FAIL vlq(2H) != 123"); bad++; } else console.log("ok   vlq(2H) = 123");
  process.exit(bad ? 1 : 0);
}

// ── the maps for one build ──
const REPO = "barbs2989/Climbing-App";
const CACHE = path.join(os.tmpdir(), "climbmatch-sourcemaps");
const localMaps = opt("--maps");
const mapDirs = new Map();
function mapsFor(build) {
  if (localMaps) return localMaps;
  if (!build || build === "dev") return null;
  if (mapDirs.has(build)) return mapDirs.get(build);
  const dir = path.join(CACHE, build);
  let found = null;
  if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith(".map"))) found = dir;
  else {
    try {
      const list = JSON.parse(execFileSync("gh", ["api", `repos/${REPO}/actions/artifacts?name=${encodeURIComponent("sourcemaps-" + build)}&per_page=1`], { encoding: "utf8" }));
      const a = list.artifacts && list.artifacts.find((x) => !x.expired);
      if (a) {
        fs.mkdirSync(dir, { recursive: true });
        const zip = path.join(dir, "maps.zip");
        fs.writeFileSync(zip, execFileSync("gh", ["api", a.archive_download_url], { maxBuffer: 1 << 30 }));
        execFileSync("unzip", ["-o", "-q", zip, "-d", dir]);
        fs.unlinkSync(zip);
        found = dir;
      }
    } catch (e) { console.error(`  (could not fetch maps for ${build}: ${String(e.message || e).split("\n")[0]})`); }
  }
  mapDirs.set(build, found);
  return found;
}
const loaded = new Map();
function mapFile(dir, jsFile) {
  const p = path.join(dir, jsFile + ".map");
  if (!loaded.has(p)) loaded.set(p, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
  return loaded.get(p);
}
const FRAME = /([\w.-]+\.js):(\d+):(\d+)/;
function symbolicate(stack, build) {
  if (!stack) return [];
  const dir = mapsFor(build);
  return stack.split("\n").slice(0, 12).map((raw) => {
    const m = FRAME.exec(raw);
    if (!m || !dir) return "    " + raw.trim();
    const map = mapFile(dir, m[1]);
    const hit = map && lookup(map, Number(m[2]), Number(m[3]));
    if (!hit) return "    " + raw.trim();
    const ex = excerpt(map, hit);
    return `    ${tidy(hit.source)}:${hit.line}:${hit.column}${hit.name ? " in " + hit.name : ""}` + (ex ? `\n        ${ex}` : "");
  });
}

// ── one pasted stack, no database ──
if (opt("--stack")) {
  for (const l of symbolicate(opt("--stack").replace(/\\n/g, "\n"), opt("--build"))) console.log(l);
  process.exit(0);
}

// ── the errors ──
const { SUPABASE_URL, requireServiceKey, headers } = await import("./lib/supabase-env.mjs");
const days = Number(opt("--days") || 7);
const since = new Date(Date.now() - days * 864e5).toISOString();
const url = `${SUPABASE_URL}/rest/v1/app_errors?select=kind,message,stack,component_stack,path,build,user_agent,created_at,user_id&created_at=gte.${since}&order=created_at.desc&limit=1000`;
const res = await fetch(url, { headers: headers(requireServiceKey()), signal: AbortSignal.timeout(30000) });
if (!res.ok) { console.error(`app_errors -> HTTP ${res.status} ${(await res.text()).slice(0, 200)}`); process.exit(1); }
const rows = await res.json();
console.log(`app_errors: ${rows.length} row(s) in the last ${days} day(s)${rows.length === 1000 ? " (capped at 1000)" : ""}\n`);

const groups = new Map();
for (const r of rows) {
  const k = has("--all") ? r.created_at + r.message : r.kind + "|" + r.message;
  if (!groups.has(k)) groups.set(k, { first: r, n: 0, builds: new Set(), paths: new Set(), users: new Set(), last: r.created_at, earliest: r.created_at });
  const g = groups.get(k);
  g.n++; g.builds.add(r.build || "?"); g.paths.add(r.path || "?"); g.users.add(r.user_id || "guest"); g.earliest = r.created_at;
}
for (const g of groups.values()) {
  const r = g.first;
  console.log(`■ ${r.kind.toUpperCase()}  ${r.message}`);
  console.log(`  ${g.n}× · ${g.users.size} climber(s) · last ${r.created_at.slice(0, 16)}${g.n > 1 ? " · first " + g.earliest.slice(0, 16) : ""} · path ${[...g.paths].slice(0, 3).join(", ")}`);
  console.log(`  build ${[...g.builds].slice(0, 3).join(", ")} · ${String(r.user_agent || "").slice(0, 90)}`);
  for (const l of symbolicate(r.stack, r.build)) console.log(l);
  if (r.component_stack) console.log("  component stack:\n" + r.component_stack.trim().split("\n").slice(0, 6).map((l) => "    " + l.trim()).join("\n"));
  console.log("");
}
if (!rows.length) console.log("No errors filed. (Read with the service key, so this is a real zero, not RLS.)");
