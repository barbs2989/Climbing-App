// Runs lib/photoEvidence.js's REAL photoFingerprint -- its source, imported as a module -- in headless
// Chrome over real JPEG and PNG files, and checks what 0208 relies on: a copy of a photo (re-save,
// resize, PNG) lands within the 8-bit bar, and a different scene does not.
//
// Why it exists: the first version of the fingerprint drew the photo straight down to 9x8, and
// Pillow (which averages areas) said copies drifted <= 8 bits. Chrome samples, and here copies
// drifted 14 -- past the bar -- so borrowed photos would have passed. Area averaging took it to 12;
// a 2-grey-level dead band for flat sky took it to 0, different scenes 11+ apart. Measured
// 2026-09-25. The hash is deterministic, so box load slows this run but cannot change its answer.
//   node scripts/oneoff/probe-photo-fingerprint-browser.mjs   (needs python3 + Pillow, and Chrome)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-photo-fingerprint-browser.mjs");
const { chromium } = await import("playwright-core");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const D = fs.mkdtempSync(path.join(os.tmpdir(), "cm-fp-"));
execFileSync("python3", [path.join(ROOT, "scripts/oneoff/make-photo-fingerprint-fixtures.py"), D], { stdio: "inherit" });
const src = fs.readFileSync(path.join(ROOT, "lib/photoEvidence.js"), "utf8");
const files = fs.readdirSync(D).sort();
const payload = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(D, f)).toString("base64")]));

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(600000);
await page.setContent("<!doctype html><title>fingerprint probe</title>");
const hashes = await page.evaluate(async ({ src, payload }) => {
  const mod = await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
  const out = {};
  for (const [name, b64] of Object.entries(payload)) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    out[name] = await mod.photoFingerprint(new Blob([bytes], { type: name.endsWith(".png") ? "image/png" : "image/jpeg" }));
  }
  return out;
}, { src, payload });
await browser.close();

const BAR = 8; // 0208's photo_is_first_use: bit_count(xor) <= 8
const bits = (a, b) => { let n = 0; for (let i = 0; i < 16; i += 2) { let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16); while (x) { n += x & 1; x >>= 1; } } return n; };
let bad = 0, worstCopy = 0, closestOther = 64;
const missing = Object.entries(hashes).filter(([, h]) => !/^[0-9a-f]{16}$/.test(h || ""));
if (missing.length) { bad++; console.log(`  FAIL  no fingerprint for ${missing.map(([k]) => k).join(", ")}`); }
for (let s = 0; s < 4; s++) {
  const o = hashes[`s${s}_orig.jpg`];
  for (const v of ["q50.jpg", "400.jpg", "600q60.jpg", "lossless.png"]) worstCopy = Math.max(worstCopy, bits(o, hashes[`s${s}_${v}`]));
  for (const f of files.filter((x) => x.startsWith("other"))) closestOther = Math.min(closestOther, bits(o, hashes[f]));
}
if (worstCopy > BAR) { bad++; console.log(`  FAIL  a copy drifted ${worstCopy} bits — past the bar of ${BAR}, so a borrowed photo would back a climb`); }
else console.log(`  ok    copies (re-save, resize, PNG) drift at most ${worstCopy} bits — inside the bar of ${BAR}`);
if (closestOther <= BAR) { bad++; console.log(`  FAIL  two different scenes came within ${closestOther} bits — a real photo would read as a reuse`); }
else console.log(`  ok    different scenes stay ${closestOther}+ bits apart — outside the bar`);
fs.rmSync(D, { recursive: true, force: true });
console.log(bad ? `\nFAIL: ${bad}` : "\nok — the browser fingerprint separates a copy from a different photo");
process.exit(bad ? 1 : 0);
