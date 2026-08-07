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

self.addEventListener("install", (event) => {
  self.skipWaiting();

  // Precache the shell now, rather than waiting for requests to pass through the fetch
  // handler below. This worker is registered on the page's `load` event, which is AFTER
  // index.html and the entry bundle have already been fetched — so on a first visit those
  // two never reach the handler and never get cached. Measured before this: the app needed
  // TWO online visits before it would open with no signal.
  //
  //   1. first visit online     body=568  cached: 1 lazy chunk only
  //   2. next open OFFLINE      body=177  net::ERR_FAILED — the app does not open
  //   3. second visit online    body=568  cached: index.html + entry bundle + 5 more
  //   4. OFFLINE after 2 online body=568  works
  //
  // That defeats the downloaded-state catalog outright: a climber downloads Washington on
  // the visit they install on, opens the app at the trailhead, and gets a dead page — the
  // routes are sitting in IndexedDB with no shell able to read them.
  //
  // Best-effort by design. Every step is caught: the strategy is network-first, so failing
  // to precache costs nothing an online user would notice, and a worker that threw here
  // would fail to install and leave them with no offline support at all.
  event.waitUntil(
    (async () => {
      try {
        // cache: "reload" so this is the live deploy, not whatever the HTTP cache holds.
        const res = await fetch(self.registration.scope, { cache: "reload" });
        if (!res || !res.ok) return;
        const html = await res.clone().text();
        // Runs before the puts below, and writes the generation marker as a side effect, so
        // the first navigation sees a matching marker and does not immediately prune away
        // everything just precached (a missing marker means "all assets are stale").
        await pruneIfNewDeploy(html);
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(self.registration.scope, res);
        // Entry bundle, its static imports (modulepreload) and the stylesheet — every
        // /assets/ URL the shell references. Lazily-imported chunks are not in here and
        // do not need to be: once this worker controls the page they cache on first use.
        const assets = [...new Set(Array.from(html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g), (m) => m[1]))];
        await Promise.all(assets.map((u) => cache.add(new URL(u, self.registration.scope).toString()).catch(() => {})));
      } catch (e) {
        /* offline or a failed fetch during install — nothing to precache, carry on */
      }
    })()
  );
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
        // ignoreVary is load-bearing. Both hosts send a Vary header on assets (`Origin`
        // locally, `Accept-Encoding` on Pages), and cache matching honours it: an entry
        // stored under a request whose headers differ from the browser's will NOT match,
        // so a perfectly good cached asset reads as absent and this returns Response.error().
        //
        // That is exactly how the precache above failed before this line: cache.add() stores
        // a no-cors request that sends no Origin, while Vite emits <script type="module"
        // crossorigin>, whose request is cors mode and does send one. Everything was cached
        // and the app still would not boot offline.
        //
        // Safe here because every URL this cache holds is either a content-hashed asset or
        // the app shell — one variant each, so there is no wrong variant to serve.
        const cached = await caches.match(req, { ignoreVary: true });
        if (cached) return cached;
        if (req.mode === "navigate") {
          const fallback = await caches.match(self.registration.scope, { ignoreVary: true });
          if (fallback) return fallback;
        }
        return Response.error();
      })
  );
});
