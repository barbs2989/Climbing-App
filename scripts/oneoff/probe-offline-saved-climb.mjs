#!/usr/bin/env node
/* Does a climb saved with "Save offline" really open, whole, on a PHONE with the network CUT?
 *
 * The parts a desk check could not reach (PRs #3649 / #3657 / #3665, owner 2026-11-19):
 *   - a 390px phone, and the SWIPE that removes a saved climb;
 *   - a true network cut (Chrome's offline emulation, so map tiles and images are cut too), with
 *     the app RELOADED while offline, so the service worker's shell is part of the test;
 *   - the three parts no catalog route carries today: climbers' TRACKS, a crag WALK-IN line and a
 *     TOPO. They are fed as FIXTURES at the network boundary while online (the save then stores
 *     them like any other answer) and must come back from the device once the network is gone;
 *   - a save whose MAP cannot download (the page must stay), and a device that is FULL.
 *
 * Nothing is written to the database: the fixtures only change what the browser is told, and every
 * save lands in this throwaway browser profile's IndexedDB.
 *
 * Run against a built app:   npm run build && npx vite preview --port 4319 --strictPort
 *                            node scripts/oneoff/probe-offline-saved-climb.mjs [--base URL] [--shots DIR]
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-offline-saved-climb.mjs");

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:4319/Climbing-App/");
const SHOTS = arg("--shots", "");
const CRAG = "wa_north_side_the", CRAG_ROUTE = "wa_beckey_route", CRAG_NAME = "Beckey Route";
const PEAK_ROUTE = "wa_mount_baker_coleman_deming";

let pass = 0, bad = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const check = (c, m, why) => (c ? ok(m) : fail(m + (why ? " — " + why : "")));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A real 64x64 PNG, generated in the page (canvas), so the topo fixture is a decodable image.
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAS0lEQVR42u3PQQ0AAAgEoNO/aI3gwx8kIFNJdqkECwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAj8HbIBAgAB3K8bPAAAAABJRU5ErkJggg==";

async function shot(page, name) { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + ".png") }); } }
const text = (page) => page.evaluate(() => document.body.innerText);
async function waitText(page, re, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (re.test(await text(page))) return true; await sleep(400); }
  return false;
}
async function clickText(page, label, { exact = true } = {}) {
  return page.evaluate(([label, exact]) => {
    const els = [...document.querySelectorAll("button,a,[role=button]")].filter((e) => e.offsetParent !== null);
    const el = els.find((e) => { const t = e.textContent.trim(); return exact ? t === label : t.includes(label); });
    if (el) el.click();
    return !!el;
  }, [label, exact]);
}
// Zoom the first map out twice, so it needs tiles this browser never fetched online (Chrome keeps the
// ones it did in memory): whatever draws now can only be the copy the save stored. Saved tiles are
// handed to the map as blob: URLs (lib/mapKit.jsx offlineFallbackLayer).
async function savedTilesDraw(page) {
  const had = await page.evaluate(() => { const b = document.querySelector(".leaflet-control-zoom-out"); if (!b) return false; b.scrollIntoView({ block: "center" }); b.click(); return true; });
  if (!had) return { map: false };
  await sleep(1500);
  await page.evaluate(() => document.querySelector(".leaflet-control-zoom-out").click());
  await sleep(6000);
  return page.evaluate(() => { const tl = [...document.querySelectorAll(".leaflet-tile")]; const ld = tl.filter((i) => i.complete && i.naturalWidth > 0); return { map: true, tiles: tl.length, loaded: ld.length, saved: ld.filter((i) => /^blob:/.test(i.src)).length }; });
}
const overflow = (page) => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
async function dbDump(page) {
  return page.evaluate(async () => {
    const open = (n) => new Promise((res, rej) => { const r = indexedDB.open(n); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const all = (db, st) => new Promise((res, rej) => { if (!db.objectStoreNames.contains(st)) return res([]); const r = db.transaction(st).objectStore(st).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const off = await open("climbmatch-offline"), tiles = await open("climbmatch-tiles");
    const pack = await all(off, "pack"), media = await all(off, "media"), tr = await all(tiles, "routes");
    return {
      pack: pack.map((r) => ({ id: r.id, area_id: r.area_id, tracks: r._snap && r._snap.tracks ? r._snap.tracks.length : null, walkIn: r._snap && r._snap.area && Array.isArray(r._snap.area.walkin_gpx) ? r._snap.area.walkin_gpx.length : null, siblings: r._snap && r._snap.siblings ? r._snap.siblings.length : null })),
      media: media.map((m) => ({ kind: m.kind, routeId: m.routeId, pack: !!m.pack, bytes: m.bytes })),
      tiles: tr.map((r) => ({ id: r.id, n: (r.keys || []).length, total: r.total, missing: r.missing })),
    };
  });
}
async function openRoute(page, id) {
  await page.goto(BASE + "?route=" + id, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (await waitText(page, /View as guest/, 6000)) await clickText(page, "View as guest", { exact: false });
  if (await waitText(page, /Save offline|Saved offline/, 25000)) return true;
  // An alpine climb's map, and the button under it, is on its Plan tab on a phone.
  await clickText(page, "Plan");
  return waitText(page, /Save offline|Saved offline/, 40000);
}
async function saveHere(page, ms = 120000) {
  if (!(await clickText(page, "Save offline", { exact: false }))) return false;
  return waitText(page, /Saved offline/, ms);
}
// The toast, read while it is up: the page text is polled from the moment of the click.
async function saveAndCatch(page, re, ms = 90000) {
  await clickText(page, "Save offline", { exact: false });
  return waitText(page, re, ms);
}

const browser = await chromium.launch({ channel: "chrome", headless: true }).catch((e) => { console.error("Chrome is needed (playwright-core ships no browser): " + e.message); process.exit(2); });
const newPhone = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, serviceWorkers: "allow" });
  return { ctx, page: await ctx.newPage() };
};

try {
  // ───────────────────────────── 1. a crag climb, with a walk-in line, tracks and a topo ──────────
  console.log("\n1. SAVE a crag climb at 390px, with a walk-in line and a topo fed in:");
  let { ctx, page } = await newPhone();
  let areaLat = null, areaLng = null, topoUrl = null;
  await ctx.route(/\/rest\/v1\/areas\?.*select=\*/, async (route) => {
    const res = await route.fetch();
    let body; try { body = await res.json(); } catch (e) { return route.fulfill({ response: res }); }
    const one = Array.isArray(body) ? body[0] : body;
    if (one && one.id === CRAG) {
      areaLat = +one.lat; areaLng = +one.lng;
      // A walk in of ~600 m ending at the crag: 12 points, the shape areas.walkin_gpx stores.
      one.walkin_gpx = Array.from({ length: 12 }, (_, i) => [areaLat - 0.005 + i * 0.00045, areaLng - 0.003 + i * 0.00027, 300 + i * 4]);
      one.walkin_kind = "recorded";
    }
    return route.fulfill({ response: res, json: body });
  });
  await ctx.route(/\/rest\/v1\/topos\?.*route_id=eq\./, async (route) => {
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
      json: [{ id: "probe-topo-1", route_id: CRAG_ROUTE, area_id: CRAG, storage_path: "probe/offline-probe-topo.png", created_at: "2026-10-01T00:00:00Z", created_by: null, alt: "Probe topo", caption: "Probe topo", topo_lines: [] }] });
  });
  await ctx.route(/\/storage\/v1\/object\/public\/topo-photos\/probe\//, (route) => { topoUrl = route.request().url(); return route.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: Buffer.from(PNG_B64, "base64") }); });

  const opened = await openRoute(page, CRAG_ROUTE);
  check(opened, "the crag climb opens at 390px (" + CRAG_NAME + ")");
  check((await overflow(page)) <= 1, "the route page does not run off a 390px screen", "overflow " + (await overflow(page)) + "px");
  await shot(page, "1-route-online");
  const saved = await saveHere(page);
  check(saved, "Save offline finishes and the page says Saved offline");
  await sleep(1500);
  let d = await dbDump(page);
  const p = d.pack[0] || {};
  check(p.walkIn === 12, "the crag's walk-in line was stored (12 points)", JSON.stringify(p));
  check(d.media.some((m) => m.kind === "topo" && m.pack), "the topo image was stored on the device", JSON.stringify(d.media));
  const til = d.tiles[0] || {};
  check(til.n > 0, "map tiles were stored (" + til.n + " of " + til.total + ")", JSON.stringify(til));
  await shot(page, "1-route-saved");

  // ───────────────────────────── 2. cut the network and reload ───────────────────────────────────
  console.log("\n2. NETWORK CUT (Chrome offline), app RELOADED cold:");
  await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready).catch(() => {});
  await sleep(8000); // the service worker precaches the shell after it activates
  await ctx.unrouteAll({ behavior: "ignoreErrors" });
  // Chrome's own HTTP cache would hand back the online tiles it saw a minute ago. Off, so a tile that
  // draws can only have come from the app's saved copy.
  await (await ctx.newCDPSession(page)).send("Network.setCacheDisabled", { cacheDisabled: true });
  await ctx.setOffline(true);
  let shell = true;
  try { await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 }); } catch (e) { shell = false; console.log("   reload threw: " + e.message.split("\n")[0]); }
  const booted = shell && await waitText(page, /Logbook|View as guest/, 30000);
  check(booted, "the app opens with no network (service worker shell)");
  if (await waitText(page, /View as guest/, 3000)) await clickText(page, "View as guest", { exact: false });
  await shot(page, "2-offline-home");

  check(await clickText(page, "Logbook"), "Logbook is reachable from the phone's bar");
  await sleep(1500);
  await clickText(page, "Saved");
  await sleep(800);
  check(await clickText(page, "Offline"), "Saved has an Offline chip");
  const rowOk = await waitText(page, new RegExp(CRAG_NAME), 30000);
  check(rowOk, "the saved climb is listed by name with no network");
  const t2 = await text(page);
  check(/Saved offline · 1/i.test(t2), "the heading counts the one row");
  check(/1 topo/.test(t2), "the row says a topo came with it", (t2.match(/Saved [^\n]*\n[^\n]*/) || [""])[0]);
  check(/Swipe a climb left to remove it/.test(t2), "the phone shows the swipe hint");
  check((await overflow(page)) <= 1, "Logbook › Saved › Offline does not run off a 390px screen", "overflow " + (await overflow(page)) + "px");
  await shot(page, "2-logbook-offline");

  // open it
  await page.evaluate((name) => { const b = [...document.querySelectorAll("button")].find((e) => e.textContent.includes(name) && /Saved /.test(e.textContent)); if (b) b.click(); }, CRAG_NAME);
  const opened2 = await waitText(page, /No service\./, 40000);
  check(opened2, "tapping the row opens the route page, with the No service line");
  await sleep(6000);
  const t3 = await text(page);
  check(/This is the copy saved on this device/.test(t3), "the line gives the age of the saved copy");
  const mapState = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll(".leaflet-tile")];
    const loaded = tiles.filter((i) => i.complete && i.naturalWidth > 0);
    const paths = [...document.querySelectorAll(".leaflet-overlay-pane path, .leaflet-overlay-pane canvas")];
    return { tiles: tiles.length, loaded: loaded.length, local: loaded.filter((i) => /^(blob:|data:)/.test(i.src)).length, lines: paths.length };
  });
  const zt = await savedTilesDraw(page);
  check(zt.map && zt.saved > 0, "zoomed out with no network, the route map draws tiles saved on the device (" + zt.saved + " of " + zt.loaded + " drawn)", JSON.stringify(zt));
  check(mapState.lines > 0, "a line is drawn on the map offline (the walk-in)", JSON.stringify(mapState));
  check(/walk[- ]in|Walk in/i.test(t3), "the page names the walk in");
  await waitText(page, /TOPO/, 10000);
  for (let i = 0; i < 40 && /Loading topo photos/.test(await text(page)); i++) await sleep(1000);
  const topo = await page.evaluate(() => { const i = [...document.querySelectorAll("img")].find((x) => /Probe topo/.test(x.alt || "")); return i ? { local: /^blob:/.test(i.src), loaded: i.complete && i.naturalWidth > 0 } : null; });
  check(topo && topo.local && topo.loaded, "the saved topo draws from the device", JSON.stringify(topo));
  check((await overflow(page)) <= 1, "the offline route page does not run off a 390px screen", "overflow " + (await overflow(page)) + "px");
  await shot(page, "2-route-offline");
  await clickText(page, "Conditions");
  check(await waitText(page, /The forecast needs a connection\./, 15000), "Conditions shows the one forecast card");
  await shot(page, "2-conditions-offline");

  // ───────────────────────────── 3. swipe to remove ─────────────────────────────────────────────
  console.log("\n3. SWIPE the row left to remove it:");
  await clickText(page, "Logbook"); await sleep(1500); await clickText(page, "Saved"); await sleep(600); await clickText(page, "Offline");
  await waitText(page, new RegExp(CRAG_NAME), 20000);
  const swiped = await page.evaluate(async (name) => {
    const btn = [...document.querySelectorAll("button")].find((e) => e.textContent.includes(name) && /Saved /.test(e.textContent));
    if (!btn) return "no row";
    let el = btn; while (el && !(el.style && /pan-y/.test(el.style.touchAction || ""))) el = el.parentElement;
    if (!el) return "no swipe surface";
    const r = el.getBoundingClientRect(), y = r.top + r.height / 2;
    const ev = (type, x) => { const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === "touchend" ? [] : [t], targetTouches: type === "touchend" ? [] : [t], changedTouches: [t] })); };
    const x0 = r.right - 30;
    ev("touchstart", x0);
    for (let dx = 20; dx <= 240; dx += 20) { ev("touchmove", x0 - dx); await new Promise((q) => setTimeout(q, 16)); }
    ev("touchend", x0 - 240);
    return "swiped";
  }, CRAG_NAME);
  check(swiped === "swiped", "the row takes a left swipe", swiped);
  check(await waitText(page, /Nothing saved offline yet/, 15000), "the list empties and says how to save one");
  await sleep(1000);
  d = await dbDump(page);
  check(d.pack.length === 0, "the saved climb is gone from the device");
  check(!d.media.some((m) => m.pack), "the images its save stored are gone too", JSON.stringify(d.media));
  check(d.tiles.every((t) => t.n === 0) || d.tiles.length === 0, "its map tiles are gone", JSON.stringify(d.tiles));
  await shot(page, "3-after-swipe");
  await ctx.close();

  // ───────────────────────────── 4. the map cannot download ─────────────────────────────────────
  console.log("\n4. A SAVE WHOSE MAP CANNOT DOWNLOAD keeps the page:");
  ({ ctx, page } = await newPhone());
  await ctx.route(/basemap\.nationalmap\.gov/, (route) => route.abort());
  check(await openRoute(page, PEAK_ROUTE), "the alpine climb opens at 390px");
  const sawToast = await saveAndCatch(page, /The map didn.t download/, 120000);
  check(sawToast, "the toast says the page is saved and the map did not download");
  check(await waitText(page, /Saved offline · map not saved/, 20000), "the button row reads Saved offline · map not saved");
  check(await clickText(page, "Retry") || (await text(page)).includes("Retry"), "Retry is offered");
  await sleep(1500);
  d = await dbDump(page);
  check(d.pack.length === 1, "the climb is still on the device (it used to be deleted whole)", JSON.stringify(d.pack));
  check(d.media.filter((m) => m.pack).length === 3, "its 3 photos were still saved", JSON.stringify(d.media));
  await shot(page, "4-map-failed");
  await ctx.close();

  // ───────────────────────────── 5. the device is full ───────────────────────────────────────────
  console.log("\n5. A FULL DEVICE says so and keeps what fit:");
  ({ ctx, page } = await newPhone());
  await ctx.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v) { if (this.name === "media") throw new DOMException("The quota has been exceeded.", "QuotaExceededError"); return put.apply(this, arguments); };
  });
  check(await openRoute(page, PEAK_ROUTE), "the alpine climb opens");
  check(await saveAndCatch(page, /This device is full: 0 of 3 images saved/, 120000), "the toast says the device is full and how many images landed (0 of 3)");
  await waitText(page, /Saved offline/, 60000);
  d = await dbDump(page);
  check(d.pack.length === 1 && d.media.length === 0, "the page is saved, and no image is claimed", JSON.stringify({ pack: d.pack.length, media: d.media.length }));
  await ctx.close();

  // ───────────────────────────── 6. an alpine climb: shared track, photos, saved tiles ───────────
  console.log("\n6. AN ALPINE CLIMB with a shared track on one of its reports, then the network cut:");
  ({ ctx, page } = await newPhone());
  let rep1 = null;
  page.on("response", async (res) => {
    const u = res.url();
    if (rep1 || !/\/rest\/v1\/climb_logs\?/.test(u) || /gpx_track=not/.test(u) || !u.includes(PEAK_ROUTE)) return;
    try { const j = await res.json(); if (Array.isArray(j) && j[0] && j[0].id && j[0].user_id) rep1 = { id: j[0].id, user_id: j[0].user_id, date: j[0].date_climbed }; } catch (e) { /* not a report list */ }
  });
  await ctx.route(/\/rest\/v1\/climb_logs\?.*gpx_track=not\.is\.null/, async (route) => {
    for (let i = 0; i < 40 && !rep1; i++) await sleep(250);
    if (!rep1) return route.continue();
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
      json: [{ id: rep1.id, user_id: rep1.user_id, date_climbed: rep1.date, car_to_car_minutes: 615, // The stored shape (lib/routeTracks.js): { pts: [[lat, lng, elevation ft, seconds], ...] }.
      gpx_track: { pts: Array.from({ length: 40 }, (_, i) => [48.7705 + i * 0.0002, -121.8960 + i * 0.0021, 3700 + i * 180, i * 900]) } }] });
  });
  check(await openRoute(page, PEAK_ROUTE), "the alpine climb opens at 390px");
  check(await saveHere(page), "Save offline finishes");
  await sleep(1500);
  d = await dbDump(page);
  check((d.pack[0] || {}).tracks === 1, "the shared track was stored with the climb", JSON.stringify(d.pack));
  check(d.media.filter((m) => m.pack).length === 3, "its 3 photos were stored", JSON.stringify(d.media));
  await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready).catch(() => {});
  await sleep(8000);
  await ctx.unrouteAll({ behavior: "ignoreErrors" });
  await (await ctx.newCDPSession(page)).send("Network.setCacheDisabled", { cacheDisabled: true });
  await ctx.setOffline(true);
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  if (await waitText(page, /View as guest/, 5000)) await clickText(page, "View as guest", { exact: false });
  await waitText(page, /Logbook/, 30000);
  await clickText(page, "Logbook"); await sleep(1500); await clickText(page, "Saved"); await sleep(600); await clickText(page, "Offline");
  check(await waitText(page, /Coleman.Deming Glacier/, 30000) && /3 photos/.test(await text(page)), "the Logbook row lists it with 3 photos, no network");
  await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => /Coleman.Deming/.test(e.textContent) && /Saved /.test(e.textContent)); if (b) b.click(); });
  check(await waitText(page, /No service\./, 40000), "it opens with the No service line");
  await clickText(page, "Plan");
  await sleep(9000);
  const t6 = await text(page);
  const map6 = await page.evaluate(() => { const tl = [...document.querySelectorAll(".leaflet-tile")]; const ld = tl.filter((i) => i.complete && i.naturalWidth > 0); return { tiles: tl.length, loaded: ld.length, local: ld.filter((i) => /^(blob:|data:)/.test(i.src)).length }; });
  void map6;
  const zt6 = await savedTilesDraw(page);
  check(zt6.map && zt6.saved > 0, "zoomed out with no network, the Plan tab's map draws tiles saved on the device (" + zt6.saved + " of " + zt6.loaded + " drawn)", JSON.stringify(zt6));
  check(!/Couldn.t load[^\n]*track/i.test(t6), "the tracks list does not say it failed to load");
  check(/GPS track · /.test(t6), "the saved shared track is listed on its report's row (" + ((t6.match(/GPS track · [^\n]*/) || [""])[0]) + ")", "no GPS track row on the Plan tab");
  check(!/GPS tracks couldn.t load/.test(t6), "and the list does not say GPS tracks couldn't load");
  await shot(page, "6-alpine-plan-offline");
  await clickText(page, "Photos");
  await sleep(4000);
  const ph6 = await page.evaluate(() => [...document.querySelectorAll("img")].filter((i) => /test photo/.test(i.alt || "") && i.offsetParent !== null).map((i) => ({ local: /^blob:/.test(i.src), ok: i.complete && i.naturalWidth > 0 })));
  check(ph6.length >= 3 && ph6.every((x) => x.local && x.ok), "the Photos tab draws all 3 photos from the device", JSON.stringify(ph6));
  await shot(page, "6-alpine-photos-offline");
  await ctx.close();
} catch (e) {
  bad++; console.log("  FAIL the probe itself threw: " + (e && e.stack || e));
} finally {
  await browser.close();
}
console.log("\nprobe-offline-saved-climb: " + pass + " ok, " + bad + " failed");
process.exit(bad ? 1 : 0);
