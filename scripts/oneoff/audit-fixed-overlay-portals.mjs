// List every position:"fixed" overlay and whether it is wrapped in createPortal.
// Overlays rendered inside #appscroll must portal to document.body: #appscroll has
// `animation-fill-mode: both`, which makes it a permanent stacking context, so any
// fixed child is trapped under the app header/nav (z-index 30).
import fs from "fs";
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx",
  "lib/DbAreaBrowser.jsx", "lib/GpsSubmissionModal.jsx", "lib/DbGuides.jsx",
  "lib/DbGuideApply.jsx", "lib/DbGuideDashboard.jsx", "lib/AuthModal.jsx"];
for (const f of FILES) {
  let src;
  try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
  const lines = src.split("\n");
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/position:\s*"fixed"/g)) {
      const pre = l.slice(Math.max(0, m.index - 600), m.index);
      const portal = /createPortal\(\s*<[^;]{0,500}$/.test(pre);
      const zm = l.slice(m.index, m.index + 500).match(/zIndex:\s*(\d+|Z_TOAST)/);
      const label = (l.slice(Math.max(0, m.index - 300), m.index + 300).match(/aria-label="([^"]+)"/) || [, ""])[1];
      console.log((portal ? "portal " : "INLINE ") + (f + ":" + (i + 1)).padEnd(34) +
        " z=" + String(zm ? zm[1] : "?").padEnd(7) + " " + label);
    }
  });
}
