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

import { readFileSync, existsSync } from "node:fs";
import base from "../vite.config.js";

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

// Overlays are discovered from the source, not listed here, so a modal added tomorrow
// is walked without anyone remembering to register it.
function overlayStates(code) {
  const found = [];
  for (const m of code.matchAll(/\[([a-zA-Z][\w$]*Open),(set[A-Z][\w$]*)\]=useState\(false\)/g)) {
    found.push({ name: m[1], setter: m[2], at: m.index });
  }
  return found;
}

function zeroStateScaffold() {
  return {
    name: "zero-state-scaffold",
    enforce: "pre", // must run before @vitejs/plugin-react compiles the JSX away
    transform(code, id) {
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
      const refAt = out.indexOf('const prevUidRef=useRef("__forcezero");');
      // Only setters already declared above the injection point are in scope. Anything
      // below is reported rather than silently dropped -- a modal that stops being walked
      // is exactly the blind spot this check exists to close.
      const all = overlayStates(out);
      const usable = all.filter((s) => s.at < refAt);
      const skipped = all.filter((s) => s.at >= refAt).map((s) => s.name);
      if (skipped.length) {
        console.error("check:zero — these overlays are declared below the injection point and cannot be opened: " + skipped.join(", "));
      }
      const map = usable.map((s) => JSON.stringify(s.name) + ":" + s.setter).join(",");
      const inject =
        "useEffect(function(){var M={" + map + "};" +
        "window.__zeroOverlays=Object.keys(M);" +
        "var p=new URLSearchParams(location.search);var t=p.get('zt');var z=p.get('z');" +
        "if(t)setTab(t);" +
        "if(z&&M[z])setTimeout(function(){M[z](true);},1200);" +
        "window.__zeroReady=true;},[]);";
      return out.replace(
        'const prevUidRef=useRef("__forcezero");',
        'const prevUidRef=useRef("__forcezero");\n  ' + inject
      );
    },
  };
}

// Warm the LAZY children, not just the entry.
//
// #693 raised load()'s goto timeout to 120s because the Climbs tab lazily imports
// DbAreaBrowser and the dev server compiles that chunk on the first request for it. That
// diagnosis is right, but a bigger budget is not a fix: on a machine held at ~800 load by a
// parallel session the run still died at 120s, on the FIRST navigation. Vite's own warmup
// starts transforming these at server boot, which overlaps with Playwright launching
// Chrome, so the chunks are largely built before the first goto instead of being paid for
// inside its timeout.
//
// Discovered from the source rather than listed here, for the same reason the overlay list
// is: a lazy import added tomorrow is warmed without anyone remembering to register it.
// A hardcoded file list silently narrows every time the code moves.
function lazyChunks() {
  const files = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "main.jsx"];
  const out = new Set();
  for (const f of files) {
    let src;
    try { src = readFileSync(new URL("../" + f, import.meta.url), "utf8"); } catch { continue; }
    for (const m of src.matchAll(/lazy\(\s*\(\)\s*=>\s*import\("([^"]+)"\)/g)) {
      // warmup.clientFiles takes real file paths, not module specifiers: most of these are
      // written extensionless ("./lib/DbAreaBrowser") and would warm NOTHING if passed
      // through. Resolve against disk and say so if one does not exist, rather than
      // shipping a warm list that quietly covers one file out of six.
      const spec = m[1];
      const cand = [spec, spec + ".jsx", spec + ".js", spec + "/index.jsx", spec + "/index.js"];
      const hit = cand.find((c) => existsSync(new URL("../" + c.replace(/^\.\//, ""), import.meta.url)));
      if (hit) out.add(hit);
      else console.error("check:zero — lazy import " + JSON.stringify(spec) + " did not resolve to a file; it will not be warmed.");
    }
  }
  if (!out.size) {
    // Nothing matched: either there are no lazy imports any more, or the pattern moved.
    // Say so rather than silently warming nothing and leaving the next person to rediscover
    // the 120s timeout the hard way.
    console.error("check:zero — no lazy imports found to warm; if the app still uses lazy(), the pattern in zero-state.config.mjs needs updating.");
  }
  return [...out];
}

const WARM = lazyChunks();
console.log("check:zero — warming " + WARM.length + " lazy chunk(s): " + WARM.join(", "));

export default {
  ...base,
  plugins: [zeroStateScaffold(), ...(base.plugins || [])],
  server: { ...(base.server || {}), warmup: { clientFiles: WARM } },
};
