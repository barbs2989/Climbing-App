/* DOES "BASE OF THE CLIMB" ACTUALLY REACH THE ROUTE PAGE? (0188)
 *
 * The panel returns nothing unless USE_DB is on, so check:bare — which renders the seed shape —
 * can never see it. This renders the REAL RouteDetail with ./lib/supabase stubbed to USE_DB=true,
 * and seeds the react-query cache with the unattributed points route_base_checkin_points()
 * returns, so every state the panel can be in is drawn without a browser or a database.
 *
 * Both directions: it must render where the climb has a location to check against, and must NOT
 * render where there is none (a button that can only ever be refused is worse than no button).
 *
 *   node scripts/oneoff/probe-base-checkin-panel-renders.mjs
 */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const noop = () => {};
export function render(route, who, points, failed) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (points) qc.setQueryData(["route-base-checkins", route.id], points);
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, who, initialSubTab: "overview", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const stub = {
  name: "stub-supabase",
  setup(b) {
    b.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: "stub", namespace: "sb" }));
    b.onLoad({ filter: /.*/, namespace: "sb" }, () => ({
      contents: `export const USE_DB = true;
        const q = () => ({ select: q, eq: q, in: q, order: q, limit: q, single: async () => ({ data: null, error: null }), then: (r) => r({ data: [], error: null }) });
        export const supabase = { rpc: async () => ({ data: [], error: null }), from: q,
          auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
          channel: () => ({ on() { return this; }, subscribe() { return this; }, track() {}, untrack() {} }), removeChannel() {} };`,
      loader: "js",
    }));
  },
};
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("no realtime"); } };

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-basecheckin-"));
const out = path.join(dir, "b.cjs");
process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  plugins: [stub], outfile: out, logLevel: "error",
});
const { render } = require_(out);

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const route = (area) => ({ id: "probe_route", name: "Probe Route", grade: "5.9", gradeSystem: "yds", discipline: "trad",
  pitches: 1, mountainId: "probe_area", _dbArea: { id: "probe_area", name: "Probe Crag", areaType: "crag", ...area } });
const LOCATED = route({ lat: 47.84033, lng: -117.75534 });
const UNLOCATED = route({});
const UID = "8f14e45f-ce9a-4b0e-9c1a-2b3c4d5e6f70";

let bad = 0, ran = 0;
const is = (c, m) => { ran++; if (c) console.log("  ok    " + m); else { bad++; console.log("  FAIL  " + m); } };
const panel = (t) => { const i = t.indexOf("BASE OF THE CLIMB"); return i < 0 ? "" : t.slice(i, i + 900); };

const t0 = text(render(LOCATED, UID, []));
is(t0.length > 800, `the route page rendered (${t0.length} chars) — otherwise every "absent" below is vacuous`);
const p0 = panel(t0);
is(!!p0, "a located climb shows BASE OF THE CLIMB on Overview");
is(p0.includes("Nobody has checked in at the base yet."), "...saying nobody has checked in, when the read returned none");
is(p0.includes("I’m at the base — check in") || p0.includes("I'm at the base — check in"), "...with the check-in button for a signed-in climber");
is(p0.includes("never who, or when"), "...and says what other climbers will and will not see");

const p1 = panel(text(render(LOCATED, null, [])));
is(p1.includes("Sign in to check in"), "a signed-out reader is told to sign in");
is(!!p1 && !p1.includes("I’m at the base"), "...and offered no button that could only fail");

const pts = [{ lat: 47.84040, lng: -117.75530, mine: false }, { lat: 47.84043, lng: -117.75533, mine: true }, { lat: 47.8500, lng: -117.7553, mine: false }];
const p2 = panel(text(render(LOCATED, UID, pts)));
is(/Checked in on-site by 2 climbers, including you/.test(p2), "two agreeing check-ins read as one spot, 2 climbers, including you");
is(p2.includes("1 other spot reported"), "...with the outlying check-in counted, not merged");
is(p2.includes("Open the base in maps"), "...and a link to the spot");
is(p2.includes("Remove my check-in"), "...and a way to withdraw your own");
is(p2.includes("check in again"), "...and the button reads as a re-check-in");
is(!/user_id|undefined|NaN/.test(p2), "no identity field, undefined or NaN reaches the panel");

const t3 = text(render(UNLOCATED, UID, []));
is(t3.length > 800 && !t3.includes("BASE OF THE CLIMB"), "a climb with NO location on file shows no check-in button at all");

console.log(`\n${ran - bad}/${ran} passed`);
if (ran < 14) { console.log("FAIL: fewer assertions ran than written"); process.exit(1); }
process.exit(bad ? 1 : 0);
