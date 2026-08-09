// Vite config used ONLY by scripts/check-signed-in.mjs.
//
// It adds exactly one thing to the real config: a `?z=<overlayName>` opener, so the walk
// can reach the 27 modal / full-screen-takeover states while signed in as an account that
// actually owns a crew and a group.
//
// It deliberately does NOT touch identity. That is the whole difference from
// scripts/zero-state.config.mjs, which rewrites three anchors to force a brand-new account:
// here the session is real, injected into localStorage by the check, and `uid` comes from
// it exactly as it does in production. Forcing a uid here would defeat the point — an
// overlay rendering real crew-mates is precisely what nothing has ever walked.
//
// Nothing here ships. This file is only ever passed via `vite --config`, so the scaffold
// cannot leak into a bundle.

import base from "../vite.config.js";
import { buildOpener, buildRouteDetailOpener, routeDetailSource, lazyChunks } from "./lib/overlay-scaffold.mjs";

// RouteDetail owns overlays of its own, and no `?z=` injected into App can reach a flag local
// to another component. So it gets its own opener, and App is told the names so it knows to
// navigate into a route first. See scripts/lib/overlay-scaffold.mjs.
const RD_NAMES = buildRouteDetailOpener(routeDetailSource(), "check:signed-in").names;

// The real declaration, left intact. It sits below every `set*Open` setter, which is what
// makes it a usable injection point, and it is NOT rewritten — unlike the zero-state
// config, which replaces it to force the sign-in reset at mount.
const ANCHOR = "  const prevUidRef=useRef(uid);";

function signedInScaffold() {
  return {
    name: "signed-in-scaffold",
    enforce: "pre", // must run before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      if (id.endsWith("/RouteDetail.jsx")) return buildRouteDetailOpener(code, "check:signed-in").code;
      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      const n = code.split(ANCHOR).length - 1;
      if (n !== 1) {
        // Fail closed. A moved anchor must not quietly walk an app with no opener wired
        // up, because then every overlay silently goes unchecked and the run still passes.
        throw new Error(
          "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + ANCHOR +
          "\nbut found " + n + ". No overlay could be opened, so check:signed-in would " +
          "report green having walked none of them. Update the anchor in " +
          "scripts/signed-in.config.mjs."
        );
      }
      const { inject } = buildOpener(code, ANCHOR, "check:signed-in", undefined, RD_NAMES);
      return code.replace(ANCHOR, ANCHOR + "\n  " + inject);
    },
  };
}

const WARM = lazyChunks("check:signed-in");
console.log("check:signed-in — warming " + WARM.length + " lazy chunk(s): " + WARM.join(", "));

export default {
  ...base,
  plugins: [signedInScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};
