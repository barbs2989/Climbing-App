// Renders the icon SVGs to the PNG sizes iOS and Android require, and checks the two
// things about them that are only visible on a real phone.
//
// iOS ignores SVG for apple-touch-icon, and a web manifest wants raster icons, so those
// files have to exist as PNGs. Generating them FROM the SVGs (rather than drawing them
// separately) is the point: the mark can only be changed in one place.
//
//   node scripts/oneoff/render-app-icons.mjs
//
// Uses the Chrome that playwright-core drives — the same engine that renders the SVG
// favicon in the tab, so raster and vector agree by construction.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pub = (f) => join(ROOT, "public", f);

const SRC_ANY = readFileSync(pub("favicon.svg"), "utf8");
const SRC_MASK = readFileSync(pub("favicon-maskable.svg"), "utf8");

const OUT = [
  ["apple-touch-icon.png", 180, SRC_ANY],  // iOS home screen
  ["icon-192.png", 192, SRC_ANY],          // manifest, purpose "any"
  ["icon-512.png", 512, SRC_ANY],          // manifest, purpose "any"
  ["icon-maskable-512.png", 512, SRC_MASK],// manifest, purpose "maskable"
];

let fails = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? "ok  " : "FAIL"}  ${msg}`); if (!cond) fails++; };

// iOS composites touch icons on white, so a transparent mark would show white-on-white.
// Only visible on a device, so it is asserted here instead.
ok(/<rect[^>]*fill="#0d1117"/.test(SRC_ANY), "favicon.svg has an opaque background");
// A maskable icon must be full bleed: the launcher supplies the shape. An `rx` here is
// exactly the defect this check exists to prevent recurring.
ok(/<rect width="24" height="24" fill=/.test(SRC_MASK), "favicon-maskable.svg background is full bleed");
ok(!/<rect[^>]*\brx=/.test(SRC_MASK), "favicon-maskable.svg background has NO rounded corners");

const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const [name, size, svg] of OUT) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" width="${size}" height="${size}"></body>`,
      { waitUntil: "load" }
    );
    await page.waitForFunction(() => { const i = document.querySelector("img"); return i && i.complete && i.naturalWidth > 0; });
    writeFileSync(pub(name), await page.screenshot({ omitBackground: false }));

    // Measure where the ink actually lands, rather than trusting the transform arithmetic.
    // Painted = differs from the #0d1117 background by more than antialiasing noise.
    const reach = await page.evaluate(async ([b64, s]) => {
      const img = new Image();
      img.src = "data:image/svg+xml;base64," + b64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = c.height = s;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0, s, s);
      const d = g.getImageData(0, 0, s, s).data;
      const cx = s / 2, cy = s / 2;
      let max = 0;
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        const i = (y * s + x) * 4;
        const painted = Math.abs(d[i] - 13) + Math.abs(d[i + 1] - 17) + Math.abs(d[i + 2] - 23) > 60;
        if (!painted) continue;
        const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (r > max) max = r;
      }
      return max / (s / 2); // as a fraction of the icon's half-width
    }, [Buffer.from(svg).toString("base64"), size]);

    console.log(`  wrote public/${name}  ${size}x${size}  ${statSync(pub(name)).size} bytes  ink reaches ${(reach * 100).toFixed(1)}% of half-width`);
    if (name.includes("maskable")) {
      // The maskable safe zone is the central circle of 80% the width, i.e. radius 0.8 of
      // the half-width. Anything beyond it can be cropped away by a launcher's mask.
      ok(reach <= 0.8, `maskable ink stays inside the 80% safe circle (${(reach * 100).toFixed(1)}% <= 80%)`);
    }
  }
} finally {
  await browser.close();
}

console.log(fails === 0 ? "\nicons: ok" : `\nicons: FAILED — ${fails} check(s)`);
process.exit(fails ? 1 : 0);
