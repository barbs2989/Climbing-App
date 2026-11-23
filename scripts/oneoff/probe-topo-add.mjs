// HAND-RUN PROBE (topo audit, 2026-11-23): add a topo photo as a signed-in climber, in the real app,
// with NOTHING written to the database. Every request to Supabase is intercepted in the browser:
// reads go through with the public key, every write is answered here. Run: node scripts/oneoff/probe-topo-add.mjs
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { NPX, NPX_PRE } from "../lib/npx.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-topo-add.mjs");

const OUT = process.env.PROBE_OUT || path.resolve("probe-out");
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const SB = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY;
const PORT = 5391;
const UID = "11111111-2222-4333-8444-555555555555";

// A 640x480 grey PNG, so the editor has a real image to draw on.
function png(w, h) {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 90 + (x * 80 / w | 0); raw[o + 1] = 100; raw[o + 2] = 110 + (y * 60 / h | 0); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PHOTO = png(640, 480);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 7200;
const token = b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ sub: UID, role: "authenticated", exp, aud: "authenticated", email: "probe@example.test" }) + ".x";
const user = { id: UID, aud: "authenticated", role: "authenticated", email: "probe@example.test", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const session = { access_token: token, refresh_token: "r", expires_in: 7200, expires_at: exp, token_type: "bearer", user };

const log = { storagePosts: [], topoInserts: 0, linePosts: 0, captionPatches: [], topoDeletes: 0, passedWrites: [], reports: [] };
const OTHER = "99999999-2222-4333-8444-555555555555";
let topos = []; let failNextLine = true;
const results = []; const ok = (name, pass, detail) => { results.push({ name, pass, detail }); console.log((pass ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : "")); };

const anon = await (await fetch(SB + "/rest/v1/routes?select=id,name&discipline=eq.trad&limit=1", { headers: { apikey: ANON, Authorization: "Bearer " + ANON } })).json();
const ROUTE = anon[0].id; console.log("route:", ROUTE, anon[0].name);

const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
for (let i = 0; ; i++) { try { const r = await fetch("http://127.0.0.1:" + PORT + "/Climbing-App/"); if (r.ok) break; } catch (e) { /* not up yet */ } if (i > 120) { server.kill(); throw new Error("vite did not start"); } await new Promise((r) => setTimeout(r, 1000)); }

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch (e) { /* ignore */ } }, ["climbmatch-auth", session]);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));

await page.route(SB + "/**", async (route) => {
  const req = route.request(); const url = new URL(req.url()); const m = req.method(); const p = url.pathname;
  const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (p.startsWith("/auth/v1/")) return json(p.endsWith("/user") ? user : session);
  if (p.startsWith("/storage/v1/object/public/topo-photos/") || p.startsWith("/storage/v1/render/")) return route.fulfill({ status: 200, contentType: "image/png", body: PHOTO });
  if (p.startsWith("/storage/v1/object/topo-photos/")) {
    if (m === "POST") { log.storagePosts.push(decodeURIComponent(p.slice("/storage/v1/object/topo-photos/".length))); return json({ Key: "topo-photos/x", Id: "x" }); }
    return json([]);
  }
  if (p === "/rest/v1/topos") {
    if (m === "GET") return json(topos);
    if (m === "POST") { log.topoInserts++; const b = req.postDataJSON(); const row = { id: "aaaaaaaa-0000-4000-8000-00000000000" + log.topoInserts, ...b, caption: null, created_by: UID, created_at: new Date().toISOString(), moderation: "visible", topo_lines: [] }; topos = [row, ...topos]; return json(row, 201); }
    if (m === "PATCH") { const b = req.postDataJSON(); log.captionPatches.push(b); topos = topos.map((t) => ({ ...t, ...b })); return json({ id: topos[0] && topos[0].id, ...b }); }
    if (m === "DELETE") { log.topoDeletes++; const id = (url.searchParams.get("id") || "").replace(/^eq\./, ""); const gone = topos.filter((t) => t.id === id).map((t) => ({ id: t.id })); topos = topos.filter((t) => t.id !== id); return json(gone); }
  }
  if (p === "/rest/v1/topo_lines" && m === "POST") {
    log.linePosts++;
    await new Promise((r) => setTimeout(r, 700)); // slow enough for a second tap to land
    if (failNextLine) { failNextLine = false; return json({ message: "probe: the line was refused", code: "42501" }, 403); }
    const b = req.postDataJSON(); const row = { id: "bbbbbbbb-0000-4000-8000-000000000001", ...b, created_by: UID, created_at: new Date().toISOString() };
    topos = topos.map((t) => t.id === b.topo_id ? { ...t, topo_lines: [row] } : t); return json(row, 201);
  }
  if (m === "GET" || m === "HEAD") { const h = { ...req.headers(), authorization: "Bearer " + ANON }; return route.continue({ headers: h }); }
  if (p === "/rest/v1/rpc/report_content") { log.reports.push(req.postDataJSON()); return json("cccccccc-0000-4000-8000-000000000001"); }
  log.passedWrites.push(m + " " + p); // never forwarded
  return json(p.startsWith("/rest/v1/rpc/") ? [] : [], 200);
});

const shot = (n) => page.screenshot({ path: path.join(OUT, n + ".png") });
try {
  await page.goto("http://127.0.0.1:" + PORT + "/Climbing-App/?route=" + encodeURIComponent(ROUTE), { waitUntil: "commit", timeout: 180000 });
  page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text().slice(0, 160)); });
  const add = page.getByRole("button", { name: /Add a topo photo|\+ Add photo/ }).first();
  await add.waitFor({ timeout: 90000 });
  // The probe account has accepted no policy version; the notice would sit over the editor.
  await page.addStyleTag({ content: "[data-probe-hide]{display:none !important}" });
  const hideNotice = () => page.evaluate(() => { for (const b of document.querySelectorAll("button")) if (/I accept/.test(b.textContent || "")) { let e = b; while (e.parentElement && getComputedStyle(e).position !== "fixed") e = e.parentElement; e.setAttribute("data-probe-hide", "1"); } });
  await page.getByRole("button", { name: /I accept/ }).waitFor({ timeout: 15000 }).catch(() => {});
  await hideNotice();
  await add.scrollIntoViewIfNeeded(); await shot("1-section");

  // 1. upload: a name Storage would refuse
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), add.click()]);
  await fc.setFiles({ name: "Capture d’écran 2026-11-23 à 10.11.12 #2.png", mimeType: "image/png", buffer: PHOTO });
  const dlg = page.getByRole("dialog", { name: /Draw this/ });
  await dlg.waitFor({ timeout: 30000 });
  const key = log.storagePosts[0] || "";
  ok("storage key is plain ASCII", /^[0-9a-f-]{36}\/[0-9a-f-]{36}-[A-Za-z0-9_-]+\.png$/.test(key), key);

  // 2. type a caption and do NOT press Save caption; draw two points
  await dlg.getByRole("textbox", { name: /Caption/ }).fill("North face from the notch, June");
  const frame = dlg.getByRole("application");
  await hideNotice(); await frame.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
  const pts = () => dlg.locator("[data-h^='point:']").count();
  const tapAt = async (fx, fy) => { const bb = await frame.boundingBox(); const x = bb.x + bb.width * fx, y = bb.y + bb.height * fy;
    const under = await page.evaluate(([px, py]) => { const e = document.elementFromPoint(px, py); return e ? (e.tagName + (e.getAttribute("role") ? "[" + e.getAttribute("role") + "]" : "") + " " + String(e.textContent || e.getAttribute("alt") || "").slice(0, 30)) + " | focus=" + (document.activeElement && document.activeElement.tagName) : "none"; }, [x, y]);
    await page.mouse.click(x, y); await page.waitForTimeout(250); const n = await pts(); console.log("  tap", fx, fy, "at", Math.round(x), Math.round(y), "under:", under, "-> points", n); return n; };
  const n1 = await tapAt(0.3, 0.7); const n2 = await tapAt(0.6, 0.25);
  ok("the first tap after typing a caption places a point", n1 === 1 && n2 === 2, "points after tap 1: " + n1 + ", after tap 2: " + n2);
  if (n2 < 2) await tapAt(0.5, 0.45);
  const save = dlg.getByRole("button", { name: /Save topo|Saving/ });
  await save.scrollIntoViewIfNeeded(); await shot("2-drawn");

  // 3. double-tap Save; the first attempt is refused. DOM clicks: the probe account's policy notice sits over the sheet's last row.
  await save.evaluate((el) => { el.click(); el.click(); });
  await page.waitForTimeout(250);
  ok("Save reads Saving… and is disabled mid-save", (await save.textContent()).includes("Saving") && await save.isDisabled());
  const alert = dlg.getByRole("alert").filter({ hasText: "refused" });
  await alert.waitFor({ timeout: 10000 }); await alert.scrollIntoViewIfNeeded(); await shot("3-refused");
  ok("a refused save is said INSIDE the sheet", await alert.isVisible(), (await alert.textContent()).slice(0, 90));
  ok("a double tap sent ONE line", log.linePosts === 1, "posts=" + log.linePosts);
  ok("the sheet stayed open with the drawing", await dlg.isVisible() && (await pts()) >= 2);

  // 4. retry succeeds; the unsaved caption went with it
  await save.evaluate((el) => el.click()); await dlg.waitFor({ state: "detached", timeout: 15000 });
  ok("the typed caption was saved with the line", log.captionPatches.some((b) => b.caption === "North face from the notch, June"), JSON.stringify(log.captionPatches));
  await page.waitForTimeout(600);
  ok("the topo is in the strip with its caption", await page.getByText("North face from the notch, June").first().isVisible());
  await page.getByText("North face from the notch, June").first().scrollIntoViewIfNeeded(); await shot("4-saved");
  ok("the photo was never taken down", log.topoDeletes === 0);

  // 5. a second photo, cancelled: it comes down
  await hideNotice(); await shot("4b-strip");
  const tile = page.locator("div[role='button']").filter({ hasText: /^\+\s*Add photo$/ }).first();
  console.log("  strip tiles found:", await page.locator("div[role='button']").filter({ hasText: /^\+\s*Add photo$/ }).count());
  const [fc2] = await Promise.all([page.waitForEvent("filechooser"), tile.click()]);
  await fc2.setFiles({ name: "IMG_2041.png", mimeType: "image/png", buffer: PHOTO });
  const dlg2 = page.getByRole("dialog", { name: /Draw this/ }); await dlg2.waitFor({ timeout: 30000 });
  await dlg2.getByRole("button", { name: "Cancel", exact: true }).evaluate((el) => el.click());
  await page.getByRole("button", { name: "Remove photo" }).evaluate((el) => el.click());
  await dlg2.waitFor({ state: "detached", timeout: 10000 }); await page.waitForTimeout(500);
  ok("cancelling a new photo removes it", log.topoDeletes === 1);
  ok("no write was forwarded to the database", true, "answered locally: " + (log.passedWrites.length ? [...new Set(log.passedWrites)].join(", ") : "none besides the topo calls"));

  // 5b. a photo that already shows its line goes up with nothing drawn on it
  const before = log.linePosts;
  // ...and somebody else's topo arrives with the next read, for the Report controls below
  topos = [...topos, { id: "dddddddd-0000-4000-8000-000000000001", area_id: "x", route_id: ROUTE, storage_path: OTHER + "/theirs.jpg", alt: "Their photo", caption: "Theirs", created_by: OTHER, created_at: "2026-01-02T00:00:00Z", moderation: "visible",
    topo_lines: [{ id: "eeeeeeee-0000-4000-8000-000000000001", topo_id: "dddddddd-0000-4000-8000-000000000001", route_id: ROUTE, points: [{ x: 20, y: 80 }, { x: 60, y: 20 }], pins: [], variants: [], variant_labels: [], label: "Their line", created_by: OTHER, created_at: "2026-01-02T00:00:00Z", moderation: "visible" }] }];
  const tile2 = page.locator("div[role='button']").filter({ hasText: /^\+\s*Add photo$/ }).first();
  const [fc3] = await Promise.all([page.waitForEvent("filechooser"), tile2.click()]);
  await fc3.setFiles({ name: "scanned-topo.png", mimeType: "image/png", buffer: PHOTO });
  const dlg3 = page.getByRole("dialog", { name: /Draw this/ }); await dlg3.waitFor({ timeout: 30000 });
  const post = dlg3.getByRole("button", { name: "Post photo without a line" });
  ok("with nothing drawn the button reads Post photo without a line, and is live", await post.isEnabled());
  await post.scrollIntoViewIfNeeded(); await shot("6-post-without-line");
  await post.evaluate((el) => el.click()); await dlg3.waitFor({ state: "detached", timeout: 15000 }); await page.waitForTimeout(700);
  ok("the photo is posted and NO line is stored", log.linePosts === before && log.topoDeletes === 1 && topos.some((t) => t.storage_path.includes("scanned-topo")), "line posts " + before + " -> " + log.linePosts);
  ok("it shows in the strip as a photo with no line yet", await page.getByRole("button", { name: /Open topo photo — no line drawn yet/ }).first().isVisible());

  // 5c. Report: never on your own, offered on somebody else's photo and line
  await page.getByRole("button", { name: /Open topo photo — no line drawn yet/ }).first().click();
  const viewer = page.getByRole("dialog", { name: "Topo" }); await viewer.waitFor({ timeout: 10000 });
  ok("your own photo has no Report control", (await viewer.getByRole("button", { name: /^Report this/ }).count()) === 0);
  await viewer.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Open topo photo: Their photo" }).click();
  await viewer.waitFor({ timeout: 10000 });
  const rp = viewer.getByRole("button", { name: "Report this photo" }), rl = viewer.getByRole("button", { name: "Report this line" });
  await rl.scrollIntoViewIfNeeded(); await shot("7-report-controls");
  ok("somebody else's photo offers Report this photo and Report this line", await rp.isVisible() && await rl.isVisible());
  await rl.click();
  const sheet = page.getByRole("dialog", { name: "Report this line" }); await sheet.waitFor({ timeout: 10000 });
  ok("Report this line opens the report sheet, on top (the viewer closed)", await sheet.isVisible() && (await viewer.count()) === 0);
  await sheet.getByRole("button", { name: "Spam or scam" }).click(); await shot("8-report-sheet");
  await sheet.getByRole("button", { name: /report/i }).last().click(); await page.waitForTimeout(800);
  ok("the report is filed against the LINE", log.reports.length === 1 && log.reports[0].p_kind === "topo_line" && log.reports[0].p_id === "eeeeeeee-0000-4000-8000-000000000001", JSON.stringify(log.reports[0] || null));

  // 6. signed out: asked before the picker opens
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.route(SB + "/**", (route) => { const m = route.request().method(); return m === "GET" || m === "HEAD" ? route.continue() : route.fulfill({ status: 200, contentType: "application/json", body: "[]" }); });
  await p2.goto("http://127.0.0.1:" + PORT + "/Climbing-App/?route=" + encodeURIComponent(ROUTE), { waitUntil: "commit", timeout: 180000 });
  const add2 = p2.getByRole("button", { name: /Add a topo photo|\+ Add photo/ }).first();
  const guest = p2.getByRole("button", { name: /guest/i }).first();
  await Promise.race([add2.waitFor({ timeout: 90000 }), guest.waitFor({ timeout: 90000 }).then(() => guest.click())]).catch(() => {});
  await add2.waitFor({ timeout: 90000 }).catch(async (e) => { await p2.screenshot({ path: path.join(OUT, "5-guest-stuck.png") }); throw e; });
  await add2.scrollIntoViewIfNeeded();
  let chooser = false; p2.once("filechooser", () => { chooser = true; });
  await add2.click(); await p2.waitForTimeout(800); await p2.screenshot({ path: path.join(OUT, "5-guest.png") });
  ok("a guest is asked to sign in BEFORE choosing a photo", !chooser && await p2.getByText("Sign in to add a topo photo.").isVisible());
} catch (e) {
  console.log("PROBE ERROR:", e.message); await shot("error").catch(() => {});
  results.push({ name: "probe ran to the end", pass: false });
} finally {
  await browser.close(); server.kill();
}
const bad = results.filter((r) => !r.pass);
console.log("\n" + (results.length - bad.length) + "/" + results.length + " passed");
process.exit(bad.length ? 1 : 0);
