// Does the route page claim a peak has only one route when the sibling READ failed?
//
// `RouteDetail` resolves the other lines on a peak as:
//
//   const {data:dbSibs}=useAreaRoutes(route.mountainId)          // `error` is DISCARDED
//   const cragSibs=USE_DB&&dbSibs ? dbSibs.map(dbRouteToCamel)
//                                 : ROUTES.filter(x=>x.mountainId===route.mountainId)
//   const sibs=cragSibs.filter(x=>x.id!==route.id)
//   ... sibs.length ? "Other established lines on this peak…"
//                   : "The only route catalogued on <peak> so far."
//
// `useAreaRoutes` throws on error, so a failed read leaves `dbSibs` undefined and the fallback
// filters the SEED array by a DB area id — which matches nothing. The page then states, as a fact
// about the catalog, that this is the only route on the mountain.
//
// WHY NO GUARD SEES IT, and both halves are needed to explain the silence:
//   1. check:outage opens the route page with `?zr=1`, which opens ROUTES[0] — a SEED route. On a
//      seed route the fallback is CORRECT (seed ids match seed ids), so the defect cannot appear
//      in that fixture at all. It needs a DB route, which is what every real user opens.
//   2. Even on the right route it would be masked: this sits on the Overview tab, where
//      `reportsUnavailable` already renders "Couldn't load…", so the screen says-broken=YES and
//      rule 1 passes while this sentence is false. The a-screen-is-a-mixture shape.
//
// `?debugRoute=<id>` opens a DB route directly. It fetches by `id`, while useAreaRoutes fetches by
// `area_id` — so failing ONLY requests carrying `area_id=eq.` isolates the sibling read and leaves
// the page itself loading normally. That precision is the whole probe.
import { chromium } from "playwright-core";

const SITE = process.env.SITE || "https://barbs2989.github.io/Climbing-App/";
const ROUTE = process.env.ROUTE || "ak_fudgecicle_chimney";
const LIE = /only route catalogued on/i;
const HONEST = /Other established lines on this peak/i;
const SAYS_BROKEN = /Couldn’t load the other routes on this peak/i;
const PENDING = /Checking for other routes on this peak/i;

const browser = await chromium.launch({ channel: "chrome", headless: true });
let bad = 0;

async function run(label, blockSiblings) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let blocked = 0, allowed = 0;
  await page.route("**/rest/v1/routes*", (r) => {
    const u = r.request().url();
    if (blockSiblings && u.includes("area_id=eq.")) {
      blocked++;
      return r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "probe" }) });
    }
    allowed++;
    return r.continue();
  });
  await page.goto(`${SITE}?debugRoute=${encodeURIComponent(ROUTE)}`, { waitUntil: "domcontentloaded", timeout: 120000 });

  // TEXT STABILITY IS THE WRONG SETTLE HERE, and it made an earlier run of this probe report the
  // unfixed copy against a build that HAD the fix. `isError` is false while react-query retries,
  // and the false sentence renders from the very first paint and does not change while those
  // retries run — so the text is perfectly stable throughout the window in which the app does not
  // yet know the read failed. The same trap check:outage records: the first screen walked is
  // evidence of nothing. Wait for the outage to become OBSERVABLE — a terminal phrasing — and only
  // fall back to stability if none arrives.
  let prev = "", txt = "", stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    txt = await page.innerText("body").catch(() => "");
    if (SAYS_BROKEN.test(txt) || HONEST.test(txt)) break;      // terminal, either direction
    stable = txt === prev ? stable + 1 : 0;
    prev = txt;
    if (stable >= 3 && i >= 16) break;                          // ~25s of retry budget first
  }

  const onRoute = /Log an ascent/i.test(txt);
  const lie = LIE.test(txt), honest = HONEST.test(txt);
  console.log(`\n--- ${label} ---`);
  console.log(`  sibling reads blocked=${blocked}  other routes-reads allowed=${allowed}`);
  console.log(`  on the route page: ${onRoute}   (${txt.length} chars)`);
  console.log(`  says "Other established lines on this peak": ${honest}`);
  console.log(`  says "The only route catalogued on …":        ${lie}`);
  console.log(`  says "Couldn’t load the other routes …":       ${SAYS_BROKEN.test(txt)}`);
  console.log(`  still "Checking for other routes …":           ${PENDING.test(txt)}`);
  if (lie) console.log(`  -> ${(txt.match(/The only route catalogued on [^\n]{0,80}/i) || [""])[0]}`);

  // Fail closed: a probe that never reached the route page proves nothing either way.
  if (!onRoute) { console.log(`  FAIL — never reached the route page; this run is evidence of nothing.`); bad++; }
  await ctx.close();
  return { lie, honest, onRoute };
}

const control = await run("CONTROL: every read succeeds", false);
const failing = await run("SIBLING READ FAILING (area_id=eq. only)", true);

console.log(`\n=== verdict ===`);
if (control.onRoute && !control.honest) {
  console.log(`INCONCLUSIVE — the control did not show the sibling section, so this route has no`);
  console.log(`siblings to lose. Pick a route whose area holds several (scripts/oneoff/pick-sibling-route.mjs).`);
  bad++;
} else if (failing.lie) {
  console.log(`DEFECT CONFIRMED — with only the sibling read failing, the page states as fact that this`);
  console.log(`is the only route on the peak. The control on the same route lists the others.`);
  process.exit(1);
} else if (failing.onRoute && control.onRoute) {
  console.log(`ok — the failed sibling read does not produce a false claim about the catalog.`);
}
process.exit(bad ? 1 : 0);
