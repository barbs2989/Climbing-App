// Asserts the app actually declares an icon, and that every icon it points at exists,
// is where it claims to be, and is the size it claims to be.
//
//   npm run check:icons     (also gated by `npm run build`)
//
// Ported from PR #746, a parallel session's independent take on the same task, which got
// several things right that #745 did not. Adapted in three ways, noted at each site.
//
// This exists because the failure it catches is invisible. Vite does not verify references
// into public/ — a missing or renamed file there is emitted as a rewritten href and 404s at
// runtime, with a silently iconless tab as the only symptom. That is the state the app
// shipped in until 2026-08-09: the document declared ZERO <link rel="icon"> elements, so
// there was no tab icon, no home-screen icon, and nothing for an installer to use.
//
// A claim deliberately NOT made here: that a page without a declared icon has the browser
// probe /favicon.ico and take a 404. #745 asserted that and it is unverified — probed with a
// request-logging server and Chrome via playwright, headless AND headed, a page declaring no
// icon produced a request for "/" and nothing else. The missing icon is directly observable
// and needs no such story.
//
// Static on purpose — no browser, no network, no dev server — so it can sit in `build` with
// the other gates rather than needing someone to remember it.
//
// The two path conventions are OPPOSITE and easy to get backwards, so both are asserted:
//   index.html           MUST be "%BASE_URL%x" or root-absolute "/x". Vite rewrites both to
//                        the configured base. A bare relative path breaks on a deep route.
//   manifest.webmanifest MUST be relative ("icon.svg"). public/ is copied verbatim and Vite
//                        never rewrites inside it, so a root-absolute path resolves off-base
//                        on GitHub Pages and every icon 404s. Relative also survives a repo
//                        rename, which a hardcoded "/Climbing-App/" prefix does not.
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
  fail.push('index.html declares no <link rel="icon"> — the tab, the home screen and any installer have nothing to use');
if (!links.some((l) => l.rel === "manifest"))
  fail.push('index.html declares no <link rel="manifest"> — the app cannot be installed');

for (const { rel, href } of links) {
  // ADAPTED from #746, which required a leading "/". %BASE_URL% is the form actually shipped
  // and verified against the live deploy; both are rebased by Vite, a bare relative path is not.
  const base = href.startsWith("%BASE_URL%");
  const rooted = href.startsWith("/") && !href.startsWith("//");
  if (!base && !rooted) {
    fail.push(`index.html rel="${rel}" href="${href}" is neither %BASE_URL%-prefixed nor root-absolute — Vite will not rebase it, so it breaks under base`);
    continue;
  }
  const rel_path = base ? href.slice("%BASE_URL%".length) : href.slice(1);
  if (!existsSync(join(PUBLIC, rel_path)))
    fail.push(`index.html rel="${rel}" points at public/${rel_path}, which does not exist`);
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
        fail.push(`manifest icon src="${src}" is root-absolute — public/ is copied verbatim, so it resolves off-base and 404s on Pages`);
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
    // launcher shrinks the whole tile onto a plate.
    const maskables = (mf.icons || []).filter((i) => (i.purpose || "").split(/\s+/).includes("maskable"));
    if (!maskables.length) fail.push("manifest declares no maskable icon");
    // ADDED beyond #746, because this is the bug #745 actually shipped: the maskable entry
    // pointed at the ordinary ROUNDED icon. A maskable icon must be full bleed — the launcher
    // supplies the shape — so it has to be its own file, not the "any" icon reused.
    const anySrcs = new Set((mf.icons || []).filter((i) => (i.purpose || "any").split(/\s+/).includes("any")).map((i) => i.src));
    for (const m of maskables)
      if (anySrcs.has(m.src))
        fail.push(`manifest reuses ${m.src} for both "any" and "maskable" — a maskable icon must be full bleed and separately scaled to the 80% safe circle`);

    for (const k of ["name", "start_url", "display", "background_color", "theme_color"])
      if (!mf[k]) fail.push(`manifest is missing "${k}"`);
    // start_url/scope are resolved against the MANIFEST's URL, so relative keeps them correct
    // under any base. `id` is deliberately exempt: the spec resolves it against the ORIGIN,
    // so a relative "./" would resolve to "/" and silently change the installed app's identity.
    for (const k of ["start_url", "scope"])
      if (mf[k] && mf[k].startsWith("/"))
        fail.push(`manifest "${k}" is root-absolute ("${mf[k]}") — use a relative value so it survives a base or repo rename`);
  }
}

if (fail.length) {
  console.error("check:icons FAILED\n");
  fail.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log(`check:icons: ok — ${links.length} icon/manifest links, all resolved and sized as declared.`);

// Injection-tested 2026-08-09 (re-run after the port); each of these must fail the run:
//   1. delete the <link rel="icon"> line           -> "declares no <link rel=icon>"
//   2. rename public/favicon.svg                   -> "points at public/favicon.svg, which does not exist"
//   3. make a manifest icon src root-absolute      -> "is root-absolute"
//   4. change icon-192's declared sizes to 512x512 -> "declares sizes=512x512 but the file is 192x192"
//   5. drop purpose:"maskable" from the manifest   -> "declares no maskable icon"
//   6. point the maskable entry at icon-512.png    -> "reuses ... for both any and maskable"
//   7. make an index.html href bare-relative       -> "neither %BASE_URL%-prefixed nor root-absolute"
