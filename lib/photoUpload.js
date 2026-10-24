// What every photo goes through before it reaches the `topo-photos` bucket: its location removed,
// then its size brought down to what a phone screen can show.
//
// Uploads used to be the camera's original -- a 12 MP phone photo is 4-8 MB, and the bucket's only
// limit was 0150's 15 MiB cap -- and every screen drew that original, since getPublicUrl serves the
// stored file as-is. A route gallery or a list of avatars pulled tens of MB, at trailheads with
// one bar of signal and into the offline pins.
//
// So a photo is redrawn at MAX_EDGE on its long side (no screen in a 520px column needs more, even
// zoomed at 3x density) and encoded as JPEG at JPEG_QUALITY: ~300-600 KB for a phone photo.
//   * A PNG with ANY transparent pixel stays a PNG: a topo diagram drawn over a transparent
//     background turns black as a JPEG. An opaque PNG (a screenshot, a photo saved as PNG) is a
//     JPEG like any other.
//   * GIF is left alone: redrawing it would keep only the first frame of an animation.
//   * A photo already within MAX_EDGE and under SMALL_ENOUGH bytes is kept as it is, and so is any
//     photo the redraw would make LARGER -- re-encoding an already-compressed file only loses detail.
//   * A file the browser cannot decode here is uploaded as withoutLocation left it (already safe)
//     rather than refused: the size is a cost, the location was the harm.
//
// Decoded through an <img>, not createImageBitmap: every current browser draws an <img> upright
// from its EXIF orientation, while createImageBitmap's orientation handling has differed between
// engines. The canvas output carries no EXIF at all, so nothing can rotate it a second time.
import { withoutLocation } from "./photoPrivacy";

const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;
const SMALL_ENOUGH = 1024 * 1024;

// The storage options every `topo-photos` upload passes. Supabase stamps an object with
// `max-age=3600` unless told otherwise, and its resized copies (/render/image/) inherit the stamp
// -- so an hour after a climber last looked, every avatar and strip photo was resized again on the
// server before it drew (measured 2026-10-21: 0.6-1.1 s per thumbnail cold, 50-65 ms cached). Every
// path is `{uid}/{uuid}-{name}` and is never overwritten, so a URL's bytes never change and a year
// is safe; a replaced photo is a new URL.
export const PHOTO_CACHE_SECONDS = "31536000";
export function photoUploadOptions(file) {
  return { contentType: (file && file.type) || undefined, cacheControl: PHOTO_CACHE_SECONDS };
}

export async function preparePhotoForUpload(file) {
  file = await withoutLocation(file);
  if (!file || (file.type || "").toLowerCase() === "image/gif") return file;
  try {
    return (await shrink(file)) || file;
  } catch (e) {
    return file;
  }
}

async function shrink(file) {
  const img = await decode(file);
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  if (scale === 1 && file.size <= SMALL_ENOUGH) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const keepPng = file.type === "image/png" && hasTransparency(ctx, canvas.width, canvas.height);
  const type = keepPng ? "image/png" : "image/jpeg";
  const blob = await new Promise((res) => canvas.toBlob(res, type, keepPng ? undefined : JPEG_QUALITY));
  if (!blob || blob.size >= file.size) return null;
  const base = (file.name || "photo").replace(/\.[^.]*$/, "");
  return new File([blob], base + (keepPng ? ".png" : ".jpg"), { type });
}

function decode(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("undecodable")); };
    img.src = url;
  });
}

function hasTransparency(ctx, w, h) {
  const px = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}
