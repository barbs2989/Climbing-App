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
import { buildOpener, lazyChunks, routeDetailTransform, ADMIN_GATE } from "./lib/overlay-scaffold.mjs";

const ANCHOR = "  const prevUidRef=useRef(uid);";

function overlayScrollScaffold() {
  return {
    name: "overlay-scroll-scaffold",
    enforce: "pre", // before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      // RouteDetail owns modals of its own, and no `?z=` injected into App can reach a
      // flag local to another component. Shared helper so no config can forget it.
      const _rd = routeDetailTransform(code, id, "check:overlay-scroll");
      if (_rd !== null) return _rd;
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
      const { inject } = buildOpener(code, ANCHOR, "check:overlay-scroll");
      // The review queue's admin gate, so check:pinned-dismiss's `?zx=reviewQueue` can open it.
      // Inert unless that opener sets window.__ovAdminGate; see ADMIN_GATE in overlay-scaffold.mjs.
      const g = code.split(ADMIN_GATE.from).length - 1;
      if (g !== 1) throw new Error(`ADMIN GATE LOST in ClimbMatch.jsx: expected exactly 1 occurrence of ${ADMIN_GATE.from} but found ${g} — update ADMIN_GATE in scripts/lib/overlay-scaffold.mjs`);
      return code.replace(ADMIN_GATE.from, ADMIN_GATE.to).replace(ANCHOR, ANCHOR + "\n  " + inject);
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
