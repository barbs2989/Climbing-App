// paced-fetch.mjs — the one way the Mountain Project importers request a page: one request at a time,
// paced, and SLOWER the moment the site looks unhappy.
//
// The owner's license from onX sets no rate limit (2026-10-02), so the pace starts at FLOOR_MS (1 s)
// rather than robots.txt's 60 s. It is still adaptive, as the owner asked ("if it looks like an
// attack, we go slower"): a 429, a 403, any 5xx, a timeout or network error, or an answer the caller
// marks as refused multiplies the gap by 4 (honouring Retry-After), up to MAX_MS; every 50 clean
// answers in a row halve it again, never below the floor. `--polite` restores the 61 s robots.txt pace.
//
//   import { mpGet, mpRefused, mpStats } from "../lib/paced-fetch.mjs";
//   const r = await mpGet(url);          // { status, type, body }
//   if (!/csv/.test(r.type)) mpRefused(); // a refusal the status code did not show

const UA = "ClimbMatch-licensed-importer (barbs2989@gmail.com)";
const POLITE = process.argv.includes("--polite");
const FLOOR_MS = POLITE ? 61_000 : 1_000;
const MAX_MS = 120_000;
let gap = FLOOR_MS, last = 0, clean = 0, requests = 0, backoffs = 0;

function slower(why, retryAfterS) {
  const before = gap;
  gap = Math.min(MAX_MS, Math.max(gap * 4, (retryAfterS || 0) * 1000));
  clean = 0; backoffs++;
  if (gap !== before) console.log(`  PACE ${why}: ${before / 1000}s -> ${gap / 1000}s between requests`);
}
function cleanAnswer() {
  if (++clean >= 50 && gap > FLOOR_MS) { const before = gap; gap = Math.max(FLOOR_MS, gap / 2); clean = 0; console.log(`  PACE 50 clean answers: ${before / 1000}s -> ${gap / 1000}s`); }
}

export async function mpGet(url) {
  for (let i = 0; ; i++) {
    const wait = last + gap - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    last = Date.now(); requests++;
    try {
      // A request with no deadline hung the crawl for three days (Colorado, 2026-09-27).
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120_000) });
      const body = await r.text();
      if (r.status === 429 || r.status === 403 || r.status >= 500) {
        slower("HTTP " + r.status, +r.headers.get("retry-after") || 0);
        if (i < 5) continue;
      } else cleanAnswer();
      return { status: r.status, type: r.headers.get("content-type") || "", body };
    } catch (e) {
      slower("network " + (e.name || "error"));
      if (i >= 5) throw e;
    }
  }
}
// A 200 that is not what was asked for (an HTML page in place of the CSV export) counts as a refusal.
export function mpRefused() { slower("refused answer"); }
export function mpStats() { return { requests, backoffs, gapS: gap / 1000 }; }
