// Start reading a climb's full row the moment a finger touches its list row (or the pointer rests on
// it), instead of on the click (owner, 2026-11-14: "anything else we can speed up?").
//
// A list row is THIN (lib/db.js useAreaRoutes): opening it makes the app read the full row with
// fetchRouteRow() and show "Loading climb…" until it lands. fetchRouteRow caches under the query
// client (["route-row", id]) and shares an in-flight read, so a read started here is the same read
// the open then waits on — the tap finds it finished or already under way.
//
// Rows opt in with data-route-id (RouteRow, ClassicsList — only for _thin rows, the ones an open
// would have to wait for). One listener on the document covers every list; nothing per row.
import { fetchRouteRow } from "./db.js";

const HOVER_MS = 90; // a pointer passing over a list on its way elsewhere starts no reads
let installed = false;

function routeIdAt(target) {
  const el = target && target.closest ? target.closest("[data-route-id]") : null;
  return el ? el.getAttribute("data-route-id") : null;
}
function warm(id) {
  if (!id) return;
  try { fetchRouteRow(id).catch(() => {}); } catch (e) { /* no backend: the open will say so */ }
}

export function installRoutePrefetch() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  let timer = null, hovered = null;
  // Touch and mouse press: read now — the click follows ~100 ms later.
  document.addEventListener("pointerdown", (e) => warm(routeIdAt(e.target)), { passive: true, capture: true });
  // Desktop hover: read once the pointer has rested on the row.
  document.addEventListener("mouseover", (e) => {
    const id = routeIdAt(e.target);
    if (id === hovered) return;
    hovered = id;
    clearTimeout(timer);
    if (id) timer = setTimeout(() => warm(id), HOVER_MS);
  }, { passive: true });
  // Keyboard: a row reached by Tab is about to be opened with Enter.
  document.addEventListener("focusin", (e) => warm(routeIdAt(e.target)), { passive: true });
}
