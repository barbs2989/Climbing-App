// What to hand `import()` when the module is a FILE PATH the script computed.
//
// `await import("/tmp/x.mjs")` works on macOS and Linux. On Windows an absolute path is
// `C:\…\x.mjs`, and the ESM loader reads `C:` as a URL scheme and throws
// ERR_UNSUPPORTED_ESM_URL_SCHEME — so every guard that bundles a screen with esbuild and imports
// the bundle died there before checking anything.
//
//   await import(fileHref(out + "?t=" + Date.now()))
//
// An absolute path (with or without a `?query` cache-buster) becomes a file:// URL; a hand-built
// `file://C:\…` is repaired; anything else (a bare specifier, a `node:` builtin, a proper URL)
// passes through untouched.
import path from "node:path";
import { pathToFileURL } from "node:url";

export function fileHref(spec) {
  let s = String(spec);
  if (/^file:\/\/(?!\/)/.test(s) && /^file:\/\/[A-Za-z]:/.test(s)) s = s.slice("file://".length); // file://C:\… → C:\…
  else if (s.startsWith("file:")) return s;
  const q = s.search(/[?#]/);
  const p = q === -1 ? s : s.slice(0, q), rest = q === -1 ? "" : s.slice(q);
  if (!path.isAbsolute(p)) return s;
  return pathToFileURL(p).href + rest;
}
