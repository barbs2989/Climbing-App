/* Tag chips: reachable on a phone, and no longer wired to somebody else's navigation.

   Two defects, one change. A chip's blurb lived only in `title` — a hover tooltip, on an app
   built for a 390px phone, so on the target device the only thing explaining what a tag MEANS
   was unreachable. And the whole chip row sat inside the social-proof row, which is one
   clickable() control that navigates to the Partners sub-tab, so tapping a tag went somewhere
   unrelated to the tag.

   Rendering is the only thing that settles either: the first is an attribute question and the
   second is a containment question, and neither is visible from reading routeTags. */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions:{queries:{retry:false}} }); const noop=()=>{};
export function render(route,tab){return renderToStaticMarkup(React.createElement(QueryClientProvider,{client:qc},
 React.createElement(RouteDetail,{route,initialSubTab:tab,onBack:noop,onSubTab:noop,contribs:[],myReports:[],connections:[],comments:{},hzVotes:{},sunReports:{},gearEdits:{},diffRatings:{},crewsForRoute:[],myStars:{},presence:null})));}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-tagint-")), "b.cjs");
await build({ stdin:{contents:ENTRY,resolveDir:ROOT,loader:"js"}, bundle:true, format:"cjs", platform:"node",
  jsx:"automatic", loader:{".jsx":"jsx"}, define:{"import.meta.env":"{}"}, outfile:out, logLevel:"error" });
const { render } = require_(out);

let fail = 0;
const ok = (m, cond, extra) => { console.log((cond ? "  ok    " : "  FAIL  ") + m + (cond || extra === undefined ? "" : "  " + JSON.stringify(extra).slice(0, 200))); if (!cond) fail++; };

// A route with tags and NO social proof: no activity, no crews, nobody viewing. That is the
// state that proves containment — if the chips still render while the social row does not, the
// tags cannot be inside it. Reasoning about nesting in a 400 kB markup string is the fragile
// way to ask the same question.
const route = {
  id: "probe_tags", name: "Probe", grade: "5.9", gradeSystem: "yds", discipline: "trad",
  pitches: 3, mountainId: "probe_area", classic: true,
  features: ["Exposed", "Crack", "Well-protected"], lists: ["fifty_classics"],
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
};
const html = render(route, "overview");
if (html.length < 3000) throw new Error(`fail-closed: thin render (${html.length} chars)`);

// --- 1. the chips are real controls -------------------------------------------------------
const chips = [...html.matchAll(/<span([^>]*aria-expanded="false"[^>]*)>/g)].map(m => m[1]);
ok(`every tag renders a chip (found ${chips.length})`, chips.length >= 5, chips.length);
ok("each chip announces a role", chips.every(a => /role="button"/.test(a)), chips.find(a => !/role="button"/.test(a)));
ok("each chip is reachable by Tab", chips.every(a => /tabindex="0"/.test(a)), chips.find(a => !/tabindex="0"/.test(a)));
ok("each chip carries its own name", chips.every(a => /aria-label="[^"]{8,}"/.test(a)), chips.find(a => !/aria-label="[^"]{8,}"/.test(a)));

// --- 2. the blurb is reachable without hover ----------------------------------------------
// It rides in the accessible NAME, so a screen reader gets the meaning with no interaction at
// all, and the chip opens it visually for everyone else. `title` alone did neither on a phone.
const labels = [...html.matchAll(/aria-label="([^"]*)"/g)].map(m => m[1]);
ok("a feature blurb reaches the accessible name",
  labels.some(l => /Follows a crack/.test(l)), labels.filter(l => /Crack/.test(l)));
ok("a list blurb reaches the accessible name",
  labels.some(l => /fifty routes/.test(l)), labels.filter(l => /Classic/.test(l)));
// The blurb must NOT be inside the chip's own text: the chip is a token-shaped box, and a
// paragraph in one is the defect check:token-boxes exists for.
// The visible label is the text immediately after the chip's own icon span. Anchoring on that
// rather than on a lazy match to the next </span> matters: a lazy match backtracks past the
// icon's close and swallows the rest of the page, which reads as a chip holding a paragraph.
const chipText = [...html.matchAll(/aria-expanded="false"[^>]*><span aria-hidden="true">[^<]*<\/span>([^<]*)/g)].map(m => m[1]);
ok(`each chip's visible text is token-sized (${chipText.length} read)`,
  chipText.length >= 5 && chipText.every(t => t.length > 0 && t.length < 40), chipText.filter(t => t.length >= 40));
ok("no chip prints its blurb as chip text",
  chipText.every(t => !/Follows a crack|fifty routes|Big drops/.test(t)), chipText);

// --- 3. the chips are not inside somebody else's navigation --------------------------------
ok("the social-proof row is absent on a route with no social proof", !/cm-stagger/.test(html));
ok("...and the tag chips render anyway", chips.length >= 5, chips.length);

// The mirror: with social proof present the row comes back, and the chips are still their own
// controls rather than inert spans swallowed by it.
const busy = { ...route, activity: [{ user: "A climber", date: "2026-08-01", outcome: "Summited" }] };
const busyHtml = render(busy, "overview");
ok("the social-proof row returns when there IS social proof", /cm-stagger/.test(busyHtml));
const busyChips = [...busyHtml.matchAll(/<span([^>]*aria-expanded="false"[^>]*)>/g)];
ok("the chips are still controls beside it", busyChips.length >= 5, busyChips.length);

console.log("");
if (fail) { console.error(`probe-tag-chip-interaction: ${fail} FAILED`); process.exit(1); }
console.log("probe-tag-chip-interaction: ok — chips are keyboard-reachable controls that carry their own blurb, outside the Partners control.");
