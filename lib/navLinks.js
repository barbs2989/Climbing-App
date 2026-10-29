// "Open in navigation app" on the route page. Every link lands on THIS route's ground, never an
// app's home page: a bare https://www.gaiagps.com on a phone is Gaia's "get the app" page, which is
// what a climber who already had Gaia installed was sent to.
//
// Formats, and how sure we are of each (researched 2026-10-15):
//   Gaia GPS app   gaiagps://map?lat=..&lng=..&z=..      Gaia's own announced scheme (iOS)
//   Gaia GPS web   https://www.gaiagps.com/map/?lat=..&lon=..&zoom=..   note lon/zoom, not lng/z
//   CalTopo        https://caltopo.com/map.html#ll=lat,lng&z=..  CalTopo staff: opens the app when installed
//   Google Maps    https://www.google.com/maps/search/?api=1&query=lat,lng   Maps URLs: opens the app when installed
//   Apple Maps     https://maps.apple.com/?ll=lat,lng&q=..   opens Maps on Apple devices, the web map elsewhere
// AllTrails and the USGS viewer were dropped: neither documents a link that opens at a place, so
// both could only ever go to a home page.

const num = (v) => (v == null || v === "" ? NaN : Number(v));
const ok = (la, ln) => Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180;

/** The point and zoom the route's own map shows: the box around its track and placed waypoints,
 *  else the peak/crag's coordinate. null when the route has no coordinate at all. */
export function navTarget(route, place) {
  const pts = [];
  for (const p of (route && route.gpxPts) || []) { if (p && ok(num(p[0]), num(p[1]))) pts.push([num(p[0]), num(p[1])]); }
  for (const w of (route && route.waypoints) || []) { if (w && ok(num(w.lat), num(w.lng))) pts.push([num(w.lat), num(w.lng)]); }
  const pl = place && ok(num(place.lat), num(place.lng)) ? { lat: num(place.lat), lng: num(place.lng) } : null;
  if (!pts.length) return pl ? { lat: pl.lat, lng: pl.lng, z: 14, pin: pl } : null;
  let s = 90, n = -90, w = 180, e = -180;
  for (const [la, ln] of pts) { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, ln); e = Math.max(e, ln); }
  const lat = (s + n) / 2, lng = (w + e) / 2;
  // A phone screen is ~1.5 tiles wide; pick the deepest zoom whose screen still holds the whole box.
  const span = Math.max(e - w, (n - s) / Math.max(0.2, Math.cos(lat * Math.PI / 180)), 1e-4);
  const z = Math.max(10, Math.min(15, Math.floor(Math.log2(360 * 1.5 / (span * 1.2)))));
  return { lat, lng, z, pin: pl || { lat, lng } };
}

const r5 = (x) => Math.round(x * 1e5) / 1e5;

/** The rows of the card. `app` is the URL that opens an installed app directly, where it differs
 *  from `href` (the link that works anywhere). */
export function navLinks(t, pinName, ua) {
  if (!t) return [];
  const lat = r5(t.lat), lng = r5(t.lng), z = t.z;
  const plat = r5(t.pin.lat), plng = r5(t.pin.lng);
  const agent = ua != null ? ua : (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");
  const ios = /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(agent);
  const gaiaWeb = `https://www.gaiagps.com/map/?lat=${lat}&lon=${lng}&zoom=${z}`;
  const gaiaScheme = `gaiagps://map?lat=${lat}&lng=${lng}&z=${z}`;
  // Android: an intent URL falls back to the web map by itself when Gaia is not installed.
  const gaiaApp = ios ? gaiaScheme
    : android ? `intent://map?lat=${lat}&lng=${lng}&z=${z}#Intent;scheme=gaiagps;package=com.trailbehind.android.gaiagps.pro;S.browser_fallback_url=${encodeURIComponent(gaiaWeb)};end`
    : null;
  return [
    { n: "Gaia GPS", href: gaiaWeb, app: gaiaApp },
    { n: "CalTopo", href: `https://caltopo.com/map.html#ll=${lat},${lng}&z=${z}` },
    { n: "Google Maps", href: `https://www.google.com/maps/search/?api=1&query=${plat},${plng}` },
    { n: "Apple Maps", href: `https://maps.apple.com/?ll=${plat},${plng}&q=${encodeURIComponent(pinName || "Climb")}&z=${z}` },
  ];
}
