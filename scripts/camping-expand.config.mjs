// Vite config used only by scripts/oneoff/probe-camping-expand-onscreen.mjs.
//
// The camping sites are COLLAPSED, and `check:camping` says plainly that it cannot prove the
// tap works: SSR renders initial state and cannot click. That leaves the one failure this whole
// change could cause — a disclosure that never opens, making 5,083 sites of researched prose
// unreachable — proven by nothing. It is the `descent_text` shape exactly (populated on 1,021
// routes, rendered on none), so it gets driven in a real browser rather than argued about.
//
// Seed ROUTES carry no `bivy` (the one `bivy:` in the source is a waypoint TYPE string), so
// `?zr=1` alone opens a route with no camping panel at all. This injects sites onto ROUTES[0]
// in memory — never editing the source — which is the pattern zero-state.config.mjs and
// anniversary.config.mjs already establish for making a gated surface reachable.
//
// ROUTES[0] is `kings_hf`, discipline `scrambling`, which is inside catOf()'s camping gate.
// That is asserted below rather than assumed: a seed reshuffle would otherwise leave this
// probe opening a route with no panel and reporting the feature broken.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { buildOpener, lazyChunks, routeDetailTransform } from "./lib/overlay-scaffold.mjs";

const OPENER_ANCHOR = "  const prevUidRef=useRef(uid);";
const ROUTES_ANCHOR = "const ROUTES=[";

// Distinctive tokens so the probe cannot pass on incidental page text. Every field the
// disclosure is responsible for revealing is represented, because "some prose appeared" is
// not the question — the question is whether the fields that left the collapsed row came back.
export const FIXTURE = [{
  name: "Probe Basin camp",
  type: "camp",
  elev: 6300,
  capacity: "ZZCAPACITYZZ room for several parties on gravel benches above the tarn.",
  water: "ZZWATERZZ the melt stream runs until late August and then stops entirely.",
  permit: "ZZPERMITZZ a quota area that has to be booked well before the trip.",
  notes: "ZZNOTESZZ the last water is well below the col.",
}];

// The first `{...}` after an anchor, by balancing braces over RAW source while skipping string
// contents — the same care anniversary.config.mjs takes, and for the same reason: a brace
// inside a string literal must not be counted, or the walk ends in the wrong place. (Not the
// comment/string blanker the static guards use — that treats every quote as a delimiter and
// this app's seed prose is full of apostrophes.)
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

function campingExpandScaffold() {
  return {
    name: "camping-expand-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      const _rd = routeDetailTransform(code, id, "camping-expand probe");
      if (_rd !== null) return _rd;

      // The seed route must actually be one the camping gate admits. catOf() folds `rock` into
      // trad/sport, so a discipline check here is the same question the panel asks.
      if (id.endsWith("/ClimbMatchCore.jsx")) {
        const n = code.split(ROUTES_ANCHOR).length - 1;
        if (n !== 1) throw new Error(`ANCHOR LOST: expected 1 occurrence of ${ROUTES_ANCHOR} in ClimbMatchCore.jsx, found ${n}.`);
        // Balance the braces of ROUTES[0] rather than taking a fixed window. A 4,000-char slice
        // was the first version and it read `discipline: undefined` — that route object is far
        // longer, because it carries communityTracks, activity and gpx inline. A fixed window
        // encodes a guess about the subject's size, which is the same mistake the on-screen
        // probe's `i + 400` terminator made; do not reintroduce it here.
        const first = firstObject(code, ROUTES_ANCHOR);
        if (!first) throw new Error("camping-expand scaffold: could not balance ROUTES[0] — cannot tell whether the seed route is inside the camping gate.");
        const disc = (first.match(/discipline:"([a-z]+)"/) || [])[1];
        if (!["alpine", "mountaineering", "scrambling", "ice", "mixed"].includes(disc)) {
          throw new Error(
            `camping-expand scaffold: ROUTES[0] is discipline "${disc}", which the camping gate excludes. ` +
            `?zr=1 would open a route with NO camping panel and the probe would report the disclosure ` +
            `broken when it is fine. Point the probe at a gated seed route.`
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
          "look at the home tab and report the camping panel missing. Update the anchor in " +
          "scripts/camping-expand.config.mjs."
        );
      }
      const { inject } = buildOpener(code, OPENER_ANCHOR, "camping-expand probe");
      // Mutating a property of an imported array's element, not rebinding the import — ESM
      // bindings are read-only and a reassignment would throw. This runs during render, well
      // before the opener's 900ms openRoute() timeout fires.
      const seedSites = `  if(ROUTES&&ROUTES[0])ROUTES[0].bivy=${JSON.stringify(FIXTURE)};\n`;
      return code.replace(OPENER_ANCHOR, OPENER_ANCHOR + "\n" + seedSites + "  " + inject);
    },
  };
}

const WARM = lazyChunks("camping-expand probe");
console.log("camping-expand probe — injecting " + FIXTURE.length + " bivy site(s) onto ROUTES[0]; warming " + WARM.length + " lazy chunk(s)");

export default {
  ...base,
  plugins: [campingExpandScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};
