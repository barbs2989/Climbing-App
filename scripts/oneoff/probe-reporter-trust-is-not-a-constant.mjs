#!/usr/bin/env node
/* A REAL REPORTER'S TRUST WAS A HARDCODED 50, PRINTED BESIDE THEIR NAME.
 *
 * `buildConsensus`, `kwScan` and `routeKw` each carried a LOCAL `trustOf` shadowing the
 * module-level one — the shadowing trap CLAUDE.md records for `clickable`, three times over:
 *
 *     const trustOf = n => { const a = seedAuthor(n); return a ? vScore(a) : 50; };
 *
 * `seedAuthor` matches seed CLIMBERS by display NAME, so every DB reporter fell through it and
 * got the literal 50. RouteDetail rendered that RAW — `{""+h.trust}` and `{""+rp.trust}` — so
 * every real climber on the HAZARD VOTES list read 50, in amber, the low-trust colour, on a
 * safety surface. Nothing measured it; it is a constant wearing a measurement's clothes.
 *
 * THE TWO JOBS NEED DIFFERENT ANSWERS, which is why the fix is a PAIR rather than one function.
 * Weighting a consensus legitimately wants a neutral prior for an author it cannot score — the
 * dbReports comment says so in as many words ("weights an unknown author at the neutral default
 * instead of fabricating one"). DISPLAY must not print a number nobody measured, and there is
 * nothing real to print instead: useProfilesByIds selects id/name/avatar/show_name/username and
 * NO score of any kind. So reporterTrust returns null and the chip is dropped.
 *
 * THE COLOUR LADDER WAS THE PRE-#1740 ONE. Those ternaries hand-copied 90/70/50 while #1740
 * replaced TrustBadge's ladder with TRUST_TIERS at 65/33/15 — so a climber at 70 was "blue" here
 * and "Highly Trusted" one screen over, and `>=90` green sat above the earnable ceiling of 84 and
 * was unreachable for anybody. Both now go through the shared `trustTier`, which the app already
 * feeds vScore output (TrustBadge: `climber._real ? realTrust : vScore(climber)`), so this is the
 * existing convention rather than a new scale.
 *
 * No browser, no database. Section 3 proves the WEIGHTING did not move, by bundling the
 * pre-change core out of git rather than re-typing its formula.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const corePath = path.join(ROOT, "ClimbMatchCore.jsx");
const rdPath = path.join(ROOT, "RouteDetail.jsx");
const appPath = path.join(ROOT, "ClimbMatch.jsx");

let pass = 0, failn = 0, ran = 0;
const ok = m => { pass++; ran++; console.log("  ok    " + m); };
const fail = m => { failn++; ran++; console.log("  FAIL  " + m); };
const dead = m => { console.log("  BROKEN: " + m); process.exitCode = 1; throw new Error("__dead__"); };

const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-trust-"));
process.on("exit", () => { try { fs.rmSync(outdir, { recursive: true, force: true }); } catch {} });

async function bundleCore(fileAbs, outName, names) {
  const out = path.join(outdir, outName);
  await build({
    stdin: {
      contents: `export { ${names.join(", ")} } from ${JSON.stringify(fileAbs)};`,
      resolveDir: ROOT, loader: "js",
    },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: out, logLevel: "error",
  });
  return require_(out);
}

try {
  const coreSrc = fs.readFileSync(corePath, "utf8");
  const rdSrc = fs.readFileSync(rdPath, "utf8");
  const appSrc = fs.readFileSync(appPath, "utf8");
  if (coreSrc.length < 100000 || rdSrc.length < 100000) dead("an app source read short — this probe would prove nothing");

  const WANT = ["reporterTrust", "reporterWeightTrust", "TRUST_PRIOR", "vScore", "seedAuthor",
                "buildConsensus", "trustTier", "TRUST_TIERS", "CLIMBERS", "ME", "SERVER_TRUST_EARNABLE"];
  const M = await bundleCore(corePath, "now.cjs", WANT);
  for (const k of WANT) if (M[k] === undefined) dead(`core does not export ${k}`);
  const { reporterTrust, reporterWeightTrust, TRUST_PRIOR, vScore, seedAuthor, buildConsensus, trustTier, TRUST_TIERS, CLIMBERS, SERVER_TRUST_EARNABLE } = M;

  // A seed climber to score, and a name that is deliberately in no seed list.
  const seedName = (CLIMBERS.find(c => c && c.name) || {}).name;
  if (!seedName) dead("no seed climber with a name — the non-vacuity half cannot run");
  const dbName = "Robin Belay (db reporter, not a seed climber)";
  if (seedAuthor(dbName)) dead("the supposedly-unknown fixture name resolves to a seed climber");

  // ---------------------------------------------------------------- 1. THE PAIR
  console.log("\n1. reporterTrust says \"we do not know\"; reporterWeightTrust supplies the prior");

  const rtSeed = reporterTrust(seedName);
  if (typeof rtSeed === "number" && rtSeed === vScore(seedAuthor(seedName)))
    ok(`a SEED author still scores: reporterTrust(${JSON.stringify(seedName)}) === vScore(...) === ${rtSeed}`);
  else fail(`a seed author must keep a real score, got ${JSON.stringify(rtSeed)}`);

  if (reporterTrust(dbName) === null) ok("a DB reporter yields NULL rather than a constant");
  else fail(`a DB reporter yielded ${JSON.stringify(reporterTrust(dbName))} — a number nobody measured`);

  if (reporterWeightTrust(dbName) === TRUST_PRIOR)
    ok(`weighting still substitutes the neutral prior (${TRUST_PRIOR})`);
  else fail(`weighting gave ${reporterWeightTrust(dbName)}, want TRUST_PRIOR ${TRUST_PRIOR}`);

  if (reporterWeightTrust(seedName) === rtSeed) ok("weighting uses the real score where there is one");
  else fail("weighting disagreed with the display score for a seed author");

  // The prior is the app's own value, not a fresh constant. Pinned so the two cannot drift.
  if (vScore(null) === TRUST_PRIOR) ok(`TRUST_PRIOR matches vScore(null) (${TRUST_PRIOR}) — one neutral value, not two`);
  else fail(`TRUST_PRIOR is ${TRUST_PRIOR} but vScore(null) is ${vScore(null)} — two neutral priors have drifted`);

  // ---------------------------------------------------------------- 2. WHAT RENDERS
  console.log("\n2. buildConsensus attaches a trust only where one exists");

  const mk = (user, i) => ({
    user, date: new Date(Date.now() - (i + 1) * 86400000).toISOString().slice(0, 10),
    stars: 4, condTags: ["Rockfall", "Dry"], crewId: null, avatar: "",
  });
  const consDb = buildConsensus([mk(dbName, 0), mk(dbName, 1), mk(dbName, 2)]);
  const consSeed = buildConsensus([mk(seedName, 0), mk(seedName, 1), mk(seedName, 2)]);
  if (!consDb || !consSeed) dead("buildConsensus returned nothing for the fixtures — nothing below is measurable");

  const hzDb = consDb.hazards || [], hzSeed = consSeed.hazards || [];
  if (!hzDb.length || !hzSeed.length) dead(`the fixture produced no hazard rows (db ${hzDb.length}, seed ${hzSeed.length}) — the display assertions would pass vacuously`);

  if (hzDb.every(h => h.trust === null)) ok(`all ${hzDb.length} hazard rows from a DB reporter carry trust === null`);
  else fail(`a DB reporter's hazard row carries trust ${JSON.stringify(hzDb[0].trust)}`);

  // NON-VACUITY: a rule that only ever suppresses is satisfied by deleting the feature.
  if (hzSeed.every(h => typeof h.trust === "number"))
    ok(`all ${hzSeed.length} hazard rows from a SEED reporter still carry a number (${hzSeed[0].trust})`);
  else fail("a seed reporter lost their trust number — this suppressed the feature rather than the lie");

  // ---------------------------------------------------------------- 3. THE WEIGHTING DID NOT MOVE
  console.log("\n3. the consensus arithmetic is unchanged (pre-change core, out of git)");

  let refMod = null;
  try {
    const refSrc = execFileSync("git", ["show", "origin/main:ClimbMatchCore.jsx"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (refSrc.indexOf("return a?vScore(a):50;") < 0)
      console.log("  note  origin/main already carries this fix — the equivalence check is spent, skipping");
    else {
      const refPath = path.join(ROOT, `.cm-trust-ref-${process.pid}.jsx`);
      process.on("exit", () => { try { fs.rmSync(refPath, { force: true }); } catch {} });
      fs.writeFileSync(refPath, refSrc);
      refMod = await bundleCore(refPath, "ref.cjs", ["buildConsensus"]);
    }
  } catch (e) {
    if (String(e.message).indexOf("__dead__") >= 0) throw e;
    console.log("  note  could not load the pre-change core (" + e.message.split("\n")[0] + ") — equivalence not measured");
  }

  if (refMod && refMod.buildConsensus) {
    /* THE TWO GROUPS MUST REPORT DIFFERENT TAGS, or this comparison is VACUOUS: with every
       report carrying the same tags each one is 100% whatever the weights are, so a changed
       prior moves nothing. The injection case `prior-becomes-zero` MISSED until this was
       fixed — the suite catching a hole in the probe rather than in the app. */
    const tagged = (user, i, tags) => Object.assign(mk(user, i), { condTags: tags });
    const mixed = [tagged(dbName, 0, ["Rockfall"]), tagged(seedName, 1, ["Dry"]),
                   tagged(dbName, 2, ["Rockfall"]), tagged(seedName, 3, ["Dry"]),
                   tagged(dbName, 4, ["Rockfall"])];
    const a = buildConsensus(mixed), b = refMod.buildConsensus(mixed);
    const weighted = c => JSON.stringify({ topTags: c.topTags, recentTags: c.recentTags, confidence: c.confidence, avgStars: c.avgStars });
    if (weighted(a) === weighted(b)) ok("weighted tags, confidence and star average are byte-identical to the pre-change core");
    else fail(`the weighting MOVED:\n        now  ${weighted(a)}\n        was  ${weighted(b)}`);

    const trustNow = JSON.stringify((a.hazards || []).map(h => h.trust));
    const trustWas = JSON.stringify((b.hazards || []).map(h => h.trust));
    if (trustNow !== trustWas) ok(`and the DISPLAYED trust did change, as intended: ${trustWas} -> ${trustNow}`);
    else fail("the displayed trust is unchanged — this fix reached nothing");
  }

  // ---------------------------------------------------------------- 4. WIRING, AS SOURCE
  console.log("\n4. the render sites are wired to it (source — executing the helper proves neither)");

  /* A shadowed copy anywhere restores the whole defect while every assertion above stays green.
     Scanned with BABEL, not a regex: this fix wants explaining, and a comment quoting the old
     shape would make a textual scan fail on its own documentation — the trap check:ci-cancel
     records. An AST does not see comments, and the blanker other guards use is unsafe on these
     files (it desynchronises on a JSX apostrophe and ate 21% of RouteDetail.jsx once). */
  const shadows = [];
  /* ClimbMatch.jsx is in scope too. It carries no DISPLAY site — its two uses are weightOf
     helpers inside consensus builders — but the shape is the defect wherever it is written,
     and a scan that walks two of the three app files reports a clean tree about the third. */
  for (const [label, src] of [["ClimbMatchCore.jsx", coreSrc], ["RouteDetail.jsx", rdSrc], ["ClimbMatch.jsx", appSrc]]) {
    let ast;
    try { ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false }); }
    catch (e) { dead(`${label} did not parse (${e.message.split("\n")[0]}) — the shadow scan cannot run`); }
    traverse(ast, {
      // `a ? vScore(a) : <number>` — the exact shape, wherever it is written.
      ConditionalExpression(pth) {
        const c = pth.node.consequent, alt = pth.node.alternate;
        const callsVScore = c && c.type === "CallExpression" && c.callee && c.callee.name === "vScore";
        const literalFallback = alt && alt.type === "NumericLiteral";
        if (callsVScore && literalFallback) shadows.push(`${label}: a ? vScore(a) : ${alt.value}`);
      },
      // ...and a binding shadowing the module-level trustOf, whatever its fallback looks like.
      Scopable(pth) {
        const b = pth.scope.bindings && pth.scope.bindings.trustOf;
        if (b && pth.scope.parent) shadows.push(`${label}: a nested binding named trustOf`);
      },
    });
  }
  if (!shadows.length) ok("no shadowed trustOf, and no vScore-or-a-literal fallback, survives (AST)");
  else fail(`${shadows.length} shadowed copies remain: ${[...new Set(shadows)].join(" | ")}`);

  for (const [who, want] of [["rp", "rp.trust!=null"], ["h", "h.trust!=null"]]) {
    if (rdSrc.indexOf(want) >= 0) ok(`the ${who} trust chip is dropped when the score is unknown`);
    else fail(`RouteDetail does not gate the ${who} trust chip on a known score`);
    if (rdSrc.indexOf(`trustTier(${who}.trust).color`) >= 0) ok(`the ${who} chip takes its colour from the shared trustTier`);
    else fail(`the ${who} chip does not use trustTier — a hand-copied ladder has returned`);
  }

  // The two pre-#1740 ladders, by shape rather than by phrasing.
  const oldLadder = rdSrc.match(/(?:rp|h)\.trust\s*>=\s*\d+\s*\?/g) || [];
  if (!oldLadder.length) ok("no hand-copied trust ladder survives in RouteDetail");
  else fail(`a hand-copied ladder is back: ${oldLadder.join(" | ")}`);

  // THE LADDER IS BOUNDED, NEVER PINNED, which is the contract sections 6 and 7 of
  // check:trust-breakdown already hold: a rebalance is correct work, and a probe holding today's
  // 65 would go red on it — which is how a probe teaches people to ignore it. What must stay true
  // is that the top tier is REACHABLE, and the ceiling is read from core rather than typed, so
  // the bound moves by itself the day a verification the app cannot currently grant becomes
  // earnable.
  if (typeof SERVER_TRUST_EARNABLE !== "number") dead("core does not export a numeric SERVER_TRUST_EARNABLE — the bound below would be a typed constant");
  if (!Array.isArray(TRUST_TIERS) || !TRUST_TIERS.length) dead("TRUST_TIERS did not load — every ladder assertion would pass vacuously");

  const topMin = TRUST_TIERS[0].min;
  if (topMin <= SERVER_TRUST_EARNABLE)
    ok(`the top tier (${topMin}) is at or below the earnable ceiling (${SERVER_TRUST_EARNABLE}) — a reporter can reach it`);
  else fail(`the top tier is ${topMin}, above the ${SERVER_TRUST_EARNABLE} any climber can earn — the top colour is unreachable, which is the pre-#1740 defect`);

  // ...and the chip's own ladder really does hand that reporter the top colour.
  const ceilingTier = trustTier(SERVER_TRUST_EARNABLE);
  if (ceilingTier && ceilingTier.label === TRUST_TIERS[0].label)
    ok(`a reporter at the earnable ceiling (${SERVER_TRUST_EARNABLE}) reaches "${ceilingTier.label}"`);
  else fail(`${SERVER_TRUST_EARNABLE} lands on "${ceilingTier && ceilingTier.label}", so the top colour is still unreachable`);

  const FLOOR = 16;
  if (ran < FLOOR) { console.log(`\nBROKEN: only ${ran} assertions ran (floor ${FLOOR}) — this run proved less than it claims`); process.exitCode = 1; }
  else if (failn) { console.log(`\n${failn} FAILED, ${pass} passed (${ran} assertions)`); process.exitCode = 1; }
  else console.log(`\nok — a reporter's trust is measured or absent, never a constant (${pass} assertions)`);
} catch (e) {
  if (String(e.message).indexOf("__dead__") < 0) { console.log("  BROKEN: " + e.stack); process.exitCode = 1; }
}
