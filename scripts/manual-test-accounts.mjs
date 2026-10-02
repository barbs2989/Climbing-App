// Three real accounts, filled with example data, for testing the app BY HAND while signed in.
//
//   node scripts/manual-test-accounts.mjs create   # make Avery, Blake, Casey and Drew + their data
//   node scripts/manual-test-accounts.mjs status   # are they still there? (row counts)
//   node scripts/manual-test-accounts.mjs delete   # remove every row this script made, then the accounts
//
// Sign in as AVERY (the account the checklist is written for). The sign-in details are written to
// manual-test-accounts.local at the repo root -- gitignored by `*.local`, never printed.
//
// Not scripts/lib/ui-fixture.mjs: that fixture is per-run and sweepOrphans() deletes every
// @climbmatch-qa.invalid account older than 45 minutes, so accounts made there would vanish under
// the next check:signed-in. These use their own reserved domain and live until `delete`.
//
// THESE ARE VISIBLE TO REAL USERS while they exist: discoverable profiles, a public group, public
// trip reports and route comments. Delete them when testing is done.
//
// The service key bypasses RLS, so seeding proves nothing about policies -- it only puts each
// screen in a state worth looking at. Triggers still fire: columns that default to auth.uid() are
// set explicitly, and belay_catches.filed_by is patched after insert (its trigger stamps NULL).

import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, requireServiceKey, anonKey, headers } from "./lib/supabase-env.mjs";
import { POLICY_VERSION } from "../lib/policy.js";
import { randomUUID } from "node:crypto";

const DOMAIN = "climbmatch-manual.invalid";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = process.env.MANUAL_ACCOUNTS_FILE || join(ROOT, "manual-test-accounts.local");
const KEY = requireServiceKey();
const SH = headers(KEY);

const R = {
  bakerNR: "wa_mount_baker_north_ridge",
  coleman: "wa_mount_baker_coleman_deming",
  stuart: "wa_mount_stuart_north_ridge",
  dc: "wa_mount_rainier_disappointment_cleaver",
  ptarmigan: "wa_ptarmigan_traverse",
  colchuck: "wa_colchuck_peak_colchuck_glacier",
};

// Photos are the images.unsplash.com URLs ClimbMatchCore's own seed climbers use: external https URLs
// render as-is (no storage upload), and removing one just drops the URL.
const IMG = {
  avery: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
  blake: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
  casey: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop&crop=face",
  drew: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face",
  ridge: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=280&fit=crop",
  glacier: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=400&h=280&fit=crop",
  summit: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400&h=280&fit=crop",
};

async function fetchRetry(url, opts, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fetch(url, opts); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}
async function call(base, path, opts = {}) {
  const r = await fetchRetry(`${SUPABASE_URL}/${base}/${path}`, { ...opts, headers: { ...SH, "Content-Type": "application/json", ...(opts.headers || {}) } });
  const text = await r.text();
  let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const rest = (p, o) => call("rest/v1", p, o);
const auth = (p, o) => call("auth/v1", p, o);

// Every row this script inserts is recorded, so `delete` removes exactly those rows (in reverse)
// rather than trusting FK cascades, then the accounts.
const made = [];
async function insert(table, row, key = "id") {
  const { status, body } = await rest(`${table}?select=*`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
  if (status >= 300 || !Array.isArray(body) || body.length !== 1) throw new Error(`insert ${table} failed (${status}): ${JSON.stringify(body).slice(0, 300)}`);
  const got = body[0];
  const filter = Array.isArray(key) ? key.map((k) => `${k}=eq.${encodeURIComponent(got[k])}`).join("&") : `${key}=eq.${encodeURIComponent(got[key])}`;
  made.push({ table, filter });
  return got;
}
async function patch(table, filter, body) {
  const { status, body: out } = await rest(`${table}?${filter}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) });
  if (status >= 300 || !Array.isArray(out) || out.length !== 1) throw new Error(`patch ${table}?${filter} failed (${status}): ${JSON.stringify(out).slice(0, 300)}`);
  return out[0];
}

function password() {
  const a = "abcdefghjkmnpqrstuvwxyz", d = "23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
  s += "-";
  for (let i = 0; i < 4; i++) s += d[Math.floor(Math.random() * d.length)];
  s += "-";
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)].toUpperCase();
  return s;
}
async function createUser(tag, name) {
  const email = `${tag}@${DOMAIN}`;
  const pw = password();
  const { status, body } = await auth("admin/users", { method: "POST", body: JSON.stringify({ email, password: pw, email_confirm: true, user_metadata: { name, terms_version: POLICY_VERSION } }) });
  if (status >= 300 || !body?.id) throw new Error(`create ${email} failed (${status}): ${JSON.stringify(body).slice(0, 300)}`);
  return { id: body.id, email, password: pw, name };
}
// A FAILED listing must never read as "no accounts": `status` then reported 0 accounts while
// Avery could still sign in, and `create` would go on to make a second set. Retry, then throw.
async function existingUsers() {
  let last = null;
  for (let i = 0; i < 4; i++) {
    const { status, body } = await auth("admin/users?per_page=1000");
    if (status === 200 && body && Array.isArray(body.users)) return body.users.filter((u) => (u.email || "").endsWith("@" + DOMAIN));
    last = status;
    await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }
  throw new Error(`could not list accounts (HTTP ${last}) — try again in a moment.`);
}

async function create() {
  if (existsSync(STATE) || (await existingUsers()).length) {
    throw new Error(`test accounts already exist (${STATE}${existsSync(STATE) ? "" : " missing, but @" + DOMAIN + " users found"}). Run "delete" first.`);
  }
  const users = {};
  const save = () => writeFileSync(STATE, JSON.stringify({
    note: "Manual-test accounts for ClimbMatch. Sign in as Avery. Remove with: node scripts/manual-test-accounts.mjs delete",
    created: new Date().toISOString(),
    accounts: Object.values(users).map((u) => ({ name: u.name, email: u.email, password: u.password, id: u.id })),
    rows: made,
  }, null, 2) + "\n", { mode: 0o600 });
  try {
    users.A = await createUser("avery", "Avery Tester");
    users.B = await createUser("blake", "Blake Tester");
    users.C = await createUser("casey", "Casey Tester");
    users.D = await createUser("drew", "Drew Tester");
    save();
    const { A, B, C, D } = users;

    // ── Profiles (rows made by the signup trigger; patched, not inserted) ──
    await patch("profiles", `id=eq.${A.id}`, {
      username: "averytester", show_name: true, avatar: IMG.avery,
      photos: [IMG.ridge, IMG.summit], photo_alts: { [IMG.ridge]: "A snowy ridge at sunrise (test photo)", [IMG.summit]: "Summit view over the clouds (test photo)" }, location: "Bellingham, WA", level: "Advanced",
      bio: "TEST ACCOUNT for manual QA — not a real climber. Alpine and trad, mostly the North Cascades.",
      sport_grade: "5.11a", trad_grade: "5.10a", boulder_grade: "V4",
      disciplines: ["alpine", "trad", "sport", "ice"],
      skills: ["leadbelay", "tradlead", "anchors", "glacier", "crevasse", "navigation"],
      certifications: ["WFR"], cert_expiry: { WFR: "2027-05-01" },
      belay_devices: { atc: "Proficient", grigri: "Expert" },
      climb_grades: { sport: { role: "lead" }, ice: { grade: "WI3", role: "follow" } },
      availability: ["weekends"], avail_week: ["sat_am", "sun_am", "wed_pm"], hiking_speed_ft_hr: 1500,
    });
    await patch("profiles", `id=eq.${B.id}`, {
      username: "blaketester", show_name: true, avatar: IMG.blake, location: "Seattle, WA", level: "Intermediate",
      bio: "TEST ACCOUNT for manual QA — not a real climber.", trad_grade: "5.9",
      disciplines: ["alpine", "trad"], skills: ["leadbelay", "glacier"], availability: ["weekends"], hiking_speed_ft_hr: 1300,
    });
    await patch("profiles", `id=eq.${C.id}`, {
      username: "caseytester", show_name: true, avatar: IMG.casey, location: "Leavenworth, WA", level: "Expert",
      bio: "TEST ACCOUNT for manual QA — not a real climber.", sport_grade: "5.12a", trad_grade: "5.11a",
      disciplines: ["sport", "trad", "ice"], availability: ["flexible"],
    });
    await patch("profiles", `id=eq.${D.id}`, { username: "drewtester", show_name: true, avatar: IMG.drew, location: "Tacoma, WA", bio: "TEST ACCOUNT — Avery has blocked this one.", disciplines: ["sport"] });
    await insert("profile_zips", { user_id: A.id, zip: "98225" }, "user_id");
    await insert("profile_zips", { user_id: B.id, zip: "98103" }, "user_id");
    await insert("profile_zips", { user_id: C.id, zip: "98826" }, "user_id");
    await insert("profile_emergency_contacts", { user_id: A.id, name: "Jordan (test contact)", phone: "555-0100" }, "user_id");
    const now = new Date().toISOString();
    for (const u of [A, B]) await insert("verification_records", { user_id: u.id, verification_type: "email", status: "verified", verified_at: now });
    await insert("verification_records", { user_id: A.id, verification_type: "member_club", status: "verified", verified_at: now });

    // ── Friends: A–B and B–C connected; Casey has sent Avery a request ──
    await insert("connections", { requester: A.id, addressee: B.id, status: "accepted", responded_at: now });
    await insert("connections", { requester: B.id, addressee: C.id, status: "accepted", responded_at: now });
    await insert("connections", { requester: C.id, addressee: A.id, status: "pending" });

    // ── Direct messages ──
    await insert("messages", { sender_id: A.id, recipient_id: B.id, body: "Nice work on Coleman–Deming! Up for something harder?", read: true, created_at: "2026-09-20T18:00:00Z" });
    await insert("messages", { sender_id: B.id, recipient_id: A.id, body: "Definitely. Stuart North Ridge before the snow?", read: true, created_at: "2026-09-20T18:20:00Z" });
    await insert("messages", { sender_id: B.id, recipient_id: A.id, body: "I made a crew for it — check your requests.", read: false });

    // ── Crews ──
    const crew1 = await insert("crews", {
      created_by: A.id, route_id: R.coleman, dates: ["2026-10-17", "2026-10-18"], meet_place: "Heliotrope Ridge Trailhead", meet_time: "05:00", cap: 4,
      float_plan: { vehicle: "Grey Subaru Outback (test)", lot: "Heliotrope Ridge TH", depart: "2026-10-17 05:00", ret: "2026-10-18 18:00", contact: "Jordan 555-0100 (test)", notes: "Turnaround 1 pm. TEST DATA." },
    });
    await insert("crew_members", { crew_id: crew1.id, user_id: A.id, status: "confirmed", invited_by: A.id, gear_claims: ["Rope", "Pickets"] }, ["crew_id", "user_id"]);
    await insert("crew_members", { crew_id: crew1.id, user_id: B.id, status: "confirmed", invited_by: A.id, gear_claims: ["Stove"] }, ["crew_id", "user_id"]);
    await insert("crew_members", { crew_id: crew1.id, user_id: C.id, status: "pending", invited_by: C.id, note: "Room for one more? I can bring a second rope." }, ["crew_id", "user_id"]);
    await insert("crew_day_acks", { crew_id: crew1.id, user_id: A.id, date: "2026-10-17" }, ["crew_id", "user_id", "date"]);
    await insert("crew_day_acks", { crew_id: crew1.id, user_id: B.id, date: "2026-10-17" }, ["crew_id", "user_id", "date"]);
    await insert("crews_messages", { crew_id: crew1.id, user_id: A.id, body: "Saturday works for both of us — locking in the 17th.", created_at: "2026-09-29T17:00:00Z" });
    await insert("crews_messages", { crew_id: crew1.id, user_id: B.id, body: "Forecast looks clear. I'll bring the stove and fuel.", created_at: "2026-09-29T17:30:00Z" });
    await insert("crews_messages", { crew_id: crew1.id, user_id: B.id, body: "Casey asked to join — your call, Avery." });

    const crew2 = await insert("crews", { created_by: B.id, route_id: R.stuart, dates: ["2026-10-24", "2026-10-25"], meet_place: "Stuart Lake Trailhead", meet_time: "04:30", cap: 3 });
    await insert("crew_members", { crew_id: crew2.id, user_id: B.id, status: "confirmed", invited_by: B.id }, ["crew_id", "user_id"]);
    await insert("crew_members", { crew_id: crew2.id, user_id: A.id, status: "invited", invited_by: B.id, note: "Want to lead the upper ridge?" }, ["crew_id", "user_id"]);

    const crew3 = await insert("crews", { created_by: A.id, route_id: R.colchuck, dates: ["2026-08-23"], agreed_date: "2026-08-23", dismissed: true, meet_place: "Stuart Lake Trailhead", meet_time: "04:00", cap: 4 });
    await insert("crew_members", { crew_id: crew3.id, user_id: A.id, status: "confirmed", invited_by: A.id }, ["crew_id", "user_id"]);
    await insert("crew_members", { crew_id: crew3.id, user_id: B.id, status: "confirmed", invited_by: A.id }, ["crew_id", "user_id"]);

    // ── Groups ──
    const g1 = await insert("groups", { name: "Bellingham Alpine (TEST group)", created_by: A.id, blurb: "Test group for manual QA — weekend alpine trips out of Bellingham.", location: "Bellingham, WA", disciplines: ["alpine"], policy: "approval", event_policy: "anyone", visibility: "public" });
    made.push({ table: "group_members", filter: `group_id=eq.${g1.id}` }); // the owner row the trigger makes
    await insert("group_members", { group_id: g1.id, user_id: B.id, role: "moderator", status: "active" });
    await insert("group_members", { group_id: g1.id, user_id: C.id, role: "member", status: "pending" });
    const p1 = await insert("group_posts", { group_id: g1.id, author: A.id, body: "Welcome! Post trip plans and partner requests here. (TEST DATA)", pinned: true, pinned_at: now });
    const p2 = await insert("group_posts", { group_id: g1.id, author: B.id, body: "Coleman–Deming was in great shape on 9/14 — bergschrund easy to pass on climber's left.", photos: [IMG.glacier], photo_alts: { [IMG.glacier]: "Glacier on the Coleman–Deming (test photo)" } });
    await insert("group_post_reactions", { post_id: p2.id, user_id: A.id, reaction: "🔥" }, ["post_id", "user_id"]);
    await insert("comments", { target_id: "gp_" + p2.id, user_id: A.id, text: "Thanks — that's the beta I needed." });
    const ev = await insert("group_events", { group_id: g1.id, host: A.id, title: "Crevasse rescue practice (TEST)", event_date: "2026-10-25", event_time: "9:00 am", location: "Mount Baker — Heliotrope Ridge", descr: "Bring a harness, two prusiks and a pulley.", capacity: 8 });
    await insert("group_event_rsvps", { event_id: ev.id, user_id: B.id }, ["event_id", "user_id"]);
    void p1;

    const g2 = await insert("groups", { name: "Seattle Ice (TEST group)", created_by: B.id, blurb: "Private test group.", location: "Seattle, WA", disciplines: ["ice"], policy: "approval", event_policy: "mods", visibility: "private" });
    made.push({ table: "group_members", filter: `group_id=eq.${g2.id}` });
    await insert("group_members", { group_id: g2.id, user_id: A.id, role: "member", status: "invited" });
    const ev2 = await insert("group_events", { group_id: g2.id, host: B.id, title: "Ice clinic day (TEST)", event_date: "2026-12-12", event_time: "8:00 am", location: "Alpental", descr: "Test event.", capacity: 0 });
    await insert("group_event_invites", { event_id: ev2.id, invitee: A.id, invited_by: B.id }, ["event_id", "invitee"]);

    // ── Climb logs (dates in the past; tick types capitalised; stars null = conditions report) ──
    const L = {};
    L.coleman = await insert("climb_logs", { user_id: A.id, route_id: R.coleman, discipline: "alpine", date_climbed: "2026-09-14", tick_type: "Summit", stars: 4, partners: [B.id], trip_report_visibility: "public",
      notes: "Left the TH at 4:30, summit by 11. Bergschrund passable on climber's left. TEST TRIP REPORT.", cond_tags: ["Thin snow bridges"], snow_condition: "Patchy",
      approach_minutes: 240, climb_minutes: 300, descent_minutes: 210, car_to_car_minutes: 750, party_size: 2,
      photos: [{ url: IMG.summit, caption: null, alt: "Summit plateau (test photo)" }, { url: IMG.glacier, caption: null, alt: "Roman Wall from below (test photo)" }],
      itinerary: { days: [{ n: 1, title: "Car to car", objective: "Summit", gainFt: 7080, lossFt: 7080, hours: "12-13", miles: 11.3, packLb: 30, note: "TEST", schedule: [{ time: "04:30", label: "Leave TH", detail: "" }, { time: "11:00", label: "Summit", detail: "" }] }] } });
    L.stuart = await insert("climb_logs", { user_id: A.id, route_id: R.stuart, discipline: "alpine", date_climbed: "2026-08-30", tick_type: "Lead", stars: 5, trip_report_visibility: "public",
      notes: "Long day. Gendarme pitch is the crux. TEST TRIP REPORT.", cond_tags: ["Loose rock"], rappel_count: 2, rappel_longest_m: 30, rappel_rope: "single 60 m" });
    L.colchuck = await insert("climb_logs", { user_id: A.id, route_id: R.colchuck, discipline: "alpine", date_climbed: "2026-08-23", tick_type: "Summit", stars: 3, partners: [B.id], crew_id: crew3.id, trip_report_visibility: "crew", notes: "Glacier mostly bare ice by late August. TEST." });
    L.dc = await insert("climb_logs", { user_id: A.id, route_id: R.dc, discipline: "alpine", date_climbed: "2026-07-19", tick_type: "Attempt", stars: 2, outcome_reasons: ["weather"], outcome_note: "Turned at 12,300 ft — whiteout. TEST.", trip_report_visibility: "private" });
    L.cond = await insert("climb_logs", { user_id: A.id, route_id: R.bakerNR, discipline: "alpine", date_climbed: "2026-09-28", stars: null, trip_report_visibility: "public", cond_tags: ["Thin snow bridges", "Icefall / falling ice"], snow_condition: "Patchy", notes: "Conditions only — scouted from the Coleman. TEST." });
    L.bColeman = await insert("climb_logs", { user_id: B.id, route_id: R.coleman, discipline: "alpine", date_climbed: "2026-09-14", tick_type: "Summit", stars: 5, partners: [A.id], trip_report_visibility: "public", notes: "Great day with Avery. Snow bridges getting thin above 8,000 ft. TEST.", cond_tags: ["Thin snow bridges"] });
    L.bPtarmigan = await insert("climb_logs", { user_id: B.id, route_id: R.ptarmigan, discipline: "alpine", date_climbed: "2026-08-10", tick_type: "Summit", stars: 5, trip_report_visibility: "public", notes: "Five days, perfect weather. TEST." });
    await insert("climb_log_confirmations", { log_id: L.coleman.id, partner_id: B.id, verdict: "confirmed" }, ["log_id", "partner_id"]);
    // Blake's Coleman log tags Avery and is left UNANSWERED, so Avery gets the confirm prompt.

    await insert("kudos", { giver: B.id, receiver: A.id, climb_log_id: L.stuart.id, route_name: "North Ridge (Complete)" });
    await insert("kudos", { giver: A.id, receiver: B.id, climb_log_id: L.bPtarmigan.id, route_name: "Ptarmigan Traverse" });

    // ── Belay catches, both directions, filed by the climber who was caught ──
    const c1 = await insert("belay_catches", { belayer_id: A.id, climber_id: B.id, date_occurred: "2026-08-30", description: R.stuart });
    await patch("belay_catches", `id=eq.${c1.id}`, { filed_by: B.id });
    const c2 = await insert("belay_catches", { belayer_id: B.id, climber_id: A.id, date_occurred: "2026-09-14", description: R.coleman });
    await patch("belay_catches", `id=eq.${c2.id}`, { filed_by: A.id });

    // ── Vouches: received (new style + an OLD-style one) and one EMPTY one-tap vouch given, to edit ──
    await insert("vouches", { from_id: B.id, to_id: A.id, reason: JSON.stringify({ route: "Coleman–Deming Glacier", ratings: { safety: 5, communication: 4, reliability: 5, preparation: 4, fitness: 4, teamwork: 5 }, skills: ["glacier", "crevasse", "anchors"], text: "Solid on the glacier and calm when it got windy. (TEST)", wouldClimbAgain: true }) });
    await insert("vouches", { from_id: C.id, to_id: A.id, created_at: "2026-06-01T12:00:00Z", reason: JSON.stringify({ route: "Outer Space", ratings: { safety: 5, punctuality: 3, gear: 4, belay: 5 }, skills: ["leadbelay"], text: "Older-style vouch, from before the categories changed. (TEST)", wouldClimbAgain: true }) });
    await insert("vouches", { from_id: A.id, to_id: B.id, reason: JSON.stringify({ route: "Coleman–Deming Glacier", ratings: {}, skills: [], text: "" }) });

    // ── Logbook: objectives (one shared with Blake), lists, saved search ──
    for (const r of [R.bakerNR, R.ptarmigan, R.dc]) await insert("objectives", { user_id: A.id, route_id: r }, ["user_id", "route_id"]);
    await insert("objectives", { user_id: B.id, route_id: R.ptarmigan }, ["user_id", "route_id"]);
    await insert("user_lists", { user_id: A.id, name: "Cascade glaciers to do", icon: "star", description: "Public test list.", route_ids: [R.bakerNR, R.dc, R.colchuck], shared: true });
    await insert("user_lists", { user_id: A.id, name: "Rock days (private)", icon: "star", description: "Private test list.", route_ids: [R.stuart], shared: false });
    await insert("saved_searches", { user_id: A.id, name: "Moderate alpine", query: { filters: { gradeMin: "5.6", gradeMax: "5.10", minStars: 3 }, discSel: ["alpine"] } });

    // ── Route page: a comment thread and difficulty ratings on Coleman–Deming ──
    const cm = await insert("comments", { target_id: R.coleman, user_id: B.id, text: "Anyone been up since the September storm? (TEST comment)" });
    await insert("comments", { target_id: R.coleman, user_id: A.id, parent_id: cm.id, text: "Went 9/14 — bergschrund still passable on the left. (TEST reply)" });
    await insert("route_difficulty_ratings", { route_id: R.coleman, user_id: A.id, axis: "physical", rating: 3 });
    await insert("route_difficulty_ratings", { route_id: R.coleman, user_id: A.id, axis: "technical", rating: 2 });

    // ── Comment reactions (keys from REACTIONS) ──
    await insert("comment_reactions", { comment_id: cm.id, user_id: A.id, reaction: "helpful" }, ["comment_id", "user_id"]);

    // ── Route contributions. None of their readers filter on status, so pending rows render; the
    //    service key cannot approve (trg_contribution_status). No `field` corrections: one that applies
    //    rewrites a REAL route for everyone, and a grade one fires apply_agreed_grade. ──
    await insert("contributions", { route_id: R.coleman, kind: "sun", value: { vote: "more", note: "Full sun on the Roman Wall by 9 am. TEST." }, contributor: B.id });
    await insert("contributions", { route_id: R.coleman, kind: "pair", value: { with: R.bakerNR, withName: "North Ridge", note: "Same trailhead; a good next step after Coleman–Deming. TEST." }, contributor: A.id });
    await insert("contributions", { route_id: R.coleman, kind: "photo", value: { url: IMG.ridge, alt: "Ridge above the Coleman Glacier (test photo)" }, contributor: B.id });

    // ── Hazards: Blake and Casey say the snow bridges are still there (needs >=2 matching reports, above) ──
    await insert("hazard_votes", { route_id: R.coleman, hazard_label: "Weak snow bridges", user_id: B.id, vote: "still" });
    await insert("hazard_votes", { route_id: R.coleman, hazard_label: "Weak snow bridges", user_id: C.id, vote: "still" });

    // ── Base of the climb: two on-site check-ins (inside the RPC's own rules). Not Avery, so her
    //    own real check-in is never refused as impossible travel. ──
    const ago2 = new Date(Date.now() - 2 * 86400000).toISOString();
    await insert("route_base_checkins", { route_id: R.coleman, user_id: B.id, lat: 48.7905, lng: -121.8475, accuracy_m: 8, samples: 3, fixed_at: ago2 }, ["route_id", "user_id"]);
    await insert("route_base_checkins", { route_id: R.coleman, user_id: C.id, lat: 48.7905, lng: -121.8475, accuracy_m: 10, samples: 3, fixed_at: ago2 }, ["route_id", "user_id"]);

    // ── Itineraries: Avery's own plan for North Ridge, and one Blake shared to the crew ──
    const itin = { days: [
      { n: 1, title: "Trailhead to Hogsback camp", objective: "Camp at 6,000 ft", gainFt: 2400, lossFt: 0, hours: "4-5", miles: 4, packLb: 45, note: "TEST plan", schedule: [{ time: "07:00", label: "Leave TH", detail: "" }] },
      { n: 2, title: "Summit and out", objective: "Summit", gainFt: 4700, lossFt: 7100, hours: 12, miles: 9, packLb: 20, note: "", schedule: [] },
    ] };
    await insert("user_itineraries", { user_id: A.id, route_id: R.bakerNR, itinerary: itin }, ["user_id", "route_id"]);
    await patch("crews", `id=eq.${crew1.id}`, { itinerary: itin, itinerary_by: B.id });
    await insert("crew_email_invites", { crew_id: crew1.id, email: `friend@${DOMAIN}`, invited_by: A.id, note: "Join us if you can make it. TEST." }, ["crew_id", "email"]);

    // ── A weekly repeating event: one row per week, one shared series_id, the host RSVP'd to each ──
    const series = randomUUID();
    for (const d of ["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27"]) {
      const e = await insert("group_events", { group_id: g1.id, host: A.id, title: "Tuesday gym night (TEST)", event_date: d, event_time: "6:30 pm", location: "Vital Bellingham", descr: "Weekly training session.", capacity: 0, repeat: "weekly", series_id: series });
      await insert("group_event_rsvps", { event_id: e.id, user_id: A.id }, ["event_id", "user_id"]);
    }

    // ── Guides: Casey is a verified, listed guide; Avery has an open inquiry; Blake reviewed a trip ──
    await insert("guide_profiles", { id: C.id, status: "active", title: "Alpine Guide (TEST)", base_location: "Bellingham, WA", specialty: "Glacier & alpine", bio: "TEST guide profile — not a real guide.", cancellation_policy: "Full refund 7+ days out.", lat: 48.7519, lng: -122.4787, day_rate: 450, group_max: 3, response_hrs: 24, regions: ["North Cascades", "Mount Baker"], languages: ["English"], insurance_carrier_name: "Test Mutual", insurance_attested: true, insurance_attested_at: now, permit_attested: true, permit_attested_at: now, waiver_process_attested: true, waiver_process_attested_at: now, independent_contractor_attested: true, independent_contractor_attested_at: now, agreement_signed_name: "Casey Tester", agreement_signed_at: now, submitted_at: now, listed_at: now });
    await insert("guide_credentials", { guide_id: C.id, kind: "primary_track", cert_track: "AlpineGuide", label: "Alpine Guide (TEST)", issuing_org: "AMGA", cert_number: "TEST-001", status: "verified", verified_at: now, verified_expires_at: new Date(Date.now() + 365 * 86400000).toISOString() });
    await insert("inquiries", { guide_id: C.id, climber_id: A.id, objective: "Coleman–Deming, first glacier climb (TEST)", requested_dates: "Late June 2027", party_size: 2, message: "Looking for a guided first glacier trip. TEST.", status: "new" });
    const bq = await insert("inquiries", { guide_id: C.id, climber_id: B.id, objective: "Crevasse rescue refresher (TEST)", requested_dates: "Aug 2026", party_size: 1, message: "TEST.", status: "accepted", guide_responded_at: now });
    await insert("reviews", { inquiry_id: bq.id, guide_id: C.id, climber_id: B.id, rating: 5, text: "Patient and thorough — the rescue drills finally clicked. (TEST review)", guide_reply: "Thanks Blake! (TEST)", guide_reply_at: now });

    // ── Blocked: Avery has blocked Drew (never connected, so the block has nothing to remove) ──
    await insert("blocked_users", { blocker: A.id, blocked: D.id });

    save();
    console.log(`Created Avery, Blake, Casey and Drew with ${made.length} example rows.`);
    console.log(`Sign-in details: ${STATE}`);
  } catch (e) {
    save();
    console.error("FAILED part-way: " + e.message);
    console.error(`Everything made so far is recorded in ${STATE}; run "delete" to remove it.`);
    process.exitCode = 1;
  }
}

async function remove() {
  const st = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { accounts: [], rows: [] };
  let failed = 0;
  for (const { table, filter } of [...(st.rows || [])].reverse()) {
    const { status } = await rest(`${table}?${filter}`, { method: "DELETE" });
    if (status >= 300) { failed++; console.error(`  could not delete ${table}?${filter} (${status})`); }
  }
  const users = new Map((st.accounts || []).map((a) => [a.id, a.email]));
  for (const u of await existingUsers()) users.set(u.id, u.email);
  for (const [id, email] of users) {
    const { status } = await auth(`admin/users/${id}`, { method: "DELETE" });
    if (status >= 300 && status !== 404) { failed++; console.error(`  could not delete account ${email} (${status})`); }
  }
  const left = await existingUsers();
  const ids = [...users.keys()];
  const prof = ids.length ? (await rest(`profiles?id=in.(${ids.join(",")})&select=id`)).body : [];
  if (!left.length && !(prof || []).length && !failed) {
    if (existsSync(STATE)) unlinkSync(STATE);
    console.log(`Deleted ${(st.rows || []).length} rows and ${users.size} accounts. Nothing left.`);
  } else {
    console.error(`NOT fully removed: ${left.length} account(s), ${(prof || []).length} profile(s) remain; ${failed} delete(s) failed. Run delete again.`);
    process.exitCode = 1;
  }
}

async function status() {
  const st = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null;
  const users = await existingUsers();
  console.log(`${users.length} test account(s) in the database: ${users.map((u) => u.email).join(", ") || "none"}`);
  console.log(st ? `${st.rows.length} rows recorded in ${STATE} (created ${st.created})` : `no ${STATE}`);
  if (st && st.accounts[0]) {
    const r = await fetchRetry(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anonKey(), "Content-Type": "application/json" }, body: JSON.stringify({ email: st.accounts[0].email, password: st.accounts[0].password }) });
    console.log(`Avery can sign in with the saved password: ${r.ok ? "yes" : "NO (" + r.status + ")"}`);
  }
}

const cmd = process.argv[2];
try {
  if (cmd === "create") await create();
  else if (cmd === "delete") await remove();
  else if (cmd === "status") await status();
  else { console.log("usage: node scripts/manual-test-accounts.mjs create | status | delete"); process.exitCode = 2; }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
