// audit-0474-crew-hand-over-live.mjs — drives "Make organizer" (0474) on the LIVE site as two disposable
// real accounts in one crew (scripts/lib/ui-fixture.mjs), and asks the DATABASE after each step.
// Screenshots at 390 and 1440 go to the directory given as the first argument.
//   node scripts/oneoff/audit-0474-crew-hand-over-live.mjs <shots-dir>
// Hand-run: needs the service key (the fixture creates and deletes real accounts). AUDIT_SITE points it
// at another build (a local preview) instead of the live site.
//
// THE FIXTURE HOLDS THREE CREWS, and two are on the same climb. Every step therefore picks its card by
// the crew's MEET-UP PLACE ("Heliotrope Ridge TH"), never by position or by the climb's name: the first
// version scanned cards in order and photographed the crag crew's sheet as the "after" state.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, requireServiceKey, anonKey } from "../lib/supabase-env.mjs";

const SITE = process.env.AUDIT_SITE || "https://barbs2989.github.io/Climbing-App/";
const OUT = process.argv[2] || "audit-shots";
const MEET = "Heliotrope Ridge TH";
fs.mkdirSync(OUT, { recursive: true });
const SVC = requireServiceKey();
const log = (m) => console.log(m);
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ok    " : "  FAIL  ") + m); if (!c) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const db = async (q) => (await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } })).json();

const fixture = await createFixture(log);
let browser;
try {
  const crewId = fixture.crew.id;
  const tok = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anonKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email: fixture.mate.email, password: fixture.mate.password }),
  });
  const mateSession = await tok.json();
  if (!mateSession.access_token) throw new Error("could not sign in as the mate");
  const mateHandle = "@" + fixture.mate.username, ownerHandle = "@" + fixture.owner.username;

  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  const open = async (session, width, height) => {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 2 : 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [STORAGE_KEY, JSON.stringify(sessionForStorage(session))]);
    await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector('[aria-label="Primary"]', { timeout: 120000 });
    await sleep(2500);
    return { page, ctx, errs };
  };
  const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + ".png") });
  const text = (page) => page.evaluate(() => document.body.innerText);
  const hasButton = (page, t) => page.evaluate((t) => [...document.querySelectorAll("button")].some((b) => { const r = b.getBoundingClientRect(); return (b.textContent || "").trim() === t && r.width > 0; }), t);
  const clickText = async (page, t, last = false) => {
    const hit = await page.evaluate(({ t, last }) => {
      const els = [...document.querySelectorAll('button,[role="button"],a')].filter((e) => { const r = e.getBoundingClientRect(); return (e.textContent || "").trim() === t && r.width > 0 && r.height > 0; });
      const el = last ? els[els.length - 1] : els[0];
      if (!el) return false; el.scrollIntoView({ block: "center" }); el.click(); return true;
    }, { t, last });
    await sleep(900);
    return hit;
  };
  const goCrews = async (page) => {
    const hit = await page.evaluate(() => {
      const nav = document.querySelector('[aria-label="Primary"]');
      const b = nav && [...nav.querySelectorAll("button,a,[role=button],[role=tab]")].find((e) => /^Crews/.test((e.getAttribute("aria-label") || e.textContent || "").trim()));
      if (!b) return false; b.click(); return true;
    });
    await sleep(3500);
    return hit;
  };
  // Open the Crew sheet of THE crew: the card whose Meet-up step names the fixture's meet-up place.
  const openTargetSheet = async (page) => {
    const hit = await page.evaluate((MEET) => {
      const meets = [...document.querySelectorAll('[data-crew-step="meet"]')];
      const crews = [...document.querySelectorAll('[data-crew-step="crew"]')];
      const i = meets.findIndex((m) => (m.textContent || "").includes(MEET));
      if (i < 0 || !crews[i]) return { i, n: meets.length };
      crews[i].scrollIntoView({ block: "center" }); crews[i].click(); return { i, n: meets.length, ok: true };
    }, MEET);
    await sleep(1800);
    return hit;
  };
  // The roster rows of the open sheet: name text beside each status chip.
  const roster = (page) => page.evaluate(() => [...document.querySelectorAll('button[data-chip="status"]')].map((b) => { const row = b.parentElement; return { row: (row.textContent || "").replace(/\s+/g, " ").trim(), expanded: b.getAttribute("aria-expanded") }; }));
  const openMemberRow = async (page, handle) => {
    const hit = await page.evaluate((handle) => { const b = [...document.querySelectorAll('button[data-chip="status"]')].find((x) => (x.parentElement.textContent || "").includes(handle)); if (!b) return false; if (b.getAttribute("aria-expanded") !== "true") { b.scrollIntoView({ block: "center" }); b.click(); } return true; }, handle);
    await sleep(800);
    return hit;
  };
  const chipOn = async (page, handle) => { const t = await page.evaluate(() => { const x = document.body.innerText; const a = x.indexOf("MEMBERS"), b = x.indexOf("INVITE", a); return a < 0 ? "" : x.slice(a, b < 0 ? a + 400 : b); }); const you = t.indexOf("You"), h = t.indexOf(handle.slice(0, 9)), o = t.indexOf("Organizer"); if (o < 0 || you < 0 || h < 0) return "nobody"; const first = Math.min(you, h), second = Math.max(you, h); const who = o > second ? (second === you ? "you" : "member") : (first === you ? "you" : "member"); return who; };
  const closeSheet = async (page) => { await page.evaluate(() => { const x = [...document.querySelectorAll("button")].filter((b) => (b.getAttribute("aria-label") || "").trim() === "Close").pop(); if (x) x.click(); }); await sleep(900); };
  const sheetHead = (page) => page.evaluate(() => { const t = document.body.innerText; const i = t.indexOf("Crew size"); return i < 0 ? "" : t.slice(i, i + 60).replace(/\n/g, " "); });

  // ── A. the organizer, phone ──
  log("\nA. organizer at 390px");
  const o = await open(fixture.session, 390, 844);
  ok(await goCrews(o.page), "the Crews tab opens");
  let t = await openTargetSheet(o.page);
  ok(!!t.ok, `the handed-over-to-be crew's card is found by its meet-up place (card ${t.i} of ${t.n})`);
  ok((await sheetHead(o.page)).includes("2 of 4"), "its sheet is the right crew: " + await sheetHead(o.page));
  await shot(o.page, "01-owner-crew-sheet-390");
  ok(await openMemberRow(o.page, mateHandle), "the member's row opens");
  ok(await hasButton(o.page, "Make organizer"), "Make organizer is offered on the confirmed member's row");
  ok((await chipOn(o.page, mateHandle)) === "you", "the Organizer chip starts on the organizer's own row");
  await shot(o.page, "02-owner-member-options-390");
  const box = await o.page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => (x.textContent || "").trim() === "Make organizer"); const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), vw: innerWidth }; });
  ok(box.h >= 40 && box.right <= box.vw, `the button is ${box.w}×${box.h}px, inside a ${box.vw}px screen`);

  // ── B. the same state on desktop, before anything moves ──
  log("\nB. organizer at 1440px");
  const od = await open(fixture.session, 1440, 900);
  await goCrews(od.page);
  await openTargetSheet(od.page);
  await openMemberRow(od.page, mateHandle);
  ok(await hasButton(od.page, "Make organizer"), "Make organizer is offered at 1440px too");
  await shot(od.page, "03-owner-member-options-1440");
  await clickText(od.page, "Make organizer");
  await shot(od.page, "04-owner-confirm-1440");
  await clickText(od.page, "Cancel");
  await od.ctx.close();

  // ── C. the confirm sheet, and a cancel that changes nothing ──
  log("\nC. confirm sheet");
  await clickText(o.page, "Make organizer");
  await shot(o.page, "05-owner-confirm-390");
  let body = await text(o.page);
  ok(body.includes("Make " + mateHandle + " the organizer?"), "the sheet asks: Make " + mateHandle + " the organizer?");
  ok(/You stay in the crew as a member/.test(body), "…and says the organizer stays on as a member");
  const confirmColor = await o.page.evaluate(() => { const els = [...document.querySelectorAll("button")].filter((b) => (b.textContent || "").trim() === "Make organizer"); return getComputedStyle(els[els.length - 1]).backgroundColor; });
  ok(confirmColor === "rgb(42, 116, 222)", "the confirm button is the app's blue, not the red destructive one (" + confirmColor + ")");
  ok(await clickText(o.page, "Cancel"), "Cancel is offered");
  await sleep(1200);
  let row = (await db(`crews?id=eq.${crewId}&select=created_by,cap`))[0];
  ok(row.created_by === fixture.owner.id, "after Cancel the organizer has not moved (database)");

  // ── D. the hand-over ──
  log("\nD. hand over");
  await openMemberRow(o.page, mateHandle);
  await clickText(o.page, "Make organizer");
  ok(await clickText(o.page, "Make organizer", true), "the confirm button is tapped");
  await sleep(500);
  await shot(o.page, "06-owner-toast-390");
  body = await text(o.page);
  ok(body.includes(mateHandle + " is now the organizer"), "a toast says the member is now the organizer");
  await sleep(4000);
  row = (await db(`crews?id=eq.${crewId}&select=created_by,cap`))[0];
  ok(row.created_by === fixture.mate.id, "the database names the mate as organizer");
  ok(row.cap === 4, "the crew's size limit is untouched (4)");
  const members = await db(`crew_members?crew_id=eq.${crewId}&select=user_id,status,invited_by`);
  ok(members.length === 2 && members.every((m) => m.status === "confirmed"), "both climbers are still confirmed members");
  const msgs = await db(`crews_messages?crew_id=eq.${crewId}&select=body,user_id&order=created_at.desc&limit=3`);
  ok(Array.isArray(msgs) && msgs.some((m) => /is now the organizer of this crew/.test(m.body || "")), "the crew chat holds the hand-over line: " + JSON.stringify((msgs[0] || {}).body));
  // The SAME sheet, with no reload: the chip moved and the organizer's controls are gone.
  await shot(o.page, "07-owner-sheet-after-390");
  ok((await sheetHead(o.page)).includes("2 of 4"), "the open sheet is still this crew: " + await sheetHead(o.page));
  ok((await chipOn(o.page, mateHandle)) === "member", "the Organizer chip has MOVED to the member's row, without a reload (it is on: " + await chipOn(o.page, mateHandle) + ")");
  ok(!(await hasButton(o.page, "Make organizer")), "the old organizer is no longer offered Make organizer");
  ok(!(await o.page.evaluate(() => /LIMIT/.test(document.body.innerText))), "…nor the size-limit stepper");
  await closeSheet(o.page);

  // ── E. the new organizer's screen ──
  log("\nE. the new organizer (mate) at 390px");
  const m = await open(mateSession, 390, 844);
  await goCrews(m.page);
  t = await openTargetSheet(m.page);
  ok(!!t.ok, "the mate finds the same crew's card");
  ok((await sheetHead(m.page)).includes("2 of 4"), "its sheet is the right crew: " + await sheetHead(m.page));
  ok((await chipOn(m.page, ownerHandle)) === "you", "the mate's own row carries the Organizer chip");
  ok(await m.page.evaluate(() => /LIMIT/.test(document.body.innerText)), "the mate has the organizer's size-limit stepper");
  await openMemberRow(m.page, ownerHandle);
  ok(await hasButton(m.page, "Make organizer"), "the mate is offered Make organizer on the old organizer's row");
  await shot(m.page, "08-mate-sheet-390");
  await closeSheet(m.page);
  // the hand-over line in the mate's crew chat
  const chatOpened = await m.page.evaluate((MEET) => { const meets = [...document.querySelectorAll('[data-crew-step="meet"]')]; const i = meets.findIndex((x) => (x.textContent || "").includes(MEET)); const chats = [...document.querySelectorAll("button")].filter((b) => (b.textContent || "").trim() === "Crew chat"); if (i < 0 || !chats[i]) return false; chats[i].scrollIntoView({ block: "center" }); chats[i].click(); return true; }, MEET);
  await sleep(3000);
  await shot(m.page, "09-mate-crew-chat-390");
  ok(chatOpened && (await text(m.page)).includes("is now the organizer of this crew"), "the mate reads the hand-over line in the crew chat");
  await m.ctx.close();

  // ── F. the old organizer leaves without disbanding ──
  log("\nF. old organizer leaves");
  t = await openTargetSheet(o.page);
  ok(!!t.ok, "the old organizer reopens the crew's sheet");
  ok(await clickText(o.page, "Leave crew"), "Leave crew is offered");
  await shot(o.page, "10-owner-leave-confirm-390");
  body = await text(o.page);
  ok(/Your partners can still climb together/.test(body) && !/disbands/.test(body.slice(body.indexOf("Leave this crew?"))), "the confirmation is the MEMBER's: partners keep the crew, nothing about disbanding");
  await clickText(o.page, "Leave crew", true);
  await sleep(4000);
  await shot(o.page, "11-owner-after-leave-390");
  const crewLeft = await db(`crews?id=eq.${crewId}&select=id,created_by`);
  const memLeft = await db(`crew_members?crew_id=eq.${crewId}&select=user_id,status`);
  ok(crewLeft.length === 1 && crewLeft[0].created_by === fixture.mate.id, "the crew still exists, organized by the mate (database)");
  ok(memLeft.length === 1 && memLeft[0].user_id === fixture.mate.id, "…and only the old organizer's membership is gone");
  ok(o.errs.length === 0, "no page errors on the old organizer's screen" + (o.errs.length ? ": " + o.errs[0] : ""));
} catch (e) {
  console.log("  ERROR " + (e && e.stack || e));
  fails++;
} finally {
  if (browser) await browser.close().catch(() => {});
  const left = await fixture.cleanup();
  console.log(left.length ? "  LEFT BEHIND: " + left.join(", ") : "  fixture accounts removed");
}
console.log(fails ? "\n" + fails + " FAILED" : "\nall live hand-over checks hold");
process.exit(fails ? 1 : 0);
