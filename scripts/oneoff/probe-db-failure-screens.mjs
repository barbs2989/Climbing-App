// What does a climber SEE when the database is down?
//
// Every browser guard here walks a HEALTHY backend. Supabase has returned 503 PGRST002 and
// 3s statement timeouts repeatedly in this project, and memory records the failure shape: a
// failed read that renders as an EMPTY STATE tells the user they have no data rather than
// that something broke. This looks, rather than assumes.
//
// Uses page.route to fail PostgREST reads. Nothing is written; production is untouched.
//
// WHAT IT MEASURED, 2026-08-19, and why the answer is "not here":
//
//   DEMO_AUTOLOGIN=1, every read 500  -> all six tabs render BYTE-IDENTICAL to healthy, and
//                                        only 4 PostgREST requests are made at all. Those
//                                        tabs are SEED-backed, so an outage is invisible.
//   DEMO_AUTOLOGIN off, every read 500 -> the sign-in gate, 181 chars. realAuthGate is live,
//                                        so a logged-out visitor never reaches a DB surface.
//
// So the question "what does a climber see when the database is down" is NOT answerable from
// a logged-out or demo walk: the DB-backed surfaces (area browser, route lists, crews, logs)
// only exist for a SIGNED-IN account. Answering it properly means layering this interception
// under check:signed-in's fixture (real accounts + service key), which is a different and
// larger piece of work than this probe.
//
// Kept because the negative result is the useful part: it rules out the two cheap walks and
// says exactly what the expensive one would have to do. It also documents that the main tabs
// are seed-backed, which is easy to forget when reading guard output that looks DB-shaped.
//
// NOTE ON NAVIGATION: `?zt=` is an OVERLAY-SCAFFOLD feature, injected by the guard vite
// configs. A plain `npx vite` has no scaffold, so `?zt=` does nothing and every request
// renders the default tab — which is how the first run of this probe measured Home six times
// and reported six identical screens. Tabs are driven by CLICKING the nav instead.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";

const claim = (start) => new Promise((res, rej) => {
  let p = start;
  const go = () => {
    if (p >= start + 40) return rej(new Error("no free port"));
    const s = net.createServer();
    s.once("error", () => { p++; go(); });
    s.once("listening", () => s.close(() => res(p)));
    s.listen(p, "127.0.0.1");
  };
  go();
});

const MODE = process.argv[2] || "500";           // 500 | schema | empty | none
const port = await claim(5410);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  // DEMO_AUTOLOGIN decides whether this probe measures anything. With it ON the app serves the
  // SEEDED demo, so the six main tabs render identically with the database dead — measured, 4
  // requests blocked and byte-identical output. Off, realAuthGate is live and the app is
  // genuinely DB-backed, which is the state a real climber is in.
  { stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: process.env.DEMO === "1" ? "true" : "" } });

const wait = async (u, n = 90) => { for (let i = 0; i < n; i++) { try { if ((await fetch(u)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 1000)); } return false; };
if (!await wait(base)) { server.kill(); throw new Error("dev server never came up"); }

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let blocked = 0;
if (MODE !== "none") {
  await page.route("**/rest/v1/**", async (route) => {
    blocked++;
    if (MODE === "empty") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    if (MODE === "schema") return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "PGRST002", message: "Could not query the database for the schema cache" }) });
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" }) });
  });
}

const errs = [];
page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));

const settle = async () => {
  let last = "", same = 0;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 700));
    const t = (await page.evaluate(() => document.body.innerText || "")).replace(/\d+/g, "#");
    if (t === last) { if (++same >= 3) break; } else { same = 0; last = t; }
  }
  return page.evaluate(() => document.body.innerText || "");
};

await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
const first = await settle();

// PROVE THE APP IS ON SCREEN before believing anything below. index.html's boot placeholder
// mirrors the real nav, so "Home is present" is satisfied by a blank app — the trap recorded
// in a-crashed-app-makes-negative-assertions-pass. The route list only exists in the real app.
const booted = /Climbs|Partners|Logbook/.test(first) && first.length > 300;
console.log(`\n=== PostgREST forced to: ${MODE} ===`);
console.log(`app on screen: ${booted ? "yes" : "NO — boot shell only, nothing below is meaningful"}  (${first.length} chars)\n`);

const TABS = ["Home", "Climbs", "Partners", "Crew", "Logbook", "Me"];
for (const t of TABS) {
  const el = page.locator(`text="${t}"`).last();
  if (await el.count()) { await el.click({ timeout: 5000 }).catch(() => {}); }
  const text = await settle();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const broken = /couldn't|could not|failed|error|try again|retry|unavailable|problem|went wrong|offline/i.test(text);
  const empty = /no .* yet|nothing here|none yet|get started|add your first|no results|no climbs|no crews/i.test(text);
  console.log(`${t.padEnd(8)} ${String(text.length).padStart(5)}ch  says-broken=${broken ? "YES" : "no "}  says-empty=${empty ? "YES" : "no "}`);
  console.log(`         ${JSON.stringify(lines.slice(2, 9))}`);
}
console.log(`\nblocked ${blocked} PostgREST request(s); page errors: ${errs.length}`);
errs.slice(0, 5).forEach((e) => console.log("  " + e));

await browser.close();
server.kill();
