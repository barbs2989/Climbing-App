// Vite config used ONLY by scripts/check-zero-state.mjs.
//
// The zero state cannot be reached by clicking: the demo seeds bookmarks, crews,
// friend requests and unread counts, and there is no build flag that empties them.
// The app's own sign-in reset does empty them -- so this config replays that reset
// at mount, in memory, instead of editing ClimbMatch.jsx.
//
// Nothing here ships. `npm run build` uses vite.config.js; this file is only ever
// passed via `vite --config`, so the scaffold cannot leak into a bundle.
//
// Three anchors are rewritten, each asserted to match EXACTLY once. If one stops
// matching the check fails with ANCHOR LOST rather than quietly walking a populated
// app and reporting green -- the same failure mode check:bare guards against.

import base from "../vite.config.js";
import { buildOpener, lazyChunks, routeDetailTransform } from "./lib/overlay-scaffold.mjs";

const ANCHORS = [
  [
    // A real account is identified by a session uid; a great deal of the UI is gated on it.
    // Force one so uid-gated branches render the way they do for a signed-in user.
    "const uid=(USE_DB&&session&&session.user)?session.user.id:null;",
    'const uid="00000000-0000-0000-0000-0000000zer0";',
  ],
  [
    // The body of the uid-change effect IS the app's definition of "a brand-new account".
    // Force it to run rather than hand-copying it: a hand copy that omits setProfile or
    // the Object.assign(ME,...) manufactures leaks that were never there.
    "if(uid){setLogs([]);",
    "if(true){setLogs([]);",
  ],
  [
    // Fire that effect at mount by making the previous uid differ from the current one.
    "  const prevUidRef=useRef(uid);",
    '  const prevUidRef=useRef("__forcezero");',
  ],
];

function zeroStateScaffold() {
  return {
    name: "zero-state-scaffold",
    enforce: "pre", // must run before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
      // RouteDetail owns modals of its own, and no `?z=` injected into App can reach a
      // flag local to another component. Shared helper so no config can forget it.
      const _rd = routeDetailTransform(code, id, "check:zero");
      if (_rd !== null) return _rd;
      if (!id.endsWith("/ClimbMatch.jsx")) return null;
      let out = code;
      for (const [from, to] of ANCHORS) {
        const n = out.split(from).length - 1;
        if (n !== 1) {
          throw new Error(
            "ANCHOR LOST in ClimbMatch.jsx: expected exactly 1 occurrence of\n  " + from +
            "\nbut found " + n + ". The zero state is no longer being forced, so this check " +
            "would walk the populated demo and pass for the wrong reason. Update the anchor " +
            "in scripts/zero-state.config.mjs."
          );
        }
        out = out.replace(from, to);
      }
      // Overlay discovery and the opener effect are shared with
      // scripts/signed-in.config.mjs, so the two checks cannot drift apart on which
      // modals exist. See scripts/lib/overlay-scaffold.mjs.
      const { inject } = buildOpener(out, 'const prevUidRef=useRef("__forcezero");', "check:zero");
      return out.replace(
        'const prevUidRef=useRef("__forcezero");',
        'const prevUidRef=useRef("__forcezero");\n  ' + inject
      );
    },
  };
}

const WARM = lazyChunks("check:zero");
console.log("check:zero — warming " + WARM.length + " lazy chunk(s): " + WARM.join(", "));

export default {
  ...base,
  plugins: [zeroStateScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};
