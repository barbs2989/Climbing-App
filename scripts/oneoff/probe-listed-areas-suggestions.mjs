// PROBE: Listed areas › "Suggested from your climbs" (owner note 2026-11-26). Hand-run against a dev server.
//
//   node scripts/oneoff/probe-listed-areas-suggestions.mjs [baseUrl] [accountsFile]
//
// Signs in as the manual-test account Avery (scripts/manual-test-accounts.mjs), opens Menu › Listed areas, and checks:
//  1. the suggestions are ONE closed dropdown (aria-expanded=false), counted, with no area rows drawn until it opens;
//  2. opened, every row names WHY it is offered ("N logged climbs", "N saved climbs", "Saved area");
//  3. the areas offered are EXACTLY the expected set, computed here independently from the DB (Avery's climb_logs,
//     saved routes and saved_areas -> routes.area_id -> a wall folded to its crag, minus state/country/world and
//     what Avery is already listed at). The app's set is limited to the routes it loaded, so a MISSING area is
//     reported, not failed, when the expected set is larger than 20;
//  4. "+ List" on a row opens the listing form for THAT area; Back returns to the list with the dropdown still there.
// It never saves a listing.
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { tapMenuItem } from "../lib/menu-screens.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

assertQuietBox("probe-listed-areas-suggestions.mjs");

const BASE = process.argv[2] || "http://localhost:5173/Climbing-App/";
const ACC = JSON.parse(readFileSync(process.argv[3] || "manual-test-accounts.local", "utf8")).accounts[0];
const SH = headers(requireServiceKey());
const get = async (p) => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: SH }); if (!r.ok) throw new Error(p + " -> " + r.status + " " + (await r.text()).slice(0, 200)); return r.json(); };

const tok = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: anonKey(), "content-type": "application/json" }, body: JSON.stringify({ email: ACC.email, password: ACC.password }) });
if (!tok.ok) throw new Error("sign-in failed " + tok.status);
const session = await tok.json();
const uid = session.user.id;

// ---- the expected set, from the DB alone ----
const logs = await get(`climb_logs?select=route_id&user_id=eq.${uid}`);
let savedRoutes = [];
try { savedRoutes = (await get(`objectives?select=route_id&user_id=eq.${uid}`)).map((r) => r.route_id); } catch (e) { console.log("(saved routes not read: " + e.message.slice(0, 80) + ")"); }
let savedAreas = [];
try { savedAreas = (await get(`saved_areas?select=area_id&user_id=eq.${uid}`)).map((r) => r.area_id); } catch (e) { console.log("(saved areas not read: " + e.message.slice(0, 80) + ")"); }
let listedIds = new Set();
try { listedIds = new Set((await get(`partner_areas?select=area_id&user_id=eq.${uid}`)).map((r) => r.area_id)); } catch (e) { console.log("(listings not read: " + e.message.slice(0, 80) + ")"); }
const rids = [...new Set(logs.map((l) => l.route_id).concat(savedRoutes))];
const routes = rids.length ? await get(`routes?select=id,area_id&id=in.(${rids.map(encodeURIComponent).join(",")})`) : [];
const aIds = [...new Set(routes.map((r) => r.area_id).concat(savedAreas))];
const areas = aIds.length ? await get(`areas?select=id,name,area_type,parent_id&id=in.(${aIds.map(encodeURIComponent).join(",")})`) : [];
const pIds = [...new Set(areas.filter((a) => a.area_type === "wall" && a.parent_id).map((a) => a.parent_id))];
const parents = pIds.length ? await get(`areas?select=id,name,area_type&id=in.(${pIds.map(encodeURIComponent).join(",")})`) : [];
const byId = Object.fromEntries(areas.concat(parents).map((a) => [a.id, a]));
const NO = new Set(["world", "country", "state"]);
const expected = new Set();
for (const a of areas) { const t = a.area_type === "wall" && a.parent_id ? byId[a.parent_id] : a; if (!t || NO.has(t.area_type) || listedIds.has(t.id)) continue; expected.add(t.name); }
console.log(`DB: ${logs.length} logs, ${savedRoutes.length} saved routes, ${savedAreas.length} saved areas, ${listedIds.size} listings -> ${expected.size} expected suggestion(s): ${[...expected].join(", ")}`);

// ---- the screen ----
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [STORAGE_KEY, JSON.stringify(sessionForStorage(session))]);
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
let fails = 0; const fail = (m) => { fails++; console.log("FAIL " + m); }; const ok = (m) => console.log("ok   " + m);
if (!(await tapMenuItem(page, "Listed areas", 4000))) { fail("no Listed areas in the Menu"); await browser.close(); process.exit(1); }
const dlg = page.locator('[role="dialog"][aria-label="My listed areas"]');
await dlg.waitFor({ timeout: 15000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + "/closed.png" : "/dev/null" }).catch(() => {});
const tog = dlg.locator('button[aria-controls="suggested-areas"]');
if (!(await tog.count())) { expected.size ? fail("no Suggested dropdown, but " + expected.size + " expected") : ok("no suggestions expected, none drawn"); await browser.close(); process.exit(fails ? 1 : 0); }
const label = (await tog.innerText()).split("\n")[0];
(await tog.getAttribute("aria-expanded")) === "false" ? ok("dropdown starts closed: " + label) : fail("dropdown starts open");
(await dlg.locator("#suggested-areas").count()) === 0 ? ok("no suggestion rows drawn while closed") : fail("rows drawn while closed");
const box = await tog.boundingBox(); box && box.height >= 44 ? ok("toggle drawn " + Math.round(box.height) + "px tall") : fail("toggle under 44px");
await tog.click(); await page.waitForTimeout(500);
(await tog.getAttribute("aria-expanded")) === "true" ? ok("opens on tap") : fail("did not open");
await page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + "/open.png" : "/dev/null", fullPage: false }).catch(() => {});
const rows = await dlg.locator("#suggested-areas > div[style]").filter({ has: page.locator("button") }).evaluateAll((els) => els.map((e) => { const s = e.querySelectorAll("span span"); return { name: s[0] ? s[0].textContent : "", sub: s[1] ? s[1].textContent : "" }; }));
const n = Number((label.match(/·\s*(\d+)/) || [])[1]);
rows.length === n ? ok(`count in the label (${n}) = rows drawn`) : fail(`label says ${n}, ${rows.length} rows`);
for (const r of rows) /(\d+ logged climbs?|\d+ saved climbs?|Saved area)/.test(r.sub) ? ok(`row "${r.name}" says why: ${r.sub}`) : fail(`row "${r.name}" gives no reason: ${r.sub}`);
const got = new Set(rows.map((r) => r.name));
const extra = [...got].filter((x) => !expected.has(x)), missing = [...expected].filter((x) => !got.has(x));
extra.length ? fail("offered but not expected: " + extra.join(", ")) : ok("every offered area is one of the climber's own");
missing.length ? (expected.size > 20 ? console.log("note missing (cap 20): " + missing.join(", ")) : fail("expected but not offered: " + missing.join(", "))) : ok("every expected area is offered");
if (rows.length) {
  const first = rows[0].name;
  await dlg.locator(`button[aria-label="List me at ${first}"]`).first().click(); await page.waitForTimeout(800);
  const head = await dlg.locator("div").filter({ hasText: /^List me here$|^Edit listing$/ }).count();
  const saveBtn = await dlg.getByRole("button", { name: "List me at " + first }).count();
  head && saveBtn ? ok(`+ List opened the listing form for "${first}"`) : fail("+ List did not open the form for " + first);
  await dlg.getByRole("button", { name: "← Back" }).click(); await page.waitForTimeout(800);
  (await dlg.locator('button[aria-controls="suggested-areas"]').count()) ? ok("Back returns to the list, dropdown still there") : fail("Back lost the dropdown");
}
await browser.close();
console.log(fails ? `${fails} FAILED` : "ALL OK");
process.exit(fails ? 1 : 0);
