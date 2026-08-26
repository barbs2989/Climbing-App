// Does a BARE route render correctly on the LIVE site, in a real browser?
//
// This shape is 99.5% of the catalog and it is covered today only two ways, neither of which is
// this one:
//   - `check:bare` renders it with `renderToStaticMarkup` — SSR, so effects never run. Its own
//     header says a `CountUp` tile renders its initial 0 there and must never be asserted on.
//   - `check:ui` walks exactly ONE route detail, and the route it samples is an ENRICHED one.
//     CLAUDE.md records that gap verbatim: "the shape almost every route actually has was the
//     one shape nothing rendered", which is how #641 and #655 shipped.
//
// So: load real bare routes on production, in Chrome, via the app's own `?debugRoute=<id>` deep
// link, walk every sub-tab, and look for the things SSR cannot see — uncaught errors, and the
// `NaN`/`undefined`/`null`/`[object Object]` leaks `check:ui` forbids.
//
// Read-only, no dev server, no secrets.
import { chromium } from "playwright-core";

const SITE = "https://barbs2989.github.io/Climbing-App/";
// BOTH families, because they gate differently and the first version of this probe only
// covered one. `catOf()` folds bouldering/sport/trad into the crag family, where `cragOnly` is
// true and the Plan tab is absent; scrambling is alpine-family, where Plan renders. Testing
// only crag routes would have left the branch that #641 lived in unwalked — the same
// discipline-gating trap CLAUDE.md records for `RouteGearCheck` and `check:field-renders`.
//
// Measured 2026-08-20: alpine, ice, mixed and mountaineering have NO fully-bare routes in the
// catalog — every one carries at least some enrichment — so scrambling is the only alpine-family
// discipline this can be asked of with real data.
const ROUTES = process.argv.slice(2).length ? process.argv.slice(2) : [
  "wa_corridor_traverse",   // bouldering V4      crag family
  "wa_nebula",              // sport 5.8          crag family
  "wa_spring_kitten",       // trad 5.10b         crag family (catOf folds trad in)
  "wa_gully_1",             // scrambling 3rd     ALPINE family — the only bare one available
];
// A CRAG route labels the conditions tab "Send Reports" (`cragOnly?"Send Reports":"Reports"`),
// so each entry lists every label it can carry. Getting this wrong is not a missed screen — the
// first run of this probe reported byte-identical character counts for Overview and "Reports",
// i.e. it counted a screen it never navigated to.
const SUBTABS = [["Overview"], ["Plan"], ["Reports", "Send Reports"], ["Safety"], ["Partners"], ["Photos"]];
// The leaks check:ui forbids in rendered copy. Word-bounded so a route named "Nullify" is safe.
const FORBIDDEN = /\bNaN\b|\bundefined\b|\bnull\b|\[object Object\]/;

const browser = await chromium.launch({ channel: "chrome", headless: true });
let problems = 0, screens = 0;

for (const id of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e && e.message || e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });

  await page.goto(`${SITE}?debugRoute=${id}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(9000);

  const opened = await page.evaluate(() => {
    const t = document.body.innerText || "";
    return { len: t.length, onRoute: /Overview/.test(t) && /Safety/.test(t) };
  });
  console.log(`\n=== ${id} ===  body=${opened.len}  route page=${opened.onRoute}`);
  if (!opened.onRoute) {
    console.log("  DID NOT OPEN — ?debugRoute did not reach the route page");
    problems++;
    await page.close();
    continue;
  }

  let prev = await page.innerText("body").catch(() => "");
  for (const labels of SUBTABS) {
    const sub = labels[0];
    // Click the BUTTON, not the first element whose text matches. `querySelectorAll` returns
    // document order, so a wrapping <div> with the same innerText comes first — and clicking a
    // parent does not fire the child button's handler. That is why "Send Reports" reported
    // "tapped" and then navigated nowhere.
    let tapped = false;
    for (const n of labels) {
      tapped = await page.evaluate((nm) => {
        const hit = [...document.querySelectorAll("button")]
          .filter((e) => (e.innerText || "").trim() === nm)
          .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; });
        if (!hit.length) return false;
        hit[0].click();
        return true;
      }, n);
      if (tapped) break;
    }
    if (!tapped) { console.log(`  ${sub.padEnd(9)} not present`); continue; }
    await page.waitForTimeout(2200);
    const txt = await page.innerText("body").catch(() => "");
    // Confirm with the app's OWN signal rather than a text diff: the sub-tab bar marks the
    // active tab with aria-current (#1041). A text diff cannot tell "the click missed" from
    // "this tab happens to render the same", and on a bare route several tabs are nearly empty.
    const active = await page.evaluate(() => {
      // Exclude fixed/sticky chrome. The PRIMARY nav also carries aria-current (it is the
      // app's oldest one, `aria-current={tab===n.id?"page":undefined}`), so an unfiltered query
      // returns the bottom nav's "Climbs" on every route page and every sub-tab reads as a
      // failure. Same nav-collision trap check:ui records for text matching.
      const b = [...document.querySelectorAll("button[aria-current]")]
        .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; })
        .find((e) => ["true", "page"].includes(e.getAttribute("aria-current")));
      return b ? (b.innerText || "").trim() : null;
    });
    if (!labels.includes(active)) {
      console.log(`  ${sub.padEnd(9)} NOT NAVIGATED — aria-current is ${JSON.stringify(active)}; not counted`);
      problems++;
      continue;
    }
    prev = txt;
    screens++;
    const m = txt.match(FORBIDDEN);
    // Report the sentence around a leak, not just that one happened — a bare count sends you
    // hunting through a 20,000-character screen.
    let where = "";
    if (m) {
      const i = txt.indexOf(m[0]);
      where = "  <-- " + JSON.stringify(txt.slice(Math.max(0, i - 70), i + 70).replace(/\s+/g, " "));
      problems++;
    }
    console.log(`  ${sub.padEnd(9)} ${String(txt.length).padStart(6)} chars${m ? "  LEAK " + m[0] + where : ""}`);
  }

  if (errors.length) {
    problems += errors.length;
    console.log(`  ${errors.length} page error(s):`);
    for (const e of [...new Set(errors)].slice(0, 4)) console.log(`     ${e.slice(0, 150)}`);
  }
  await page.close();
}

console.log(`\nwalked ${screens} bare-route screen(s) across ${ROUTES.length} route(s) on the live site`);
console.log(problems ? `${problems} problem(s) — see above.` : "no leaks, no page errors.");
await browser.close();
process.exit(problems ? 1 : 0);
