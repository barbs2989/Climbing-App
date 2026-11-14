// verify-0426-private-crew-pglite.mjs — replays every migration into PGlite (as check:migration-replay
// does) and then acts as four callers against one PRIVATE crew and one LISTED crew:
//   organiser, invitee (invited, then accepts), outsider (signed in, on neither), anon.
// No production database, no service key: run `node scripts/oneoff/verify-0426-private-crew-pglite.mjs`.
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
// Same stand-ins as scripts/check-migration-replay.mjs.
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
  -- Supabase's own default privileges, set BEFORE the replay so every migration's revokes still bite.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);
for (const f of fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  await db.exec("begin"); await db.exec(fs.readFileSync(path.join(DIR, f), "utf8")); await db.exec("commit");
}

const U = { org: "00000000-0000-4000-8000-0000000000a1", inv: "00000000-0000-4000-8000-0000000000a2", out: "00000000-0000-4000-8000-0000000000a3", req: "00000000-0000-4000-8000-0000000000a4" };
for (const [k, id] of Object.entries(U)) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, k + "@example.invalid"]);
  await db.query("insert into public.profiles (id, name) values ($1, $2) on conflict (id) do nothing", [id, "Climber " + k]);
}
const area = (await db.query("select id from public.areas limit 1")).rows[0];
const route = (await db.query("select id from public.routes limit 1")).rows[0];
if (!area && !route) { console.log("no area or route in seed — cannot place a crew"); process.exit(1); }

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok    " : "  FAIL  ") + msg); if (!cond) fails++; };
// Run fn as a caller (null = anon), inside a transaction so the role and claims never leak.
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
const mk = (priv) => as("org", async () => (await db.query(
  `insert into public.crews (${place.col}, discipline, created_by, cap, private) values ($1, $2, $3, 6, $4) returning id, share_token`,
  [place.val, place.disc, U.org, priv])).rows[0]);

const P = await mk(true), L = await mk(false);
ok(!P.e && !L.e, "the organiser creates a private and a listed crew" + (P.e ? " — " + P.e.message : L.e ? " — " + L.e.message : ""));
const priv = P.r, pub = L.r;
for (const c of [priv, pub]) {
  const r = await as("org", () => db.query("insert into public.crew_members (crew_id, user_id, status) values ($1, $2, 'invited')", [c.id, U.inv]));
  ok(!r.e, "the organiser invites the invitee" + (r.e ? " — " + r.e.message : ""));
}
const roster = (who, c) => as(who, async () => (await db.query("select user_id, status from public.crew_members where crew_id = $1", [c.id])).rows);

ok(((await roster("org", priv)).r || []).length === 2, "organiser reads the private roster (self + invitee)");
ok(((await roster("inv", priv)).r || []).length === 2, "an INVITED climber reads the private roster before answering");
ok(((await roster("out", priv)).r || []).length === 0, "an outsider reads NONE of the private roster");
ok(((await roster(null, priv)).r || []).length === 0, "anon reads NONE of the private roster");
ok(((await roster("out", pub)).r || []).length === 2, "an outsider still reads a listed crew's roster (unchanged)");
ok(((await roster(null, pub)).r || []).length === 2, "anon still reads a listed crew's roster (unchanged)");

const listed = async (who) => ((await as(who, async () => (await db.query("select id from public.crew_listings")).rows)).r || []).map((x) => x.id);
const outList = await listed("out");
ok(!outList.includes(priv.id) && outList.includes(pub.id), "Join a crew (crew_listings) leaves the private crew out, keeps the listed one");
const anonList = await listed(null);
ok(!anonList.includes(priv.id) && anonList.includes(pub.id), "same for anon");

const ask = (c) => as("req", () => db.query("insert into public.crew_members (crew_id, user_id, status, invited_by) values ($1, $2, 'pending', $2)", [c.id, U.req]));
ok(!!(await ask(priv)).e, "nobody can ASK to join a private crew");
const askPub = await ask(pub);
ok(!askPub.e, "asking to join a listed crew still works" + (askPub.e ? " — " + askPub.e.message : ""));

const share = (c) => as(null, async () => (await db.query("select public.crew_share_preview($1) as p", [c.share_token])).rows[0].p);
ok((await share(priv)).r === null, "the share link of a private crew opens nothing");
ok((await share(pub)).r !== null, "a listed crew's share link still opens");

const acc = await as("inv", () => db.query("update public.crew_members set status = 'confirmed' where crew_id = $1 and user_id = $2 returning 1", [priv.id, U.inv]));
ok(!acc.e && acc.r.rows.length === 1, "the invitee accepts the private crew" + (acc.e ? " — " + acc.e.message : ""));
const crewRow = await as("inv", async () => (await db.query("select id from public.crews where id = $1", [priv.id])).rows);
ok((crewRow.r || []).length === 1, "a confirmed member reads the private crew row");

const flip = await as("org", () => db.query("update public.crews set private = false where id = $1 returning id", [priv.id]));
ok(!flip.e && flip.r.rows.length === 1, "the organiser can list the crew again");
ok((await listed("out")).includes(priv.id), "…and then it shows under Join a crew");
const flipBack = await as("inv", () => db.query("update public.crews set private = true where id = $1 returning id", [priv.id]));
ok(!flipBack.e && flipBack.r.rows.length === 0, "a member who is not the organiser cannot change it");

console.log(fails ? `\nverify-0426: ${fails} expectation(s) FAILED` : "\nverify-0426: ok — a private crew stays private, a listed crew is unchanged");
process.exit(fails ? 1 : 0);
