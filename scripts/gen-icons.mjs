// Regenerates the raster app icons in public/ from the two SVG sources next to them.
//
//   npm run gen:icons
//
// The SVGs are the source of truth; every PNG here is derived, so editing a PNG by hand
// guarantees it drifts from the vector the favicon actually uses. Re-run this after any
// change to public/icon.svg or public/icon-maskable.svg.
//
// Rasters exist at all because two consumers cannot take an SVG: iOS ignores SVG for
// apple-touch-icon, and Android's installer wants a real bitmap for the launcher. The
// browser tab favicon uses the SVG directly and needs nothing from this script.
//
// Rendered through headless Chrome rather than a conversion library so the pixels come
// from the same renderer that draws the favicon — playwright-core is already a devDep for
// the check: scripts, so this adds no dependency.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// [source svg, output png, pixel size]
const TARGETS = [
  ["icon.svg", "apple-touch-icon.png", 180],
  ["icon.svg", "icon-192.png", 192],
  ["icon.svg", "icon-512.png", 512],
  ["icon-maskable.svg", "icon-maskable-512.png", 512],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

for (const [src, out, size] of TARGETS) {
  const svg = readFileSync(join(PUBLIC, src), "utf8");
  const uri = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
  await page.setViewportSize({ width: size, height: size });
  // margin:0 and an exactly-sized <img> so the screenshot needs no clip arithmetic.
  await page.setContent(
    `<body style="margin:0"><img src="${uri}" width="${size}" height="${size}" style="display:block"></body>`
  );
  // The <img> decodes asynchronously; screenshotting before it settles yields a blank
  // tile, which looks like a working script that silently produced empty icons.
  await page.waitForFunction(() => {
    const i = document.querySelector("img");
    return i && i.complete && i.naturalWidth > 0;
  });
  const buf = await page.screenshot({ type: "png" });
  writeFileSync(join(PUBLIC, out), buf);
  console.log(`  ${src} -> ${out} (${size}x${size}, ${buf.length} bytes)`);
}

await browser.close();
console.log("icons written to public/");
