// probe: a chat video's recorded location is zeroed before upload (lib/videoPrivacy.js, 2026-11-26).
// Builds an MP4 in memory the way phones lay one out (ftyp, moov with udta/©xyz and an Apple
// ISO6709 meta item, then mdat holding bytes that LOOK like a coordinate) and checks that the
// metadata coordinates are zeroed, the media bytes are untouched, and the length is unchanged.
import { scrubVideoLocation, topLevelBoxes } from "../../lib/videoPrivacy.js";

const enc = (s) => Array.from(s, (c) => c.charCodeAt(0) & 0xff);
const box = (type, payload) => { const n = 8 + payload.length; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255, ...enc(type), ...payload]; };
const android = "+47.6062-122.3321/";
const apple = "+46.8523-121.7603+4392.000/";
const decoy = "+11.1111-111.1111/"; // inside mdat: picture data, must not be touched
const file = new Uint8Array([
  ...box("ftyp", enc("isom\0\0\0\0isomiso2mp41")),
  ...box("moov", [...box("udta", box("©xyz", [0, android.length, 0x15, 0xc7, ...enc(android)])), ...box("meta", [...enc("com.apple.quicktime.location.ISO6709"), ...enc(apple)])]),
  ...box("mdat", enc("frame-bytes" + decoy + "more-frames")),
]);
const before = Buffer.from(file).toString("latin1");
const len = file.length;
const n = scrubVideoLocation(file);
const after = Buffer.from(file).toString("latin1");
let bad = 0;
const ok = (c, msg) => { console.log((c ? "  ok    " : "  FAIL  ") + msg); if (!c) bad++; };
ok(topLevelBoxes(file).map((b) => b.type).join(",") === "ftyp,moov,mdat", "the box walk sees ftyp, moov, mdat");
ok(n === 2, `both metadata coordinates found (${n})`);
ok(!after.includes(android) && after.includes("+00.0000-000.0000/"), "the Android ©xyz position is zeroed");
ok(!after.includes(apple) && after.includes("+00.0000-000.0000+0000.000/"), "the Apple ISO6709 position is zeroed");
ok(after.includes(decoy), "bytes inside mdat that look like a coordinate are untouched");
ok(file.length === len && before.length === after.length, "the file is exactly as long as before");
ok(before.replace(android, "").replace(apple, "").length === after.replace("+00.0000-000.0000/", "").replace("+00.0000-000.0000+0000.000/", "").length, "nothing else changed length");
console.log(bad ? `${bad} failed` : "ok — a chat video loses its recorded location and nothing else");
process.exit(bad ? 1 : 0);
