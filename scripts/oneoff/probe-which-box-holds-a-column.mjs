// WHICH BOX does a column's value land in — a token, or a prose row?
//
// CLAUDE.md's standing rule is "before writing a researched string into an existing column, look at
// where that column renders", and `check:token-boxes` exists because reaching a screen and FITTING
// the element it reaches are different questions. But that guard samples ~40 rows, so a long value
// on a route it did not sample is invisible to it, and the question is often asked about ONE column
// while triaging an audit.
//
// This answers it directly: render the real RouteDetail over named live rows, find the innermost
// element whose text is the column's value, and print that element's inline style.
//
// WHY IT EXISTS: I asserted in #1544 that a sentence in `road.name` was "the season-holds-prose
// defect in a name field". That is a claim about where the column renders, and it was WRONG —
// road.name lands in a `line-height:1.5` prose row on both its render paths, so a long value wraps
// and is legible. Reading the static source could not settle it; rendering did, in one run.
//
// `--sentinel` injects a long distinctive value into the column before rendering, so the question
// becomes "CAN this box receive a paragraph?" rather than "does it today". That is the
// `check:field-renders` SENTINELS technique, and it is the only way to ask about a column with zero
// populated rows - which is exactly when you most want to know, i.e. just after a migration adds it.
// It is also this probe's non-vacuity check: a box-shape test that can only ever answer "no" is
// worth nothing, and `--col crux --sentinel` is the case that makes it answer YES.
//
//   node scripts/oneoff/probe-which-box-holds-a-column.mjs --col road.name --id wa_x,wa_y
//   node scripts/oneoff/probe-which-box-holds-a-column.mjs --col crux --id wa_x --sentinel
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : null; };
const COL = arg("col");
const IDS = (arg("id") || "").split(",").map((s) => s.trim()).filter(Boolean);
const TABS = (arg("tabs") || "overview,planner,safety").split(",");
const SENTINEL = process.argv.includes("--sentinel");
// Long enough to be a paragraph, distinctive enough that indexOf cannot land on a neighbour.
const SENT_TEXT = "ZZBOXZZ a deliberately long sentinel value written to see which element it lands in";
if (!COL || !IDS.length) { console.error("usage: --col <column[.subkey]> --id <id[,id]> [--tabs a,b]"); process.exit(1); }

const [COLUMN, SUBKEY] = COL.split(".");
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=*`, { headers: headers(anonKey()) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.error("FAIL - the read returned nothing; a missing row is not a missing box."); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

// esbuild traps this repo records: bundle INSIDE the project (node resolves `react` from the
// nearest node_modules — this probe hit that on its first run), --jsx=automatic, and
// --define:import.meta.env={} because lib/supabase.js reads it at module scope.
const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-box-"));
const entry = path.join(tmp, "e.jsx");
fs.writeFileSync(entry, `
export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
`);
const bundle = path.join(tmp, "b.mjs");
try {
  execFileSync(path.join(ROOT, "node_modules/.bin/esbuild"), [
    entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--loader:.jsx=jsx", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--outfile=" + bundle, "--log-level=error",
  ], { cwd: ROOT });
} catch (e) { console.error("esbuild failed:\n" + (e.stderr || e).toString()); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); }

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { RouteDetail, dbRouteToCamel } = await import(bundle);
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
// One shape test, used for the verdict AND for the census below, so they cannot disagree.
const isToken = (st) => {
  const radius = /border-radius:\s*(\d+)/.exec(st);
  return !!radius && +radius[1] >= 10 && /padding/.test(st) && !/line-height/.test(st);
};
const countTokenBoxes = (html) => {
  let n = 0, m;
  const RE = /style="([^"]*)"/g;
  while ((m = RE.exec(html))) if (isToken(m[1])) n++;
  return n;
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

let rendered = 0;
try {
for (const id of IDS) {
  const raw = byId.get(id);
  if (!raw) { console.log(`\n${id}: NOT FOUND`); continue; }
  if (SENTINEL) {
    if (SUBKEY) { raw[COLUMN] = Object.assign({}, raw[COLUMN] || {}, { [SUBKEY]: SENT_TEXT }); }
    else raw[COLUMN] = SENT_TEXT;
  }
  const v = SUBKEY ? (raw[COLUMN] && raw[COLUMN][SUBKEY]) : raw[COLUMN];
  if (typeof v !== "string" || !v.trim()) { console.log(`\n${id}: ${COL} is not a non-empty string`); continue; }
  // A short value's first 40 chars can occur anywhere on the page, and indexOf takes the FIRST
  // hit - which would report a neighbouring element's style with total confidence.
  if (!SENTINEL && v.length < 25) { console.log(`\n${id}: ${COL} is only ${v.length} chars - too short to locate unambiguously. Use --sentinel.`); continue; }
  console.log(`\n########## ${id}  ${COL} is ${v.length} chars${SENTINEL ? " (SENTINEL)" : ""}`);
  const route = dbRouteToCamel(raw);
  for (const tab of TABS) {
    let html = "";
    try {
      html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
        React.createElement(RouteDetail, {
          route, initialSubTab: tab, onBack: noop, onSubTab: noop,
          contribs: [], myReports: [], connections: [], comments: {},
          hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
          crewsForRoute: [], myStars: {}, presence: null,
        })));
    } catch (e) { console.log(`  [${tab}] render threw: ${e.message}`); continue; }
    // Match a slice long enough to be unambiguous but short enough to survive any truncation the
    // reader applies (seasonShort/shortGrade both cap, which is the whole point of asking).
    const at = html.indexOf(esc(v.slice(0, 40)));
    if (at < 0) { console.log(`  [${tab}] does not render here`); continue; }
    rendered++;
    const stack = [];
    const TAG = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
    let t;
    while ((t = TAG.exec(html)) && t.index < at) {
      if (t[4] === "/" || /^(?:br|img|input|hr|meta|path|circle|line)$/i.test(t[2])) continue;
      if (t[1] === "/") stack.pop();
      else stack.push({ tag: t[2], attrs: t[3] });
    }
    const styled = [...stack].reverse().map((e, i) => ({ e, up: i }))
      .find(({ e }) => /style="/.test(e.attrs));
    const st = styled ? (styled.e.attrs.match(/style="([^"]*)"/) || ["", ""])[1] : "";
    const token = isToken(st);
    const depth = stack.length ? `<${stack[stack.length - 1].tag}> at depth ${stack.length}` : "(no enclosing element)";
    console.log(`  [${tab}] innermost: ${depth}; nearest styled ancestor ${styled ? styled.up + " level(s) up" : "NONE"}`);
    console.log(`         style: ${st || "(none)"}`);
    console.log(`         token-shaped? ${token ? "YES - a paragraph here is a defect" : "no"}` +
                `   nowrap? ${/white-space:\s*nowrap/.test(st) ? "YES" : "no"}` +
                `   wraps as prose? ${/line-height/.test(st) ? "yes" : "unclear"}`);
    // Non-vacuity, printed rather than assumed: a "no" means something only if the shape test
    // fires elsewhere on this very page.
    const tb = countTokenBoxes(html);
    console.log(`         (the shape test finds ${tb} token-shaped box(es) elsewhere on this page` +
                `${tb ? "" : " - SUSPECT: it may be matching nothing"})`);
  }
}
} finally {
  // Unconditional: this directory lives inside the project and is not gitignored, so a throw
  // that skipped cleanup would leave something `git add .` can pick up.
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Fail closed: "no token box found" and "the value never rendered" print the same reassuring
// nothing, and only one of them is an answer.
if (!rendered) { console.error(`\nFAIL - ${COL} rendered on NO tab for any id. That is not "it fits".`); process.exit(1); }
console.log(`\n${rendered} render site(s) inspected.`);
