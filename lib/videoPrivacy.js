// A chat VIDEO leaves the device without the place it was recorded (security audit 2026-11-26).
//
// Phones write the recording position into an MP4 / MOV file's metadata: iPhones as the
// `com.apple.quicktime.location.ISO6709` item, Android as the `©xyz` atom, both an ISO 6709 string
// such as "+47.6062-122.3321+050.000/". Photos already lose theirs (lib/photoPrivacy.js); a video
// sent in a chat carried it to whoever received the file, although the Privacy Policy says a
// position is stored only when you check in or attach a GPS track.
//
// Done IN PLACE, not re-encoded (a browser cannot re-encode video cheaply): the metadata boxes
// (`moov`, and a top-level `meta` or `udta`) are found by walking the file's top-level boxes, and
// every ISO 6709 coordinate inside them has its digits overwritten with 0. Same length, same
// structure, so the video plays exactly as before; the picture and sound (`mdat`) are never read
// for this or touched. WebM has no standard location field and is sent as it is.

const META_BOXES = new Set(["moov", "meta", "udta"]);
// ISO 6709 as phones write it: ±DD.DDDD±DDD.DDDD, an optional ±altitude, an optional CRS, then "/".
const ISO6709 = /[+-]\d{2}(?:\.\d+)?[+-]\d{3}(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?(?:CRS[A-Za-z0-9_:]*)?\//g;

/** The top-level boxes of an ISO-BMFF file: [{type, start, end}]. Stops at the first malformed one. */
export function topLevelBoxes(bytes) {
  const out = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 0;
  while (at + 8 <= bytes.length) {
    let size = dv.getUint32(at);
    const type = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]);
    if (size === 1) {
      if (at + 16 > bytes.length) break;
      const big = dv.getUint32(at + 8) * 4294967296 + dv.getUint32(at + 12);
      size = big;
    } else if (size === 0) size = bytes.length - at;
    if (size < 8 || at + size > bytes.length) break;
    out.push({ type, start: at, end: at + size });
    at += size;
  }
  return out;
}

/** Zero every ISO 6709 coordinate inside the metadata boxes, in place. Returns how many were found. */
export function scrubVideoLocation(bytes) {
  let n = 0;
  for (const b of topLevelBoxes(bytes)) {
    if (!META_BOXES.has(b.type)) continue;
    let s = "";
    for (let i = b.start; i < b.end; i++) s += String.fromCharCode(bytes[i]);
    ISO6709.lastIndex = 0;
    for (let m; (m = ISO6709.exec(s));) {
      n++;
      for (let k = 0; k < m[0].length; k++) {
        const c = m[0].charCodeAt(k);
        if (c >= 48 && c <= 57) bytes[b.start + m.index + k] = 48;
      }
    }
  }
  return n;
}

export async function videoWithoutLocation(file) {
  if (!file || !/^video\/(mp4|quicktime)$/.test(file.type)) return file;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!scrubVideoLocation(bytes)) return file;
  return new File([bytes], file.name || "video", { type: file.type, lastModified: file.lastModified });
}
