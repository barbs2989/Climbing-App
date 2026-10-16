// Render the peak-page briefing over EVERY WA area that gets one, and read what it says.
//
// #1672 swept the ROUTE page catalog-wide for broken rendered copy and found it clean. The
// AREA page had never been asked, and `SummitBriefing` is the part of it that derives rather
// than displays: every string it prints is a reading of other rows — a grade span, an
// approach range, a shared permit — so it is where a bad derivation would surface as copy.
//
// It is a MEASUREMENT, not a guard: `check:summit-briefing` proves the panel's contract on
// three real peaks and two synthetic ones, and rendering all 198 every run would buy a
// catalog read for a question whose answer moves only when the catalog does. Re-run it after
// a bulk write to the access, permit or grade columns.
//
// Result 2026-09-09: 198 peak briefings rendered, 0 findings.

import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const { SUPABASE_URL, headers, requireServiceKey } = await import(join(ROOT, "scripts/lib/supabase-env.mjs"));
// Service key because the anon role's 3s statement timeout cannot complete a `like` scan of
// the 200k-row routes table. Read-only: this issues no write.
const h = headers(requireServiceKey());
async function all(sel){const out=[];let last="";for(let g=0;g<800;g++){const r=await fetch(SUPABASE_URL+"/rest/v1/"+sel+"&id=gt."+encodeURIComponent(last)+"&order=id.asc&limit=1000",{headers:h});const p=await r.json();if(!Array.isArray(p))throw new Error(JSON.stringify(p).slice(0,200));if(!p.length)break;out.push(...p);last=p[p.length-1].id;if(p.length<1000)break;}return out;}

const dir = mkdtempSync(join(tmpdir(), "sweep-"));
const ENTRY = `
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { SummitBriefing } from ${JSON.stringify(join(ROOT, "lib/DbAreaBrowser.jsx"))};
export function render(area, routes) {
  const C = new Proxy({}, { get: () => "#123456" });
  return renderToStaticMarkup(React.createElement(SummitBriefing, { area, routes, C,
    uElev: ft => Math.round(ft).toLocaleString() + " ft",
    uDistMi: mi => (Math.round(mi * 100) / 100) + " mi" }));
}`;
const outfile = join(dir, "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", outfile, platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, logLevel: "error" });
const { render } = createRequire(import.meta.url)(outfile);

const rows = await all("routes?select=*&area_id=like.wa_*");
const byArea = new Map();
for (const r of rows) { if (!byArea.has(r.area_id)) byArea.set(r.area_id, []); byArea.get(r.area_id).push(r); }
const ids = [...byArea.keys()];
const A = new Map();
for (let i = 0; i < ids.length; i += 80) {
  const q = ids.slice(i, i + 80).map(x => '"' + x + '"').join(",");
  const r = await fetch(SUPABASE_URL + "/rest/v1/areas?select=id,name,area_type,elevation_ft&id=in.(" + encodeURIComponent(q) + ")", { headers: h });
  for (const a of await r.json()) A.set(a.id, a);
}
const BAD = [["NaN", /\bNaN\b/], ["undefined", /\bundefined\b/], ["Infinity", /-?\bInfinity\b/], ["objobj", /\[object Object\]/]];
let rendered = 0, findings = 0;
const strip = s => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");
for (const [id, rs] of byArea) {
  const a = A.get(id); if (!a) continue;
  let html; try { html = render(a, rs); } catch (e) { console.log("THREW " + id + ": " + e.message); findings++; continue; }
  if (!html) continue;
  rendered++;
  const text = strip(html);
  for (const [name, re] of BAD) if (re.test(text)) { console.log(name.padEnd(12) + " " + id); findings++; }
  const m = [...html.matchAll(/letter-spacing:0\.5(?:px)?">([^<]{1,60})<\/div><div style="font-size:13\.5[^"]*">([^<]{0,4000})</g)];
  for (const [, label, value] of m) if (value.length > 120) { console.log("LONG VALUE  " + id + " | " + label + " | " + value.length + " chars | " + JSON.stringify(value.slice(0,90))); findings++; }
}
if (rendered < 100) { console.error("FAIL - only " + rendered + " briefings rendered. A short sweep reports a clean catalog."); process.exit(1); }
console.log("\nrendered " + rendered + " peak briefings, " + findings + " finding(s)");
process.exitCode = findings ? 1 : 0;
