// CONTENT-SECURITY-POLICY for the built pages (security audit 2026-11-26).
//
// The site is static on GitHub Pages, which cannot send response headers, so the policy rides in a
// <meta http-equiv> tag. supabase-js keeps the signed-in session in localStorage, so ANY script that
// runs on this origin can read it and take the account over — on the Review desk, the owner's admin
// account. This policy is the wall behind the escaping and safeHref() (lib/safeUrl.js): a script may
// come only from this site, from cdnjs (Leaflet and MapLibre, each pinned by an integrity hash) and
// from Cloudflare's Turnstile check — never an injected inline <script>, an onclick="" attribute, a
// javascript: link, or eval.
//
// The ONE inline script the page carries (index.html's boot-reload guard, kept by check:chunk-reload)
// is allowed by its SHA-256, computed here from the built HTML, so editing that script cannot leave
// a stale hash behind. Applied to the BUILD only: the dev server injects its own inline HMR preamble.
//
// What a <meta> policy cannot do: frame-ancestors (so it does not stop the page being framed —
// GitHub Pages sends no X-Frame-Options either; recorded as an owner to-do) and reporting.
// Styles, images, fetches and frames are deliberately left open: the app draws with inline styles
// everywhere and reads tiles, forecasts and photos from many hosts, and none of those can run script.
//
// ADS: AdSense injects script from many Google hosts and cannot live under a host list, so when a
// publisher id is set (VITE_ADSENSE_CLIENT) script-src is left out and the rest of the policy stays.
import { createHash } from "node:crypto";

export function cspPlugin() {
  return {
    name: "climbmatch-csp",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const hashes = [];
        html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (m, body) => {
          hashes.push("'sha256-" + createHash("sha256").update(body, "utf8").digest("base64") + "'");
          return m;
        });
        const ads = !!process.env.VITE_ADSENSE_CLIENT;
        const dirs = [
          ads ? null : ["script-src", "'self'", ...hashes, "https://cdnjs.cloudflare.com", "https://challenges.cloudflare.com"].join(" "),
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].filter(Boolean);
        const tag = `<meta http-equiv="Content-Security-Policy" content="${dirs.join("; ")}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`;
        return html.replace(/<head>/i, "<head>\n    " + tag);
      },
    },
  };
}
