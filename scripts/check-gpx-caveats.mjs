// DOES THE CAVEAT SURVIVE THE DOWNLOAD?
//
// Every honesty caption this repo has built for a route's line lives on a WEB PAGE — a sketch is
// "straight lines between this route's waypoints", a stub is "a placeholder, not this route's
// track", a partial one says which end is missing. Then the page offers **Download GPX**, and the
// file said none of it: `<wpt>` entries and a `<trk><name>` with no `<desc>` anywhere. It loads
// into Gaia or CalTopo as a track named after the route, with nothing attached.
//
// That is the one place the disclaimer matters most, because it is the place the reader cannot go
// back and re-read the page.
//
// WHAT THIS PROVES, and what it does not. It asserts the STRING the download writes, which is why
// `buildGpx` was split out of `gpxDownload`: the download half calls Blob and document inside a
// try/catch, so anything calling it in node had the exception swallowed and could never see the
// file. It does not prove a mapping app displays `<desc>` — that is a property of GPX 1.1 and of
// those apps, not of this repo.
//
// Static: one esbuild bundle, no browser, no database.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (m) => { console.error("FAIL-CLOSED: " + m + " — nothing below was checked."); process.exit(1); };

// THE BUNDLE MUST BE WRITTEN INSIDE THE PROJECT. node resolves `react` from the nearest
// node_modules, so a bundle in the OS temp dir throws ERR_MODULE_NOT_FOUND — a trap this repo has
// recorded more than once.
const out = path.join(ROOT, `.tmp_gpx_probe_${process.pid}.cjs`);
const entry = path.join(ROOT, `.tmp_gpx_entry_${process.pid}.jsx`);
fs.writeFileSync(entry, `export { buildGpx, __set_UNITS } from "./ClimbMatchCore.jsx";\n`);
try {
  esbuild.buildSync({
    entryPoints: [entry], bundle: true, format: "cjs", platform: "node",
    external: ["react", "react-dom", "react-dom/server", "@tanstack/react-query", "@supabase/supabase-js", "leaflet"],
    jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: out, logLevel: "error",
  });
} catch (e) { fs.rmSync(entry, { force: true }); dead("the bundle did not build: " + (e && e.message)); }
const mod = require_(out);
const clean = () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); };
process.on("exit", clean);

const { buildGpx } = mod;
if (typeof buildGpx !== "function") dead("buildGpx is not exported from ClimbMatchCore");

console.log("check:gpx-caveats\n");

const WPS = [
  { name: "Trailhead", type: "Trailhead", lat: 48.4926, lng: -121.1176 },
  { name: "Basin camp", type: "Campsite", lat: 48.5299, lng: -121.1242 },
  { name: "Glacier gain", type: "Junction", lat: 48.5479, lng: -121.1249 },
  { name: "Summit", type: "Summit", lat: 48.5543, lng: -121.1043 },
];
const SYNTH = WPS.map((w) => [w.lat, w.lng]);
const REAL = [];
for (let i = 0; i < WPS.length - 1; i++)
  for (let s = 0; s < 8; s++)
    REAL.push([WPS[i].lat + (WPS[i + 1].lat - WPS[i].lat) * (s / 8), WPS[i].lng + (WPS[i + 1].lng - WPS[i].lng) * (s / 8)]);
REAL.push([WPS[3].lat, WPS[3].lng]);
const CHORD = [[48.4926, -121.1176], [48.5543, -121.1043]];

const sketch = buildGpx({ id: "r1", name: "Probe", gpxPts: SYNTH, waypoints: WPS });
const real = buildGpx({ id: "r2", name: "Probe", gpxPts: REAL, waypoints: WPS });
const chord = buildGpx({ id: "r3", name: "Probe", gpxPts: CHORD, waypoints: [WPS[1], WPS[2]] });

// FAIL CLOSED. Every "must contain" assertion below passes against a file that was never built,
// and every "must not contain" one passes against an empty string.
if (sketch.length < 200 || real.length < 200) dead(`buildGpx produced ${sketch.length}/${real.length} characters — too thin to assert on`);
if (!/<trkpt /.test(sketch) || !/<wpt /.test(sketch)) dead("the built file carries no track points or waypoints — the probe is not exercising the writer");

// ── 1. the caveat reaches the file
if (!/<trk>[\s\S]*?<desc>/.test(sketch)) fail("a sketched line exports with no <desc> on its track — the caveat stops at the browser");
else ok("a sketched line carries a track description");
if (!sketch.includes("not a recorded GPS track")) fail("the exported description does not say the line is not a recorded track");
else ok("the exported description says what the line is not");
if (!/<metadata><desc>/.test(sketch)) fail("the file carries no metadata description — a reader that shows only file-level notes sees nothing");
else ok("the file carries a metadata description too");

// ── 2. AND NOT ON A GENUINE TRACK. A rule that only ever adds is satisfied by captioning
//    everything, and a false disclaimer on a real recording is how a real one stops being read.
if (/<desc>/.test(real)) fail("a genuine recorded track is exported with a disclaimer — a false warning on good data");
else ok("a genuine track exports with no disclaimer");

// ── 3. the second kind of line gets the second sentence
if (!chord.includes("single straight segment")) fail("a two-point chord exports without saying it is a straight segment");
else ok("a two-point chord says so in the file");

// ── 4. STRUCTURE. GPX 1.1 is a SEQUENCE — metadata before wpt before trk, and inside a trk,
//    name before desc before trkseg. Out of order is an invalid file, and some readers reject one.
{
  const iMeta = sketch.indexOf("<metadata>"), iWpt = sketch.indexOf("<wpt "), iTrk = sketch.indexOf("<trk>");
  if (!(iMeta >= 0 && iMeta < iWpt && iWpt < iTrk)) fail(`GPX element order is wrong: metadata ${iMeta}, wpt ${iWpt}, trk ${iTrk}`);
  else ok("metadata, waypoints and track appear in the order GPX 1.1 requires");
  const trk = sketch.slice(iTrk);
  const iName = trk.indexOf("<name>"), iDesc = trk.indexOf("<desc>"), iSeg = trk.indexOf("<trkseg>");
  if (!(iName >= 0 && iName < iDesc && iDesc < iSeg)) fail(`inside <trk> the order is wrong: name ${iName}, desc ${iDesc}, trkseg ${iSeg}`);
  else ok("inside the track, name precedes desc precedes trkseg");
}

// ── 5. ESCAPING, ASSERTED AS SOURCE — because its effect is UNOBSERVABLE today and an assertion
//    that cannot fail is worse than none.
//
// A description is a SENTENCE, so & < > must be escaped rather than deleted the way a route title
// safely can be. But nothing currently reaching <desc> contains one: every caveat is fixed English
// with no ampersand, and the waypoint and route names are stripped by the existing name path before
// they get near it. A first version of this built a route called "A & B" with a waypoint named
// "Camp <1> & 2", asserted the output held no bare ampersand, and PASSED against escaping that had
// been deleted — there was no ampersand in the file either way. The injection reported MISSED,
// which is the only reason it was caught.
//
// So this pins that the escape is APPLIED, which is the part a future caveat containing "&" would
// depend on, and says plainly that it does not observe the result.
{
  const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
  const i = src.indexOf("function buildGpx");
  const body = i < 0 ? "" : src.slice(i, i + 4000);
  if (!body) dead("buildGpx not found in ClimbMatchCore — the source assertion below is vacuous");
  const descs = (body.match(/<desc>\$\{esc\(/g) || []).length;
  if (descs < 2) fail(`only ${descs} of the two <desc> values are escaped — a sentence containing & < > would make the file malformed`);
  else ok("both descriptions are escaped at the source (its effect is unobservable until a caveat contains &)");
}

// ── 6. A RECORDED TRACK FROM ANOTHER CLIMBER MUST NOT INHERIT THESE SENTENCES. The same function
//    exports a community track through `overridePts`, and none of these claims is true of it —
//    they are about the ROUTE's own stored line.
{
  const other = buildGpx({ id: "r5", name: "Probe", gpxPts: SYNTH, waypoints: WPS }, REAL, "Someone's track");
  if (/<desc>/.test(other)) fail("a climber's own recorded track inherits the route line's disclaimer");
  else ok("an exported community track carries no claim about the route's stored line");
}

console.log();
if (failures) { console.error(`check:gpx-caveats FAILED — ${failures} problem(s).`); process.exit(1); }
console.log("ok — the file a climber downloads carries the same caveat the screen shows, and a genuine track carries none");
