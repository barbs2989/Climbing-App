// verify-0450-float-filings-pglite.mjs — replays every migration into PGlite and acts as the organiser, two
// confirmed members, an invitee and an outsider against one crew: each confirmed member files their OWN float plan;
// nobody writes another's; the crew reads, outsiders do not; leaving drops the filing (0450).
// Owner decision 2026-11-18: no screen shows a crewmate's filing — that is the app's job, not RLS's.
// No production database, no service key: `node scripts/oneoff/verify-0450-float-filings-pglite.mjs`.
// Exits 1 on the first broken expectation.
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
  org: "00000000-0000-4000-8000-0000000000b1", blake: "00000000-0000-4000-8000-0000000000b2",
  casey: "00000000-0000-4000-8000-0000000000b3", inv: "00000000-0000-4000-8000-0000000000b4",
  out: "00000000-0000-4000-8000-0000000000b5",
};
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())", [id, k + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, $2) on conflict (id) do nothing", [id, "Climber " + k]);
}
const route = (await db.query("select id from public.routes limit 1")).rows[0];
const area = (await db.query("select id from public.areas limit 1")).rows[0];
if (!route && !area) { console.log("no route or area in seed — cannot place a crew"); process.exit(1); }

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
const place = route ? { col: "route_id", val: route.id, disc: null } : { col: "area_id", val: area.id, disc: "sport" };
const made = await as("org", async () => (await db.query(
  `insert into public.crews (${place.col}, discipline, created_by, cap, private) values ($1, $2, $3, 6, true) returning id`,
  [place.val, place.disc, U.org])).rows[0]);
ok(!made.e, "the organiser creates a crew" + (made.e ? " — " + made.e.message : ""));
const crew = made.r.id;
// Seat the roster as the app would end up: Blake and Casey confirmed, inv still invited.
for (const [who, st] of [["blake", "confirmed"], ["casey", "confirmed"], ["inv", "invited"]]) {
  await db.query("insert into public.crew_members (crew_id, user_id, status, invited_by) values ($1, $2, $3, $4) on conflict (crew_id, user_id) do update set status = excluded.status", [crew, U[who], st, U.org]);
}
const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const file = (who, uid, ret) => as(who, () => db.query(
  "insert into public.crew_float_filings (crew_id, user_id, return_by) values ($1, $2, $3::date) on conflict (crew_id, user_id) do update set return_by = excluded.return_by, updated_at = now() returning user_id",
  [crew, U[uid], ret]));
const readAll = (who) => as(who, () => db.query("select user_id from public.crew_float_filings where crew_id = $1 order by user_id", [crew]));

let r = await file("blake", "blake", day(7));
ok(!r.e && r.r.rows.length === 1, "a confirmed MEMBER (Blake) files his own float plan" + (r.e ? " — " + r.e.message : ""));
r = await file("org", "org", day(7));
ok(!r.e && r.r.rows.length === 1, "the organiser files her own too" + (r.e ? " — " + r.e.message : ""));
r = await file("blake", "blake", day(8));
ok(!r.e, "Blake re-files (upsert) with a new return day" + (r.e ? " — " + r.e.message : ""));
const ret = (await db.query("select return_by::text as d from public.crew_float_filings where crew_id = $1 and user_id = $2", [crew, U.blake])).rows[0];
ok(ret && ret.d === day(8), "…and his row now holds the new day");

r = await file("blake", "casey", day(7));
ok(!!r.e, "Blake cannot file a plan AS Casey");
r = await file("org", "blake", day(9));
ok(!!r.e, "the organiser cannot write Blake's filing either");
r = await file("inv", "inv", day(7));
ok(!!r.e, "an INVITEE who has not accepted cannot file");
r = await file("out", "out", day(7));
ok(!!r.e, "an outsider cannot file");
r = await file(null, "out", day(7));
ok(!!r.e, "anon cannot file");

const sneak = await as("casey", () => db.query("update public.crew_float_filings set return_by = null where crew_id = $1 and user_id = $2 returning user_id", [crew, U.blake]));
ok(!sneak.e && sneak.r.rows.length === 0, "Casey cannot change Blake's filing");
const sneakDel = await as("casey", () => db.query("delete from public.crew_float_filings where crew_id = $1 and user_id = $2 returning user_id", [crew, U.blake]));
ok(!sneakDel.e && sneakDel.r.rows.length === 0, "Casey cannot delete Blake's filing");

let rd = await readAll("casey");
ok(!rd.e && rd.r.rows.length === 2, "a confirmed member (Casey) can read the crew's filings, as the Privacy Policy says (" + (rd.r ? rd.r.rows.length : rd.e.message) + ")");
rd = await readAll("out");
ok(!rd.e && rd.r.rows.length === 0, "an outsider reads none");
rd = await readAll("inv");
ok(!rd.e && rd.r.rows.length === 0, "an invitee who has not accepted reads none");
rd = await readAll(null);
ok(!rd.e && rd.r.rows.length === 0, "anon reads none (and gets no error, so the embedded crews read survives)");

const del = await as("blake", () => db.query("delete from public.crew_float_filings where crew_id = $1 and user_id = $2 returning user_id", [crew, U.blake]));
ok(!del.e && del.r.rows.length === 1, "Blake deletes his own filing");
r = await file("blake", "blake", day(7));
ok(!r.e, "…and files again");
await db.query("delete from public.crew_members where crew_id = $1 and user_id = $2", [crew, U.blake]);
const left = (await db.query("select count(*)::int as n from public.crew_float_filings where crew_id = $1 and user_id = $2", [crew, U.blake])).rows[0].n;
ok(left === 0, "leaving the crew drops Blake's filing");
await db.query("delete from public.crews where id = $1", [crew]);
const gone = (await db.query("select count(*)::int as n from public.crew_float_filings where crew_id = $1", [crew])).rows[0].n;
ok(gone === 0, "deleting the crew drops every filing on it");
const contactCol = (await db.query("select count(*)::int as n from information_schema.columns where table_name = 'crew_float_filings' and column_name ~ 'contact|plan|body|text'")).rows[0].n;
ok(contactCol === 0, "the table has no contact or plan-body column");

console.log(fails ? `\nverify-0450: ${fails} expectation(s) FAILED` : "\nverify-0450: ok — each confirmed member files their own; nobody writes another's; the crew reads, outsiders don't; leaving drops it");
process.exit(fails ? 1 : 0);
