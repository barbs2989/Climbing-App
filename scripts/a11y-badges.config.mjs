// Vite config used only by check:a11y-badges.
//
// Like scripts/overlay-scroll.config.mjs and unlike scripts/zero-state.config.mjs, it
// rewrites NOTHING about the app's state — it injects the shared overlay opener and stops
// there. That is the whole point here: a badge count only exists when the count is
// non-zero, so the defect this check looks for is INVISIBLE at zero state. `Friends` with
// no pending requests renders no badge and announces cleanly. The populated demo is the
// only state where the fault can be seen at all.
//
// Its own ANCHOR, like the two configs beside it. Duplicating the anchor string is the
// established pattern here and it is safe because a stale one fails LOUDLY (ANCHOR LOST)
// rather than quietly walking an app with no opener. What must not be duplicated is the
// overlay DISCOVERY, and that is imported from the shared scaffold.
//
// Does not ship. Only ever passed via `vite --config`.

import base from "../vite.config.js";
import { buildOpener, lazyChunks, routeDetailTransform } from "./lib/overlay-scaffold.mjs";

const ANCHOR = "  const prevUidRef=useRef(uid);";

function a11yBadgeScaffold() {
  return {
    name: "a11y-badges-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      // RouteDetail owns modals of its own, and no `?z=` injected into App can reach a
      // flag local to another component. Shared helper so no config can forget it.
      const _rd = routeDetailTransform(code, id, "check:a11y-badges");
      if (_rd !== null) return _rd;
      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      const n = code.split(ANCHOR).length - 1;
      if (n !== 1) {
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + ANCHOR +
          "\nbut found " + n + ". Without the opener no overlay is ever mounted, so this " +
          "check would walk six bare tabs and report green over nothing. Update the anchor " +
          "in scripts/a11y-badges.config.mjs."
        );
      }
      const { inject } = buildOpener(code, ANCHOR, "check:a11y-badges");
      return code.replace(ANCHOR, ANCHOR + "\n  " + inject);
    },
  };
}

const WARM = lazyChunks("check:a11y-badges");
console.log("check:a11y-badges — warming " + WARM.length + " lazy chunk(s): " + WARM.join(", "));

export default {
  ...base,
  plugins: [a11yBadgeScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};
