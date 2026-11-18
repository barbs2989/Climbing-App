// A deploy removed a lazy screen's file and main.jsx is ALREADY reloading for it. main.jsx's
// vite:preloadError handler calls preventDefault() so Vite does not rethrow -- and Vite then resolves
// the import to undefined, so React.lazy throws its own "reading 'default'" TypeError into the nearest
// error boundary while the reload is in flight. Seen 2026-11-18 on a signed-in phone: Menu > Listed
// areas across a deploy drew "This screen hit a bug ... (reading 'default')" (AppErrorBoundary) and
// stayed; a climb tapped across the next one drew "Something went wrong loading this section"
// (SectionErrorBoundary). That error, within the window main.jsx's marker records, is the deploy, not a
// bug: both boundaries ask swallowedChunk. The key is main.jsx's CHUNK_RELOAD_KEY (check:chunk-reload
// holds the two spellings together). No imports: AppErrorBoundary must stay out of the core bundle.
export const CHUNK_RELOAD_KEY = "climbmatch:chunk-reload-at";

// main.jsx sets this just before its location.reload(). A history traversal started after a reload
// CANCELS it (Chrome; measured live 2026-11-18: reload() then history.back() never reloads, reload()
// alone does). When the error that reload answers reaches AppErrorBoundary, the whole App unmounts, and
// lib/backButton.js's cleanup calls history.back() to take its entry off -- so Menu > Listed areas
// across a deploy stayed on the error card instead of loading the new build. That cleanup asks this.
let reloadPending = false;
export function noteReloadPending() { reloadPending = true; }
export function isReloadPending() { return reloadPending; }
export function swallowedChunk(msg) {
  if (!/default/.test(msg)) return false; // Chrome: reading 'default'; Firefox: property "default"; Safari: evaluating 'x.default'
  try { return Date.now() - (Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0) < 30 * 1000; } catch { return false; }
}
