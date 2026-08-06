// Network-first app-shell cache: online users always get the latest deploy;
// only a genuinely offline request falls back to whatever was cached last.
// Deliberately does NOT touch cross-origin requests (Supabase, map tiles, images) —
// those aren't part of the app shell and shouldn't be cached here.
const SHELL_CACHE = "climbmatch-shell-v1";

// Vite emits content-hashed asset names, so every deploy produces a completely new set of
// URLs and the previous set can never be requested again. Nothing evicted them: the
// `activate` handler below only deletes caches whose NAME differs from SHELL_CACHE, and that
// name is a constant — so it has never deleted anything. `sw.js` is also byte-identical
// across deploys, so the browser never sees a new worker and `activate` runs once, ever;
// pruning there would fire a single time and never again.
//
// Measured while fixing this: ~2 MB of assets per deploy, 34 successful deploys in one
// working day. That is tens of MB of permanently unreachable bytes on a phone, and it grows
// without bound — eventually large enough that the browser evicts the whole origin's storage
// under quota pressure, taking the useful entries with it.
//
// So the prune runs on navigation instead, which happens on every load. The entry bundle's
// hashed filename identifies the deploy: when it changes, every cached asset belongs to the
// previous deploy and is dead by definition, so the whole /assets/ set goes.
const GENERATION_KEY = "__shell_generation__";
const ASSET_RE = /assets\/index-[A-Za-z0-9_-]+\.js/;

async function pruneIfNewDeploy(html) {
  const found = html.match(ASSET_RE);
  if (!found) return; // not the app shell, or markup we don't recognise — leave the cache alone
  const cache = await caches.open(SHELL_CACHE);
  const marker = new URL(GENERATION_KEY, self.registration.scope).toString();
  const prev = await cache.match(marker);
  if (prev && (await prev.text()) === found[0]) return; // same deploy, nothing to do

  // Record the new generation FIRST, so a reload racing this can't prune twice.
  await cache.put(marker, new Response(found[0]));
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((k) => k.url !== marker && new URL(k.url).pathname.includes("/assets/"))
      .map((k) => cache.delete(k))
  );
  // Two cases delete assets belonging to the CURRENT deploy rather than an old one:
  //   - the first navigation after this ships, when there is no marker yet and every entry
  //     is therefore treated as stale (guaranteed, once per client);
  //   - an asset that lands mid-prune (a race, rare).
  // Both cost one redundant fetch and nothing else. The strategy is network-first, so
  // correctness never depends on the cache, the client is provably online here (the HTML
  // fetch just succeeded), and each asset is re-cached the next time it is requested. Paying
  // ~2 MB once to reclaim tens of MB of unreachable bytes is the right way round.
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(req, copy));
          if (req.mode === "navigate") {
            // waitUntil, not await: the page must not wait on cache maintenance.
            event.waitUntil(res.clone().text().then(pruneIfNewDeploy).catch(() => {}));
          }
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const fallback = await caches.match(self.registration.scope);
          if (fallback) return fallback;
        }
        return Response.error();
      })
  );
});
