#!/usr/bin/env node
// THE PLANNER MUST PRINT ITS DAY PLAN ONCE — and must still print it for the routes whose only
// copy is the PUBLISHED TIMES panel.
//
// Rendered over REAL rows through the real dbRouteToCamel, because the whole question is whether
// two of a real row's columns collide on screen; a fixture proves the renderer works on invented
// data. Both directions are asserted, because a change that only ever SUPPRESSES is satisfied by
// deleting the panel.
//
// Three populations, all taken from the catalog rather than declared:
//   mirrored  — sectionBreakdown fully covered by itinerary.days: the list must be GONE, and the
//               day title must still be on the tab exactly once
//   richer    — sectionBreakdown says something the days do not: the list must REMAIN
//   noDays    — no itinerary days at all: the list must REMAIN, it is the only copy
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };
const dead = (m) => { console.log("  BROKEN PROBE  " + m); process.exit(1); };

const dir = fs.mkdtempSync(path.join(ROOT, ".cm-dp-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });
const entry = path.join(dir, "e.js"), out = path.join(dir, "b.mjs");
fs.writeFileSync(entry, [
  `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`,
  `export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};`,
].join("\n"));
try {
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}", "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle RouteDetail.jsx"); }
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
const { RouteDetail, dbRouteToCamel } = await import(out);
if (typeof dbRouteToCamel !== "function") dead("lib/db.js no longer exports dbRouteToCamel — ANCHOR LOST");

/* TWO PHASES, AND THE FIRST ATTEMPT WAS ONE. `selectAll("routes","*",…)` over a 205k-row table
   dies with `57014` — the anon role's 3s statement timeout — because `*` drags every jsonb column
   through. Classifying needs three columns; only the handful actually RENDERED needs the full row.
   CLAUDE.md records this timeout under check:field-renders; it is a property of the query shape,
   not of the catalog being unreachable. */
const rows = await selectAll("routes", "id,discipline,timing,itinerary", "timing=not.is.null", { pageSize: 1000 });
if (!rows.length) dead("no rows read — a failed read is not an empty catalog");

const n = (x) => String(x == null ? "" : x).trim();
const covered = (r) => {
  const sb = (r.timing && Array.isArray(r.timing.sectionBreakdown)) ? r.timing.sectionBreakdown : [];
  const days = (r.itinerary && Array.isArray(r.itinerary.days)) ? r.itinerary.days : [];
  if (!sb.length || days.length !== sb.length) return false;
  return sb.every((s, i) => {
    const d = days[i] || {};
    if (n(s.fromTo) !== n(d.title)) return false;
    if (!((s.hrs == null && d.hours == null) || Number(s.hrs) === Number(d.hours))) return false;
    const sn = n(s.note), dn = n(d.note);
    return !sn || dn === sn || dn.startsWith(sn.replace(/[….]+$/, ""));
  });
};
/* PUBLISHED TIMES LIVES INSIDE `Calculator`, WHICH IS `!cragOnly`. So on a trad/sport/bouldering
   route the panel does not exist at all and never did — the first run reported
   wa_accendo_lunae_lib_west_face_var as "PUBLISHED TIMES vanished" and that was pre-existing
   behaviour, not this change. The classifier cannot see it from timing/itinerary alone, so
   `discipline` is read too and the crag family is excluded from the panel assertions.
   THE DUPLICATION IS STILL REAL ON THOSE ROUTES' data; it simply cannot reach a screen twice
   there, which is the only thing this probe is about. */
const CRAG = new Set(["trad", "sport", "bouldering"]);
/* THE FAMILY IS `catOf`'s, NOT THE RAW `discipline`. ClimbMatchCore.jsx:252 is
   `catOf(r) = r.discipline === "rock" ? (r.style || "Trad").toLowerCase() : r.discipline`, so a
   route stored as `rock` folds into trad/sport and IS cragOnly. Filtering on the raw discipline
   left wa_olympus_summit_block_north_face (`discipline: "rock"`, 4 legs) in the sample, and it
   reported "PUBLISHED TIMES vanished" about a panel that has never rendered there.
   AND `routes.style` DOES NOT EXIST — asking for it returns `42703`. `style` is a SEED-only
   field, so on every DB route the fallback fires and `rock` folds to `trad` unconditionally.
   That is why this needs no extra column and no per-row lookup. */
const catOf = (r) => (r.discipline === "rock" ? "trad" : r.discipline);
const withSB = rows.filter((r) => r.timing && Array.isArray(r.timing.sectionBreakdown) && r.timing.sectionBreakdown.length && !CRAG.has(catOf(r)));
const mirrored = withSB.filter(covered);
const noDays = withSB.filter((r) => !(r.itinerary && Array.isArray(r.itinerary.days) && r.itinerary.days.length));
const richer = withSB.filter((r) => !covered(r) && !noDays.includes(r));
console.log(`catalog: ${withSB.length} routes carry a sectionBreakdown — ${mirrored.length} mirrored, ${richer.length} richer, ${noDays.length} with no days\n`);
if (!mirrored.length || !richer.length || !noDays.length) dead("one population is empty — the assertions below would only cover part of the class");

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
const fullRow = async (id) => {
  const [r] = await selectAll("routes", "*", "id=eq." + id, { pageSize: 5 });
  if (!r) dead(`could not re-read ${id} in full`);
  return r;
};
const render = (raw) => {
  const route = dbRouteToCamel(raw);
  route.mountainId = route.mountainId || "probe_area";
  route._dbArea = route._dbArea || { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" };
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, {
      route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null,
    })));
};
const textOf = (h) => h.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const countIn = (hay, needle) => { let c = 0, i = 0; for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; c++; i = j + 1; } return c; };
/* THE PANEL'S OWN FIELDS ARE THE CONTROL. If PUBLISHED TIMES stopped rendering altogether the
   "printed once" assertions would all pass, so its heading is required on every route. */
const PANEL = "PUBLISHED TIMES";

/* SAMPLED BY HOW ASSERTABLE THE ROUTE IS, not by catalog order. Counting occurrences of a short
   title is unsafe — "Long single day" could coincide with ordinary copy — so the bar is 20 chars,
   and the first run duly examined ZERO titles on wa_a_servant_to_liberty (its one leg is "Long
   single day") and then reported that as "lost its only copy". A route with nothing assertable is
   SKIPPED, and the run fails closed if too few were actually asserted. */
const longest = (r) => Math.max(0, ...r.timing.sectionBreakdown.map((x) => n(x.fromTo).length));
const SAMPLE = Number(process.env.SAMPLE || 8);
let checkedTitles = 0, skipped = 0;
for (const thin of [...mirrored].sort((a, b) => longest(b) - longest(a)).slice(0, SAMPLE)) {
  const raw = await fullRow(thin.id);
  const html = render(raw), t = textOf(html);
  if (!t.includes(PANEL)) { fail(`${raw.id}: PUBLISHED TIMES vanished — suppressing the duplicate must not remove the panel`); continue; }
  let worst = 0, worstTitle = "", checked = 0;
  for (const s of raw.timing.sectionBreakdown) {
    const title = n(s.fromTo);
    if (title.length < 20) continue;           // too short to be distinctive in page text
    const c = countIn(t, title);
    if (c > worst) { worst = c; worstTitle = title; }
    checked++; checkedTitles++;
  }
  if (!checked) { skipped++; continue; }   // no title long enough to count safely
  if (!worst) { fail(`${raw.id}: none of its leg titles reached the tab at all — the day plan lost its only copy`); continue; }
  if (worst === 1) ok(`${raw.id}: leg titles print once (${raw.timing.sectionBreakdown.length} legs)`);
  else fail(`${raw.id}: ${JSON.stringify(worstTitle.slice(0, 60))} prints ${worst}x on the Planner`);
}
if (checkedTitles < 5) dead(`only ${checkedTitles} distinctive leg title(s) examined (${skipped} route(s) skipped as unassertable) — too few to mean anything`);

for (const [label, pop] of [["richer", richer], ["no-days", noDays]]) {
  if (!pop.length) { fail(`the ${label} population is empty — this direction went unchecked`); continue; }
  for (const thin of pop.slice(0, 3)) {
    const raw = await fullRow(thin.id);
    const t = textOf(render(raw));
    if (!t.includes(PANEL)) { fail(`${raw.id} [${label}]: PUBLISHED TIMES did not render`); continue; }
    const titles = raw.timing.sectionBreakdown.map((s) => n(s.fromTo)).filter((x) => x.length >= 20);
    if (!titles.length) { ok(`${raw.id} [${label}]: no distinctive title to assert on, panel renders`); continue; }
    if (titles.some((x) => t.includes(x))) ok(`${raw.id} [${label}]: keeps its breakdown — this is its only copy`);
    else fail(`${raw.id} [${label}]: lost its breakdown, and nothing else on the tab carries it`);
  }
}

console.log("");
if (bad) { console.log(`${bad} failure(s) — the Planner does not print its day plan exactly once.`); process.exit(1); }
console.log("ok — the day plan prints once where the itinerary covers it, and still prints where it does not.");
