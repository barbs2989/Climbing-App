#!/usr/bin/env node
// Does the live site actually serve the current tip of main?
//
// Why this exists. On 2026-08-06 production sat 8 commits behind main for five
// hours and nothing reported it. Two separate causes, and neither was visible
// from inside a deploy run:
//
//   1. cancel-in-progress: true meant each merge killed the build behind it, so
//      run after run reported "cancelled" -- a word that reads like a decision
//      rather than a failure. Fixed in #616.
//   2. During a GitHub Actions outage, nine merges produced NO deploy run at
//      all. deploy.yml cannot report on a run that never existed, so the only
//      way to notice is to ask the question from outside: what is main, and
//      what is actually published?
//
// Run by hand any time:  node scripts/check-deploy-drift.mjs
// Exit 0 = in sync (or inside the grace window). Exit 1 = real drift.

const REPO = process.env.GITHUB_REPOSITORY || "barbs2989/Climbing-App";
const SITE = process.env.SITE_URL || "https://barbs2989.github.io/Climbing-App/";
// A merge that landed a moment ago is not drift -- the build takes ~5 min and
// the runner may queue before that. Only complain once a commit has had a fair
// chance to reach production.
//
// THE CLOCK USED TO BE THE NEWEST COMMIT'S AGE, AND THAT MADE THIS GUARD
// STRUCTURALLY UNABLE TO REPORT THE THING IT EXISTS FOR. Measured 2026-09-02:
// production sat 17 commits and ~80 minutes behind main while this printed
// "ok -- a deploy is probably still in flight" on every run. In a repo where
// several sessions merge every few minutes there is ALWAYS a commit younger
// than the grace, so the grace never expires, however far behind production is.
//
// The right question is not "how fresh is the newest commit" but "how long has
// the OLDEST thing we have not shipped been waiting". That number is unaffected
// by later merges, so a busy repo can no longer excuse itself.
//
// What was starving them, for the failure message below: deploy.yml gates every
// step on the SHA still being the tip of main (tip_early/tip_final). Under a
// fast merge rate a newer commit lands during the ~1 minute build, tip_final is
// false, and the deploy job SKIPS -- while the run still reports "success" at
// the run level. 10 of 25 consecutive runs skipped that way and 10 more were
// cancelled while queued.
const GRACE_MINUTES = Number(process.env.GRACE_MINUTES || 45);
// Injection hook. The healthy state of this guard is "in sync", which is also
// what a broken clock prints, so the stale path cannot be exercised without
// pretending production is behind. Used only by the injection cases at the
// bottom of this file.
const SIMULATE_PUBLISHED = process.env.SIMULATE_PUBLISHED || "";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const api = async (path) => {
  const r = await fetch(`https://api.github.com/${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const short = (s) => (s || "").slice(0, 7);
const fail = (msg) => { console.error(msg); process.exitCode = 1; };

// The newest deployment record is NOT necessarily the live one. A stale run can
// publish a *failed* record on top of a healthy site -- that happened on
// 2026-08-06, and reading deployments[0] blindly would have called production
// broken while it was fine (and, worse, called it fine while an old commit had
// been republished over it). Production serves the most recent deployment whose
// latest status is "success"; nothing else counts.
async function livePublishedSha() {
  const deployments = await api(`repos/${REPO}/deployments?environment=github-pages&per_page=30`);
  for (const d of deployments) {
    const statuses = await api(`repos/${REPO}/deployments/${d.id}/statuses?per_page=1`);
    if (statuses[0]?.state === "success") return { sha: d.sha, id: d.id, at: statuses[0].created_at };
  }
  return null;
}

// How long has the OLDEST unpublished commit been waiting, and how many are there?
// `compare` returns commits oldest-first, so commits[0] is the one that has been
// waiting longest. `ahead_by` stays accurate even when the commit list is capped.
//
// Fails SOFT rather than closed, deliberately: if the comparison cannot be made the
// answer is still "production is behind", and refusing to report that at all would be
// worse than reporting it on the weaker clock. The output says which clock it used.
async function staleness(baseSha, headSha) {
  try {
    const cmp = await api(`repos/${REPO}/compare/${baseSha}...${headSha}`);
    const oldest = (cmp.commits || [])[0];
    if (!oldest || !cmp.ahead_by) return null;
    return {
      behind: cmp.ahead_by,
      sha: oldest.sha,
      min: Math.round((Date.now() - new Date(oldest.commit.committer.date).getTime()) / 60000),
    };
  } catch { return null; }
}

const mainCommit = await api(`repos/${REPO}/commits/main`);
const mainSha = mainCommit.sha;
const mainAt = new Date(mainCommit.commit.committer.date);
const ageMin = Math.round((Date.now() - mainAt.getTime()) / 60000);

const published = SIMULATE_PUBLISHED
  ? { sha: SIMULATE_PUBLISHED, id: 0, at: "(simulated)" }
  : await livePublishedSha();
if (SIMULATE_PUBLISHED) console.log(`(SIMULATE_PUBLISHED=${short(SIMULATE_PUBLISHED)} - injection run, not a real verdict)`);

// Liveness is a separate question from freshness: the right commit can be
// published and the site still be unreachable.
let siteOk = false, bundle = "";
try {
  const r = await fetch(SITE, { redirect: "follow" });
  const html = await r.text();
  bundle = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [""])[0];
  siteOk = r.ok && !!bundle;
  if (!siteOk) fail(`the site did not answer with a bundle: http ${r.status}`);
} catch (e) {
  fail(`the site is unreachable: ${e.message}`);
}

console.log(`main       ${short(mainSha)}  (${ageMin} min old)`);
console.log(`published  ${published ? short(published.sha) : "<no successful deployment found>"}`);
const stale = published && published.sha !== mainSha ? await staleness(published.sha, mainSha) : null;
if (stale) console.log(`behind     ${stale.behind} commit(s); oldest unpublished ${short(stale.sha)} has waited ${stale.min} min`);
console.log(`site       ${siteOk ? `ok, serving ${bundle}` : "UNREACHABLE"}`);

// Liveness first. Publishing the right commit is no comfort if the site is
// down, and reporting "ok — production serves the current tip of main" under an
// UNREACHABLE site is exactly the kind of green that hides a real failure.
if (!siteOk) {
  fail(
    `\ncheck:deploy-drift FAILED — the deployed site is not serving.\n` +
    `  ${SITE}\n` +
    `The published commit may still be correct; that is not the problem here.`
  );
} else if (!published) {
  fail("\ncheck:deploy-drift FAILED — no successful github-pages deployment exists at all.");
} else if (published.sha === mainSha) {
  console.log("\ncheck:deploy-drift: ok — production serves the current tip of main.");
} else if (stale ? stale.min < GRACE_MINUTES : ageMin < GRACE_MINUTES) {
  console.log(
    `\ncheck:deploy-drift: ok — production is behind main, but the oldest unpublished ` +
    `commit has only waited ${stale ? stale.min : ageMin} min (grace ${GRACE_MINUTES} min). ` +
    `A deploy is probably still in flight.` +
    (stale ? "" : "  [could not compare against published; fell back to the newest commit's age]")
  );
} else {
  fail(
    `\ncheck:deploy-drift FAILED — production is ${stale ? stale.behind : "?"} commit(s) behind main, ` +
    `and the oldest unpublished commit has waited ${stale ? stale.min : ageMin} minutes.\n` +
    `  main       ${mainSha}\n` +
    `  published  ${published.sha}  (succeeded ${published.at})\n\n` +
    `Nothing is publishing. The usual causes, in order:\n` +
    `  1. DEPLOYS ARE STARVING under a fast merge rate. deploy.yml gates every step\n` +
    `     on the SHA still being the tip of main, so a merge landing during the build\n` +
    `     makes the deploy job SKIP -- while the run still says "success". Check the\n` +
    `     JOB, not the run:\n` +
    `       gh run view <id> --json jobs --jq '.jobs[] | "\\(.name) \\(.conclusion)"'\n` +
    `     Measured 2026-09-02: 10 of 25 runs skipped, 10 more cancelled while queued.\n` +
    `  2. No deploy run was ever created (push triggers dropped during a GitHub\n` +
    `     incident). Check: gh run list --workflow=deploy.yml --branch=main\n` +
    `  3. Runs are being created but never picked up by a runner.\n` +
    `  4. A run failed at the publish step.\n\n` +
    `To fix, dispatch a deploy of current main:\n` +
    `  gh workflow run deploy.yml --ref main\n` +
    `Then confirm by bundle hash, not by a green check -- a superseded run reports\n` +
    `"cancelled" and gh run watch exits 0 on it.`
  );
}
