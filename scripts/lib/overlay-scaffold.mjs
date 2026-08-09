// Shared machinery for the two Vite configs that drive the browser checks:
// scripts/zero-state.config.mjs (check:zero) and scripts/signed-in.config.mjs
// (check:signed-in).
//
// Both need the same two things — a way to open any overlay by name, and a warm list of
// lazy chunks — and they need them to mean the SAME thing. Two copies of the discovery
// regex would drift the moment one file is updated and the other is not, and the failure
// would be silent: the stale copy keeps reporting green over a shrinking set of overlays.
//
// Neither config ships. Both are only ever passed via `vite --config`, so nothing here can
// reach a production bundle.

import { readFileSync, existsSync } from "node:fs";

// Overlays whose RENDERER is gated on state beyond their own flag, so flipping the flag
// alone cannot mount them. These are correct code, not bugs: the walk simply cannot reach
// them by name, and failing on them would train everyone to ignore the failure.
//
// Every entry records the actual gate, so the claim is checkable rather than taken on
// trust — and assertKnownOverlays() below fails if a name here has stopped being an
// overlay at all, which is how a list like this normally rots.
export const NEEDS_EXTRA_STATE = {
  areaTreeOpen: "rendered as `areaTreeOpen && selArea` — needs an area selected first",
  crewListOpen: "a disclosure inside the crew finder's result list — needs crews to list",
};

// A name that is exempted but no longer exists is a stale exemption, and a stale exemption
// is how an overlay quietly stops being checked forever.
export function assertKnownOverlays(discovered, fail) {
  for (const name of Object.keys(NEEDS_EXTRA_STATE)) {
    if (!discovered.includes(name)) {
      fail("scaffold", `NEEDS_EXTRA_STATE lists ${JSON.stringify(name)}, which is no longer an overlay state — remove it from scripts/lib/overlay-scaffold.mjs`);
    }
  }
}

// Overlay states are discovered from the SOURCE, never listed, so a modal added tomorrow is
// walked without anyone remembering to register it.
export function overlayStates(code) {
  const found = [];
  for (const m of code.matchAll(/\[([a-zA-Z][\w$]*Open),(set[A-Z][\w$]*)\]=useState\(false\)/g)) {
    found.push({ name: m[1], setter: m[2], at: m.index });
  }
  return found;
}

// Build the opener effect. `?zt=<tab>` selects a tab, `?z=<overlayName>` opens an overlay.
//
// Only setters declared ABOVE the injection point are in scope. Anything below is named in
// the output rather than silently dropped — a modal that quietly stops being walked is
// exactly the blind spot these checks exist to close.
export function buildOpener(code, anchor, label) {
  const at = code.indexOf(anchor);
  if (at < 0) throw new Error(`buildOpener: anchor not found: ${anchor}`);
  const all = overlayStates(code);
  const usable = all.filter((s) => s.at < at);
  const skipped = all.filter((s) => s.at >= at).map((s) => s.name);
  if (skipped.length) {
    console.error(`${label} — these overlays are declared below the injection point and cannot be opened: ${skipped.join(", ")}`);
  }
  const map = usable.map((s) => JSON.stringify(s.name) + ":" + s.setter).join(",");
  return {
    usable,
    skipped,
    inject:
      "useEffect(function(){var M={" + map + "};" +
      "window.__overlays=Object.keys(M);" +
      "var p=new URLSearchParams(location.search);var t=p.get('zt');var z=p.get('z');" +
      "if(t)setTab(t);" +
      "if(z&&M[z])setTimeout(function(){M[z](true);},1200);" +
      "window.__overlaysReady=true;},[]);",
  };
}

// Warm the LAZY children, not just the entry.
//
// #693 raised the goto timeout to 120s because the Climbs tab lazily imports DbAreaBrowser
// and the dev server compiles that chunk on the first request for it. A bigger budget is
// not a fix: on a machine held at high load by a parallel session the run still died at
// 120s on the FIRST navigation. Vite's own warmup starts transforming these at server boot,
// overlapping with Playwright launching Chrome, so the chunks are largely built before the
// first goto instead of being paid for inside its timeout.
//
// Discovered from the source for the same reason the overlay list is: a hardcoded file list
// silently narrows every time the code moves.
export function lazyChunks(label) {
  const files = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "main.jsx"];
  const out = new Set();
  for (const f of files) {
    let src;
    try { src = readFileSync(new URL("../../" + f, import.meta.url), "utf8"); } catch { continue; }
    for (const m of src.matchAll(/lazy\(\s*\(\)\s*=>\s*import\("([^"]+)"\)/g)) {
      // warmup.clientFiles takes real file paths, not module specifiers: most of these are
      // written extensionless ("./lib/DbAreaBrowser") and would warm NOTHING if passed
      // through. Resolve against disk and say so if one does not exist, rather than
      // shipping a warm list that quietly covers one file out of six.
      const spec = m[1];
      const cand = [spec, spec + ".jsx", spec + ".js", spec + "/index.jsx", spec + "/index.js"];
      const hit = cand.find((c) => existsSync(new URL("../../" + c.replace(/^\.\//, ""), import.meta.url)));
      if (hit) out.add(hit);
      else console.error(`${label} — lazy import ${JSON.stringify(spec)} did not resolve to a file; it will not be warmed.`);
    }
  }
  if (!out.size) {
    console.error(`${label} — no lazy imports found to warm; if the app still uses lazy(), the pattern in scripts/lib/overlay-scaffold.mjs needs updating.`);
  }
  return [...out];
}
