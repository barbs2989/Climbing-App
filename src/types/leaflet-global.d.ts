/**
 * Leaflet is loaded from a CDN at run time (`loadLeaflet` in `lib/mapKit.js`) and attached to
 * `window.L`; the repo carries no Leaflet package and no typings for it. This declares the global so
 * strict TypeScript knows it exists. It is `any` on purpose: typing a CDN script we do not pin would be
 * a hand-copy of its API, and every use site treats the map and its layers as opaque.
 */
export {};

declare global {
  interface Window {
    L?: any;
  }
}
