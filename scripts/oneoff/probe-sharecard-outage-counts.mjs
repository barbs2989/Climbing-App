// Does the SHARE CARD stop exporting a count it could not read?
//
// This is the #674 family and the worst member of it: `summary` is copied to the clipboard,
// mailed, texted and tweeted, so a false count does not merely sit on a screen -- it leaves the
// app under the climber's name. #674 put the word "undefined" there; an outage put a wrong ZERO.
//
// SSR, so no browser and no database: the two states differ only by a prop, which live data
// cannot produce on demand.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// The bundle MUST be written inside the project or node resolves `react` from the OS temp dir.
const OUT = path.join(ROOT, "scripts", "oneoff", ".sharecard-probe.mjs");

await esbuild.build({
  entryPoints: [path.join(ROOT, "ClimbMatchCore.jsx")],
  bundle: true, format: "esm", outfile: OUT, jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  external: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "@supabase/supabase-js"],
  logLevel: "silent",
});
const mod = await import(OUT + "?t=" + Date.now());
const ShareCard = mod.ShareCard;
if (typeof ShareCard !== "function") { console.error("ANCHOR LOST: ShareCard is not exported"); process.exit(1); }

const climber = {
  id: "11111111-1111-1111-1111-111111111111", _real: true,
  name: "Nathan Barber", level: "Intermediate", location: "Salt Lake City, UT",
  years: 5, routesLogged: 12, catchLedger: { totalCatches: 3 }, highlights: [],
};

const render = (flags) =>
  renderToStaticMarkup(React.createElement(ShareCard, { climber, onClose() {}, ...flags }));

const healthy = render({});
const outage  = render({ logsUnavailable: true, catchesUnavailable: true });

// FAIL CLOSED: every "must not contain" assertion below passes against a card that never rendered.
if (healthy.length < 800) { console.error(`FAIL-CLOSED: healthy render only ${healthy.length} chars`); process.exit(1); }
console.log(`healthy ${healthy.length} chars   outage ${outage.length} chars\n`);

let bad = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) bad++; };

// HEALTHY: the counts are exported, so the outage assertions below are not vacuous.
ok(healthy.includes("12 climbs logged"), "healthy: exports '12 climbs logged'");
ok(healthy.includes("3 catches caught"), "healthy: exports '3 catches caught'");
const dash = (t) => (t.match(/—/g) || []).length;   // the card uses — as a separator too

// OUTAGE: the clause DROPS OUT rather than interpolating a zero.
ok(!outage.includes("0 climbs logged"),  "outage: does NOT export '0 climbs logged'");
ok(!outage.includes("0 catches caught"), "outage: does NOT export '0 catches caught'");
ok(!/\d+ climbs logged/.test(outage),    "outage: no NUMBER precedes climbs-logged anywhere");
ok(!/\d+ catch(es)? caught/.test(outage),"outage: no NUMBER precedes catches-caught anywhere");
ok(dash(outage) > dash(healthy),         "outage: gained — placeholders (" + dash(healthy) + " -> " + dash(outage) + ")");
// The rest of the card must survive -- dropping a clause must not blank the share sheet.
ok(outage.includes("Nathan Barber"),     "outage: the card still identifies the climber");
ok(outage.includes("5 yrs climbing"),    "outage: unrelated fields still export");

fs.rmSync(OUT, { force: true });
console.log(bad ? `\n${bad} assertion(s) FAILED` : "\nok — an unreadable count is dropped from the exported text, not exported as zero");
process.exit(bad ? 1 : 0);
