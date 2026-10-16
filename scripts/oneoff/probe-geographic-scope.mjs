// CAN THE APP SAY WHERE ITS USERS ARE? Three questions, all facts about the software:
//
//   1. Is access geographically restricted?
//   2. Does a profile record a country?
//   3. Is there any other source that would say — analytics, telemetry, a logged region?
//
// This exists because the legal research (artifact a0ee4cae) turned up one threshold question that
// decides how much of the UK Online Safety Act reaches this app at all: whether it has "links to the
// UK". Ofcom's children's-access-assessment duty binds every user-to-user service in scope, and a
// service may only conclude children cannot access it via highly effective age assurance — a
// self-declared 18+ tick box does NOT support that conclusion. So the scope question is worth more
// than the tick-box question, and nobody had asked whether the app can answer it.
//
// Static: source plus the deploy workflows. No DB, no browser, no network.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = p => { try { return fs.readFileSync(path.join(ROOT, p), "utf8"); } catch (e) { return ""; } };

const core = read("ClimbMatchCore.jsx"), app = read("ClimbMatch.jsx"), db = read("lib/db.js");
if (core.length < 100000) { console.error(`ClimbMatchCore.jsx is only ${core.length} chars — refusing to report`); process.exit(1); }

let findings = 0;
const say = (ok, label, detail) => {
  if (!ok) findings++;
  console.log(`${ok ? "ok    " : ">>    "}  ${label}`);
  if (detail) console.log(`          ${detail}`);
};

// --- 1. geographic restriction -----------------------------------------------------------------
/* HOST-SHAPED and mechanism-shaped needles only. `navigator.geolocation` is the USER's own position
   for the route map and has nothing to do with restricting access; matching the bare word "geo"
   reports every map in the app. Same too-broad-proxy trap the tracker needle fell into. */
const GATE = /\bCF-IPCountry\b|x-vercel-ip-country|geo-?block|geoblock|geo-?restrict|region-?lock|\bcountryAllow|blockedCountries|allowedCountries/i;
const gateHits = [["ClimbMatchCore.jsx", core], ["ClimbMatch.jsx", app], ["lib/db.js", db]]
  .filter(([, t]) => GATE.test(t)).map(([n]) => n);
const wf = fs.existsSync(path.join(ROOT, ".github/workflows"))
  ? fs.readdirSync(path.join(ROOT, ".github/workflows")).filter(f => f.endsWith(".yml")) : [];
if (!wf.length) { console.error("no workflows found — scan broken"); process.exit(1); }
const wfGate = wf.filter(f => GATE.test(read(".github/workflows/" + f)));
say(gateHits.length + wfGate.length === 0
  ? false : true,   // absence of a gate IS the finding here, so invert: no gate => report it
  gateHits.length + wfGate.length
    ? `access IS geographically gated (${[...gateHits, ...wfGate].join(", ")})`
    : `NO geographic restriction anywhere in the app or the deploy`,
  gateHits.length + wfGate.length ? null
    : `${wf.length} workflow(s) scanned. The site ships on GitHub Pages, which serves one global\n          CDN and offers no geographic controls — so this is a property of the hosting, not an\n          omission that a config change would fix.`);

// --- 2. does a profile record a country? -------------------------------------------------------
/* `country` DOES appear in core — as an area-tree LEVEL ("Country"/"Countries") and as a map zoom
   preset (`country:4`). Neither is a user attribute, and counting the bare word would report the
   opposite of the truth. Look at what the PROFILE stores. */
const profileGeo = [...new Set([...db.matchAll(/\b(home_?state|home_?city|home_?country|country_?code)\b/gi)].map(m => m[1].toLowerCase()))];
const hasCountry = profileGeo.some(f => /country/.test(f));
say(hasCountry, hasCountry ? "a profile records a country" : "a profile records NO country",
  `profile geography fields: ${profileGeo.length ? profileGeo.join(", ") : "(none)"} — and the picker is US_STATES, a list of the 50 US states.`);

// --- 3. any other source that would say --------------------------------------------------------
const TRACKERS = /googletagmanager\.com|google-analytics\.com|\bgtag\(|cdn\.segment\.com|mixpanel\.com|amplitude\.com|posthog\.com|sentry\.io|datadoghq\.com|plausible\.io/i;
const anyTracker = [core, app, db].some(t => TRACKERS.test(t));
say(anyTracker, anyTracker ? "an analytics SDK is present and would record region"
  : "NO analytics or telemetry of our own, so no second source of user geography",
  anyTracker ? null : "consistent with packet finding F5, which verified this independently.");

console.log(`\n${findings === 3
  ? `ALL THREE point the same way: the app is reachable worldwide, records no country, and has no\ntelemetry that would reveal one. THE THRESHOLD QUESTION CANNOT BE ANSWERED FROM THE APP'S OWN\nDATA — it can neither exclude non-US users nor evidence that it has none.\n\nThat is the finding, not a gap to fill: it means "does this service have links to the UK?" is\ncurrently unanswerable in-product, and any answer would have to come from the hosting provider's\nlogs or from a deliberate decision to restrict or to instrument.`
  : `${findings} of 3 conditions hold — re-read the rows above; the geographic picture has changed.`}`);
process.exit(0);
