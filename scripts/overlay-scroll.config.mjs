// Vite config used only by check:overlay-scroll.
//
// Unlike scripts/zero-state.config.mjs this rewrites NOTHING about the app's state — it
// injects the shared overlay opener and nothing else. That is deliberate: the question here
// is "when this sheet has enough content to scroll, does the scroll chain to the page
// behind it", and at zero state most overlays have nothing to scroll. The populated demo is
// the only state where the fault is visible at all.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { buildOpener, buildRouteDetailOpener, routeDetailSource, lazyChunks } from "./lib/overlay-scaffold.mjs";

const ANCHOR = "  const prevUidRef=useRef(uid);";
// RouteDetail owns overlays of its own, and no `?z=` injected into App can reach a flag
// local to another component. So it gets its own opener, and App is told the names so it
// knows to navigate into a route first. See scripts/lib/overlay-scaffold.mjs.
const RD_NAMES = buildRouteDetailOpener(routeDetailSource(), "check:overlay-scroll").names;

function overlayScrollScaffold() {
  return {
    name: "overlay-scroll-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      if (id.endsWith("/RouteDetail.jsx")) return buildRouteDetailOpener(code, "check:overlay-scroll").code;
      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      const n = code.split(ANCHOR).length - 1;
      if (n !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + ANCHOR +
          "\nbut found " + n + ". Without the opener no overlay is ever mounted, so this " +
          "check would walk six bare tabs and report green over nothing. Update the anchor " +
          "in scripts/overlay-scroll.config.mjs."
        );
      }
      // Discovery + opener are shared with check:zero and check:signed-in, so the three
      // cannot drift on which modals exist. See scripts/lib/overlay-scaffold.mjs.
      const { inject } = buildOpener(code, ANCHOR, "check:overlay-scroll", undefined, RD_NAMES);
      return code.replace(ANCHOR, ANCHOR + "\n  " + inject);
    },
  };
}

const WARM = lazyChunks("check:overlay-scroll");
console.log("check:overlay-scroll — warming " + WARM.length + " lazy chunk(s): " + WARM.join(", "));

export default {
  ...base,
  plugins: [overlayScrollScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};
