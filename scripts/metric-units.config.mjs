// Vite config used only by probe-weather-honours-the-unit-setting-onscreen.mjs.
//
// The unit setting is `useState("imperial")` in App with NO persistence, so it cannot be
// carried across a page load -- and `?zr=1` opens the route page by page load. Driving the
// toggle in-session does not work either: Settings renders over the nav, and leaving the
// Climbs tab clears `selRoute`, so by the time the units are metric the route page is gone.
// (`window.__routeOpen` stays true once set, so it reports the route as open when it is not
// -- a scaffold flag is not live state.)
//
// So the initial value is rewritten IN MEMORY, the way zero-state.config.mjs replays the
// sign-in reset and anniversary.config.mjs dates a log. The source is never edited.
//
// Does not ship. Only ever passed via `vite --config`.
import base from "../vite.config.js";
import { buildOpener, lazyChunks, routeDetailTransform } from "./lib/overlay-scaffold.mjs";

const UNITS_ANCHOR = '[units,setUnits]=useState("imperial")';
const OPENER_ANCHOR = "  const prevUidRef=useRef(uid);";

function metricScaffold() {
  return {
    name: "metric-units-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      const _rd = routeDetailTransform(code, id, "metric-units probe");
      if (_rd !== null) return _rd;
      if (!id.endsWith("/ClimbMatch.jsx")) return null;

      const u = code.split(UNITS_ANCHOR).length - 1;
      if (u !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + UNITS_ANCHOR +
          "\nbut found " + u + ". Without it the app would render in IMPERIAL and the probe would " +
          "compare imperial against imperial and report that nothing changed — which is exactly " +
          "what a broken conversion looks like. Update the anchor in scripts/metric-units.config.mjs."
        );
      }
      // buildOpener does its own ANCHOR LOST check and returns the code to inject.
      const { inject } = buildOpener(code, OPENER_ANCHOR, "metric-units probe");
      let out = code.replace(UNITS_ANCHOR, '[units,setUnits]=useState("metric")');
      out = out.replace(OPENER_ANCHOR, inject + OPENER_ANCHOR);
      return out;
    },
  };
}

export default {
  ...base,
  plugins: [metricScaffold(), ...(base.plugins || [])],
  optimizeDeps: { ...(base.optimizeDeps || {}), include: lazyChunks() },
};
