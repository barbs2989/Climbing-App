// Imports the REAL functions from the audit, not a copy — a mirrored copy of the logic would pass
// whatever the audit does and prove nothing.
import { judge, dirInName, dirOfAspect, landform, sep, DEG } from
  "../audit-aspect-vs-name.mjs";

let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
  if (!ok) fail++;
};

console.log("— direction parsing —");
eq('"Northeast Buttress" is NE, not N', dirInName("Northeast Buttress"), "ne");
eq('"North Ridge" is N', dirInName("North Ridge"), "n");
eq('"NE Ridge" (abbreviation as a word)', dirInName("NE Ridge"), "ne");
eq('"South-West Rib" (hyphenated)', dirInName("South-West Rib"), "sw");
eq('"Beckey Route" has no direction', dirInName("Beckey Route"), null);
// A route whose name merely CONTAINS the letters must not match: "Northern Lights" would be a
// false positive, but "Weston" containing "west" is the dangerous one.
eq('"Weston Wall" does not match west', dirInName("Weston Wall"), null);

// The six false positives the FIRST REAL RUN produced, against 510 comparable WA routes. All six
// were the parser's fault, not the data's — 30% of that run's findings.
console.log("  -- possessives: an apostrophe is a word boundary, so \\bs\\b matched \"Ford's\" --");
eq('"Ford\'s Theatre" has no direction', dirInName("Ford's Theatre"), null);
eq('"Marvin\'s Ear" has no direction', dirInName("Marvin's Ear"), null);
eq('"Lover\'s Lane (couloir)" has no direction', dirInName("Lover's Lane (couloir)"), null);
console.log("  -- two directions: the route leads with its OWN --");
eq('"South Ridge (North Peak)" is SOUTH', dirInName("South Ridge (North Peak)"), "s");
eq('"West Face (North Peak)" is WEST', dirInName("West Face (North Peak)"), "w");
eq('"Southwest Slope - Southeast Ridge" is SW', dirInName("Southwest Slope - Southeast Ridge"), "sw");
eq('"NE Ridge" still works (capitalised abbreviation)', dirInName("NE Ridge"), "ne");
eq('"Northeast" beats "north" at the same offset', dirInName("Northeast Buttress"), "ne");

console.log("\n— aspect parsing —");
eq("aspect 'NW' -> nw", dirOfAspect("NW"), "nw");
eq("aspect 'n/nw' takes the letters", dirOfAspect("n/nw"), "nnw" in DEG ? "nnw" : null);
eq("aspect null -> null", dirOfAspect(null), null);

console.log("\n— summit nouns: a direction on a SUMMIT is not an aspect —");
// Warrior Peak: "Southeast Peak" is which of two summits, and the row says so itself. Its NW aspect
// is not a contradiction. Found on the first real run.
eq('"Southeast Peak Standard" names a summit, not an aspect', dirInName("Southeast Peak Standard (Home Lake approach)"), null);
eq('"West Face / South Summit" still reads WEST', dirInName("West Face / South Summit (Standard)"), "w");

console.log("\n— landform: earliest word wins —");
eq("Face wins when it comes first", landform("Northeast Face Direct off the North Ridge"), "face");
// "glacier" is in the FACE set, so a face-first test read this ridge route as a face and flagged its
// correct N aspect. Found on the first real run.
eq('"West Ridge / Colonial Glacier" is a RIDGE', landform("West Ridge / Colonial Glacier"), "ridge");
eq('"South Slopes / Ruth Glacier" is a face', landform("South Slopes / Ruth Glacier"), "face");
eq("'South Slopes' is a face", landform("South Slopes"), "face");
eq("'East Ridge' is a ridge", landform("East Ridge"), "ridge");
eq("'Beckey Route' is other", landform("Beckey Route"), "other");

console.log("\n— the precision rule —");
// A ridge separates two faces, so perpendicular is NORMAL and must not be reported.
eq("North Ridge with aspect E is NOT a hit (a ridge has two sides)",
  judge({ name: "North Ridge", aspect: "E" }).hit, false);
// A face is one plane, so perpendicular IS a contradiction.
eq("North Face with aspect E IS a hit (one plane)",
  judge({ name: "North Face", aspect: "E" }).hit, true);
// Opposed is a contradiction either way.
eq("North Ridge with aspect S IS a hit (opposed)",
  judge({ name: "North Ridge", aspect: "S" }).hit, true);
eq("North Face with aspect N is clean", judge({ name: "North Face", aspect: "N" }).hit, false);

console.log("\n— the two real cases —");
// Little Annapurna: name says South, aspect says N/NW. Must be REPORTED (it is a real disagreement)
// even though the correct repair was the NAME, not the aspect.
const la = judge({ name: "South Slopes", aspect: "N" });
eq("Little Annapurna's South Slopes vs aspect N is reported", la.hit, true);
eq("  ...and classed as a face", la.kind, "face");
// Overcoat: batch J reported aspect=SE against text describing the north/east side.
eq("Overcoat SE route vs aspect SE agrees (no hit)",
  judge({ name: "Southeast Route", aspect: "SE" }).hit, false);

console.log("\n— skips —");
eq("no direction in name -> skip", judge({ name: "Beckey Route", aspect: "N" }).skip, "no direction in the name");
eq("no aspect -> skip", judge({ name: "North Face", aspect: null }).skip, "no usable aspect");

console.log("\n— control: prove a hit can be false —");
console.log(`  sep(N,S)=${sep(DEG.n, DEG.s)}  sep(N,E)=${sep(DEG.n, DEG.e)}  sep(N,NE)=${sep(DEG.n, DEG.ne)}`);

console.log(fail ? `\n${fail} FAILURE(S)` : "\nall cases pass");
process.exitCode = fail ? 1 : 0;
