// verify-0474-crew-hand-over-pglite.mjs — replays every migration into PGlite and acts as the organiser, two
// confirmed members, an invitee, an outsider and anon against one crew: only the organiser hands the crew over,
// only to a confirmed member; the invites she sent follow the new organiser so an outstanding one can still be
// accepted; the old organiser stays a member, loses the organiser's powers, and can leave without disbanding (0474).
// No production database, no service key: `node scripts/oneoff/verify-0474-crew-hand-over-pglite.mjs`.
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
  `insert into public.crews (${place.col}, discipline, created_by, cap) values ($1, $2, $3, 6) returning id`,
  [place.val, place.disc, U.org])).rows[0]);
ok(!made.e, "the organiser creates a crew" + (made.e ? " — " + made.e.message : ""));
const crew = made.r.id;
// Seat the roster as the app would end up: Blake and Casey confirmed, inv still invited — all by the organiser.
for (const [who, st] of [["blake", "confirmed"], ["casey", "confirmed"], ["inv", "invited"]]) {
  await db.query("insert into public.crew_members (crew_id, user_id, status, invited_by) values ($1, $2, $3, $4) on conflict (crew_id, user_id) do update set status = excluded.status", [crew, U[who], st, U.org]);
}
await db.query("insert into public.crew_email_invites (crew_id, email, invited_by) values ($1, 'friend@example.invalid', $2)", [crew, U.org]);
const hand = (who, to) => as(who, () => db.query("select public.crew_hand_over($1, $2)", [crew, to]));
const owner = async () => (await db.query("select created_by from public.crews where id = $1", [crew])).rows[0].created_by;

// The premise: a plain UPDATE cannot move the organiser.
let r = await as("org", () => db.query("update public.crews set created_by = $2 where id = $1 returning id", [crew, U.blake]));
ok(!!r.e || r.r.rows.length === 0, "a direct UPDATE of created_by is refused (the reason the function exists)");
ok((await owner()) === U.org, "…and the organiser has not moved");

// Who may not.
r = await hand("blake", U.blake);
ok(!!r.e, "a MEMBER cannot take the crew for himself" + (r.e ? " — " + r.e.message : ""));
r = await hand("blake", U.casey);
ok(!!r.e, "a member cannot hand it to someone else either");
r = await hand("out", U.out);
ok(!!r.e, "an outsider cannot take it");
r = await hand(null, U.blake);
ok(!!r.e, "anon cannot call it");
r = await hand("org", U.org);
ok(!!r.e, "the organiser cannot hand it to herself");
r = await hand("org", U.inv);
ok(!!r.e, "…nor to an INVITEE who has not accepted" + (r.e ? " — " + r.e.message : ""));
r = await hand("org", U.out);
ok(!!r.e, "…nor to an outsider");
ok((await owner()) === U.org, "after every refusal the organiser is unchanged");

// The hand-over.
r = await hand("org", U.blake);
ok(!r.e, "the organiser hands the crew to Blake, a confirmed member" + (r.e ? " — " + r.e.message : ""));
ok((await owner()) === U.blake, "crews.created_by is Blake");
const rows = (await db.query("select user_id, status, invited_by from public.crew_members where crew_id = $1", [crew])).rows;
const row = (k) => rows.find((x) => x.user_id === U[k]);
ok(row("org") && row("org").status === "confirmed", "the old organiser is still a confirmed member");
ok(row("blake").status === "confirmed" && row("casey").status === "confirmed" && row("inv").status === "invited", "nobody else's status moved");
ok(rows.every((x) => x.invited_by === U.blake), "every row the old organiser invited now names Blake");
const em = (await db.query("select invited_by from public.crew_email_invites where crew_id = $1", [crew])).rows[0];
ok(em && em.invited_by === U.blake, "the email invite names Blake too");

// What the hand-over must not break, and what it must move.
r = await as("inv", () => db.query("update public.crew_members set status = 'confirmed' where crew_id = $1 and user_id = $2 returning user_id", [crew, U.inv]));
ok(!r.e && r.r.rows.length === 1, "the outstanding invite can still be ACCEPTED after the hand-over" + (r.e ? " — " + r.e.message : ""));
r = await as("blake", () => db.query("update public.crews set meet_place = 'the lot' where id = $1 returning id", [crew]));
ok(!r.e && r.r.rows.length === 1, "Blake can now edit the crew");
r = await as("org", () => db.query("update public.crews set meet_place = 'elsewhere' where id = $1 returning id", [crew]));
ok(!r.e && r.r.rows.length === 0, "the old organiser no longer can");
r = await hand("org", U.casey);
ok(!!r.e, "the old organiser cannot hand it on again");
r = await as("org", () => db.query("delete from public.crew_members where crew_id = $1 and user_id = $2 returning user_id", [crew, U.org]));
ok(!r.e && r.r.rows.length === 1, "the old organiser LEAVES like any member");
const still = (await db.query("select count(*)::int as n from public.crews where id = $1", [crew])).rows[0].n;
ok(still === 1, "…and the crew is still there for everyone else");
r = await as("org", () => db.query("delete from public.crews where id = $1 returning id", [crew]));
ok(!r.e && r.r.rows.length === 0, "the old organiser cannot disband it any more");
r = await hand("blake", U.casey);
ok(!r.e && (await owner()) === U.casey, "Blake can hand it on to Casey" + (r.e ? " — " + r.e.message : ""));

console.log(fails ? "\n" + fails + " FAILED" : "\nall crew hand-over expectations hold");
process.exit(fails ? 1 : 0);
