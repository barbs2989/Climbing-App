// The CI half of check:signed-in's fixture: sign in as two accounts that already exist,
// using the ANON key only.
//
// Deliberately a separate module from ui-fixture.mjs, which calls requireServiceKey() at
// import time — importing that from CI would fail before doing anything, and worse, would
// make the service key look required when the whole point is that it is not.
//
// The privileged work happened once, locally:
//   scripts/oneoff/create-ci-test-accounts.mjs   (accounts, discoverable=false)
//   scripts/oneoff/seed-ci-test-fixture.mjs      (crew, group, logbook, connection)
// Everything here is what a real climber's browser does: exchange a password for a session.
//
// It returns the same shape as createFixture() so the walk cannot tell the difference —
// except cleanup(), which is a no-op that reports nothing leaked, because nothing was made.

import { SUPABASE_URL, anonKey } from "./supabase-env.mjs";
import { POLICY_VERSION } from "../../lib/policy.js";
// Re-exported from ui-fixture so the two modes cannot disagree about the storage contract.
// Safe to import now that its service-key lookup is lazy.
export { sessionForStorage, STORAGE_KEY } from "./ui-fixture.mjs";

const ANON = anonKey();

export function durableCredsPresent() {
  return !!(process.env.CI_TEST_OWNER_EMAIL && process.env.CI_TEST_OWNER_PASSWORD
    && process.env.CI_TEST_MATE_EMAIL && process.env.CI_TEST_MATE_PASSWORD);
}

async function readBody(r) {
  const text = await r.text().catch(() => "");
  try { return { status: r.status, json: JSON.parse(text), text }; }
  catch { return { status: r.status, json: null, text }; }
}

// A sick database answers with a gateway page, not JSON. Say which it is: "the fixture is
// broken" and "the database is down" need opposite responses, and a JSON parse error in the
// middle of a CI log reads as the former.
function assertHealthy(res, what) {
  if (res.status === 503 || res.status === 504 || (res.status >= 500 && !res.json) || res.json?.code === "PGRST002") {
    throw new Error(`the database is not answering (HTTP ${res.status}) while ${what}. This is not a fixture fault; re-run when it recovers.`);
  }
}

// A REST call as a given user's JWT — never the service key, which CI does not hold.
const asUser = async (sess, path, init = {}) => readBody(await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...init,
  headers: {
    apikey: ANON, Authorization: `Bearer ${sess.access_token}`,
    "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}),
  },
}));

async function signIn(email, password) {
  const res = await readBody(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  assertHealthy(res, `signing in as ${email}`);
  if (!res.json?.access_token) {
    throw new Error(`sign-in failed for ${email} (HTTP ${res.status}): ${(res.text || "").slice(0, 200)}. If the password was rotated, re-run create-ci-test-accounts.mjs --reset-password and update the CI secrets.`);
  }
  return res.json;
}

export async function durableFixture(log) {
  const ownerEmail = process.env.CI_TEST_OWNER_EMAIL;
  const mateEmail = process.env.CI_TEST_MATE_EMAIL;
  const session = await signIn(ownerEmail, process.env.CI_TEST_OWNER_PASSWORD);
  const mateSession = await signIn(mateEmail, process.env.CI_TEST_MATE_PASSWORD);

  // Read the mate's display name from their own profile rather than hardcoding it here: the
  // walk asserts the crew roster renders that name, and a constant in two files is a constant
  // that will disagree with itself.
  const res = await readBody(await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${mateSession.user.id}&select=id,name,discoverable`,
    { headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}` } },
  ));
  assertHealthy(res, "reading the mate's profile");
  const mate = res.json?.[0];
  if (!mate?.name) throw new Error(`the mate profile ${mateSession.user.id} has no name — re-run scripts/oneoff/create-ci-test-accounts.mjs`);

  // The safety contract, re-checked on every run rather than at setup only. These accounts
  // are permanent, so "discoverable=false" has to keep being true, not merely have been true
  // the day they were made — a later migration or backfill could flip a column default.
  if (mate.discoverable !== false) {
    throw new Error(`the CI mate profile is discoverable — it can surface in partner browse for real users. Set discoverable=false before running again.`);
  }

  // THE DURABLE ACCOUNTS PREDATE 0145's TRIGGER, so nothing ever stamped their acceptance and
  // PolicyUpdateNotice fired on every screen of every CI run -- a fixed, non-dismissible 200px
  // panel over the bottom of everything these guards measure, and 216 characters of constant
  // text inflating every screen's length. The per-run fixture is fixed at creation
  // (scripts/lib/ui-fixture.mjs sends terms_version, exactly as lib/auth.js does on a real
  // signup); these accounts already exist, so they are stamped here instead.
  //
  // The account updates its OWN profile row on its OWN JWT, which is precisely what
  // acceptCurrentPolicy() does in the app -- no service key, and nothing CI is not allowed to
  // hold. Idempotent: it reads first and writes only when the version differs, so a re-run is
  // one extra GET.
  const pol = await readBody(await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=terms_accepted_version`,
    { headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}` } },
  ));
  assertHealthy(pol, "reading the owner's policy acceptance");
  if (pol.json?.[0]?.terms_accepted_version !== POLICY_VERSION) {
    const stamp = await readBody(await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: ANON, Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json", Prefer: "return=representation",
        },
        body: JSON.stringify({ terms_accepted_version: POLICY_VERSION, terms_accepted_at: new Date().toISOString() }),
      },
    ));
    assertHealthy(stamp, "stamping the owner's policy acceptance");
    log(`  stamped the durable owner's policy acceptance (${POLICY_VERSION})`);
  }

  log(`  signed in as the durable CI accounts (anon key only, no service key)`);

  // A GROUP PER RUN, not one shared group — this is the isolation the durable-account design
  // was missing, and its absence produced non-deterministic reds on other people's PRs.
  //
  // The accounts have to be durable (no service key in CI, and no self-delete API, so per-run
  // ACCOUNTS would leak forever). Their DATA does not. The walk opens group modals that mutate
  // shared state — visibility, membership — and the assertions it makes are precisely about
  // that state (`isCreator`'s "+ Mod" control, `isMod`'s visibility toggle). Two runs a minute
  // apart therefore read each other's writes: on 2026-08-14 #969 failed on exactly that pair
  // and passed on re-run of the same SHA, having changed no app code.
  //
  // Groups are safe to make per-run because, unlike auth users, an owner can delete their own:
  // measured create 201 / mate-joins 201 / owner-deletes 200, row gone. So each run gets a
  // uniquely named group and takes it away again.
  // PER-RUN IS NOT PER-JOB, and that gap failed a run on 2026-08-21. `check:outage` and
  // `check:signed-in` are two jobs of the SAME workflow, so they share GITHUB_RUN_ID and
  // GITHUB_RUN_ATTEMPT and both built the identical group name. Measured on run 32450076698:
  // both started 05:18:41, outage finished 05:21:49, and signed-in failed at 05:22:47 with
  // "a member count reads 1 for a 2-member group". Teardown deletes BY ID so it cannot remove
  // the sibling's row -- but check:signed-in picks the group to open BY NAME, so with two rows
  // sharing a name it can walk the OTHER job's group and watch that job tear it down underneath.
  //
  // The symptom is the tell this repo already records for the ungated sweepOrphans: the victim's
  // rows stop existing, the failure lands nowhere near the cause, and it passes on re-run --
  // which is exactly how a real defect gets filed as a flake. GITHUB_JOB separates them.
  const tag = process.env.GITHUB_RUN_ID
    ? `run ${process.env.GITHUB_RUN_ID}${process.env.GITHUB_RUN_ATTEMPT ? "." + process.env.GITHUB_RUN_ATTEMPT : ""}${process.env.GITHUB_JOB ? "-" + process.env.GITHUB_JOB : ""}`
    : `local ${process.pid.toString(36)}${Date.now().toString(36).slice(-4)}`;
  const groupName = `CI Fixture Alpine Club (${tag})`;

  // SWEEP WHAT EARLIER RUNS LEFT, and this is the half that actually mattered. Teardown deletes
  // this run's group by id in a `finally`, which a cancelled or killed job never reaches -- so
  // every such run leaks a group owned by the durable account, and nothing has ever removed them.
  // Measured 2026-08-21: the live project held 17 groups, of which 15 were CI fixture leftovers
  // going back to 2026-08-13 and ZERO were real. `useMyGroups()` selects every group with no
  // filter, so that pile is the Groups tab every walk sees, and check:signed-in picks the group
  // to open BY NAME -- two rows sharing a name (which a run without the GITHUB_JOB tag above still
  // produces) let it walk one group while another job tears that one down.
  //
  // sweepOrphans() cannot cover this: it removes @climbmatch-qa.invalid ACCOUNTS, and these
  // groups belong to the durable pair, which must never be deleted.
  //
  // AGE-GATED at 45 minutes for the same reason sweepOrphans is, and getting that wrong is worse
  // than the leak: ungated, this deletes the group of a run already in flight, whose failure then
  // lands nowhere near the cause and passes on re-run. 45 min clears the 25-minute job wall.
  const staleBefore = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const stale = await asUser(session, `groups?select=id&created_by=eq.${session.user.id}` +
    `&name=like.CI%20Fixture%20Alpine%20Club*&created_at=lt.${staleBefore}`);
  const staleRows = Array.isArray(stale.json) ? stale.json : [];
  let swept = 0;
  for (const g of staleRows) {
    const d = await asUser(session, `groups?id=eq.${g.id}`, { method: "DELETE" });
    if (d.status < 300) swept++;
  }
  if (staleRows.length) log(`  swept ${swept}/${staleRows.length} fixture group(s) left by earlier runs (older than 45 min)`);
  // Same route the rest of the fixture uses. crews.route_id is NOT NULL.
  const CREW_ROUTE_ID = "wa_mount_baker_north_ridge";

  // THE SAME SWEEP FOR CREWS, WHICH HAD NONE. Measured 2026-08-26: the live project held 15
  // crews and 13 belonged to `CI Fixture Mate`, one per guard run from 16:06 through 19:41 on a
  // single day, plus one from 2026-08-13. Groups looked clean over that same period, and that
  // was the sweep above doing its job rather than teardown doing its job -- a failed group
  // delete is quietly repaired 45 minutes later, a failed crew delete is forever. The asymmetry
  // is what hid it: the table WITHOUT a backstop is the one whose leaks are visible.
  //
  // sweepOrphans() structurally cannot reach these. It removes @climbmatch-qa.invalid ACCOUNTS
  // and deletes what they created first; this crew belongs to the DURABLE mate, which must never
  // be deleted. Exactly the reason the group sweep exists, one table over.
  //
  // Swept AS THE MATE, who created them: the crews delete policy is `auth.uid() = created_by`
  // (0036), and the owner is only an invited member here.
  //
  // Age-gated at the same 45 minutes, for the reason the comment above spells out -- ungated,
  // this deletes the crew of a run already in flight, and two concurrent runs were observed in
  // this project on 2026-08-19. Narrowed by `created_by` AND `route_id` rather than by a name,
  // because `crews` has no name column; the mate is a fixture account nobody else can post as,
  // so no real climber's crew can be caught by it.
  //
  // WHAT A CREW DELETE TAKES WITH IT, checked in the migrations rather than assumed, because a
  // sweep is the wrong place to discover a cascade: `crew_members.crew_id` and
  // `crews_messages.crew_id` are ON DELETE CASCADE (0036, 0042) so the membership and chat rows
  // go cleanly, and `climb_logs.crew_id` is ON DELETE SET NULL (0037) -- a climber's LOG survives
  // its crew being removed. Had that one cascaded, this sweep would destroy real logged climbs.
  const staleCrews = await asUser(mateSession,
    `crews?select=id&created_by=eq.${mateSession.user.id}` +
    `&route_id=eq.${CREW_ROUTE_ID}&created_at=lt.${staleBefore}`);
  const staleCrewRows = Array.isArray(staleCrews.json) ? staleCrews.json : [];
  let sweptCrews = 0;
  for (const c of staleCrewRows) {
    const d = await asUser(mateSession, `crews?id=eq.${c.id}`, { method: "DELETE" });
    if (d.status < 300) sweptCrews++;
  }
  // Reported even when it removes NOTHING it found, because "found 11, removed 0" and "found 0"
  // need opposite reactions and print identically if only one number is logged. A sweep that
  // silently fails is the same defect as the teardown that silently failed.
  if (staleCrewRows.length) {
    log(`  swept ${sweptCrews}/${staleCrewRows.length} fixture crew(s) left by earlier runs (older than 45 min)`);
    if (sweptCrews < staleCrewRows.length) {
      log(`  WARNING: ${staleCrewRows.length - sweptCrews} stale crew(s) refused deletion — that is ` +
        `the delete policy or the mate's session, not the sweep. They accumulate until it is fixed.`);
    }
  }

  const mk = await asUser(session, "groups", {
    method: "POST",
    body: JSON.stringify({
      created_by: session.user.id, name: groupName, blurb: "Per-run fixture for check:signed-in.",
      location: "North Cascades", disciplines: ["alpine"], visibility: "public",
    }),
  });
  assertHealthy(mk, "creating this run's group");
  const group = mk.json?.[0];
  if (!group?.id) throw new Error(`could not create this run's group (HTTP ${mk.status}): ${(mk.text || "").slice(0, 200)}`);

  // The MATE seats themselves. A group owner cannot add a member (403) — that is the policy,
  // and it is what a real join does; seeding it any other way would manufacture a state the
  // app's own flow cannot reach.
  const join = await asUser(mateSession, "group_members", {
    method: "POST",
    body: JSON.stringify({ group_id: group.id, user_id: mateSession.user.id, role: "member" }),
  });
  assertHealthy(join, "seating the mate in this run's group");
  if (join.status >= 300) throw new Error(`the mate could not join this run's group (HTTP ${join.status}): ${(join.text || "").slice(0, 200)}`);

  // AND THEN HIDE IT. `groups read public or member` makes a public group readable by
  // everyone, and useMyGroups() selects every group with no filter, ordered created_at DESC
  // — so while this walk runs, a real climber opening the Groups tab sees "CI Fixture Alpine
  // Club (run 32274…)" at the TOP of their list. That is the same objection that made
  // `discoverable=false` mandatory for the durable PROFILES, and it was never applied to the
  // groups those accounts create. Measured 2026-08-19: the live project held two groups and
  // both were fixtures, so a real user's Groups tab was 100% test data.
  //
  // The order here is measured, not guessed, and it is the only order that works:
  //   * creating with visibility:'private' is refused outright — 42501, RLS. The live INSERT
  //     policy requires a group to START public, which 0090's file does not say; the file and
  //     the live policy disagree, so read this from the probe, not from the migration.
  //   * the mate joins BEFORE the flip, deliberately. group_members' insert policy carries no
  //     visibility clause in the file — but the file was already wrong once above, and a join
  //     that silently started failing would break the walk's whole reason to exist (a uuid
  //     member on the roster). Joining while public keeps that on the path already proven.
  // Exposure therefore drops from the full ~4-minute walk to about a second.
  const hide = await asUser(session, `groups?id=eq.${group.id}`, {
    method: "PATCH", body: JSON.stringify({ visibility: "private" }),
  });
  assertHealthy(hide, "hiding this run's group from real users");
  if (hide.json?.[0]?.visibility !== "private") {
    throw new Error(`this run's group is still ${JSON.stringify(hide.json?.[0]?.visibility ?? "unknown")} (HTTP ${hide.status}) — it would be listed in every real user's Groups tab. Refusing to walk rather than exposing it.`);
  }
  group.visibility = "private";
  log(`  created this job's own group ${JSON.stringify(groupName)}, private — no other JOB or run can touch it, and no real user can see it`);

  // A per-run crew owned by the MATE, with the owner left INVITED and never confirmed.
  //
  // check:outage documented this as a blind spot about itself: "No crew invites" was on screen
  // in the HEALTHY run too, because the mate JOINS the durable crew rather than staying invited.
  // The outage introduced nothing, so rule 2 stayed quiet and rule 1 was satisfied by the
  // friend-requests section beside it -- leaving the gate #1212 put in front of that sentence
  // real and unverifiable. An absence the fixture happens to share is unmeasurable, not absent.
  //
  // PER-RUN for the same reason the group is: this is state the walk asserts on, so two
  // concurrent runs sharing one invite would read each other's writes.
  //
  // Unlike the group, this needs no visibility flip. `crews` RLS is created_by = me OR I am a
  // member, with no public class at all, so it cannot surface in a real climber's app the way
  // a public group did.
  const mkCrew = await asUser(mateSession, "crews", {
    method: "POST",
    body: JSON.stringify({
      created_by: mateSession.user.id, route_id: CREW_ROUTE_ID, dates: ["2026-10-04"],
      meet_place: "Coleman Deming TH", meet_time: "05:00", cap: 3,
    }),
  });
  assertHealthy(mkCrew, "creating this run's invite crew");
  const inviteCrew = mkCrew.json?.[0];
  if (!inviteCrew?.id) throw new Error(`could not create this run's invite crew (HTTP ${mkCrew.status}): ${(mkCrew.text || "").slice(0, 200)}`);

  // The MATE does the inviting, because that is what the live policy requires: `join or invite`
  // demands invited_by = auth.uid() AND (you created the crew, or you are seating yourself at a
  // status other than confirmed). Doing it as the owner would manufacture a state the app's own
  // flow cannot reach -- the trap this repo already records for the accepted connection.
  for (const [uid, status] of [[mateSession.user.id, "confirmed"], [session.user.id, "invited"]]) {
    const seat = await asUser(mateSession, "crew_members", {
      method: "POST",
      body: JSON.stringify({ crew_id: inviteCrew.id, user_id: uid, status, invited_by: mateSession.user.id }),
    });
    assertHealthy(seat, `seating ${status} member in this run's invite crew`);
    if (seat.status >= 300) throw new Error(`could not seat the ${status} member (HTTP ${seat.status}): ${(seat.text || "").slice(0, 200)}`);
  }
  log(`  created this run's invite crew ${inviteCrew.id.slice(0, 8)}, owned by the mate, owner INVITED and not confirmed`);

  return {
    owner: { id: session.user.id, email: ownerEmail, name: "CI Fixture Owner" },
    mate: { id: mateSession.user.id, email: mateEmail, name: mate.name },
    // THE SECOND ACCOUNT'S SESSION, which this fixture has held all along and did not hand back.
    // Three merged PRs stated that CI could not run a two-account walk because "the durable pair
    // does not expose the mate's password" — and the password was never the point: signIn() above
    // already used it, so the session exists. The blocker was a missing property. A walk that
    // needs the second account to WRITE (a vouch, a message, a crew invite) can now do it under
    // the mate's own JWT in CI exactly as it does locally, which is the whole reason those probes
    // refuse the service key. What still gates each one is CONCURRENCY on these shared accounts,
    // and that is per-probe rather than general: a `messages` insert is safe because two runs'
    // rows coexist and teardown deletes by id, while `vouches` is UNIQUE(from_id, to_id) so a
    // second run is refused and a shared row is torn down under the first.
    mateSession,
    group,
    inviteCrew,
    session,
    // The accounts stay; this run's group and invite crew do not. Returning the names of rows
    // that could NOT be removed matches createFixture's contract, so a leak is reported rather
    // than accumulating silently in a live project.
    async cleanup() {
      const leaked = [];
      const del = await asUser(session, `groups?id=eq.${group.id}`, { method: "DELETE" });
      if (del.status >= 300) leaked.push(`group ${groupName} (HTTP ${del.status})`);
      else {
        const left = await asUser(session, `groups?id=eq.${group.id}&select=id`);
        if (Array.isArray(left.json) && left.json.length) leaked.push(`group ${groupName} (still present after DELETE)`);
      }
      // Deleted BY THE MATE, who created it -- the owner is only an invited member and the
      // crews delete policy is the creator's. crew_members is ON DELETE CASCADE, so the two
      // membership rows go with it.
      const dc = await asUser(mateSession, `crews?id=eq.${inviteCrew.id}`, { method: "DELETE" });
      if (dc.status >= 300) leaked.push(`invite crew ${inviteCrew.id} (HTTP ${dc.status})`);
      else {
        const left = await asUser(mateSession, `crews?id=eq.${inviteCrew.id}&select=id`);
        if (Array.isArray(left.json) && left.json.length) leaked.push(`invite crew ${inviteCrew.id} (still present after DELETE)`);
      }
      return leaked;
    },
  };
}
