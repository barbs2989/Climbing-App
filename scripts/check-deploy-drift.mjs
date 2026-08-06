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
const GRACE_MINUTES = Number(process.env.GRACE_MINUTES || 45);
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

const mainCommit = await api(`repos/${REPO}/commits/main`);
const mainSha = mainCommit.sha;
const mainAt = new Date(mainCommit.commit.committer.date);
const ageMin = Math.round((Date.now() - mainAt.getTime()) / 60000);

const published = await livePublishedSha();

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
} else if (ageMin < GRACE_MINUTES) {
  console.log(
    `\ncheck:deploy-drift: ok — production is behind main, but the newest commit is only ` +
    `${ageMin} min old (grace ${GRACE_MINUTES} min). A deploy is probably still in flight.`
  );
} else {
  fail(
    `\ncheck:deploy-drift FAILED — production has been behind main for ${ageMin} minutes.\n` +
    `  main       ${mainSha}\n` +
    `  published  ${published.sha}  (succeeded ${published.at})\n\n` +
    `Nothing is publishing the newest commit. The usual causes, in order:\n` +
    `  1. No deploy run was ever created for it (push triggers dropped during a\n` +
    `     GitHub incident). Check: gh run list --workflow=deploy.yml --branch=main\n` +
    `  2. Runs are being created but never picked up by a runner.\n` +
    `  3. A run failed at the publish step.\n\n` +
    `To fix, dispatch a deploy of current main:\n` +
    `  gh workflow run deploy.yml --ref main\n` +
    `Then confirm by bundle hash, not by a green check -- a superseded run reports\n` +
    `"cancelled" and gh run watch exits 0 on it.`
  );
}
