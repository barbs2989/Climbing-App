/* "Audit the tags." Renders REAL rows and reads the chip row back, because the questions
   worth asking about tags are all about what reaches the screen: is a tag drawn twice, does
   a `lists` value reach a chip at all, and is the chip's explanation reachable on a phone. */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";
import { anonKey, selectAll } from "../lib/supabase-env.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib", "db.js"))};
import { C } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const qc = new QueryClient({ defaultOptions:{queries:{retry:false}} }); const noop=()=>{};
export { dbRouteToCamel, C };
export function render(route,tab){return renderToStaticMarkup(React.createElement(QueryClientProvider,{client:qc},
 React.createElement(RouteDetail,{route,initialSubTab:tab,onBack:noop,onSubTab:noop,contribs:[],myReports:[],connections:[],comments:{},hzVotes:{},sunReports:{},gearEdits:{},diffRatings:{},crewsForRoute:[],myStars:{},presence:null})));}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-tag-")), "b.cjs");
await build({ stdin:{contents:ENTRY,resolveDir:ROOT,loader:"js"}, bundle:true, format:"cjs", platform:"node",
  jsx:"automatic", loader:{".jsx":"jsx"}, define:{"import.meta.env":"{}"}, outfile:out, logLevel:"error" });
const { render, dbRouteToCamel, C } = require_(out);
const key = anonKey();
const text = h => h.replace(/<style[\s\S]*?<\/style>/g," ").replace(/<[^>]+>/g," ")
  .replace(/&#x27;/g,"'").replace(/&amp;/g,"&").replace(/&middot;/g,"·").replace(/\s+/g," ");
const IDS = ["wa_mount_stuart_north_ridge","wa_forbidden_peak_west_ridge","wa_storm_king_southwest_scramble","wa_nooksack_tower_beckey_route"];
for (const id of IDS) {
  const r = (await selectAll("routes","*",`id=eq.${id}`,{pageSize:5,key}))[0];
  if (!r) { console.log(id,"NOT FOUND"); continue; }
  const html = render({...dbRouteToCamel(r), _dbArea:{id:r.area_id,name:"Probe",areaType:"peak",region:"Washington"}}, "overview");
  if (html.length < 3000) throw new Error("fail-closed: thin render");
  const t = text(html);
  const row = /(Regional classic|★)[\s\S]{0,900}?<\/div><\/div>/.exec(html);
  const chips = [...html.matchAll(/<span title="([^"]*)"[^>]*border-radius:20px[^>]*>(?:<span aria-hidden="true">)?([^<]*)<\/span>([^<]*)/g)];
  const seg = /ascents? logged(.{0,240})/.exec(t);
  console.log(`\n${id}\n   classic=${r.classic}  lists=${JSON.stringify(r.lists)}  features=${JSON.stringify(r.features)}`);
  console.log("   chip row :", seg ? seg[1].trim().slice(0,200) : "(row not found)");
  console.log("   'Regional classic' occurrences:", (html.match(/Regional classic/g)||[]).length,
              "| routeTags '★ Classic' chip:", (html.match(/>★<\/span>Classic/g)||[]).length);
  const tagChips = [...html.matchAll(/<span aria-hidden="true">([^<]*)<\/span>([A-Za-z0-9 '\u00c0-\u024f-]+)/g)].map(m=>m[1]+" "+m[2].trim());
  console.log("   chips drawn by RouteTagRow:", tagChips.length ? tagChips.join(" | ") : "(none)");
  const titles = [...html.matchAll(/title="([^"]{0,140})"/g)].map(m=>m[1]).filter(x=>/Steck|Bulger|prominence|highest|drops right beside|Retreat is hard/.test(x));
  if (titles.length) console.log("   blurbs reachable ONLY via title= (no hover on a phone):\n      - " + titles.join("\n      - "));
}

// --- every FEATURE_TAGS colour must actually EXIST in the palette --------------------------
// TagChip does `C[t.color] || C.textSub` and `C[t.color+"Bg"] || C.surface`, so a colour name
// that is not in the palette does not throw and does not look broken - the chip renders in the
// muted fallback, indistinguishable from a value the table never learned. Only resolving the
// name against C can tell those apart, and a static guard cannot: C lives in a JSX module.
const { FEATURE_TAGS, LIST_TAGS } = await import("file://" + path.join(ROOT, "lib", "routeTags.js"));
let bad = 0;
for (const [table, defs] of [["FEATURE_TAGS", FEATURE_TAGS], ["LIST_TAGS", LIST_TAGS]]) {
  for (const [name, def] of Object.entries(defs)) {
    const fg = C[def.color], bg = C[def.color + "Bg"];
    if (!fg || !bg) { console.log(`  FAIL ${table}.${name}: colour ${JSON.stringify(def.color)} -> fg=${fg} bg=${bg}`); bad++; }
  }
}
console.log(`\ncolour resolution: ${Object.keys(FEATURE_TAGS).length} feature + ${Object.keys(LIST_TAGS).length} list entries, ${bad} unresolved`);
if (bad) process.exit(1);
