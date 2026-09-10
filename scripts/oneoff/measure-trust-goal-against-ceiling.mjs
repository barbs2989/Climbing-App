/* Is the trust card's "/ 90 goal" a bar a climber can actually reach?

   The card draws `myTrustScore / 90` as a progress bar and flips to "goal met" at 90. For a
   signed-in climber that score is the SERVER model, and 20 of its 104 points sit behind
   verifications no code path in this app can grant -- so the goal, and the bar, may be describing
   a state nobody can arrive at. Measured rather than reasoned about: the score function is the
   app's own (bundled, never re-typed), and which verifications are earnable is parsed out of the
   migrations by scripts/lib/verification-reach.mjs, so both halves move by themselves. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = fs.mkdtempSync(path.join(ROOT, ".trustgoal-"));
try {
  fs.writeFileSync(
    path.join(out, "entry.js"),
    "export { serverTrustScore, serverTrustFactors, SERVER_TRUST_CAP } from " +
      JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx")) + ";\n"
  );
  /* react/react-dom/react-query stay EXTERNAL and the bundle is written INSIDE the project: both
     are recorded SSR traps -- inlining react-dom drags a CJS `require("stream")` into an ESM
     bundle, and a bundle in the OS temp dir cannot resolve react from any node_modules. */
  execFileSync("npx", ["esbuild", path.join(out, "entry.js"), "--bundle", "--format=esm",
    "--platform=node", "--jsx=automatic", "--loader:.jsx=jsx", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--outfile=" + path.join(out, "bundle.mjs")], { stdio: "pipe" });

  const app = await import(path.join(out, "bundle.mjs"));
  const reach = await import(path.join(ROOT, "scripts", "lib", "verification-reach.mjs"));
  const { types, scanned } = reach.reachableVerificationTypes(path.join(ROOT, "supabase", "migrations"));

  /* Every non-verification component past its own cap, so only the verifications vary. */
  const MAXED = { tenureDays: 40 * 30, vouches: 10000, logs: 10000, reports: 10000, catches: 10000 };
  const asIf = (all) => ({
    ...MAXED,
    emailVerified: all || types.has("email"),
    idVerified: all || types.has("id"),
    certCount: (all || types.has("member_club") || types.has("guide_certified")) ? 2 : 0,
  });

  const earnable = app.serverTrustScore(asIf(false));
  const ifAllGrantable = app.serverTrustScore(asIf(true));

  console.log("migrations scanned            :", scanned);
  console.log("verification types earnable   :", [...types].sort().join(", ") || "(none)");
  console.log("model cap                     :", app.SERVER_TRUST_CAP);
  console.log("ceiling if every type earnable:", ifAllGrantable);
  console.log("CEILING AS THE APP STANDS     :", earnable);
  console.log("partnerless ceiling           :", reach.partnerlessCeiling(app.serverTrustScore, types));
  console.log("day one (email confirmed)     :", reach.dayOneScore(app.serverTrustScore, types));
  console.log("");
  console.log("components a climber cannot fill, however long they climb:");
  for (const f of app.serverTrustFactors(asIf(false)))
    if (f.pts < f.max) console.log("   " + f.label.padEnd(24) + f.pts + " / " + f.max);
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
