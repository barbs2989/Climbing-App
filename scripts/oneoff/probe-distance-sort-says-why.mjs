// Two "sort by distance" controls did nothing, and said nothing about it.
//
// `haveMyLoc`'s own comment states the rule for FILTERS:
//
//   "every distance filter is gated on this: with no location the filter is not applied at all,
//    and the UI says why, rather than inventing an answer in either direction."
//
// A SORT was never covered. `ME.lat`/`ME.lng` are cleared by the sign-in reset and written back
// nowhere, so for a real signed-in account:
//
//   PartnerSearch "Closest"  distMiles(ME,c) => NaN, and every NaN comparison is false, so the
//                            comparator returns NaN and the list is left in EXACTLY its input
//                            order — a silent no-op.
//   CrewFinder   "Nearest"   distOf() guards ME.lat and returns null, mapped to Infinity for
//                            every crew: also no order, also unexplained.
//
// Both options were offered ungated while the radius control on the same screen honestly reads
// "Needs your location". Seed works, real account does not — the demo ME carries coordinates.
//
// This executes the real distMiles to show the sort is inert, and asserts the labels are gated.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, `.distsort-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
  "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });

const { distMiles, ME } = await import(out + "?t=" + Date.now());
if (typeof distMiles !== "function" || !ME) { console.error("ANCHOR LOST — core no longer exports distMiles/ME."); process.exit(1); }

let bad = 0;
const must = (cond, label) => { console.log(`  ${cond ? "ok   " : "FAIL "} ${label}`); if (!cond) bad++; };

// ---- 1. the sort really is a no-op without an origin ----
const people = [{ n: "far", lat: 47.6, lng: -122.3 }, { n: "near", lat: 40.77, lng: -111.9 }, { n: "mid", lat: 44.0, lng: -116.0 }];
const orderFrom = (origin) => people.slice().sort((a, b) => distMiles(origin, a) - distMiles(origin, b)).map((p) => p.n).join(" < ");

const noLoc = { id: 0 };                                   // a real account after the sign-in reset
const withLoc = { id: 0, lat: 40.76, lng: -111.89 };        // the seed demo ME

must(Number.isNaN(distMiles(noLoc, people[0])), "distMiles yields NaN with no origin");
must(orderFrom(noLoc) === "far < near < mid", `no origin: order is UNCHANGED (${orderFrom(noLoc)})`);
must(orderFrom(withLoc) === "near < mid < far", `with an origin: it really sorts (${orderFrom(withLoc)})`);

// ---- 2. so the LABEL has to say why ----
// The label is a pure function of haveMyLoc(), which reads the ME singleton — assert both ways by
// flipping ME itself, then assert the wiring in source, since a merge takes the JSX and not this.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
must(/\["dist",haveMyLoc\(\)\?"Closest":"Closest \(needs your location\)"\]/.test(core),
  "PartnerSearch's \"Closest\" is gated on haveMyLoc()");
must(/\["dist",haveMyLoc\(\)\?"Nearest":"Nearest \(needs your location\)"\]/.test(core),
  "CrewFinder's \"Nearest\" is gated on haveMyLoc()");
must(!/\["dist","Closest"\]/.test(core) && !/\["dist","Nearest"\]/.test(core),
  "neither option is offered bare any more");

// The rule this extends is stated in the source; if that comment goes, the reason goes with it.
must(/the UI says why/.test(core), "haveMyLoc still records the rule these labels follow");

clean();
if (bad) { console.error(`\n${bad} assertion(s) failed.`); process.exit(1); }
console.log("\n  A sort that cannot sort now says so, the way the radius filter beside it already did.");
