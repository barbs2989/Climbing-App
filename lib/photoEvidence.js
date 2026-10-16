// What a photo's own embedded data says about when and where it was taken -- read in the browser
// when the photo is attached to a logged climb, so Ranks can tell a photo of THIS climb from a
// borrowed one (0203). Only two facts leave this file: the date, and whether the photo's location
// was near the climb. The coordinates themselves are never sent anywhere by this code.
//
// JPEG EXIF only (DateTimeOriginal, falling back to DateTime; GPSLatitude/GPSLongitude). A photo
// with no EXIF -- a screenshot, most images saved from the web or a messaging app, many HEIC files
// -- simply has no facts, and so is not evidence. That is the point: it is what a borrowed photo
// usually looks like.

const HEAD_BYTES = 256 * 1024; // EXIF sits in APP1, at the very start of the file

export async function readPhotoFacts(blob) {
  try {
    const buf = await blob.slice(0, HEAD_BYTES).arrayBuffer();
    return parseJpegExif(new DataView(buf));
  } catch (e) {
    return null;
  }
}

function parseJpegExif(v) {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    const marker = v.getUint16(off);
    if ((marker & 0xff00) !== 0xff00) return null;
    const len = v.getUint16(off + 2);
    if (marker === 0xffe1 && off + 10 <= v.byteLength && v.getUint32(off + 4) === 0x45786966) { // "Exif"
      return parseTiff(v, off + 10, Math.min(v.byteLength, off + 2 + len));
    }
    if (marker === 0xffda) return null; // image data began: no EXIF
    off += 2 + len;
  }
  return null;
}

function parseTiff(v, t, end) {
  if (t + 8 > end) return null;
  const le = v.getUint16(t) === 0x4949;
  const u16 = (o) => v.getUint16(o, le), u32 = (o) => v.getUint32(o, le);
  const ifd = (at) => {
    const out = {};
    if (at < t || at + 2 > end) return out;
    const n = u16(at);
    for (let i = 0; i < n; i++) {
      const e = at + 2 + i * 12;
      if (e + 12 > end) break;
      out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), at: e + 8 };
    }
    return out;
  };
  const valueAt = (ent) => {
    const size = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[ent.type] || 1;
    return ent.count * size > 4 ? t + u32(ent.at) : ent.at;
  };
  const ascii = (ent) => {
    if (!ent || ent.type !== 2) return null;
    const at = valueAt(ent);
    let s = "";
    for (let i = 0; i < ent.count && at + i < end; i++) { const c = v.getUint8(at + i); if (!c) break; s += String.fromCharCode(c); }
    return s;
  };
  const rationals = (ent) => {
    if (!ent || ent.type !== 5) return null;
    const at = valueAt(ent), r = [];
    for (let i = 0; i < ent.count; i++) {
      const o = at + i * 8;
      if (o + 8 > end) return null;
      const d = u32(o + 4);
      r.push(d ? u32(o) / d : 0);
    }
    return r;
  };
  const ifd0 = ifd(t + u32(t + 4));
  const exif = ifd0[0x8769] ? ifd(t + u32(ifd0[0x8769].at)) : {};
  const gps = ifd0[0x8825] ? ifd(t + u32(ifd0[0x8825].at)) : {};

  // "YYYY:MM:DD HH:MM:SS" in the camera's local time. The DATE is all we keep, and the local date
  // is the one the climber means when they pick "date climbed".
  const stamp = ascii(exif[0x9003]) || ascii(ifd0[0x0132]);
  const m = stamp && /^(\d{4}):(\d{2}):(\d{2})/.exec(stamp);
  const takenOn = m && m[1] !== "0000" ? `${m[1]}-${m[2]}-${m[3]}` : null;

  let lat = null, lng = null;
  const la = rationals(gps[0x0002]), lo = rationals(gps[0x0004]);
  if (la && lo && la.length >= 3 && lo.length >= 3) {
    lat = (la[0] + la[1] / 60 + la[2] / 3600) * (ascii(gps[0x0001]) === "S" ? -1 : 1);
    lng = (lo[0] + lo[1] / 60 + lo[2] / 3600) * (ascii(gps[0x0003]) === "W" ? -1 : 1);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { lat = null; lng = null; }
  }
  return takenOn || lat != null ? { takenOn, lat, lng } : null;
}

// A 64-bit difference hash of the picture (16 hex): shrink to 9x8 greyscale, and set one bit per
// pixel that is brighter than its right-hand neighbour. It survives resizing, recompression and a
// stripped or edited EXIF, so the SAME picture attached to a second log -- by anyone -- is caught
// (0208 gives it credit only on its first use). It cannot be turned back into the picture.
// Browser-only; null where the image cannot be decoded.
export async function photoFingerprint(blob) {
  try {
    // AREA-AVERAGED, not one draw straight to 9x8. A single drawImage down to 9x8 samples a few
    // source pixels per cell, so texture (rock, snow) decides the bits: measured in headless
    // Chrome, a re-save of one photo moved 14 of 64 bits -- past 0208's bar of 8 -- while two
    // different scenes sat 12 apart. So: halve with smoothing to about 144x128, then average each
    // 16x16 block, which is what every pixel of the photo gets a say in.
    const bmp = await window.createImageBitmap(blob);
    let src = bmp, w = bmp.width, h = bmp.height;
    const draw = (sw, sh) => {
      const c = document.createElement("canvas");
      c.width = sw; c.height = sh;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      g.drawImage(src, 0, 0, sw, sh);
      return c;
    };
    while (w / 2 >= 144 && h / 2 >= 128) { w = Math.floor(w / 2); h = Math.floor(h / 2); src = draw(w, h); }
    const d = draw(144, 128).getContext("2d", { willReadFrequently: true }).getImageData(0, 0, 144, 128).data;
    if (bmp.close) bmp.close();
    const cell = [];
    for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 9; cx++) {
      let sum = 0;
      for (let y = cy * 16; y < cy * 16 + 16; y++) for (let x = cx * 16; x < cx * 16 + 16; x++) {
        const i = (y * 144 + x) * 4;
        sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      }
      cell.push(sum);
    }
    // A DEAD BAND of 2 grey levels (x the 256 pixels a cell sums): across flat sky two neighbours
    // are all but equal, and compression noise alone flipped those bits -- still 12 of 64 after the
    // averaging above. Near-equal now always reads 0. Measured in headless Chrome over re-saves,
    // resizes and a PNG copy: 0 bits of drift, different scenes 11+ apart. A band of 8 let two
    // different scenes within 7, inside the bar -- so 2, not wider.
    const lum = (x, y) => cell[y * 9 + x];
    const BAND = 2 * 256;
    let hex = "";
    for (let y = 0; y < 8; y++) {
      let byte = 0;
      for (let x = 0; x < 8; x++) byte = (byte << 1) | (lum(x, y) > lum(x + 1, y) + BAND ? 1 : 0);
      hex += byte.toString(16).padStart(2, "0");
    }
    return hex;
  } catch (e) {
    return null;
  }
}

const km = (aLat, aLng, bLat, bLng) => {
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
};
const dayGap = (a, b) => Math.abs((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);

// The two columns 0203 stores, from every attached photo's facts. The photo whose date is CLOSEST
// to the climb speaks for the log; its location, if it has one, decides "near". `near` is null when
// either side has no coordinate -- unknown, which the server does not hold against the climb.
export function photoEvidence(factsList, dateClimbed, routeLat, routeLng) {
  const dated = (factsList || []).filter((f) => f && f.takenOn && dateClimbed);
  if (!dated.length) return { photoTakenOn: null, photoNearRoute: null, photoHash: null };
  dated.sort((a, b) => dayGap(a.takenOn, dateClimbed) - dayGap(b.takenOn, dateClimbed));
  const best = dated[0];
  const near = best.lat != null && routeLat != null && routeLng != null && isFinite(routeLat) && isFinite(routeLng)
    ? km(best.lat, best.lng, Number(routeLat), Number(routeLng)) <= 15 : null;
  return { photoTakenOn: best.takenOn, photoNearRoute: near, photoHash: best.hash || null };
}
