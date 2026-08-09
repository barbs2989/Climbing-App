// Renders public/favicon.svg to the PNG sizes iOS and Android require.
//
// iOS ignores SVG for apple-touch-icon, and a web manifest wants raster icons, so
// those files have to exist as PNGs. Generating them FROM the SVG (rather than
// drawing them separately) is the point: the mark can only ever be changed in one
// place, and re-running this regenerates every size from it.
//
//   node scripts/oneoff/render-app-icons.mjs
//
// Uses the Chrome that playwright-core drives — same engine that renders the SVG
// favicon in the tab, so the raster and vector marks agree by construction.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SVG = join(ROOT, "public", "favicon.svg");
const OUT = [
  ["apple-touch-icon.png", 180], // iOS home screen
  ["icon-192.png", 192],         // manifest, standard
  ["icon-512.png", 512],         // manifest, splash + store listings
];

const svg = readFileSync(SVG, "utf8");
// The mark is opaque by design — iOS composites touch icons on white and a
// transparent one would show a white mountain on white. Fail loudly rather than
// ship that, since it only shows up on a real phone.
if (!/<rect[^>]*fill="#0d1117"/.test(svg)) {
  console.error("FAIL: favicon.svg has no opaque background rect — iOS would composite it on white.");
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const [name, size] of OUT) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    // margin:0 and an exactly-sized <img>: the screenshot is the icon, with no
    // page padding sneaking in as a transparent border.
    await page.setContent(
      `<body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" width="${size}" height="${size}"></body>`,
      { waitUntil: "load" }
    );
    await page.waitForFunction(() => { const i = document.querySelector("img"); return i && i.complete && i.naturalWidth > 0; });
    const buf = await page.screenshot({ omitBackground: false });
    writeFileSync(join(ROOT, "public", name), buf);
    await page.close();
    console.log(`  wrote public/${name}  ${size}x${size}  ${statSync(join(ROOT, "public", name)).size} bytes`);
  }
} finally {
  await browser.close();
}
console.log("done");
