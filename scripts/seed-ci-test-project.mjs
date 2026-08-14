#!/usr/bin/env node
// Seed the MINIMAL catalog a check:signed-in run needs, into a dedicated CI Supabase project.
//
// check:signed-in is the only guard not in CI, because CI must not hold the production
// service key (see EXCLUDED in scripts/check-guard-wiring.mjs). The way to close that without
// weakening it is a throwaway project whose service key has no production blast radius — this
// script fills that project with just enough catalog for the walk to mean something.
//
// It is NOT a catalog import. The live DB holds ~205,000 routes; the walk needs the handful
// its fixture pins, and nothing else. Loading more would make CI slow and prove no more.
//
// WHAT THE WALK ACTUALLY NEEDS, and why each row is here:
//
//   scripts/lib/ui-fixture.mjs pins ROUTE_ID = "wa_mount_baker_north_ridge" — it hangs the
//   fixture crew, an objective and a climb log off that id, so the row must exist or the
//   fixture's inserts fail on the foreign key. check-signed-in.mjs then asserts the crew card
//   renders "North Ridge", so the row's NAME is load-bearing too, not just its id.
//
//   The Climbs tab reads areas/routes under VITE_USE_DB, and `areas` enforces leaf-XOR-parent
//   (trg_areas_leaf_xor): an area may hold child AREAS or direct ROUTES, never both. So the
//   tree here is world > country > state > range > peak, with routes only on the leaf.
//
// USAGE, against the TEST project only:
//   CI_SUPABASE_URL=https://<test>.supabase.co \
//   CI_SUPABASE_SERVICE_KEY=<test service key> \
//   node scripts/seed-ci-test-project.mjs
//
// It REFUSES to run against the URL in .env.local, because the one unrecoverable mistake here
// is pointing a seeding script at production. Idempotent: every write is an upsert on the
// primary key, so re-running after a partial failure converges rather than duplicating.

import { readFileSync, existsSync } from "node:fs";

const URL_ = process.env.CI_SUPABASE_URL;
const KEY = process.env.CI_SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) {
  console.error("CI_SUPABASE_URL and CI_SUPABASE_SERVICE_KEY must both be set, and must name the TEST project.");
  console.error("Deliberately NOT read from .env/.env.local — those hold production, and this script writes.");
  process.exit(1);
}

// Fail closed against the obvious catastrophe. A seeding script that can be pointed at
// production by an inherited env var is a script that eventually is.
for (const f of [".env", ".env.local"]) {
  if (!existsSync(f)) continue;
  const prod = (readFileSync(f, "utf8").match(/VITE_SUPABASE_URL\s*=\s*(\S+)/) || [])[1];
  if (prod && prod.replace(/\/+$/, "") === URL_.replace(/\/+$/, "")) {
    console.error(`REFUSING TO RUN — CI_SUPABASE_URL matches the VITE_SUPABASE_URL in ${f}, i.e. production.`);
    console.error("This script writes. Point it at the dedicated test project.");
    process.exit(1);
  }
}

const rest = async (path, body) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      // merge-duplicates resolves on the PRIMARY KEY, which is what makes this idempotent.
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (r.status >= 300) throw new Error(`${path} -> ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
};

// world > country > state > range > peak. Only the leaf carries routes, per the leaf-XOR
// invariant the schema enforces with a trigger.
const AREAS = [
  { id: "world", name: "World", parent_id: null, area_type: "world" },
  { id: "usa", name: "United States", parent_id: "world", area_type: "country" },
  { id: "wa", name: "Washington", parent_id: "usa", area_type: "state" },
  { id: "wa_north_cascades", name: "North Cascades", parent_id: "wa", area_type: "range" },
  { id: "wa_mount_baker", name: "Mount Baker", parent_id: "wa_north_cascades", area_type: "peak", lat: 48.7767, lng: -121.8144 },
];

// The pinned route, plus two siblings so the route LIST is a list rather than a single row —
// a one-row list is a shape the app renders differently, and CI should not be the only place
// that shape is ever exercised.
const ROUTES = [
  { id: "wa_mount_baker_north_ridge", area_id: "wa_mount_baker", name: "North Ridge", grade: "AI3", grade_num: null, pitches: null, discipline: "alpine" },
  { id: "wa_mount_baker_coleman_deming", area_id: "wa_mount_baker", name: "Coleman-Deming Route", grade: "Grade II", grade_num: null, pitches: null, discipline: "mountaineering" },
  { id: "wa_mount_baker_easton_glacier", area_id: "wa_mount_baker", name: "Easton Glacier", grade: "Grade II", grade_num: null, pitches: null, discipline: "mountaineering" },
];

const run = async () => {
  console.log(`seeding ${URL_}`);
  // Parents before children: areas_set_path derives ltree from parent_id, and a child
  // inserted first has no parent to derive from.
  for (const a of AREAS) {
    await rest("areas", a);
    console.log(`  area  ${a.id}`);
  }
  await rest("routes", ROUTES);
  for (const r of ROUTES) console.log(`  route ${r.id}  ${JSON.stringify(r.name)}`);

  // Re-read rather than trust the 200. A PostgREST write can report success and change
  // nothing when RLS rejects every row; the service key should bypass RLS, but "should" is
  // not evidence, and this is the one check that would notice a wrong key.
  const check = await fetch(`${URL_}/rest/v1/routes?id=eq.wa_mount_baker_north_ridge&select=id,name,area_id`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  }).then((r) => r.json());
  if (!Array.isArray(check) || check.length !== 1 || check[0].name !== "North Ridge") {
    console.error(`\nVERIFY FAILED — read back ${JSON.stringify(check)}.`);
    console.error("check:signed-in asserts the crew card renders \"North Ridge\"; without this row it cannot.");
    process.exit(1);
  }
  console.log(`\nok — ${AREAS.length} areas, ${ROUTES.length} routes; the pinned route reads back correctly.`);
};

run().catch((e) => { console.error("\nseed FAILED:", e.message); process.exit(1); });
