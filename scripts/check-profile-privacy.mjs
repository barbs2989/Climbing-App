// check:profile-privacy — does the API itself keep what a climber chose to hide (0434)?
//
// Before 0434 every column of every profile was readable with the public anon key, signed out
// included: the real name whatever show_name said, photos whatever photos_public said, location,
// gender, availability, and account bookkeeping. The switches were honoured only by what the app
// rendered. 0434 moved that into column grants plus three generated "public_" columns.
//
// This replays every migration into PGlite (as check:migration-replay does) WITH Supabase's default
// grants — without them every query reads "permission denied" and nothing below would mean anything —
// then asks, as the real client roles:
//   1. signed out: the public card reads; no private column does; a hidden name and hidden photos
//      come back null / empty;
//   2. another signed-in climber: partner columns read; the hidden name does not; blocking still hides
//      the row;
//   3. the owner: my_profile() returns every column, the real name included;
//   4. EVERY select list the app sends for profiles (lib/profileCols.js, each profileCols("...")
//      literal, each embedded `profiles(...)`, each raw `.from("profiles").select("...")`) runs, as the
//      role(s) that send it, without "permission denied" — a missed reader is a broken screen;
//   5. what runs as the caller and reads profiles still works: the climber_resumes policy, an
//      is_admin()-gated policy signed out, and the climb_logs default-visibility trigger;
//   6. the SECURITY DEFINER readers that return a name read it through show_name (leaderboard run as
//      another climber; every definer returning a profile name scanned; the seven 0434 fixed pinned).
//
// Hand-run (~40s), like check:migration-replay: it needs @electric-sql/pglite.
//   npm run check:profile-privacy
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readDbSource } from "./lib/guard-sources.mjs";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "supabase", "migrations");
let failures = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (m) => { console.error(`check:profile-privacy FAILED — ${m}. Nothing below was checked.`); process.exit(1); };

let PGlite, ltree, pg_trgm, pgcrypto, uuid_ossp;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
  ({ ltree } = await import("@electric-sql/pglite/contrib/ltree"));
  ({ pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm"));
  ({ pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto"));
  ({ uuid_ossp } = await import("@electric-sql/pglite/contrib/uuid_ossp"));
} catch { dead("@electric-sql/pglite is not installed (npm install)"); }

const { profileCols, PARTNER_COLS, FULL_PROFILE_COLS, PROFILE_NAME_COLS } =
  await import(pathToFileURL(path.join(ROOT, "lib", "profileCols.js")).href);

// The pre-migration stand-ins are check:migration-replay's own, read from it so the two cannot drift.
const replaySrc = fs.readFileSync(path.join(ROOT, "scripts", "check-migration-replay.mjs"), "utf8");
const preStart = replaySrc.indexOf("await db.exec(`");
if (preStart < 0) dead("could not find check:migration-replay's setup block");
const pre = replaySrc.slice(preStart + 15, replaySrc.indexOf("`);", preStart));

const db = new PGlite({ extensions: { ltree, pg_trgm, pgcrypto, uuid_ossp } });
await db.exec(pre);
// Supabase's defaults: every table, function and sequence created in public is granted to the API roles.
await db.exec(`
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
const files = fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
if (files.length < 200) dead(`only ${files.length} migrations found`);
for (const f of files) {
  try { await db.exec("begin"); await db.exec(fs.readFileSync(path.join(DIR, f), "utf8")); await db.exec("commit"); }
  catch (e) { await db.exec("rollback").catch(() => {}); dead(`${f} did not replay: ${e.message}`); }
}
console.log(`check:profile-privacy: ${files.length} migrations replayed with Supabase's default grants.`);
// 0435 is step 2 (the column grants). If the table-level grant is still there, the grants never landed.
if ((await db.query(`select has_table_privilege('anon', 'public.profiles', 'select') as t`)).rows[0].t) dead("anon still holds table-level SELECT on profiles: 0435's column grants are missing");

// ── fixtures: A hides name and photos; B and C are other climbers; C is blocked by A ─────────────────
const A = "00000000-0000-4000-8000-00000000000a", B = "00000000-0000-4000-8000-00000000000b", C = "00000000-0000-4000-8000-00000000000c";
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${A}', 'a@example.test', '{"name":"Alice Hidden"}'),
    ('${B}', 'b@example.test', '{"name":"Bob Shown"}'),
    ('${C}', 'c@example.test', '{"name":"Cara Blocked"}');
  update profiles set username = 'alice', show_name = false, photos = '{https://x.test/a.jpg}', photos_public = false,
    photo_alts = '{"https://x.test/a.jpg":"a photo"}', location = 'Bellingham, WA', gender = 'genderqueer', pronouns = '{she_her,they_them}',
    terms_accepted_version = 'v9', discoverable = true, resume_public = true where id = '${A}';
  update profiles set username = 'bob', show_name = true, photos = '{https://x.test/b.jpg}', photos_public = true where id = '${B}';
  update profiles set username = 'cara' where id = '${C}';
  insert into blocked_users (blocker, blocked) values ('${A}', '${C}');
`);

// Run `sql` as a client role with a JWT subject (null = signed out). Resolves { rows } or { error }.
async function as(role, uid, sql, params = []) {
  try {
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [uid || "", role]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params);
    await db.exec("rollback");
    return { rows: r.rows };
  } catch (e) {
    await db.exec("rollback").catch(() => {});
    return { error: e.message };
  }
}
// A PostgREST select list ("a,b:c") as SQL ("a, c as b").
const sqlCols = (list) => list.split(",").map((c) => c.trim()).filter(Boolean).map((c) => {
  const [alias, col] = c.includes(":") ? c.split(":") : [c, c];
  return col === alias ? `"${col}"` : `"${col}" as "${alias}"`;
}).join(", ");

// ── 1. signed out ────────────────────────────────────────────────────────────────────────────────────
{
  const card = await as("anon", null, `select ${sqlCols(profileCols(FULL_PROFILE_COLS, false))} from profiles where id = $1`, [A]);
  if (card.error) fail(`signed out, the public card does not read: ${card.error}`);
  else if (card.rows[0]?.name !== null) fail(`signed out, a hidden name came back: ${JSON.stringify(card.rows[0]?.name)}`);
  else if ((card.rows[0]?.photos || []).length) fail("signed out, hidden photos came back");
  else ok("signed out: the public card reads, with a hidden name null and hidden photos empty");
  const shown = await as("anon", null, `select public_name, public_photos from profiles where id = $1`, [B]);
  if (shown.rows?.[0]?.public_name !== "Bob Shown" || !(shown.rows?.[0]?.public_photos || []).length) fail(`signed out, a SHOWN name/photos did not come back: ${JSON.stringify(shown)}`);
  else ok("signed out: a name and photos the climber shows do come back");
  for (const col of ["name", "photos", "photo_alts", "location", "gender", "pronouns", "availability", "avail_week", "free_until", "climb_grades",
    "hiking_speed_ft_hr", "discoverable", "account_type", "primary_account_id", "terms_accepted_version", "terms_accepted_at",
    "pinned_states", "requests_from", "mutuals_visible", "trip_reports_default", "cert_expiry", "certifications"]) {
    const r = await as("anon", null, `select "${col}" from profiles limit 1`);
    if (!r.error) fail(`signed out can read profiles.${col}`);
  }
  ok("signed out: none of the 21 private / signed-in-only columns is readable");
  const star = await as("anon", null, `select * from profiles limit 1`);
  if (!star.error) fail("signed out, select * on profiles still works"); else ok("signed out: select * is refused");
  const filt = await as("anon", null, `select id from profiles where name ilike '%Alice%'`);
  if (!filt.error) fail("signed out can FILTER on the hidden name"); else ok("signed out: filtering on the raw name is refused too");
  const rpc = await as("anon", null, `select * from my_profile()`);
  if (!rpc.error) fail("signed out can call my_profile()"); else ok("signed out: my_profile() is not callable");
}

// ── 2. another signed-in climber ─────────────────────────────────────────────────────────────────────
{
  const r = await as("authenticated", B, `select ${sqlCols(profileCols(FULL_PROFILE_COLS, true))} from profiles where id = $1`, [A]);
  if (r.error) fail(`B cannot read A's profile card: ${r.error}`);
  else {
    const p = r.rows[0];
    if (p.name !== null) fail(`B reads A's hidden name: ${p.name}`);
    else if ((p.photos || []).length || p.photo_alts !== null) fail("B reads A's hidden photos");
    else if (p.location !== "Bellingham, WA" || p.gender !== "genderqueer" || (p.pronouns || []).join() !== "she_her,they_them") fail("B cannot read A's partner-matching columns");
    else ok("B (signed in): A's hidden name and photos are null/empty; partner columns (location, gender, pronouns) read");
  }
  for (const col of ["name", "photos", "photo_alts", "terms_accepted_version", "pinned_states", "requests_from", "mutuals_visible", "trip_reports_default", "account_type", "primary_account_id"]) {
    const x = await as("authenticated", B, `select "${col}" from profiles where id = $1`, [A]);
    if (!x.error) fail(`B can read A's ${col}`);
  }
  ok("B (signed in): none of the 10 owner-only columns is readable");
  const blocked = await as("authenticated", C, `select id from profiles where id = $1`, [A]);
  if (blocked.error || blocked.rows.length) fail(`C, blocked by A, still reads A's row: ${JSON.stringify(blocked)}`);
  else ok("C (blocked by A): A's row is still hidden");
}

// ── 3. the owner ─────────────────────────────────────────────────────────────────────────────────────
{
  const r = await as("authenticated", A, `select * from my_profile()`);
  const p = r.rows?.[0];
  if (r.error || !p) fail(`A cannot read their own row through my_profile(): ${r.error || "no row"}`);
  else if (p.name !== "Alice Hidden" || p.terms_accepted_version !== "v9" || !(p.photos || []).length || p.photo_alts === null || p.requests_from == null)
    fail(`my_profile() is missing A's own private columns: ${JSON.stringify(p).slice(0, 300)}`);
  else ok(`A: my_profile() returns the full own row (${Object.keys(p).length} columns, the real name included)`);
  const onlyMine = await as("authenticated", A, `select count(*)::int n from my_profile()`);
  if (onlyMine.rows?.[0]?.n !== 1) fail("my_profile() returned more than the caller's row");
  const upd = await as("authenticated", A, `update profiles set photo_alts = '{}'::jsonb, terms_accepted_version = 'v10' where id = $1 returning id`, [A]);
  if (upd.error || upd.rows.length !== 1) fail(`A cannot update their own row returning id: ${upd.error}`);
  else ok("A: updating the own row (returning id) works");
  const upd2 = await as("authenticated", A, `update profiles set discoverable = true where id = $1 returning id, discoverable`, [A]);
  if (upd2.error) fail(`setDiscoverable's returning list is refused: ${upd2.error}`); else ok("A: setDiscoverable / setPhotosPublic returning lists work");
  const other = await as("authenticated", B, `update profiles set bio = 'x' where id = $1 returning id`, [A]);
  if (!other.error && other.rows.length) fail("B can update A's row");
}

// ── 4. every select list the app sends ───────────────────────────────────────────────────────────────
{
  const srcFiles = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!["node_modules", "dist", ".git"].includes(e.name)) walk(path.join(d, e.name)); }
    else if (/\.(jsx?|tsx?)$/.test(e.name)) srcFiles.push(path.join(d, e.name));
  } };
  walk(path.join(ROOT, "lib")); walk(path.join(ROOT, "src"));
  for (const f of fs.readdirSync(ROOT)) if (/\.jsx$/.test(f)) srcFiles.push(path.join(ROOT, f));

  const lists = new Map(); // list -> { anonToo, where }
  const add = (list, anonToo, where) => { const k = list.replace(/\s+/g, ""); if (!lists.has(k)) lists.set(k, { anonToo, where }); else if (anonToo) lists.get(k).anonToo = true; };
  add(profileCols(PARTNER_COLS, true), false, "PARTNER_COLS signed in");
  add(profileCols(PARTNER_COLS, false), true, "PARTNER_COLS signed out");
  add(profileCols(FULL_PROFILE_COLS, true), false, "FULL_PROFILE_COLS signed in");
  add(profileCols(FULL_PROFILE_COLS, false), true, "FULL_PROFILE_COLS signed out");
  add(PROFILE_NAME_COLS, true, "PROFILE_NAME_COLS");
  let rawStar = 0;
  for (const f of srcFiles) {
    const s = fs.readFileSync(f, "utf8"), rel = path.relative(ROOT, f);
    for (const m of s.matchAll(/profileCols\("([^"]+)"/g)) { add(profileCols(m[1], true), false, rel); add(profileCols(m[1], false), true, rel); }
    // embeds: `profiles(...)` inside a select string, from any table (guide listings, reviews and comments are public)
    for (const m of s.matchAll(/[^_a-z]profiles\(([a-z_:, ]+)\)/g)) add(m[1], true, rel + " (embed)");
    // raw selects on the table itself: own-row reads by a signed-in climber
    for (const m of s.matchAll(/from\("profiles"\)\s*\.select\("([^"]*)"/g)) {
      if (m[1].trim() === "*" || m[1].trim() === "") { rawStar++; fail(`${rel}: .from("profiles").select("${m[1]}") — select * is refused for every client role since 0434`); }
      else add(m[1], false, rel + " (raw)");
    }
  }
  let n = 0; const before = failures;
  for (const [list, { anonToo, where }] of lists) {
    for (const [role, uid] of anonToo ? [["authenticated", B], ["anon", null]] : [["authenticated", B]]) {
      const r = await as(role, uid, `select ${sqlCols(list)} from profiles limit 1`);
      n++;
      if (r.error) fail(`${where}: "${list}" as ${role}: ${r.error}`);
    }
  }
  if (!rawStar) ok(`no client reads profiles with select *`);
  if (failures === before) ok(`${lists.size} distinct app select lists, ${n} role runs: none is refused`);
  // the two search filters
  const s1 = await as("authenticated", B, `select id from profiles where public_name ilike '%Bob%' or username ilike '%ali%'`);
  const s2 = await as("authenticated", B, `select id from profiles where discoverable = true`);
  if (s1.error || s2.error) fail(`a search filter is refused: ${s1.error || s2.error}`);
  else if (s1.rows.length !== 2) fail(`name/handle search found ${s1.rows.length} of 2`);
  else ok("the search filters (public_name / username ilike, discoverable = true) work");
  const hiddenSearch = await as("authenticated", B, `select id from profiles where public_name ilike '%Alice%'`);
  if (hiddenSearch.error || hiddenSearch.rows.length) fail("a hidden real name is still searchable"); else ok("a hidden real name does not match a name search");
}

// ── 5. what runs as the caller and reads profiles ────────────────────────────────────────────────────
{
  const res = await as("anon", null, `select count(*) from climber_resumes`);
  if (res.error) fail(`the climber_resumes policy fails signed out: ${res.error}`); else ok("climber_resumes policy (reads resume_public) works signed out");
  const adm = await as("anon", null, `select count(*) from app_feedback`);
  if (adm.error) fail(`an is_admin()-gated read fails signed out: ${adm.error}`); else ok("is_admin()-gated policies still evaluate signed out");
  // climb_logs_default_visibility reads trip_reports_default, which no client may read any more.
  await db.exec(`update profiles set trip_reports_default = 'friends' where id = '${A}'`);
  const cols = (await db.query(`select column_name, is_nullable, column_default from information_schema.columns
     where table_schema = 'public' and table_name = 'climb_logs'`)).rows;
  const needs = cols.filter((c) => c.is_nullable === "NO" && c.column_default == null && !["user_id", "id"].includes(c.column_name));
  const vals = { user_id: `'${A}'` };
  for (const c of needs) vals[c.column_name] = c.column_name === "route_id" ? "'r1'" : c.column_name === "date_climbed" ? "current_date" : "'x'";
  const ins = await as("authenticated", A, `insert into climb_logs (${Object.keys(vals).join(", ")}) values (${Object.values(vals).join(", ")}) returning trip_report_visibility`);
  if (ins.error && /permission denied for table profiles|column .* of relation profiles/.test(ins.error)) fail(`logging a climb now fails on profiles: ${ins.error}`);
  else if (ins.error) console.log(`  note  the climb_logs insert could not be staged here (${ins.error.split("\n")[0]}); the trigger is checked directly below`);
  else if (ins.rows[0].trip_report_visibility !== "friends") fail(`a new log got ${ins.rows[0].trip_report_visibility}, not the climber's default`);
  else ok("logging a climb as the climber takes their trip_reports_default (the trigger reads it as definer)");
  const def = (await db.query(`select prosecdef from pg_proc where proname = 'climb_logs_default_visibility'`)).rows[0];
  if (!def?.prosecdef) fail("climb_logs_default_visibility is not SECURITY DEFINER, so it cannot read trip_reports_default as the caller");
}

// ── 6. SECURITY DEFINER readers that return another climber's name ───────────────────────────────────
{
  const lb = await as("authenticated", B, `select user_id, name from leaderboard('overall')`);
  if (lb.error) fail(`leaderboard('overall') fails: ${lb.error}`);
  else {
    const a = lb.rows.find((r) => r.user_id === A), b = lb.rows.find((r) => r.user_id === B);
    if (a && a.name !== null) fail(`leaderboard hands B A's hidden name: ${a.name}`);
    else if (b && b.name !== "Bob Shown") fail("leaderboard no longer returns the caller's own name");
    else ok(`leaderboard: ${a ? "A's hidden name is null" : "A is not on the board here"}${b ? ", the caller's own name is returned" : ""}`);
  }
  // Every definer function that returns a name-like column and reads profiles must read it through the switch.
  const fns = (await db.query(`select p.proname, p.prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef and p.prosrc ~* '\\mprofiles\\M'
       and pg_get_function_result(p.oid) ~* '\\m(name|author_name)\\M text'`)).rows;
  const ADMIN_ONLY = new Set(["accessibility_report_queue", "app_feedback_queue"]);
  let bad = 0;
  for (const f of fns) {
    if (ADMIN_ONLY.has(f.proname)) continue;
    // a raw `<alias>.name` read from a profiles alias, not guarded by show_name in the same expression
    const aliases = [...f.prosrc.matchAll(/\bprofiles\s+(?:as\s+)?([a-z]+)\b/gi)].map((m) => m[1]).filter((x) => !/^(on|where|join|left|using)$/i.test(x));
    for (const al of new Set(aliases)) {
      for (const m of f.prosrc.matchAll(new RegExp(`(.{0,40})\\b${al}\\.name\\b`, "g"))) {
        if (!/show_name/.test(m[1])) { bad++; fail(`${f.proname} returns ${al}.name without show_name`); }
      }
    }
  }
  // The partner functions return a CTE built from `p.*`, which the alias rule above cannot follow, so
  // the seven 0434 re-created are pinned by name: each must still read the name through the switch.
  const FIXED = ["log_tags_for_me", "partners_near", "partners_by_objective", "partners_for_my_areas", "partners_in_area", "crag_regular", "leaderboard"];
  for (const name of FIXED) {
    const f = fns.find((x) => x.proname === name);
    if (!f) { bad++; fail(`${name} no longer exists or no longer returns a name — re-check what replaced it`); continue; }
    if (!/\.public_name\b|show_name or p\.id = me then p\.name/.test(f.prosrc)) { bad++; fail(`${name} returns the raw name again (0434 read it through show_name)`); }
  }
  if (!bad) ok(`${fns.length} definer functions return a name from profiles; none reads the raw name without show_name`);
}

// ── 7. climb_logs signed out: every column but WHO they climbed with (0501) ─────────────────────────
// 0501 revoked anon's table-level SELECT on climb_logs and granted back every column except
// `partners` by name. So a column ADDED later is unreadable signed out until its migration grants it,
// and the app's trip-report reads (route page, a shared ?report= link) name it -- a guest would get an
// error instead of the reports. This section fails on that, and on partners becoming readable again.
{
  const logCols = (await db.query(`select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'climb_logs' order by ordinal_position`)).rows.map((r) => r.column_name);
  if (!logCols.includes("partners")) fail("climb_logs has no partners column any more: re-read 0501 and this section");
  const ungranted = [];
  for (const c of logCols) {
    const p = (await db.query(`select has_column_privilege('anon', 'public.climb_logs', $1, 'select') as p`, [c])).rows[0].p;
    if (c === "partners" ? p : !p) ungranted.push(c);
  }
  if (ungranted.includes("partners")) fail("signed out can read climb_logs.partners (who a climber climbed with) — 0501 is undone");
  const missing = ungranted.filter((c) => c !== "partners");
  if (missing.length) fail(`climb_logs column(s) not granted to anon: ${missing.join(", ")} — a migration adding a climb_logs column must \`grant select (<col>) on public.climb_logs to anon\` (0501), or guests' trip reports fail`);
  if (!ungranted.length) ok(`signed out: all ${logCols.length - 1} climb_logs columns but partners are readable, partners is not`);
  const star = await as("anon", null, `select * from climb_logs limit 1`);
  if (!star.error) fail("signed out, select * on climb_logs works — partners comes with it"); else ok("signed out: select * on climb_logs is refused");

  const db_js = readDbSource(ROOT);
  const base = (db_js.match(/const TRIP_REPORT_COLS = "([^"]+)"/) || [])[1];
  const extra = (db_js.match(/TRIP_REPORT_COLS \+ "([^"]+)"/) || [])[1];
  if (!base) fail("lib/db.js: TRIP_REPORT_COLS not found — this section can no longer test the trip-report reads");
  const lists = new Map(), ownLists = new Map();
  if (base) { lists.set("route_id, " + base, "TRIP_REPORT_COLS"); if (extra) lists.set("route_id, " + base + extra, "TRIP_REPORT_COLS + 0121 columns"); }
  const srcFiles = [path.join(ROOT, "lib", "db.js")];
  for (const f of fs.readdirSync(ROOT)) if (/\.jsx$/.test(f)) srcFiles.push(path.join(ROOT, f));
  for (const f of srcFiles) {
    // lib/db.js is a re-export list since 2026-11-25: its code is read as one text (lib/db-*.js joined).
    const rel = path.relative(ROOT, f), s = rel === path.join("lib", "db.js") ? readDbSource(ROOT) : fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/from\("climb_logs"\)\s*\.select\("([^"]*)"/g)) {
      if (/^\s*\*?\s*$/.test(m[1])) { fail(`${rel}: .from("climb_logs").select("${m[1]}") — select * is refused signed out since 0501; name the columns`); continue; }
      // `partners` is the author's own: ONE reader may name it, useMyLogs (your own logs, keyed on
      // your id, enabled only signed in), which App hydrates `logs` from and the edit form fills
      // from. Anywhere else, naming it is a list a guest would be refused. That one list is run
      // signed in below, as its author would; anon is still proven refused partners above.
      const cols = m[1].split(",").map((x) => x.trim());
      if (cols.includes("partners")) {
        const fnAt = s.lastIndexOf("export function ", m.index);
        const fn = (s.slice(fnAt, fnAt + 60).match(/export function (\w+)/) || [])[1];
        if (rel !== path.join("lib", "db.js") || fn !== "useMyLogs") fail(`${rel}: a climb_logs select naming partners outside useMyLogs (${fn || "?"}) — partners is refused signed out since 0501`);
        else if (!/\.eq\("user_id", userId\)/.test(s.slice(m.index, m.index + m[0].length + 200))) fail("useMyLogs names partners but no longer reads only .eq(\"user_id\", userId) — it must stay the climber's OWN logs");
        else ownLists.set(m[1], rel + " useMyLogs (own logs, signed in)");
        continue;
      }
      if (!lists.has(m[1])) lists.set(m[1], rel);
    }
  }
  const before = failures;
  for (const [list, where] of lists) {
    const r = await as("anon", null, `select ${sqlCols(list)} from climb_logs limit 1`);
    if (r.error) fail(`${where}: "${list.slice(0, 80)}…" signed out: ${r.error}`);
  }
  for (const [list, where] of ownLists) {
    const r = await as("authenticated", A, `select ${sqlCols(list)} from climb_logs where user_id = auth.uid() limit 1`);
    if (r.error) fail(`${where}: "${list.slice(0, 80)}…" signed in as the author: ${r.error}`);
    else ok(`${where} runs signed in (it names partners, the author's own)`);
  }
  if (failures === before) ok(`${lists.size} app climb_logs select lists run signed out`);
}

// ── 8. every function a GUEST can call that reads climb_logs AS THE CALLER still runs (0540) ────────
// 0501 took climb_logs.partners from anon. state_trip_reports was SECURITY INVOKER and read `l.*`, so
// every signed-out call was refused, and the nightly offline state files (built with the anon key)
// published 0 of 61 states for three nights before anyone saw it. Each SECURITY INVOKER read-only
// function anon may execute whose body names climb_logs is called here as anon with NULL arguments:
// nothing matches, but Postgres checks column privileges before it reads a row, so a whole-row or
// a hidden-column read fails exactly as it does in production.
{
  const fns = (await db.query(`select p.oid::regprocedure::text as sig, p.proname, p.pronargs,
       coalesce((select string_agg(format_type(t, null), ',') from unnest(p.proargtypes) t), '') as args
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not p.prosecdef and p.prokind = 'f' and p.provolatile in ('s', 'i')
      and p.prosrc ~* 'climb_logs' and has_function_privilege('anon', p.oid, 'execute')`)).rows;
  const before = failures;
  for (const f of fns) {
    const nulls = f.args ? f.args.split(",").map((t) => `null::${t}`).join(", ") : "";
    const r = await as("anon", null, `select * from public.${f.proname}(${nulls}) limit 1`);
    if (r.error && /permission denied/i.test(r.error)) fail(`${f.sig} signed out: ${r.error} — a SECURITY INVOKER reader must name only columns anon holds (0540 did this for state_trip_reports)`);
  }
  if (!fns.some((f) => f.proname === "state_trip_reports")) fail("state_trip_reports is no longer an invoker read-only function anon can call — the nightly offline build calls it with the anon key; re-read 0540");
  if (failures === before) ok(`${fns.length} invoker function(s) a guest can call that read climb_logs run signed out`);
}

if (failures) { console.error(`\ncheck:profile-privacy FAILED — ${failures} problem(s).`); process.exit(1); }
console.log("\ncheck:profile-privacy: every check passed.");
