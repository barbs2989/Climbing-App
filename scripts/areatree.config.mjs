// Vite config used only by scripts/oneoff/probe-db-area-tree-onscreen.mjs.
//
// The "All areas" overlay is gated on `areaTreeOpen && (dbAreaCtx || selArea)`. `dbAreaCtx` is
// written ONLY by DbAreaBrowser's own effect, after a climber has drilled into an area — and this
// repo has four recorded browser attempts that failed to drive that navigation
// ([[three-climbs-tab-sections-dead-in-production]]). Driving it again is not the point of this
// probe; the point is whether DbAreaTree renders a real catalog hierarchy once it is open.
//
// So the area context is injected directly, the same never-edit-the-source pattern
// zero-state.config.mjs, anniversary.config.mjs and camping-expand.config.mjs establish.
//
// The injected value is EXACTLY the shape DbAreaBrowser reports — {id,name,lat,lng,areaType},
// with real coordinates read from the live row — because a probe that feeds a shape the app
// cannot produce is testing a state that does not exist. DbAreaTree only reads `id`, but passing
// a coordinate-less object would quietly test a context the reporter would never emit (it returns
// null unless lat/lng are set).
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { lazyChunks } from "./lib/overlay-scaffold.mjs";

const ANCHOR = "  const prevUidRef=useRef(uid);";

// A real crag, deliberately DEEP: usa.colorado.co_canon_city.co_shelf_road.co_cactus_cliff. A
// shallow area would let the tree pass while rendering only a root, which is the vacuous version
// of this test — the state ancestor has to be several levels up for the walk down to mean anything.
export const AREA = { id: "co_cactus_cliff", name: "Cactus Cliff", lat: 38.63213, lng: -105.22238, areaType: "crag" };

export default {
  ...base,
  // The scaffold plugin goes FIRST, and the id match carries a LEADING SLASH — both copied from
  // camping-expand.config.mjs rather than improvised. Without the slash the match is
  // position-dependent on vite's module ids, and the first version of this config threw
  // ANCHOR LOST on a file that demonstrably contains the anchor exactly once.
  plugins: [
    {
      name: "areatree-probe",
      enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
      transform(code, id) {
        if (!id.endsWith("/ClimbMatch.jsx")) return null;
        if (!code.includes(ANCHOR)) {
          throw new Error("areatree.config: ANCHOR LOST — `" + ANCHOR + "` not found in ClimbMatch.jsx. Nothing was injected, so the probe below would report the overlay missing when it was never opened.");
        }
        const inject = ANCHOR + "\n"
          + "useEffect(function(){"
          + "var p=new URLSearchParams(location.search);"
          + "if(!p.get('zat'))return;"
          + "setTab('routes');"
          // DEFERRED, and this is app behaviour rather than probe convenience. DbAreaBrowser
          // reports onAreaContext(null) from its own mount effect, because it starts on the
          // country/state picker with no `current` area — so a dbAreaCtx set synchronously here is
          // stomped a tick later by the real reporter and the overlay never opens. Waiting past
          // that mount is what a climber does anyway: the context only exists once you have
          // drilled into an area.
          + "setTimeout(function(){"
          + "setDbAreaCtx(" + JSON.stringify(AREA) + ");"
          + "setAreaTreeOpen(true);"
          + "window.__areaTreeOpened=true;"
          + "},2500);"
          + "},[]);";
        return code.replace(ANCHOR, inject);
      },
    },
    ...(base.plugins || []),
  ],
  // WARM THE LAZY CHUNKS. DbAreaTree is `lazy(() => import(...))`, and on a cold dev server the
  // first render sits on the Suspense fallback while vite compiles it — the probe then reads
  // "Loading areas…" and reports the overlay missing. That is the recorded
  // [[lazy-chunk-cold-compile-reads-as-blank]] trap, and it is why every other scaffold config
  // ships a warm list rather than a longer sleep.
  server: { ...(base.server || {}), warmup: { clientFiles: lazyChunks("areatree probe") } },
};
