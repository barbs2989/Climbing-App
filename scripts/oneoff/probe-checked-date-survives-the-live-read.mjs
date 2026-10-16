// Does the checked date survive the LIVE read and the real mapper?
//
// check:access-checked-line proves the render path with a fixture, and check:schema proves lib/db.js
// does not read a column the database lacks. Neither asks the question in between: does the app's
// own query actually RETURN this column, and does dbRouteToCamel carry it through?
//
// That gap is where a column dies silently. CLAUDE.md records the shape twice: a route query with an
// explicit column list drops anything not named in it, and dbRouteToCamel emits BOTH `rock` and
// `rockType` from one column, so patching the wrong name reports a healthy column as dead. A
// fixture-only proof would be green with the live path broken.
//
// Read-only, anon key — deliberately anon, because that is the role the app uses. A service-key read
// would prove the row exists while RLS hid it from every real climber.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

// The route-detail path selects "*" plus an areas embed. Mirrored here rather than narrowed: the
// question is whether THIS shape returns the column.
const SEL = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))";
const ID = "wa_little_sister_north_face";

const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${encodeURIComponent(SEL)}&id=eq.${ID}`,
  { headers: headers(anonKey()) });
if (!r.ok) { console.error(`FAIL — ${r.status} ${(await r.text()).slice(0, 160)}`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.error(`FAIL — the anon role cannot read ${ID}. Not a clean result: RLS or a\nmissing row would print identically to a missing column.`); process.exit(1); }

const row = rows[0];
const has = Object.prototype.hasOwnProperty.call(row, "access_checked_at");
console.log(`${has ? "ok    " : "FAIL  "}the app's own query shape returns access_checked_at`);
if (!has) { console.error(`\nThe column exists and the mapper reads it, but this query never returns it — the\ndate would be invisible to every climber. Check the select list.`); process.exit(1); }

const v = row.access_checked_at;
console.log(`${v ? "ok    " : "FAIL  "}${ID} carries a value: ${JSON.stringify(v)}`);
if (!v) { console.error(`\nStamped rows should carry a date. Either the stamp did not land or this row was\nnever stamped — re-run stamp-access-checked-for-todays-verifications.mjs.`); process.exit(1); }

/* The mapper is EXECUTED rather than grepped. `grep -c access_checked_at lib/db.js` returning 0
   would prove nothing anyway: dbRouteToCamel opens `return { ...r, ... }`, so every snake_case
   column reaches the app whether or not the mapper names it — the trap that made a session conclude
   `difficulty` was mapped by nothing. Run it, do not read it.
   And the camelCase line IS load-bearing here despite that spread, because accessCheckedLine reads
   route.accessCheckedAt: the spread delivers access_checked_at and nothing else would rename it.

   Bundled rather than imported: lib/db.js imports "./lib/supabase" with no extension, which node
   ESM refuses (ERR_MODULE_NOT_FOUND). Every sibling probe bundles for this reason. Only these two
   small modules are bundled, never RouteDetail.jsx — a 400,000-character read this does not need. */
const { execFileSync } = await import("node:child_process");
const fsm = await import("node:fs");
const pathm = await import("node:path");
const ROOT = pathm.resolve(pathm.dirname(new URL(import.meta.url).pathname), "../..");
const entry = pathm.join(ROOT, `.checked-entry-${process.pid}.mjs`);
const bundle = pathm.join(ROOT, `.checked-bundle-${process.pid}.mjs`);
const cleanup = () => { fsm.rmSync(entry, { force: true }); fsm.rmSync(bundle, { force: true }); };
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
try {
  fsm.writeFileSync(entry, [
    `export { dbRouteToCamel } from ${JSON.stringify(pathm.join(ROOT, "lib/db.js"))};`,
    `export { accessCheckedLine } from ${JSON.stringify(pathm.join(ROOT, "lib/road.js"))};`,
  ].join("\n"));
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
    "--define:import.meta.env={}", "--external:react", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + bundle], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { cleanup(); console.error("FAIL — esbuild could not bundle lib/db.js"); process.exit(1); }
const mod = await import(bundle + "?t=" + Date.now());
const { dbRouteToCamel, accessCheckedLine } = mod;
cleanup();
const camel = dbRouteToCamel(row);
const okCamel = camel.accessCheckedAt === v;
console.log(`${okCamel ? "ok    " : "FAIL  "}dbRouteToCamel carries it as accessCheckedAt`);
if (!okCamel) { console.error(`\nGot ${JSON.stringify(camel.accessCheckedAt)}, expected ${JSON.stringify(v)}`); process.exit(1); }


const line = accessCheckedLine(camel);
console.log(`${line ? "ok    " : "FAIL  "}the reader produces a line: ${JSON.stringify(line)}`);
process.exit(line ? 0 : 1);
