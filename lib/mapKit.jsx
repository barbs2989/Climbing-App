// Shared Leaflet plumbing used by every map in the app (GPXMap/OverviewMap/
// WaypointMapPicker in ClimbMatch.jsx, NearMePanel in lib/DbAreaBrowser.jsx).
// Zero imports from ClimbMatch.jsx — same "leaf module" pattern as lib/db.js —
// so both files can import this without a circular dependency (ClimbMatch.jsx
// lazy-loads lib/DbAreaBrowser.jsx).

export const MAP_TILE_URLS = {
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  sat: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

// Injects the Leaflet CDN css/js once (dedupes what used to be 4 copy-pasted
// bootstraps) and calls onReady once window.L is available, or onError if the
// script fails to load.
// Leaflet comes from a CDN, so whatever that host returns EXECUTES in this app's origin with
// the signed-in session available. Until now nothing pinned what it may return: the loader
// handled the script *failing* with some care (see the captive-portal branch below) and not at
// all the possibility of it being *substituted*.
//
// `integrity` fixes that -- the browser hashes the response and refuses to apply it on a
// mismatch. `crossorigin` is not optional beside it: without it a cross-origin subresource is
// opaque, cannot be hashed, and is rejected outright. cdnjs answers
// `access-control-allow-origin: *`, checked rather than assumed.
//
// THE URL AND ITS HASH LIVE IN ONE OBJECT ON PURPOSE. They are a pair, and a version bump that
// updates only the URL takes down every map in the app -- which is the one way this change can
// make things worse than leaving it unpinned. Get a new hash from the publisher, never by
// hashing whatever you happened to download:
//   curl -s 'https://api.cdnjs.com/libraries/leaflet/<version>?fields=sri'
// These are cdnjs's own published sha512 values, confirmed byte-identical to what the CDN
// actually served on 2026-08-19.
const LEAFLET = {
  version: "1.9.4",
  css: {
    url: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
    sri: "sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==",
  },
  js: {
    url: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
    sri: "sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==",
  },
};

export function loadLeaflet(onReady, onError) {
  if (window.L) { onReady(); return; }
  if (!document.getElementById("leaflet-css")) {
    const lk = document.createElement("link");
    lk.id = "leaflet-css"; lk.rel = "stylesheet";
    // Both attributes must be set BEFORE the element is appended -- appending starts the
    // fetch, and an integrity set afterwards is simply ignored. Same below for the script.
    lk.crossOrigin = "anonymous";
    lk.integrity = LEAFLET.css.sri;
    lk.href = LEAFLET.css.url;
    document.head.appendChild(lk);
  }
  let sc = document.getElementById("leaflet-js");
  if (!sc) {
    sc = document.createElement("script");
    sc.id = "leaflet-js";
    sc.crossOrigin = "anonymous";
    sc.integrity = LEAFLET.js.sri;
    sc.src = LEAFLET.js.url;
    // Record the outcome ON the element. A later consumer cannot learn it any other
    // way: `load` and `error` are one-shot events, so a listener attached after the
    // script has already settled never fires. Both terminal states below were
    // unreachable-by-callback before this, and each one strands a map.
    sc.dataset.state = "loading";
    sc.onload = () => { sc.dataset.state = window.L ? "loaded" : "error"; if (window.L) onReady(); else if (onError) onError(); };
    // A REFUSED INTEGRITY HASH LANDS HERE, not anywhere new: the browser treats it as a load
    // failure, so a wrong or stale hash degrades to the caller's "map unavailable" state
    // rather than breaking the page. Verified by injecting a bad hash, not assumed.
    sc.onerror = () => { sc.dataset.state = "error"; if (onError) onError(); };
    document.body.appendChild(sc);
  } else if (sc.dataset.state === "error") {
    // Already failed once. Report it NOW rather than attaching a listener to an event
    // that has been and gone — that path left the caller waiting on its own timeout
    // (9s in NearMePanel) before it could even say the map was unavailable, and left
    // any caller without a timeout stuck on "Loading map…" forever.
    if (onError) onError();
  } else if (sc.dataset.state === "loaded") {
    // Settled successfully, but `window.L` was falsy at the top of this call — the CDN
    // answered 200 with something that is not Leaflet (a captive portal or an error
    // page both do this). Neither event will fire again, so treat it as a failure
    // instead of hanging.
    if (onError) onError();
  } else {
    sc.addEventListener("load", () => { if (window.L) onReady(); else if (onError) onError(); });
    if (onError) sc.addEventListener("error", onError);
  }
}

// Swaps the base tile layer in place on an already-created map, instead of
// tearing the whole map down — preserves pan/zoom/markers/geolocation state,
// which matters most for WaypointMapPicker (don't lose a precise pick) and
// NearMePanel (don't refire a network refetch on every toggle tap).
export function applyBaseLayer(map, tileRef, baseLayer) {
  if (!map || !window.L) return;
  const L = window.L;
  if (tileRef.current) { try { map.removeLayer(tileRef.current); } catch (e) {} }
  tileRef.current = L.tileLayer(MAP_TILE_URLS[baseLayer], { maxZoom: baseLayer === "topo" ? 17 : 19 }).addTo(map);
}

// The satellite/topo/street button row — lifted verbatim from GPXMap, the one
// map that already had this toggle.
export function BaseLayerToggle({ baseLayer, setBaseLayer, C }) {
  return (
    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, display: "flex", gap: 4 }}>
      {[["sat", "Satellite"], ["topo", "Topo"], ["street", "Street"]].map(([k, lbl]) => (
        <button key={k} onClick={() => setBaseLayer(k)} aria-current={baseLayer === k ? "true" : undefined} style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + (baseLayer === k ? C.blue : C.border), background: baseLayer === k ? C.blueBg : C.surface, color: baseLayer === k ? C.blue : C.textSub, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{lbl}</button>
      ))}
    </div>
  );
}

// A small "List | Map" segmented control for screens that toggle between a
// list view and a map view of the same data.
export function ViewToggle({ mode, onList, onMap, C }) {
  const seg = (k, lbl, onClick) => (
    <button onClick={onClick} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: mode === k ? C.blue : "transparent", color: mode === k ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{lbl}</button>
  );
  return (
    <div style={{ display: "flex", gap: 3, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: 3, marginBottom: 12 }}>
      {seg("list", "☰ List", onList)}
      {seg("map", "⤢ Map", onMap)}
    </div>
  );
}

// Cluster/single-pin SVG builder — curved name text following the inside of
// the circle's top arc (can't overlap a neighboring marker's label the way
// free-floating text can), a center count badge, and an optional pre-rendered
// discipline-icon markup string (a full <svg>...</svg> from
// ReactDOMServer.renderToStaticMarkup) shown centered (single pins, replacing
// the count) or as a small corner badge (cluster pins, alongside the count).
export function pinHtml(nm, n, d, color, brd, iconMarkup) {
  const r = d / 2, rt = r - Math.max(5, d * 0.11), id = "cp" + Math.random().toString(36).slice(2, 10);
  const safe = (nm || "").replace(/[<>&]/g, "");
  const fs = Math.max(7, Math.min(11, Math.round(d * 0.17)));
  const maxChars = Math.max(3, Math.floor((Math.PI * rt) / (fs * 0.56)));
  const splitAt = (s, max) => {
    if (s.length <= max) return [s, ""];
    let cut = s.lastIndexOf(" ", max);
    if (cut < Math.floor(max * 0.4)) cut = max;
    return [s.slice(0, cut).trim(), s.slice(cut).trim()];
  };
  let top = safe, bottom = "";
  if (safe.length > maxChars) {
    const parts = splitAt(safe, maxChars);
    top = parts[0]; bottom = parts[1];
    if (bottom.length > maxChars) bottom = bottom.slice(0, Math.max(1, maxChars - 1)) + "…";
  }
  const numFs = Math.round(d * 0.32);
  const sw = brd === "#ffffff" ? 2.5 : 3; // non-white border (e.g. "on your list" amber) draws a touch thicker
  const cr = r - sw / 2 - 0.5;

  const showIconCenter = iconMarkup && (n == null || n <= 1);
  const showIconBadge = iconMarkup && n != null && n > 1;
  const centerMarkup = showIconCenter
    ? "<g transform='translate(" + (r - 8) + "," + (r - 8) + ")'>" + iconMarkup + "</g>"
    : (n != null ? "<text x='" + r + "' y='" + (r + d * 0.16) + "' text-anchor='middle' dominant-baseline='central' font-weight='800' font-size='" + numFs + "' fill='#fff'>" + n + "</text>" : "");
  const badgeMarkup = showIconBadge
    ? "<circle cx='" + (d * 0.17) + "' cy='" + (d * 0.17) + "' r='" + (d * 0.15) + "' fill='#ffffff' stroke='" + color + "' stroke-width='1.5'/><g transform='translate(" + (d * 0.17 - 6) + "," + (d * 0.17 - 6) + ")'>" + iconMarkup + "</g>"
    : "";

  return "<svg width='" + d + "' height='" + d + "' viewBox='0 0 " + d + " " + d + "' style='overflow:visible;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45))' xmlns:xlink='http://www.w3.org/1999/xlink'>" +
    "<defs><path id='" + id + "' d='M " + (r - rt) + " " + r + " A " + rt + " " + rt + " 0 1 1 " + (r + rt) + " " + r + "'/>" +
    (bottom ? "<path id='" + id + "b' d='M " + (r + rt) + " " + r + " A " + rt + " " + rt + " 0 1 1 " + (r - rt) + " " + r + "'/>" : "") +
    "</defs>" +
    "<circle cx='" + r + "' cy='" + r + "' r='" + cr + "' fill='" + color + "' stroke='" + brd + "' stroke-width='" + sw + "'/>" +
    centerMarkup +
    "<text font-size='" + fs + "' font-weight='700' fill='#fff' stroke='rgba(0,0,0,0.85)' stroke-width='2.5' paint-order='stroke fill' style='stroke-linejoin:round'><textPath href='#" + id + "' xlink:href='#" + id + "' startOffset='50%' text-anchor='middle'>" + top + "</textPath></text>" +
    (bottom ? "<text font-size='" + fs + "' font-weight='700' fill='#fff' stroke='rgba(0,0,0,0.85)' stroke-width='2.5' paint-order='stroke fill' style='stroke-linejoin:round'><textPath href='#" + id + "b' xlink:href='#" + id + "b' startOffset='50%' text-anchor='middle'>" + bottom + "</textPath></text>" : "") +
    badgeMarkup +
    "</svg>";
}
