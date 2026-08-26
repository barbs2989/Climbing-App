// Make the DERIVED TRAILHEAD marker reachable in a real browser.
//
// The marker is built inside GPXMap's useEffect by Leaflet, so `renderToStaticMarkup` cannot see it
// — effects do not run there. probe-derived-trailhead-marker.mjs proves the LOGIC by extracting the
// block and running it against a stub, and says plainly that it does not prove Leaflet paints
// anything. This closes that gap.
//
// `?zr=1` opens seed ROUTES[0], which has a Trailhead waypoint of its own and no
// `approachLogistics`, so `trailheadPoint()` returns derived=false and the marker never draws. This
// injects the shape IN MEMORY — never editing the source — the pattern zero-state.config.mjs,
// anniversary.config.mjs and camping-expand.config.mjs already establish.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { buildOpener, lazyChunks, routeDetailTransform } from "./lib/overlay-scaffold.mjs";

const OPENER_ANCHOR = "  const prevUidRef=useRef(uid);";
const ROUTES_ANCHOR = "const ROUTES=[";

// Distinctive enough that the probe cannot pass on incidental page text.
export const TH_NAME = "ZZPROBETRAILHEADZZ";

function firstObject(code, anchor) {
  const at = code.indexOf(anchor);
  if (at < 0) return null;
  const start = at + anchor.length;
  let depth = 0, str = null;
  for (let i = start; i < code.length; i++) {
    const c = code[i];
    if (str) { if (c === "\\") { i++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === "`") { str = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return code.slice(start, i + 1); }
  }
  return null;
}

function derivedTrailheadScaffold() {
  return {
    name: "derived-trailhead-scaffold",
    enforce: "pre",
    transform(code, id) {
      const _rd = routeDetailTransform(code, id, "derived-trailhead probe");
      if (_rd !== null) return _rd;

      if (id.endsWith("/ClimbMatchCore.jsx")) {
        const n = code.split(ROUTES_ANCHOR).length - 1;
        if (n !== 1) throw new Error(`ANCHOR LOST: expected 1 occurrence of ${ROUTES_ANCHOR}, found ${n}.`);
        /* Two premises this probe rests on, asserted rather than assumed — a seed reshuffle is
           exactly how a probe quietly starts measuring the wrong route.
             1. The marker is GATED on the map already having a track or a placed pin. Without a
                track the marker is CORRECTLY absent and the probe would report a working feature
                as broken.
             2. The ROUTE TRACK map (the one this fixture reaches) renders under `!cragOnly`, so
                the route has to be in the alpine family. `catOf()` folds `rock` into trad/sport,
                so the discipline is the same question. */
        const first = firstObject(code, ROUTES_ANCHOR);
        if (!first) throw new Error("derived-trailhead scaffold: could not balance ROUTES[0].");
        if (!/gpxPts\s*:/.test(first)) {
          throw new Error(
            "derived-trailhead scaffold: ROUTES[0] carries no gpxPts, so GPXMap would draw no map " +
            "and the derived marker is correctly suppressed. Point the probe at a seed route with a track."
          );
        }
        const disc = (first.match(/discipline:"([a-z]+)"/) || [])[1];
        if (!["alpine", "mountaineering", "scrambling", "ice", "mixed"].includes(disc)) {
          throw new Error(
            `derived-trailhead scaffold: ROUTES[0] is discipline "${disc}", which catOf() folds into ` +
            `the crag family — its map renders under GETTING THERE on Overview, not ROUTE TRACK on ` +
            `Planner, and this probe navigates to Planner.`
          );
        }
        return null;
      }

      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      const n = code.split(OPENER_ANCHOR).length - 1;
      if (n !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + OPENER_ANCHOR +
          "\nbut found " + n + ". Without the opener ?zr=1 never opens a route, so this probe would " +
          "look at the home tab and report the marker missing."
        );
      }
      const { inject } = buildOpener(code, OPENER_ANCHOR, "derived-trailhead probe");
      /* Strip the route's OWN Trailhead pin and give it an approach_logistics trailhead instead.
         That is precisely the shape of the 15 real routes: the button has a start point, the
         waypoint list does not, so trailheadPoint() falls through to the logistics copy and reports
         derived=true. The coordinate is offset from the track's first point so it lands inside the
         map's bounds and is visibly separate from the pins already there.
         Mutating a property of an imported array's element, not rebinding the import — ESM bindings
         are read-only and a reassignment would throw. */
      const seed =
        "  if(ROUTES&&ROUTES[0]){var _r0=ROUTES[0];" +
        "_r0.waypoints=(_r0.waypoints||[]).filter(function(w){return String((w&&w.type)||'').toLowerCase()!=='trailhead';});" +
        "var _p=(_r0.gpxPts&&_r0.gpxPts[0])||null;" +
        "if(_p)_r0.approachLogistics={trailhead:" + JSON.stringify(TH_NAME) + ",trailheadLat:_p[0]+0.004,trailheadLng:_p[1]+0.004};" +
        "}\n";
      return code.replace(OPENER_ANCHOR, OPENER_ANCHOR + "\n" + seed + "  " + inject);
    },
  };
}

const WARM = lazyChunks("derived-trailhead probe");
console.log("derived-trailhead probe — stripping ROUTES[0]'s Trailhead pin and giving it an approach_logistics one; warming " + WARM.length + " lazy chunk(s)");

export default {
  ...base,
  plugins: [derivedTrailheadScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};
