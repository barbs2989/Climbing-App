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

console.log("\n— aspect parsing —");
eq("aspect 'NW' -> nw", dirOfAspect("NW"), "nw");
eq("aspect 'n/nw' takes the letters", dirOfAspect("n/nw"), "nnw" in DEG ? "nnw" : null);
eq("aspect null -> null", dirOfAspect(null), null);

console.log("\n— landform —");
eq("Face wins over Ridge when both appear", landform("Northeast Face Direct off the North Ridge"), "face");
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
