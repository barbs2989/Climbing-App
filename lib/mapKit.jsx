// Shared Leaflet plumbing used by every map in the app (GPXMap/OverviewMap/
// WaypointMapPicker in ClimbMatch.jsx, NearMePanel in lib/DbAreaBrowser.jsx).
// Zero imports from ClimbMatch.jsx — same "leaf module" pattern as lib/db.js —
// so both files can import this without a circular dependency (ClimbMatch.jsx
// lazy-loads lib/DbAreaBrowser.jsx).
import { useEffect, useState } from "react";

export const MAP_TILE_URLS = {
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  sat: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
};

// "Snow" is the one layer that shows the ground as it is NOW. The satellite layer above is a
// years-old mosaic, usually chosen snow-free, so it can never show fresh snow.
//
// Its picture is a single satellite PASS over the spot: Sentinel-2 (S30) or Landsat (L30),
// harmonised to 30 m a pixel with native tiles to zoom 12 -- sharp enough to see which
// glaciers and faces hold new snow. A pass only happens every 2-3 days at any one place and
// the days between are BLANK tiles, so stepping by calendar day would mostly show nothing.
// The stepper instead walks the passes NASA's granule catalogue (CMR) lists for the map's
// point, each with the cloud cover of its ~110 km scene. If CMR cannot be reached, or the map
// has no point, it falls back to the daily VIIRS composite: every day has one, but at 375 m a
// pixel it only says whether a range is white.
//
// The pass being viewed is in the layer key -- "snow:S30:2026-09-21" -- so every map's
// existing `baseLayer` state carries it without new state. Bare "snow" means "not chosen
// yet": the toggle picks one once the passes load, and until then no tiles are drawn.
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
const SNOW_PRODUCTS = {
  // `max` is as far in as the picture is still a picture. It used to be 19 for every pass, and
  // at 19 a 30 m pixel fills the whole map: one flat brown sheet that read as a broken map.
  S30: { layer: "HLS_S30_Nadir_BRDF_Adjusted_Reflectance", tms: "GoogleMapsCompatible_Level12", ext: "png", native: 12, view: 13, max: 15 },
  L30: { layer: "HLS_L30_Nadir_BRDF_Adjusted_Reflectance", tms: "GoogleMapsCompatible_Level12", ext: "png", native: 12, view: 13, max: 15 },
  // Beyond zoom 10 a 375 m pixel is a grey smear that reads as a broken map.
  VIIRS: { layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", tms: "GoogleMapsCompatible_Level9", ext: "jpg", native: 9, view: 10, max: 11 },
};

// The deepest zoom each ordinary layer has REAL tiles for. Esri imagery has them to 19 over WA
// trailheads and answers 20 with a "no data" placeholder; OpenTopoMap stops at 17.
const LAYER_NATIVE_ZOOM = { sat: 19, street: 19, topo: 17 };
// ...but the map may magnify PAST that, upscaling the deepest tiles, because placing a trailhead
// exactly means enlarging the ground around its pin. A hard stop at 19 (17 on Topo) read as the
// map breaking, and switching to Topo at 19 pulled the view back out to 17.
const DEEPEST_ZOOM = 21;
// The sharpest zoom a layer draws. A map that FITS itself to its points caps the fit here, or a
// route with one pin would open magnified past the imagery.
export function layerSharpZoom(baseLayer) {
  const s = snowPick(baseLayer);
  if (s) return s.p ? SNOW_PRODUCTS[s.p].view : 13;
  return LAYER_NATIVE_ZOOM[baseLayer] || LAYER_NATIVE_ZOOM.sat;
}
const SNOW_LOOKBACK_DAYS = 60;
const SNOW_VIIRS_DAYS = 30;
// The default pass is the newest one whose scene is at most this cloudy; a fully clouded
// newest pass would open the layer on a white sheet.
const SNOW_DEFAULT_MAX_CLOUD = 50;

export function isSnowLayer(baseLayer) { return typeof baseLayer === "string" && baseLayer.indexOf("snow") === 0; }
// { p, date } for a chosen pass, { p: null } for bare "snow", null for any other layer.
function snowPick(baseLayer) {
  if (!isSnowLayer(baseLayer)) return null;
  const m = /^snow:(S30|L30|VIIRS):(\d{4}-\d{2}-\d{2})$/.exec(baseLayer);
  return m ? { p: m[1], date: m[2] } : { p: null, date: null };
}
const snowKey = (x) => "snow:" + x.p + ":" + x.date;
const isoDaysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
// VIIRS is filed by UTC day, and today's is blank until the day is processed, so it starts at 1.
const viirsPasses = () => Array.from({ length: SNOW_VIIRS_DAYS }, (_, i) => ({ p: "VIIRS", date: isoDaysAgo(i + 1), cloud: null }));

// One CMR lookup per ~1 km cell per session: reopening a route must not refetch.
const snowPassCache = new Map();
function fetchSnowPasses(lat, lng) {
  const key = lat.toFixed(2) + "," + lng.toFixed(2);
  if (snowPassCache.has(key)) return snowPassCache.get(key);
  const since = isoDaysAgo(SNOW_LOOKBACK_DAYS);
  const one = (p) => fetch("https://cmr.earthdata.nasa.gov/search/granules.json?short_name=HLS" + p + "&version=2.0&point=" + lng + "," + lat + "&temporal=" + since + "T00:00:00Z,&page_size=100&sort_key=-start_date")
    .then((r) => { if (!r.ok) throw new Error("cmr " + r.status); return r.json(); })
    .then((j) => ((j.feed && j.feed.entry) || []).map((e) => ({ p, date: String(e.time_start).slice(0, 10), cloud: e.cloud_cover != null && e.cloud_cover !== "" ? Math.round(Number(e.cloud_cover)) : null })));
  const pr = Promise.all([one("S30"), one("L30")]).then(([a, b]) => {
    // Two passes can land on one day (two orbits, or Sentinel and Landsat): keep the clearer.
    const byDay = new Map();
    a.concat(b).forEach((x) => { const o = byDay.get(x.date); if (!o || (x.cloud != null && (o.cloud == null || x.cloud < o.cloud))) byDay.set(x.date, x); });
    return [...byDay.values()].sort((x, y) => (x.date < y.date ? 1 : -1));
  });
  // A failed lookup is not cached, so the next open tries again.
  pr.catch(() => snowPassCache.delete(key));
  snowPassCache.set(key, pr);
  return pr;
}
// The passes the stepper walks, newest first; null while loading.
function useSnowPasses(at, active) {
  const lat = at && at.lat != null ? Number(at.lat) : null, lng = at && at.lng != null ? Number(at.lng) : null;
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!active) return undefined;
    if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) { setRes({ list: viirsPasses(), fellBack: true }); return undefined; }
    let live = true;
    setRes(null);
    fetchSnowPasses(lat, lng).then(
      (list) => { if (live) setRes(list.length ? { list, fellBack: false } : { list: viirsPasses(), fellBack: true }); },
      () => { if (live) setRes({ list: viirsPasses(), fellBack: true }); }
    );
    return () => { live = false; };
  }, [active, lat, lng]);
  return active ? res : null;
}

// The one place a base tile layer is built, so a map that swaps layers in place and one that
// builds its layer at init cannot disagree about a layer's URL or zoom limits.
export function baseTileLayer(L, baseLayer) {
  const s = snowPick(baseLayer);
  if (s && !s.p) return L.layerGroup();
  if (s) {
    const P = SNOW_PRODUCTS[s.p];
    return L.tileLayer(GIBS + P.layer + "/default/" + s.date + "/" + P.tms + "/{z}/{y}/{x}." + P.ext, { maxNativeZoom: P.native, maxZoom: P.max });
  }
  const url = MAP_TILE_URLS[baseLayer] ? baseLayer : "sat";
  return L.tileLayer(MAP_TILE_URLS[url], { maxNativeZoom: LAYER_NATIVE_ZOOM[url], maxZoom: DEEPEST_ZOOM });
}
// Choosing a snow picture steps OUT to the zoom its pixels can carry. The climber can still
// zoom back in; nothing is locked.
export function fitZoomToLayer(map, baseLayer) {
  const s = snowPick(baseLayer);
  if (s && s.p && map.getZoom() > SNOW_PRODUCTS[s.p].view) map.setZoom(SNOW_PRODUCTS[s.p].view);
}

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

// PINCHING PAST THE DEEPEST ZOOM BLANKED THE WHOLE MAP. Leaflet's default `bounceAtZoomLimits`
// lets a pinch carry the map's zoom beyond the tile layer's maxZoom (then 19 satellite, 17 topo) and
// rubber-band back on release. While it is over, GridLayer._pruneTiles() opens with
// `if (map.getZoom() > this.options.maxZoom) this._removeAllTiles()` -- and _tileReady schedules
// that prune on a bare setTimeout(250) that the pinch's own _noPrune guard does not cover. So a
// tile finishing its load mid-pinch deleted EVERY tile: the map went to its dark background until
// release, then snapped back and reloaded. Reproduced on the live route map, driving Leaflet's own
// TouchZoom handler: pinch zoom 19.81, tiles 4 -> 0; with this off, zoom clamps at 19, tiles 4 -> 4.
// Set once on the class, before any map exists, so every map in the app gets it.
function tuneLeaflet() {
  const L = window.L;
  if (L && L.Map && !L.Map.prototype.options.__cmTuned) L.Map.mergeOptions({ bounceAtZoomLimits: false, __cmTuned: true });
}

export function loadLeaflet(onReadyRaw, onError) {
  const onReady = () => { tuneLeaflet(); onReadyRaw(); };
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
  tileRef.current = baseTileLayer(L, baseLayer).addTo(map);
  fitZoomToLayer(map, baseLayer);
}

// The satellite/topo/street button row — lifted verbatim from GPXMap, the one
// map that already had this toggle. `snow` opts a map into the Snow layer, and `snowAt`
// ({lat,lng}) is the point whose satellite passes it lists. Its stepper sits top-right under
// the full-screen button (44px from top:10), so a map that puts its own controls there
// (FireMap's zoom) leaves it off.
export function BaseLayerToggle({ baseLayer, setBaseLayer, C, snow, snowAt }) {
  const pick = snow ? snowPick(baseLayer) : null;
  const passes = useSnowPasses(snowAt, !!pick);
  const list = passes ? passes.list : null;
  // Bare "snow" becomes a real pass as soon as the list is in.
  useEffect(() => {
    if (!pick || pick.p || !list || !list.length) return;
    const clear = list.find((x) => x.cloud != null && x.cloud <= SNOW_DEFAULT_MAX_CLOUD);
    setBaseLayer(snowKey(clear || list[0]));
  }, [pick && pick.p, list, setBaseLayer]);
  // Stepping is by DATE, not by index, so a key chosen before a remount still steps correctly.
  const older = pick && pick.p && list ? list.find((x) => x.date < pick.date) : null;
  const newer = pick && pick.p && list ? list.filter((x) => x.date > pick.date).pop() : null;
  const cur = pick && pick.p && list ? list.find((x) => x.date === pick.date && x.p === pick.p) : null;
  const opts = [["sat", "Satellite"], ["topo", "Topo"], ["street", "Street"]].concat(snow ? [["snow", "Snow"]] : []);
  const step = { width: 30, height: 30, borderRadius: 7, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 15, fontWeight: 800, lineHeight: 1, padding: 0, cursor: "pointer" };
  const off = { opacity: 0.35, cursor: "default" };
  const fmt = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <>
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, display: "flex", gap: 4 }}>
        {opts.map(([k, lbl]) => {
          const on = k === "snow" ? pick != null : baseLayer === k;
          return <button key={k} onClick={() => { if (!(k === "snow" && on)) setBaseLayer(k); }} aria-current={on ? "true" : undefined} style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.blue : C.textSub, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{lbl}</button>;
        })}
      </div>
      {pick ? (
        <div style={{ position: "absolute", top: 62, right: 10, zIndex: 1000, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, maxWidth: 150 }}>
          {pick.p ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => { if (older) setBaseLayer(snowKey(older)); }} disabled={!older} aria-label="Show the picture before" style={older ? step : Object.assign({}, step, off)}>‹</button>
                <div aria-live="polite" style={{ textAlign: "center", minWidth: 58 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{fmt(pick.date)}</div>
                  {cur && cur.cloud != null ? <div style={{ fontSize: 10, color: C.textSub }}>{cur.cloud + "% cloud"}</div> : null}
                </div>
                <button onClick={() => { if (newer) setBaseLayer(snowKey(newer)); }} disabled={!newer} aria-label="Show the picture after" style={newer ? step : Object.assign({}, step, off)}>›</button>
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, textAlign: "center", lineHeight: 1.3 }}>{pick.p === "VIIRS" ? "Daily, coarse view. Cloud looks white too." : "Cloud % is for the wider area. Cloud looks white too."}</div>
            </>
          ) : (
            <div aria-live="polite" style={{ fontSize: 11, color: C.textSub, padding: "4px 2px", textAlign: "center" }}>Finding recent pictures…</div>
          )}
        </div>
      ) : null}
    </>
  );
}

// A small "List | Map" segmented control for screens that toggle between a
// list view and a map view of the same data.
export function ViewToggle({ mode, onList, onMap, C }) {
  const seg = (k, lbl, onClick) => (
    <button onClick={onClick} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: mode === k ? C.blueSolid : "transparent", color: mode === k ? "#fff" : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{lbl}</button>
  );
  return (
    <div style={{ display: "flex", gap: 3, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: 3, marginBottom: 12 }}>
      {seg("list", "☰ List", onList)}
      {seg("map", "⤢ Map", onMap)}
    </div>
  );
}

// Cluster/single-pin SVG builder — curved name text following the inside of
// the circle's top arc, and for a long name its bottom arc drawn upright (can't
// overlap a neighboring marker's label the way free-floating text can), a center count badge, and an optional pre-rendered
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
  const rb = rt + fs * 0.7;

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
    // The second line runs left→right along the BOTTOM (sweep 0), so it reads upright rather
    // than upside down. Upright glyphs there grow INWARD from the baseline, so the baseline sits
    // one cap-height further out (rb) to occupy the same ring band as the top line.
    (bottom ? "<path id='" + id + "b' d='M " + (r - rb) + " " + r + " A " + rb + " " + rb + " 0 1 0 " + (r + rb) + " " + r + "'/>" : "") +
    "</defs>" +
    "<circle cx='" + r + "' cy='" + r + "' r='" + cr + "' fill='" + color + "' stroke='" + brd + "' stroke-width='" + sw + "'/>" +
    centerMarkup +
    "<text font-size='" + fs + "' font-weight='700' fill='#fff' stroke='rgba(0,0,0,0.85)' stroke-width='2.5' paint-order='stroke fill' style='stroke-linejoin:round'><textPath href='#" + id + "' xlink:href='#" + id + "' startOffset='50%' text-anchor='middle'>" + top + "</textPath></text>" +
    (bottom ? "<text font-size='" + fs + "' font-weight='700' fill='#fff' stroke='rgba(0,0,0,0.85)' stroke-width='2.5' paint-order='stroke fill' style='stroke-linejoin:round'><textPath href='#" + id + "b' xlink:href='#" + id + "b' startOffset='50%' text-anchor='middle'>" + bottom + "</textPath></text>" : "") +
    badgeMarkup +
    "</svg>";
}
