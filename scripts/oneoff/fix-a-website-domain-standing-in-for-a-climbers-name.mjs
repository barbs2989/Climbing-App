// `fa` renders on the route page (RouteDetail.jsx:760 and :2284), and on one row it credits the
// first ascent to a WEBSITE:
//
//     wa_superalpine.fa = "Kyle (climberkyle.com) & Porter McMichael, February 28, 2020"
//
// A domain standing where a person's surname belongs. It breaks the standing "no sources anywhere
// in the app" rule in the single worst place for it — the field that names who did the climb — and
// it also fails the reader, who gets a first name and a URL instead of a person.
//
// THE SURNAME IS PUBLISHED, so nothing here is invented. The American Alpine Club's The Line
// (October 2023) says of Sloan Peak's west face: "Superalpine, a WI3/4 on the face that was
// established by Porter McMichael and Kyle McCrohen in 2020" —
// https://americanalpineclub.org/news/2023/10/22/the-line-october-2023, fetched this session.
// The stored date (February 28, 2020) is untouched: AAC gives only the year, and the row's own
// date is consistent with it.
//
// SCOPE — measured, and the class is SMALL and mostly NOT this: across 8,365 WA rows and 35
// rendered columns, 50 non-agency domains appear. Most are OPERATIONAL references a climber is
// told to use and must be kept: pay.gov x30 (where Mount Rainier's climbing cost-recovery fee is
// actually paid), myoutdooragent.com x2 (which administers the Hampton timberland access permit),
// ladyofthelake.com (the Stehekin ferry operator), mountsthelens.com (the permit system), and a
// county SAR email address x3. That is the same distinction the citation sweep already draws:
// a pointer telling a climber where to go is a live reference, not a citation.
//
// About fourteen are genuine citations — climberkyle.com x4, trailcatjim.com,
// topozone/hometownlocator/mountainzone on one row, yellowleaf.org, climbing.com,
// ericsbasecamp.net, mountaineers.org, listsofjohn.com. Every one of those is welded into a
// sentence that also carries a FACT ("only one first-hand account (yellowleaf.org, 2006)
// describes climbing it" — the scarcity IS the warning), so they are a reading list for the
// citation sweep and are deliberately NOT touched here. This row is different: the domain is not
// attributing a claim, it is standing in for a name, and the name is published.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  { kind: "edit", route: "wa_superalpine", path: "fa", expect: "SET_ME",
    find: "Kyle (climberkyle.com)", repl: "Kyle McCrohen", count: 1,
    why: "a website domain rendered where the first ascensionist's surname belongs; AAC names him Kyle McCrohen" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,fa,name",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
