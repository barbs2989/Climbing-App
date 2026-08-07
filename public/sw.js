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

// Returns true when it actually pruned, i.e. this is a deploy the client has not seen. The
// caller uses that to re-precache: pruning drops every lazy chunk too, and without a refill
// the offline set would silently degrade to "whatever you happened to visit" after a deploy.
async function pruneIfNewDeploy(html) {
  const found = html.match(ASSET_RE);
  if (!found) return false; // not the app shell, or markup we don't recognise — leave the cache alone
  const cache = await caches.open(SHELL_CACHE);
  const marker = new URL(GENERATION_KEY, self.registration.scope).toString();
  const prev = await cache.match(marker);
  if (prev && (await prev.text()) === found[0]) return false; // same deploy, nothing to do

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

// Every /assets/ URL the shell references, plus the lazily-imported chunks those pull in.
//
// The lazy chunks matter more than they look. RouteDetail and DbAreaBrowser only load on
// demand, so before this they were cached only if you had already visited that screen while
// online — and a climber downloads a state precisely so they can read route beta at the
// trailhead. Download Washington, never open a route page before losing signal, and the one
// screen the download exists for failed to load.
//
// Discovered by crawling, never a hardcoded list: Vite content-hashes every chunk name, so a
// list would rot on the next deploy and fail silently. The entry bundle references its chunks
// as "./Name-hash.js" string literals; those chunks reference further ones (RouteDetail pulls
// in GpsSubmissionModal), so this walks to a fixed point rather than one level.
//
// Bounded by `seen`, so a cycle cannot loop, and by MAX_DEPTH as a backstop against a bundler
// output shape that makes the regex match something unexpected. Each fetch is independently
// caught: one missing chunk must not abandon the rest.
const CHUNK_RE = /"\.\/([A-Za-z0-9_.-]+\.js)"/g;
const MAX_DEPTH = 6;

async function precacheShellAssets(html, cache) {
  const seen = new Set();
  // Default cache mode, not "reload": the page just fetched these, so this normally costs
  // nothing beyond a memory/disk-cache read. Only the HTML needs to bypass the HTTP cache.
  const take = async (url) => {
    if (seen.has(url)) return null;
    seen.add(url);
    try {
      const r = await fetch(url);
      if (!r || !r.ok) return null;
      await cache.put(url, r.clone());
      return /\.js(\?|$)/.test(url) ? await r.text() : null;
    } catch (e) { return null; }
  };

  const fromHtml = [...new Set(Array.from(html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g), (m) => m[1]))]
    .map((u) => new URL(u, self.registration.scope).toString());
  let frontier = (await Promise.all(fromHtml.map(async (u) => [u, await take(u)]))).filter(([, t]) => t);

  for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth++) {
    const next = [];
    for (const [from, text] of frontier) {
      // Resolve against the referring asset, not the scope — "./x.js" is relative to /assets/.
      for (const m of text.matchAll(CHUNK_RE)) next.push(new URL(m[1], from).toString());
    }
    const fetched = await Promise.all([...new Set(next)].map(async (u) => [u, await take(u)]));
    frontier = fetched.filter(([, t]) => t);
  }
  return seen.size;
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
        await precacheShellAssets(html, cache);
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
            //
            // Refill after a prune. A new deploy deletes every /assets/ entry including the
            // lazy chunks, and only what the client happens to visit would come back — so
            // without this the offline set decays on every deploy and the trailhead case
            // silently regresses. Runs only when pruneIfNewDeploy actually pruned (once per
            // deploy per client), and the client is provably online here.
            event.waitUntil(
              res.clone().text()
                .then(async (html) => {
                  if (await pruneIfNewDeploy(html)) await precacheShellAssets(html, await caches.open(SHELL_CACHE));
                })
                .catch(() => {})
            );
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
