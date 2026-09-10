// The badge a climber actually sees, at each tier boundary.
//
// check:trust-breakdown section 7 proves the ladder's SHAPE — every bar reachable, none handed out
// for signing up, exactly one copy. It does not prove the badge renders, and it never could: the
// table could be perfect while `trustTier` was wired to nothing. This renders the real component.
//
// It also pins the TOOLTIP, which was the fourth false claim on this card and the one no number
// could catch: it read "Trust score (0-100): built from ID verification, partner vouches, belay
// catches logged, climbs logged and certifications" — a range wrong twice over (the cap is 99 and
// only 84 is earnable) that led with the two components which are zero for every real climber
// forever, because nothing in the app can write a verified ID or credential record.
//
// No browser, no database.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(ROOT, `.trusttierprobe-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

let failures = 0, cases = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (what) => { console.error(`\nprobe FAILED — ${what}. Nothing below was checked.\n`); clean(); process.exit(1); };

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle ClimbMatchCore.jsx"); }

const mod = await import(out + "?t=" + Date.now());
const { TrustBadge, TRUST_TIERS, TRUST_GOAL, SERVER_TRUST_EARNABLE, serverTrustScore } = mod;
if (typeof TrustBadge !== "function") dead("ClimbMatchCore.jsx does not export TrustBadge — ANCHOR LOST");
if (!Array.isArray(TRUST_TIERS) || TRUST_TIERS.length < 3) dead("TRUST_TIERS did not load");

const draw = (score) => renderToStaticMarkup(React.createElement(TrustBadge, { score }));

// A markup floor first: every "must contain" assertion below is vacuous against a badge that
// rendered nothing at all.
const probe = draw(50);
if (probe.length < 60) dead(`TrustBadge rendered ${probe.length} characters — too thin to assert on`);

// EACH TIER AT ITS OWN MINIMUM, AND ONE POINT BELOW IT. The boundary is where an off-by-one lives,
// and a ladder wired to the bottom tier passes any test that only checks the minimum.
for (let i = 0; i < TRUST_TIERS.length; i++) {
  const t = TRUST_TIERS[i];
  cases++;
  const at = draw(t.min);
  if (!at.includes(t.label)) fail(`a score of ${t.min} does not render "${t.label}" — the badge shows: ${at.slice(0, 160)}`);
  else ok(`${t.min} renders "${t.label}"`);

  if (t.min === 0) continue;
  cases++;
  const below = draw(t.min - 1);
  const expected = TRUST_TIERS[i + 1] ? TRUST_TIERS[i + 1].label : t.label;
  if (below.includes(t.label)) fail(`a score of ${t.min - 1} still renders "${t.label}" — the bar is not where the table says`);
  else if (!below.includes(expected)) fail(`a score of ${t.min - 1} renders neither "${t.label}" nor "${expected}"`);
  else ok(`${t.min - 1} drops to "${expected}"`);
}

// THE TOP TIER MUST BE REACHABLE BY SOMEBODY, RENDERED — not merely below the ceiling arithmetically.
cases++;
const topScore = SERVER_TRUST_EARNABLE;
const top = draw(topScore);
if (!top.includes(TRUST_TIERS[0].label)) fail(`a climber at the earnable ceiling (${topScore}) does not read "${TRUST_TIERS[0].label}" — the top tier is a closed door`);
else ok(`a climber at the ceiling (${topScore}) reads "${TRUST_TIERS[0].label}"`);

// AND THE PROGRESS BAR MUST BE ABLE TO FILL. Against the old goal of 90 it capped at 93% for the
// best possible account, which is the same defect the labels had, expressed as geometry.
cases++;
const pct = Math.min(100, Math.round(SERVER_TRUST_EARNABLE / TRUST_GOAL * 100));
if (pct < 100) fail(`the Profile progress bar tops out at ${pct}% for a climber at the ceiling — a bar that cannot fill is a goal nobody can meet`);
else ok(`the progress bar fills at the ceiling (${SERVER_TRUST_EARNABLE}/${TRUST_GOAL})`);

// THE TOOLTIP. Asserted in BOTH directions: a rewrite that stops naming the dead components and
// also stops saying anything would satisfy a test that only looks for the old text.
cases++;
const title = /title="([^"]*)"/.exec(probe);
if (!title) fail("the badge renders no tooltip at all");
else {
  const s = title[1];
  const bad = ["0–100", "0-100", "ID verification", "certifications"].filter((x) => s.includes(x));
  if (bad.length) fail(`the tooltip still names ${bad.join(", ")} — components no real climber can ever score, under a range the model does not have`);
  else if (!/vouch/i.test(s) || !/climb/i.test(s)) fail(`the tooltip stopped describing what the score is built from: ${s}`);
  else ok("the tooltip names what the score is built from and no component nobody can earn");
}

// FullProfile carries the OTHER site that used to hold its own ladder. It ends in createPortal, so
// it is asserted as SOURCE rather than rendered — stated rather than implied, because the AST test
// in check:trust-breakdown proves no second ladder exists and this proves this site reads the first.
cases++;
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
if (!/_tt=trustTier\(ts\),tcol=_tt\.color,tlbl=_tt\.label/.test(core)) {
  fail("FullProfile does not resolve its tier through trustTier — it used to carry a second copy of the ladder");
} else ok("FullProfile reads the shared ladder");

// Non-vacuity on the model itself: the milestone the top tier is anchored to must still score it.
cases++;
const twoYears = serverTrustScore({ emailVerified: true, tenureDays: 730, logs: 60, vouches: 12, catches: 9, reports: 20 });
if (twoYears < TRUST_GOAL) fail(`the climber the top tier was anchored to (two years, 60 climbs, 12 vouches, 9 catches) scores ${twoYears}, below the ${TRUST_GOAL} bar it justifies`);
else ok(`the anchoring milestone still scores ${twoYears} against a ${TRUST_GOAL} bar`);

clean();
if (cases < 12) { console.error(`\nonly ${cases} case(s) ran — the probe stopped asking half its questions.`); process.exit(1); }
if (failures) { console.error(`\nprobe-trust-tiers-onscreen: ${failures} failure(s) across ${cases} case(s).\n`); process.exit(1); }
console.log(`\nprobe-trust-tiers-onscreen: ok — ${cases} case(s); every tier renders at its own bar and the badge claims no scale it does not have.`);
