/**
 * Leaflet is loaded from a CDN at run time (`loadLeaflet` in `lib/mapKit.jsx`) and attached to
 * `window.L`; the repo carries no Leaflet package and no typings for it. This declares the global so
 * strict TypeScript knows it exists. It is `any` ON PURPOSE, declared exactly once and named, so every
 * map component says `LeafletAny` and the lint rule against `any` has one justified site, not many:
 * typing a CDN script we do not pin would be a hand-copy of its API, and every use site treats the
 * map and its layers as opaque.
 */
export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Leaflet is CDN-loaded with no typings; this is the one declared site (see above)
  type LeafletAny = any;
  interface Window {
    L?: LeafletAny;
  }
}
