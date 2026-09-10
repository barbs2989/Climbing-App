#!/usr/bin/env node
// WHAT DOES THE VOUCH PICKER OFFER A REAL CLIMBER?
//
// GiveVouch asks "which climb did you two do together?" and its answer is PERSISTED: the call site
// does giveVouch(uid, targetId, JSON.stringify({route: v.route, ...})), and `route` is the route's
// NAME (setRoute(sel?"":r.name)). So whatever this list offers can end up written onto a vouch --
// a trust artefact about ANOTHER climber.
//
// The list was `ROUTES.filter(...)`, the SEED demo catalog, and with no query typed that filter
// keeps everything. `useRouteSearch(USE_DB ? q : "")` is disabled while q is empty, so the real
// catalog was not consulted at all for the default view.
//
// USE_DB is a module constant read from import.meta.env, so it is set here by STUBBING
// ./lib/supabase through an esbuild plugin rather than by standing up a real client -- which on
// node 20 would also need a WebSocket constructor RealtimeClient builds at construction.
//
//   node scripts/oneoff/measure-vouch-picker-offers-demo-routes.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GiveVouch } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(friend) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(GiveVouch, { friend, onClose: noop, onSave: noop })));
}
`;

// Stub ./lib/supabase so USE_DB is whatever this run needs and no client is ever constructed.
const stub = (useDb) => ({
  name: "stub-supabase",
  setup(b) {
    b.onResolve({ filter: /lib\/supabase$/ }, () => ({ path: "stub", namespace: "sb" }));
    b.onLoad({ filter: /.*/, namespace: "sb" }, () => ({
      contents: `export const USE_DB = ${useDb}; export const supabase = null;`,
      loader: "js",
    }));
  },
});

async function bundleFor(useDb) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-vouch-")), "b.cjs");
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    plugins: [stub(useDb)], outfile: out, logLevel: "error",
  });
  return require_(out).render;
}

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
  .replace(/&#x2F;/g, "/").replace(/\s+/g, " ");

// A DB-derived friend: a uuid id, and NO objectiveIds -- the shape CLAUDE.md records for a real
// connection, which is also why the shared-objectives pinning below can never fire for one.
const dbFriend = { id: "8f14e45f-ce9a-4b0e-9c1a-2b3c4d5e6f70", name: "Robin Belay", avatar: "" };

// Seed route names, read from the app rather than typed, so this cannot pass on a stale guess.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const seedNames = [...core.matchAll(/\{id:"(?:kings_hf|olympus_wf|lcc_[a-z_]+)",[^]{0,400}?name:"([^"]{4,60})"/g)]
  .map((m) => m[1]).slice(0, 6);

const renderDb = await bundleFor(true);
const renderSeed = await bundleFor(false);

const dbBody = text(renderDb(dbFriend));
const seedBody = text(renderSeed(dbFriend));

const PROMPT = "Search for the climb you did together";
const NOMATCH = "No climbs match.";

const hits = (body) => seedNames.filter((n) => n && body.includes(n));

console.log("seed route names read from source : " + (seedNames.length ? seedNames.join(", ") : "(none parsed)"));
if (!seedNames.length) { console.log("\ncould not read any seed route name; the comparison below would be vacuous."); process.exit(1); }
console.log("");
console.log("USE_DB=true  (what production serves a real climber)");
console.log("  seed demo routes offered        : " + hits(dbBody).length + (hits(dbBody).length ? " -> " + hits(dbBody).join(", ") : ""));
console.log('  says "' + PROMPT + '" : ' + dbBody.includes(PROMPT));
console.log('  says "' + NOMATCH + '"          : ' + dbBody.includes(NOMATCH));
console.log("");
console.log("USE_DB=false (the seed demo, where those routes ARE the catalog)");
console.log("  seed demo routes offered        : " + hits(seedBody).length);
console.log("");

// CONTROL: the seed build must still list them, or this measures a component that rendered nothing
// rather than a picker that stopped offering demo data.
if (!hits(seedBody).length) {
  console.log("CONTROL FAILED — the seed build offered no routes either, so this is vacuous.");
  process.exit(1);
}
console.log(hits(dbBody).length
  ? 'VERDICT: a real climber is offered DEMO routes, and the pick is written onto the vouch.'
  : 'VERDICT: no demo route is offered under USE_DB; the empty list says "' + PROMPT + '"\n         rather than claiming nothing matched a search nobody ran.');
