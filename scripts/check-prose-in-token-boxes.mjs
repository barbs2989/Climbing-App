// check:token-boxes — no element shaped like a TOKEN may contain a PARAGRAPH.
//
// Three times enrichment prose has landed in a value-sized box: `season` (the header strap),
// `grade` (the pill), and `bivy[].capacity/.water/.permit` (chips holding up to 1,386 chars).
// CLAUDE.md states the rule; nothing enforced it, which is how the third one was written by a
// pass that had read the rule.
//
// TWO STATIC ATTEMPTS FAILED FIRST, and both failures are the point of doing it this way:
//   - Matching a rendered `x.prop` to a column BY NAME scored 0 of 7 on a real run. `q.status`
//     is a guide inquiry's status, `v.season` a trip report's season enum, `t.label` a route-tag
//     chip label. `status`/`season`/`label` are among the commonest property names in the app.
//   - Restricting to expressions ROOTED at `route.<col>` was then VACUOUS: run against the
//     commit before the camping fix it reported "ok" while the defect was right there, because
//     the panel maps over `campSites(route)` — a helper's return value, not `route.bivy`.
//     Resolving that needs real interprocedural analysis.
//
// So it does not resolve expressions at all. It RENDERS the real RouteDetail over REAL rows and
// asks the rendered markup a question that needs no name and no scope: is this element styled as
// a token, and does it contain a paragraph? That is the actual defect, stated directly.
//
// Read-only. Fails closed on an empty read and on a scan that finds no token-shaped elements.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);
const LONG = Number((process.argv.find((a) => a.startsWith("--long=")) || "--long=60").split("=")[1]);

// Enriched routes only, as ONE bounded page. Enrichment is what writes prose, so unenriched rows
// only dilute the sample; and `climbing_route=not.is.null` is sparse, so selectAll's `order=id.asc`
// walks the id index and times out (57014) — the plan CLAUDE.md records for check:field-renders.
const SAMPLE = Number((process.argv.find((a) => a.startsWith("--sample=")) || "--sample=40").split("=")[1]);
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&climbing_route=not.is.null&limit=${SAMPLE}`, { headers: headers(anonKey()) });
if (!res.ok) {
  console.log(`FAIL: the catalog read failed (${res.status}) — this is NOT "no prose in a chip".`);
  console.log("      " + (await res.text()).slice(0, 200));
  process.exit(1);
}
const rows = await res.json();
if (!rows.length) { console.log("FAIL: read no enriched routes — every box would look empty, the false-pass direction"); process.exit(1); }

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-token-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const camel = (r) => { const o = { ...r }; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };
const unesc = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// A token-shaped box, from the RENDERED style string. React emits inline styles as
// `border-radius:20px;padding:2px 9px`, so this reads what the browser will actually apply —
// no guessing which of several style objects won.
//
// A nowrap box that CLIPS WITH AN ELLIPSIS is correct handling of long text, not a defect: it
// degrades to a truncated line instead of pushing the layout out. Excluding those took an
// earlier scan from 104 candidates to 54, nearly all of the dropped ones deliberately-ellipsised
// route and area names. A detector that reports correct work gets ignored.
function tokenShape(style) {
  const s = style.toLowerCase();
  const radius = (s.match(/border-radius:\s*(\d+)px/) || [])[1];
  const pad = (s.match(/padding:\s*(\d+)px/) || [])[1];
  const clips = /overflow:\s*hidden/.test(s) && /text-overflow:\s*ellipsis/.test(s);
  if (clips) return null;
  // A box that EXPLICITLY accommodates long text has been thought about, and reporting it is
  // reporting correct work. The STAGES table is the measured case: a stage's `grade` really is
  // terrain prose ("Class 3-4 (45-50 deg snow, short loose class 4 rock step, ...)"), and the
  // comment above that JSX records someone already finding it, dropping whiteSpace:nowrap and
  // adding word-break so the chip wraps and shrinks instead of clipping the row's expander off
  // a 390px phone. The three real defects had none of this: the camping chips and the approach
  // season pill simply never anticipated a paragraph.
  const wraps = /word-break:\s*break-word/.test(s) || /overflow-wrap:\s*(anywhere|break-word)/.test(s);
  if (wraps) return null;
  if (radius != null && Number(radius) >= 6 && pad != null && Number(pad) <= 4) return "pill";
  if (/white-space:\s*nowrap/.test(s)) return "nowrap";
  return null;
}

// Walk the markup with a real TAG STACK, and take the text of each element that has NO element
// children — a leaf. Leaves only, because a token-shaped wrapper legitimately contains other
// boxes, and charging a parent with its children's text would report every row on the page.
//
// A STACK, not a regex. The first version was
//   /<(\w+)([^>]*\bstyle="([^"]*)"[^>]*)>([\s\S]*?)<\/\1>/g
// and it cannot handle nesting: matching an outer element consumes its children, so the scan
// stepped straight over most spans. It found the approach-season pill only by ACCIDENT — the
// outer flex div's match terminated on its first child's `</div>`, which happened to leave the
// pill exposed as the next match. Injection case 2 (prose back into a camping chip) came back
// MISS and that is what exposed it: a guard that catches one real defect can still be blind to
// the next, and only an injection it FAILS will tell you.
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
function leafBoxes(html) {
  const out = [];
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m, last = 0;
  while ((m = re.exec(html))) {
    const [full, close, tag, attrs, selfClose] = m;
    const text = html.slice(last, m.index);
    last = m.index + full.length;
    if (text.trim() && stack.length) stack[stack.length - 1].text += text;

    if (close) {
      // Pop to the matching open tag. React emits well-formed markup, but being tolerant here
      // costs nothing and stops one stray tag from desynchronising the whole scan.
      let i = stack.length - 1;
      while (i >= 0 && stack[i].tag !== tag) i--;
      if (i < 0) continue;
      const popped = stack.splice(i);
      const el = popped[0];
      if (!el.hasElementChild) {
        const shape = tokenShape(unesc(el.style || ""));
        const t = unesc(el.text).replace(/\s+/g, " ").trim();
        if (shape && t) out.push({ shape, text: t, style: unesc(el.style) });
      }
      continue;
    }
    if (stack.length) stack[stack.length - 1].hasElementChild = true;
    if (selfClose || VOID.has(tag.toLowerCase())) continue;
    const style = (attrs.match(/\bstyle="([^"]*)"/) || [])[1] || "";
    stack.push({ tag, style, text: "", hasElementChild: false });
  }
  return out;
}

const TABS = ["overview", "conditions", "planner", "safety", "photos", "ranks"];
const findings = new Map();
let boxes = 0, rendered = 0;
for (const r of rows) {
  const route = Object.assign(camel(r), { mountainId: r.area_id, _dbArea: { id: r.area_id, name: "Probe", areaType: "peak", region: "Washington" } });
  for (const tab of TABS) {
    let html;
    try { html = render(route, tab); } catch { continue; }
    rendered++;
    for (const b of leafBoxes(html)) {
      boxes++;
      if (b.text.length <= LONG) continue;
      // Key on the STYLE, not the text: one bad box is one finding across every route that
      // renders it, or a 40-route sample reports the same defect 40 times.
      const key = b.shape + "|" + b.style.slice(0, 90);
      if (!findings.has(key)) findings.set(key, { shape: b.shape, style: b.style, n: 0, max: 0, sample: "", tabs: new Set() });
      const f = findings.get(key);
      f.n++; f.tabs.add(tab);
      if (b.text.length > f.max) { f.max = b.text.length; f.sample = b.text.slice(0, 130); }
    }
  }
}

if (!rendered) { console.log("FAIL: rendered nothing — the probe is broken"); process.exit(1); }
if (!boxes) { console.log(`FAIL: ${rendered} renders and ZERO token-shaped leaf boxes found — the shape test matches nothing`); process.exit(1); }

console.log(`${rows.length} enriched routes x ${TABS.length} sub-tabs = ${rendered} renders; ${boxes} token-shaped leaf box(es) inspected`);
console.log(`threshold: text longer than ${LONG} characters inside a value-sized box\n`);
if (!findings.size) { console.log("check:token-boxes: ok — no token-shaped box on the route page holds a paragraph."); process.exit(0); }

console.log(`${findings.size} box(es) hold text too long for their shape:\n`);
[...findings.values()].sort((a, b) => b.max - a.max).forEach((f) => {
  console.log(`  [${f.shape}] max ${f.max} chars, on ${f.n} render(s), tabs: ${[...f.tabs].join(",")}`);
  console.log(`     text:  ${JSON.stringify(f.sample)}`);
  console.log(`     style: ${f.style.slice(0, 120)}`);
});
console.log("\nEach of these is a value-sized box holding prose. The repair is the one `season` and");
console.log("`grade` already took: shorten what the BOX shows, and render the full text as prose");
console.log("beside it — shortening alone loses the sentence, which is the other half of the bug.");
process.exit(1);
