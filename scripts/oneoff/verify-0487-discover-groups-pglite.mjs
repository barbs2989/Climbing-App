// verify-0487-discover-groups-pglite.mjs — replays every migration into PGlite and asks Discover's questions of
// the database as real callers (0487): who is listed (public, visible, not yours), the search box, the state
// filter and 'Other', distance from a point, each sort, paging with a total, the chip counts, and that a
// signed-out caller gets nothing. No production database, no service key:
//   node scripts/oneoff/verify-0487-discover-groups-pglite.mjs
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";

const DIR = path.join(process.cwd(), "supabase", "migrations");
const db = new PGlite({ extensions: { ltree, pg_trgm, pgcrypto, uuid_ossp } });
// Same stand-ins as scripts/check-migration-replay.mjs, plus Supabase's default grants BEFORE the replay.
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create role authenticator noinherit; create role supabase_admin;
  create schema extensions; create schema auth; create schema storage;
  create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text,
    raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', email_confirmed_at timestamptz,
    last_sign_in_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
    is_anonymous boolean default false, deleted_at timestamptz, banned_until timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table storage.buckets (id text primary key, name text not null, owner uuid, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[], avif_autodetection boolean default false,
    created_at timestamptz default now(), updated_at timestamptz default now());
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
    name text, owner uuid, owner_id text, metadata jsonb, path_tokens text[], version text,
    created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
  create publication supabase_realtime;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
for (const f of fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  await db.exec("begin"); await db.exec(fs.readFileSync(path.join(DIR, f), "utf8")); await db.exec("commit");
}

const U = {
  ann: "00000000-0000-4000-8000-0000000000c1", bob: "00000000-0000-4000-8000-0000000000c2",
  cat: "00000000-0000-4000-8000-0000000000c3", dan: "00000000-0000-4000-8000-0000000000c4",
};
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())", [id, k + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, $2) on conflict (id) do nothing", [id, "Climber " + k]);
}
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok    " : "  FAIL  ") + msg); if (!cond) fails++; };
async function as(who, fn) {
  await db.exec("begin");
  try {
    if (who) { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [U[who]]); await db.exec("set local role authenticated"); }
    else { await db.query("select set_config('request.jwt.claim.sub', '', true)"); await db.exec("set local role anon"); }
    const r = await fn();
    await db.exec("commit");
    return { r };
  } catch (e) { await db.exec("rollback"); return { e }; }
}

// ── region_of_place: the cases regionOfPlace() in lib/db.js is written around ──
const REG = [["Seattle, WA", "Washington"], ["Seattle, Washington", "Washington"], ["Washington", "Washington"],
  ["Washington, DC", "District of Columbia"], ["Kansas City, Missouri", "Missouri"], ["Morgantown, West Virginia area", "West Virginia"],
  ["Squamish", null], ["", null], ["bellingham, wa", null], ["Squamish, BC", "British Columbia"], ["  Bend , OR ", "Oregon"]];
for (const [loc, want] of REG) {
  const got = (await db.query("select public.region_of_place($1) as r", [loc])).rows[0].r;
  ok(got === want, `region_of_place(${JSON.stringify(loc)}) = ${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
}

// ── Groups. Bob creates them all (the 0090 trigger seats him as owner), so Ann is a stranger to each. ──
const G = {};
async function mk(key, f) {
  const res = await as("bob", async () => {
    const id = (await db.query("select gen_random_uuid() as id")).rows[0].id;
    await db.query("insert into public.groups (id, name, blurb, location, disciplines, visibility, created_by) values ($1,$2,$3,$4,$5,$6,$7)",
      [id, f.name, f.blurb || null, f.location || null, f.disciplines || [], "public", U.bob]);
    return id;
  });
  if (res.e) { ok(false, "create group " + key + " — " + res.e.message); return; }
  G[key] = res.r;
}
await mk("index", { name: "Index Trad Crew", location: "Index, WA", disciplines: ["Trad"], blurb: "Granite cracks every weekend." });
await mk("smith", { name: "Smith Rock Sport", location: "Terrebonne, Oregon", disciplines: ["Sport"], blurb: "Tuff pockets." });
await mk("mtb", { name: "Mt Baker Alpine Club", location: "Bellingham, WA", disciplines: ["Alpine"] });
await mk("squam", { name: "Chief Climbers", location: "Squamish", disciplines: ["Trad", "Bouldering"] });
await mk("priv", { name: "Secret Wall Society", location: "Leavenworth, WA", disciplines: ["Trad"] });
await mk("held", { name: "Taken Down Group", location: "Spokane, WA", disciplines: ["Sport"] });
await mk("mine", { name: "Ann Is In This One", location: "Tacoma, WA", disciplines: ["Sport"] });
await mk("pend", { name: "Ann Asked To Join", location: "Portland, OR", disciplines: ["Sport"] });
ok(Object.keys(G).length === 8, "eight groups created as a signed-in climber");
// Superuser set-up from here: state the app reaches through its own RPCs, which other probes cover.
await db.query("update public.groups set visibility = 'private' where id = $1", [G.priv]);
// Only ClimbMatch Safety may hold a group (guard_moderation_column), so its guard is off for this one line.
await db.exec("alter table public.groups disable trigger groups_guard_moderation");
await db.query("update public.groups set moderation = 'held' where id = $1", [G.held]);
await db.exec("alter table public.groups enable trigger groups_guard_moderation");
await db.query("insert into public.group_members (group_id, user_id, role, status) values ($1,$2,'member','active')", [G.mine, U.ann]);
await db.query("insert into public.group_members (group_id, user_id, role, status) values ($1,$2,'member','pending')", [G.pend, U.ann]);
// Members: Smith 3 (bob, cat, dan), Index 2 (bob, cat), the rest 1.
for (const [g, u] of [["smith", "cat"], ["smith", "dan"], ["index", "cat"]])
  await db.query("insert into public.group_members (group_id, user_id, role, status) values ($1,$2,'member','active')", [G[g], U[u]]);
// Posts: Squamish most recent, then Index; a held post on Smith must not count.
await db.query("insert into public.group_posts (group_id, author, body, created_at) values ($1,$2,'old', now() - interval '9 days')", [G.index, U.bob]);
await db.query("insert into public.group_posts (group_id, author, body, created_at) values ($1,$2,'new', now() - interval '1 day')", [G.squam, U.bob]);
await db.exec("alter table public.group_posts disable trigger group_posts_guard_moderation");
await db.query("insert into public.group_posts (group_id, author, body, moderation, created_at) values ($1,$2,'held', 'held', now())", [G.smith, U.bob]);
await db.exec("alter table public.group_posts enable trigger group_posts_guard_moderation");
ok((await db.query("select moderation from public.group_posts where group_id = $1", [G.smith])).rows[0].moderation === "held", "set-up: Smith's only post is held");
// Points, as the place-from-area trigger would write them (it nulls a point with no area, so switch it off for the set-up).
await db.exec("alter table public.groups disable trigger groups_place_from_area");
await db.query("update public.groups set lat = 47.82, lng = -121.55 where id = $1", [G.index]);   // Index
await db.query("update public.groups set lat = 48.78, lng = -121.81 where id = $1", [G.mtb]);     // Mount Baker
await db.query("update public.groups set lat = 44.37, lng = -121.14 where id = $1", [G.smith]);   // Smith Rock
await db.exec("alter table public.groups enable trigger groups_place_from_area");

const nameOf = Object.fromEntries(Object.entries(G).map(([k, id]) => [id, k]));
const ask = async (who, args = {}) => {
  const a = Object.assign({ q: "", region: null, lat: null, lng: null, mi: null, sort: "match", discs: [], home: null, climb: [], lim: 20, off: 0 }, args);
  const res = await as(who, async () => (await db.query(
    "select * from public.discover_groups($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [a.q, a.region, a.lat, a.lng, a.mi, a.sort, a.discs, a.home, a.climb, a.lim, a.off])).rows);
  if (res.e) return { err: res.e.message, keys: [], rows: [] };
  return { rows: res.r, keys: res.r.map((x) => nameOf[x.id]) };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const set = (a) => a.slice().sort();

// ── Who is listed ──
let r = await ask("ann");
ok(same(set(r.keys), set(["index", "smith", "mtb", "squam", "pend"])), "Ann is listed the five public, visible groups she is not in: " + r.keys.join(", ") + (r.err ? " — " + r.err : ""));
ok(!r.keys.includes("priv"), "a private group is not listed");
ok(!r.keys.includes("held"), "a group Safety is holding is not listed");
ok(!r.keys.includes("mine"), "a group she is an active member of is not listed");
ok(r.rows.length > 0 && r.rows.every((x) => Number(x.total_count) === 5), "every row carries the total, 5");
ok((r.rows.find((x) => nameOf[x.id] === "pend") || {}).my_status === "pending", "a group she asked to join is listed, and says her request is pending");
ok((r.rows.find((x) => nameOf[x.id] === "smith") || {}).member_count === 3, "the member count is the active roster's, 3 for Smith");
ok(!!r.rows[0] && !("search_text" in r.rows[0]), "the search haystack is not in the answer");
r = await ask("bob");
ok(r.keys.length === 0 && !r.err, "Bob owns every group, so nothing is listed for him to join");
r = await ask(null);
ok(!!r.err && /permission denied/i.test(r.err), "a signed-out caller is refused: " + (r.err || "NOT REFUSED"));
const fz = await as(null, async () => (await db.query("select * from public.discover_group_facets()")).rows);
ok(!!fz.e && /permission denied/i.test(fz.e.message), "…and the chip counts are refused too");

// ── The search box ──
r = await ask("ann", { q: "wa" });
ok(same(set(r.keys), set(["index", "mtb"])), "\"wa\" finds the two Washington groups: " + r.keys.join(", "));
r = await ask("ann", { q: "Washington" });
ok(same(set(r.keys), set(["index", "mtb"])), "\"Washington\" finds groups that typed \"WA\": " + r.keys.join(", "));
r = await ask("ann", { q: "oregon" });
ok(same(set(r.keys), set(["smith", "pend"])), "\"oregon\" finds a group that typed \"OR\": " + r.keys.join(", "));
r = await ask("ann", { q: "mount baker" });
ok(same(r.keys, ["mtb"]), "\"mount baker\" finds \"Mt Baker Alpine Club\" (0190's spelling rule): " + r.keys.join(", "));
r = await ask("ann", { q: "granite trad" });
ok(same(r.keys, ["index"]), "every word must match, across the About text and the disciplines: " + r.keys.join(", "));
r = await ask("ann", { q: "zzzz" });
ok(r.keys.length === 0 && !r.err, "a word nothing holds finds nothing");
r = await ask("ann", { q: "100%_'; drop" });
ok(!r.err, "punctuation in the box is cleaned, not executed" + (r.err ? " — " + r.err : ""));

// ── State ──
r = await ask("ann", { region: "Washington" });
ok(same(set(r.keys), set(["index", "mtb"])), "state Washington: " + r.keys.join(", "));
r = await ask("ann", { region: "Other" });
ok(same(r.keys, ["squam"]), "'Other' is the groups whose location names no state: " + r.keys.join(", "));
r = await ask("ann", { region: "Oregon", q: "sport" });
ok(same(set(r.keys), set(["smith", "pend"])), "state and search combine: " + r.keys.join(", "));

// ── Near a place (Index: 47.82, -121.55) ──
r = await ask("ann", { lat: 47.82, lng: -121.55, mi: 100 });
ok(same(r.keys, ["index", "mtb"]), "within 100 mi of Index, nearest first: " + r.keys.join(", "));
ok(r.rows.length === 2 && r.rows[0].dist_mi < 1 && r.rows[1].dist_mi > 60 && r.rows[1].dist_mi < 72, "Mount Baker is about 67 mi from Index: " + (r.rows[1] && r.rows[1].dist_mi.toFixed(1)));
r = await ask("ann", { lat: 47.82, lng: -121.55, mi: 250 });
ok(same(r.keys, ["index", "mtb", "smith"]), "within 250 mi, Smith Rock joins, last: " + r.keys.join(", "));
ok(!r.keys.includes("squam"), "a group with no home area is never near anywhere");
r = await ask("ann", { lat: 47.82, lng: -121.55, mi: 25 });
ok(same(r.keys, ["index"]), "within 25 mi only Index");

// ── Sorts ──
r = await ask("ann", { sort: "members" });
ok(same(r.keys.slice(0, 2), ["smith", "index"]), "Most members: Smith (3), Index (2), then the rest: " + r.keys.join(", "));
r = await ask("ann", { sort: "active" });
ok(same(r.keys.slice(0, 2), ["squam", "index"]), "Most active: Squamish (yesterday), Index (9 days); Smith's held post does not count: " + r.keys.join(", "));
r = await ask("ann", { sort: "match", discs: ["Alpine"], home: "Oregon", climb: ["Washington"] });
ok(r.keys[0] === "mtb", "Recommended: a group sharing her discipline first: " + r.keys.join(", "));
ok(r.keys.indexOf("smith") < r.keys.indexOf("index") && r.keys.indexOf("index") < r.keys.indexOf("squam"), "…then home state, then where she climbs, then no state");
r = await ask("ann", { sort: "members", lat: 47.82, lng: -121.55, mi: 250 });
ok(same(r.keys, ["smith", "index", "mtb"]), "Most members still applies with a place picked: " + r.keys.join(", "));

// ── Paging ──
const p1 = await ask("ann", { lim: 2, off: 0 }), p2 = await ask("ann", { lim: 2, off: 2 }), p3 = await ask("ann", { lim: 2, off: 4 });
const all = p1.keys.concat(p2.keys, p3.keys);
ok(p1.keys.length === 2 && p2.keys.length === 2 && p3.keys.length === 1, "pages of 2: 2, 2, 1");
ok(new Set(all).size === 5, "no group on two pages, none missed: " + all.join(", "));
ok(same(all, (await ask("ann")).keys), "the pages are the unpaged order, cut");
ok(p3.rows.length === 1 && Number(p3.rows[0].total_count) === 5, "the last page still says 5 in all");
r = await ask("ann", { lim: 5000 });
ok(r.keys.length === 5 && !r.err, "an oversized page is capped, not an error");

// ── Chips ──
const f = await as("ann", async () => (await db.query("select * from public.discover_group_facets()")).rows);
const facet = (kind) => Object.fromEntries((f.r || []).filter((x) => x.kind === kind).map((x) => [x.key, x.n]));
const reg = facet("region");
ok(reg.Washington === 2 && reg.Oregon === 2 && reg.Other === 1 && Object.keys(reg).length === 3, "state counts: " + JSON.stringify(reg) + (f.e ? " — " + f.e.message : ""));
ok(facet("total")[""] === 5, "total 5");
const d = facet("discipline");
ok(d.Trad === 2 && d.Sport === 2 && d.Alpine === 1 && d.Bouldering === 1, "discipline counts: " + JSON.stringify(d));

// ── The columns cannot be written ──
const w = await as("bob", () => db.query("update public.groups set region = 'Texas' where id = $1", [G.index]));
ok(!!w.e, "a client cannot write region: " + (w.e ? w.e.message.slice(0, 70) : "IT COULD"));
await as("bob", () => db.query("update public.groups set location = 'Bishop, CA' where id = $1", [G.index]));
const moved = (await db.query("select region, search_text from public.groups where id = $1", [G.index])).rows[0];
ok(moved.region === "California" && / ca /.test(" " + moved.search_text + " "), "editing the location moves the region and the haystack: " + moved.region);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
