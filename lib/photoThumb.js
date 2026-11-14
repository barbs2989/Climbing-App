// A stored photo drawn SMALL is fetched small.
//
// Every photo in the `topo-photos` bucket was drawn from its public URL -- the whole file, even in
// a 36px avatar or a 128px strip thumbnail. Supabase's image renderer serves a resized copy of the
// same object from /render/image/ (measured on this project 2026-10-15: a 4.5 MB photo came back
// as a 59 KB JPEG at width=400), so a thumbnail asks for that instead.
//
//   * Only a topo-photos PUBLIC URL is rewritten. Seed photos, blob:/data: previews and the
//     FALLBACK_* placeholders pass through untouched.
//   * Width is twice the CSS size (phone screens are 2-3x), rounded UP to one of WIDTHS so the
//     same photo at 30px and 36px is one cached file, not two.
//   * Lightboxes, the topo modal and the topo line editor keep the original: they are the places
//     a climber zooms in, and a topo's lines are drawn against the full image.
//   * If the renderer ever refuses (a plan change, a quota), fromThumb() lets an onError handler
//     fall back to the ORIGINAL before any placeholder -- onImgErr in ClimbMatchCore does this.
const OBJECT = "/storage/v1/object/public/topo-photos/";
const RENDER = "/storage/v1/render/image/public/topo-photos/";
const WIDTHS = [96, 192, 384, 768, 1080];

export function photoThumb(url, cssPx) {
  if (typeof url !== "string" || url.indexOf(OBJECT) < 0) return url;
  const want = Math.max(1, Math.round((cssPx || 128) * 2));
  const w = WIDTHS.find((x) => x >= want) || WIDTHS[WIDTHS.length - 1];
  const base = url.split("?")[0].replace(OBJECT, RENDER);
  // A BOX, not a width: width alone keeps the original HEIGHT (measured: width=96 on a 3024x4032
  // photo returned 96x4032, 75 KB). width+height with resize=contain scales to fit, aspect kept.
  return base + "?width=" + w + "&height=" + w + "&resize=contain&quality=75";
}

// The original URL behind a thumbnail URL, or null if `url` is not one.
export function fromThumb(url) {
  if (typeof url !== "string" || url.indexOf(RENDER) < 0) return null;
  return url.split("?")[0].replace(RENDER, OBJECT);
}

// Ask the renderer for the sizes the Profile draws (the 36-60px avatars, the 150px strip) right
// after an upload, so the first look is a cached copy rather than a resize. Fire-and-forget: a
// failure here costs nothing but the head start.
export function warmThumbs(url) {
  if (typeof url !== "string" || url.indexOf(OBJECT) < 0 || typeof Image === "undefined") return;
  [36, 60, 150].forEach(function (px) { const im = new Image(); im.decoding = "async"; im.src = photoThumb(url, px); });
}

// onError for an <img> that had none: a refused thumbnail retries as the original, once.
export function thumbFallback(e) {
  const orig = fromThumb(e.currentTarget.src);
  if (orig) e.currentTarget.src = orig;
}
