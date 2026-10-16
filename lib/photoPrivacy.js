// A photo leaves the device WITHOUT the location the camera saved inside it.
//
// Every photo a climber uploads lands in the public `topo-photos` bucket, and phones write the
// GPS position into the file itself. Uploading the original therefore published where the photo
// was taken -- a trailhead, a campsite, somebody's home -- to anyone holding its URL, although
// the Privacy Policy says a position is stored only when you check in or attach a GPS track.
//
// JPEG (what phones and browsers send): edited IN PLACE, not re-encoded, so the picture, its
// quality and its orientation are untouched:
//   * the EXIF GPS block is blanked -- every GPS value zeroed, then its entry list emptied, so the
//     coordinates are gone from the bytes and not merely unlisted;
//   * XMP and IPTC segments are dropped: both can carry a position or a place name, and the app
//     reads nothing from either.
// The date taken and the orientation stay. Ranks reads the date (lib/photoEvidence.js) BEFORE the
// upload, from the original.
//
// PNG: its metadata chunks (eXIf, tEXt, iTXt, zTXt, tIME) are dropped IN PLACE, so a topo diagram
// keeps its transparency -- redrawing it as a JPEG would paint every transparent pixel black.
// Anything else (WebP, HEIC...) is redrawn to a fresh JPEG, which carries no metadata. A file the
// browser cannot decode is refused rather than uploaded with its location intact.

const XMP = "http://ns.adobe.com/xap/1.0/";
const XMP_EXT = "http://ns.adobe.com/xmp/extension/";

export async function withoutLocation(file) {
  if (!file) return file;
  const type = (file.type || "").toLowerCase();
  const head = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (isJpeg) {
    const out = scrubJpeg(new Uint8Array(await file.arrayBuffer()));
    if (out) return new File([out], file.name || "photo.jpg", { type: "image/jpeg" });
  } else if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e) {
    const out = scrubPng(new Uint8Array(await file.arrayBuffer()));
    if (out) return new File([out], file.name || "photo.png", { type: "image/png" });
  } else if (type === "image/gif") {
    return file; // GIF has no location field
  }
  return reencode(file);
}

// Returns the scrubbed bytes, or null if the file is not a JPEG this can walk.
export function scrubJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const buf = bytes.slice(); // never edit the caller's copy
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const keep = [[0, 2]]; // SOI
  let off = 2;
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) return null;
    const marker = buf[off + 1];
    if (marker === 0xd9) { keep.push([off, buf.length]); off = buf.length; break; }
    if (marker === 0xda) { keep.push([off, buf.length]); off = buf.length; break; } // image data to the end
    if (marker >= 0xd0 && marker <= 0xd7) { keep.push([off, off + 2]); off += 2; continue; }
    const len = v.getUint16(off + 2);
    const end = off + 2 + len;
    if (len < 2 || end > buf.length) return null;
    const body = off + 4;
    let drop = false;
    if (marker === 0xe1) {
      if (startsWith(buf, body, "Exif\0\0")) blankGps(v, body + 6, end);
      else if (startsWith(buf, body, XMP) || startsWith(buf, body, XMP_EXT)) drop = true;
    } else if (marker === 0xed) {
      drop = true; // APP13: Photoshop / IPTC, which carries city and sub-location
    }
    if (!drop) keep.push([off, end]);
    off = end;
  }
  if (off < buf.length) return null;
  const total = keep.reduce((n, [a, b]) => n + (b - a), 0);
  const out = new Uint8Array(total);
  let w = 0;
  for (const [a, b] of keep) { out.set(buf.subarray(a, b), w); w += b - a; }
  return out;
}

const PNG_META = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
// Returns the PNG without its metadata chunks, or null if it is not a PNG this can walk. Each chunk
// carries its own CRC, so dropping whole chunks leaves every other one valid.
export function scrubPng(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || sig.some((b, i) => bytes[i] !== b)) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const keep = [[0, 8]];
  let off = 8, sawEnd = false;
  while (off + 12 <= bytes.length) {
    const len = v.getUint32(off);
    const end = off + 12 + len;
    if (end > bytes.length) return null;
    const kind = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
    if (!PNG_META.has(kind)) keep.push([off, end]);
    off = end;
    if (kind === "IEND") { sawEnd = true; break; }
  }
  if (!sawEnd) return null;
  const out = new Uint8Array(keep.reduce((n, [a, b]) => n + (b - a), 0));
  let w = 0;
  for (const [a, b] of keep) { out.set(bytes.subarray(a, b), w); w += b - a; }
  return out;
}

function startsWith(buf, at, s) {
  if (at + s.length > buf.length) return false;
  for (let i = 0; i < s.length; i++) if (buf[at + i] !== s.charCodeAt(i)) return false;
  return true;
}

// Zero every GPS value and empty the GPS IFD. `t` is the TIFF header, `end` the segment's end.
function blankGps(v, t, end) {
  if (t + 8 > end) return;
  const le = v.getUint16(t) === 0x4949;
  const u16 = (o) => v.getUint16(o, le), u32 = (o) => v.getUint32(o, le);
  const ifd0 = t + u32(t + 4);
  if (ifd0 + 2 > end) return;
  const n0 = u16(ifd0);
  let gps = -1;
  for (let i = 0; i < n0; i++) {
    const e = ifd0 + 2 + i * 12;
    if (e + 12 > end) return;
    if (u16(e) === 0x8825) gps = t + u32(e + 8);
  }
  if (gps < 0 || gps + 2 > end) return;
  const size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
  const n = u16(gps);
  for (let i = 0; i < n; i++) {
    const e = gps + 2 + i * 12;
    if (e + 12 > end) break;
    const bytes = (size[u16(e + 2)] || 1) * u32(e + 4);
    if (bytes > 4) {
      const at = t + u32(e + 8);
      for (let k = 0; k < bytes && at + k < end; k++) v.setUint8(at + k, 0);
    }
    for (let k = 0; k < 12; k++) v.setUint8(e + k, 0);
  }
  v.setUint16(gps, 0, le);
}

async function reencode(file) {
  let bmp = null;
  try {
    bmp = await window.createImageBitmap(file);
  } catch (e) {
    throw new Error("This photo’s format can’t be prepared for upload. Try a JPEG.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width; canvas.height = bmp.height;
  canvas.getContext("2d").drawImage(bmp, 0, 0);
  if (bmp.close) bmp.close();
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
  if (!blob) throw new Error("This photo couldn’t be prepared for upload. Try a JPEG.");
  const name = (file.name || "photo").replace(/\.[^.]*$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
