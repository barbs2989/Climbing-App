// SAFE LINKS (security audit 2026-11-26). React 18 renders `href="javascript:…"` as written (it only
// warns), and a tap on such a link runs that script AS THIS SITE — with the signed-in climber's
// session token in reach, and on the Review desk with the owner's admin session. Several links are
// built from text another climber wrote straight into the database through the public API: a chat
// photo's `image_url`, a photo contribution's `value.url`, a group's links, a reported item's
// snapshot. The app's own forms only ever write https there, but the API does not ask the form.
//
// So every link whose address is not a literal goes through safeHref(). It keeps the schemes the
// app actually links to (web, mail, phone, text, maps' geo:, a blob: download made on this device,
// and Gaia GPS's app link) and turns anything else — javascript:, data:, vbscript:,
// file:, or a scheme hidden behind tabs, newlines or mixed case, which the URL parser strips the way
// the browser does — into `undefined`, so the element renders as plain text and does nothing.
// check:safe-href holds every dynamic href to it. The CSP in vite.config.js (cspPlugin) is the
// second wall: it refuses inline and javascript: script even where a link slipped through.

// gaiagps: and intent: are the Gaia GPS app links lib/navLinks.js builds (iOS scheme, Android intent).
const OK = /^(https?|mailto|tel|sms|geo|blob|gaiagps|intent):$/i;

/** The address, if it is one this app may link to; otherwise `undefined` (React then omits the attribute). */
export function safeHref(u) {
  if (u == null) return undefined;
  const s = String(u).trim();
  if (!s) return undefined;
  let p;
  try { p = new URL(s, typeof window !== "undefined" && window.location ? window.location.href : "https://example.invalid/"); } catch (e) { return undefined; }
  if (OK.test(p.protocol)) return s;
  // A chat photo IS a data URL (lib/db-messaging.js stores it in image_url), and its Save link must
  // keep working. A raster image cannot run script; SVG can, so it is not on the list, nor is any
  // other data: type (text/html is the classic payload).
  if (p.protocol === "data:" && /^data:image\/(png|jpe?g|gif|webp|heic|heif|avif);base64,/i.test(s)) return s;
  return undefined;
}
