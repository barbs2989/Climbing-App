// Asserts the app actually declares an icon, and that every icon it points at exists.
//
//   npm run check:icons     (also gated by `npm run build`)
//
// This exists because the failure it catches is invisible. Vite does not verify references
// into public/ — a missing or renamed file there is emitted as a rewritten href and 404s at
// runtime, with a silently iconless tab as the only symptom. That is precisely the state the
// app shipped in until 2026-08-09: measured against the live deploy, the document declared
// ZERO <link rel="icon"> elements, so there was no tab icon, no home-screen icon, and
// nothing for an installer to use.
//
// A note on a claim NOT made here: it is often said that a page without a declared icon has
// the browser probe /favicon.ico and take a 404. That may well be true of a normal browser
// session, but it could not be reproduced with the tooling in this repo — Chrome driven by
// playwright-core never requested it, headless or headed, and a request-logging server
// confirmed it from the other side of the socket. So the guard is justified by the missing
// icon, which is directly observable, and not by a 404 nobody here has seen.
//
// Static on purpose — no browser, no network, no dev server — so it can sit in `build` with
// the other gates rather than needing someone to remember it.
//
// The two path conventions are opposite and easy to get backwards, so both are asserted:
//   index.html          MUST be root-absolute ("/icon.svg").  Vite rewrites the leading "/"
//                       to the configured base, so a relative path breaks on a deep route.
//   manifest.webmanifest MUST be relative ("icon.svg").  public/ is copied verbatim and Vite
//                       never rewrites inside it, so a root-absolute path resolves off-base
//                       on GitHub Pages and every icon 404s.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const fail = [];

const html = readFileSync(join(ROOT, "index.html"), "utf8");

// Pull every <link> that names an icon or the manifest, with its rel and href.
const links = [...html.matchAll(/<link\b[^>]*>/g)]
  .map((m) => m[0])
  .map((tag) => ({
    tag,
    rel: (tag.match(/\brel="([^"]*)"/) || [])[1] || "",
    href: (tag.match(/\bhref="([^"]*)"/) || [])[1] || "",
  }))
  .filter((l) => /\b(icon|apple-touch-icon|manifest)\b/.test(l.rel));

// The original defect: no icon declared at all.
if (!links.some((l) => /(^|\s)icon(\s|$)/.test(l.rel)))
  fail.push('index.html declares no <link rel="icon"> — the browser will probe /favicon.ico and 404');
if (!links.some((l) => l.rel === "manifest"))
  fail.push('index.html declares no <link rel="manifest"> — the app cannot be installed');

for (const { rel, href } of links) {
  if (!href.startsWith("/") || href.startsWith("//")) {
    fail.push(`index.html rel="${rel}" href="${href}" is not root-absolute — Vite will not rebase it, so it breaks under base`);
    continue;
  }
  if (!existsSync(join(PUBLIC, href.slice(1))))
    fail.push(`index.html rel="${rel}" points at public${href}, which does not exist`);
}

// Width/height live in the PNG's IHDR, as big-endian uint32s at byte 16 and 20. Reading them
// directly beats trusting the declared `sizes`: a launcher that asks for 512 and is handed a
// 192 upscales it, and nothing in the build would object.
const pngSize = (p) => {
  const b = readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

const manifestPath = join(PUBLIC, "manifest.webmanifest");
if (!existsSync(manifestPath)) {
  fail.push("public/manifest.webmanifest is missing");
} else {
  let mf;
  try {
    mf = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    fail.push("public/manifest.webmanifest is not valid JSON: " + e.message);
  }
  if (mf) {
    if (!Array.isArray(mf.icons) || !mf.icons.length) fail.push("manifest declares no icons");
    for (const ic of mf.icons || []) {
      const src = ic.src || "";
      if (src.startsWith("/")) {
        fail.push(`manifest icon src="${src}" is root-absolute — public/ is copied verbatim, so it will resolve off-base and 404 on Pages`);
        continue;
      }
      const abs = join(PUBLIC, src);
      if (!existsSync(abs)) { fail.push(`manifest icon src="${src}" does not exist in public/`); continue; }
      if (src.endsWith(".png") && /^\d+x\d+$/.test(ic.sizes || "")) {
        const { w, h } = pngSize(abs);
        const [dw, dh] = ic.sizes.split("x").map(Number);
        if (w !== dw || h !== dh)
          fail.push(`manifest icon ${src} declares sizes="${ic.sizes}" but the file is ${w}x${h}`);
      }
    }
    // A maskable icon is what Android crops into its adaptive shape; without one the
    // launcher shrinks the whole tile onto a white plate.
    if (!(mf.icons || []).some((i) => (i.purpose || "").split(/\s+/).includes("maskable")))
      fail.push("manifest declares no maskable icon");
    for (const k of ["name", "start_url", "display", "background_color", "theme_color"])
      if (!mf[k]) fail.push(`manifest is missing "${k}"`);
  }
}

if (fail.length) {
  console.error("check:icons FAILED\n");
  fail.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log(`ok — ${links.length} icon/manifest links, all resolved`);

// Injection-tested 2026-08-09; each of these must fail the run:
//   1. delete the <link rel="icon"> line          -> "declares no <link rel=icon>"
//   2. rename public/icon.svg                     -> "points at public/icon.svg, which does not exist"
//   3. make a manifest icon src root-absolute     -> "is root-absolute"
//   4. change icon-192's declared sizes to 512x512-> "declares sizes=512x512 but the file is 192x192"
//   5. drop purpose:"maskable" from the manifest  -> "declares no maskable icon"
