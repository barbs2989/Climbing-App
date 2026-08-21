// Two screens counting the SAME list must not disagree.
//
// #1203: the Profile said "My objectives · 3 active" while the Logbook said "4 climbs to go" and
// Home said "4 routes" — about one list. The Profile had forked the app's completion test and
// counted a route you TURNED AROUND on as done. Every guard passed: each number was well-formed,
// each screen rendered, nothing was NaN. Nobody was asking whether they agreed.
//
// That is the mechanisable half of the three defects found by hand-reading browser snapshots
// (#1181, #1193, #1203). The other half — is a labelled value the right KIND of thing — needs
// judgement. This does not attempt it.
//
// THE RELATIONS ARE NOT ALL EQUALITY, and getting that wrong would make the guard fire on correct
// data the first time anybody finishes an objective. Home's "N routes" is the TOTAL; the other two
// are total-minus-completed. They coincide today only because nothing in the seed demo is
// completed. So:
//
//   "N climbs to go"  ==  "N active"        both are not-yet-completed. Must be equal.
//   "N routes"        >=  "N active"        total cannot be less than the unfinished part.
//
// An equality across all three would have been green on the demo and red the day a climber ticked
// something — a guard that breaks on correct behaviour is worse than the hole it closes.
//
// Reads text captured by check:ui, so it costs no extra browser time and is testable against a
// saved --snapshot without a browser at all.

// A relation is declared, never inferred. `find` returns the number a screen states, or null if
// that screen does not state it — absent is NOT zero, and a group with fewer than two readable
// numbers is reported as unmeasured rather than passing silently.
const num = (text, re) => { const m = re.exec(text || ""); return m ? Number(m[1]) : null; };

// Narrow a screen to one section before reading, bounded by the headings either side rather than
// by a character count. Returns "" when the opening heading is absent, so a moved section reads as
// unmeasured instead of matching whatever else is on the page.
const sectionOf = (text, [from, to]) => {
  const s = String(text || "");
  const a = from.exec(s); if (!a) return "";
  const rest = s.slice(a.index + a[0].length);
  const b = to ? to.exec(rest) : null;
  return b ? rest.slice(0, b.index) : rest;
};

export const COUNT_GROUPS = [
  {
    name: "objectives",
    // The label a climber reads, so a rename of the copy fails here rather than drifting.
    reads: [
      { screen: "Home",    label: "N routes",       re: /My objectives\s*\n\s*(\d+)\s+routes?\b/i },
      // SCOPED TO THE MY OBJECTIVES SECTION, not the screen. The Logbook also renders a badge per
      // CUSTOM LIST ("Summer Wasatch Tick · 1 climb to go"), so an unanchored read takes whichever
      // comes first and would compare a different list. Found by mutating a snapshot: renaming the
      // objectives copy still produced a number, from the custom list.
      //
      // The scope is the SECTION, never a character window. A `{0,400}` window was tried and it
      // silently stopped finding the badge on the older snapshot — where the leaked comment #1181
      // fixed sits between the heading and the number and pushes it out of range. A fixed window
      // encodes a guess about the size of the thing you are looking at, and it was wrong on the
      // one snapshot that carries the defect this guard exists for.
      { screen: "Logbook", label: "N climbs to go", section: [/MY OBJECTIVES/i, /CUSTOM LISTS/i],
        re: /(\d+)\s+climbs?\s+to\s+go\b/i },
      { screen: "Profile", label: "N active",       re: /My objectives\s*\n\s*(\d+)\s+active\b/i },
    ],
    // Only the pair that answers the SAME question is required equal.
    equal: ["Logbook", "Profile"],
    atLeast: [["Home", "Profile"]],
  },
  {
    name: "friends",
    reads: [
      { screen: "Crew:Friends", label: "Friends badge", re: /\bFriends\s*\n?\s*(\d+)\b/i },
      { screen: "Crew:Friends", label: "See all (N)",   re: /See all \((\d+)\)/i },
    ],
    equal: ["Crew:Friends", "Crew:Friends"],   // both reads are on one screen; compared pairwise below
    sameScreenPair: true,
  },
];

// A screen the walk never captured makes every comparison in its group vacuous, so say so.
export function checkScreenCounts(screens) {
  const out = [];
  for (const g of COUNT_GROUPS) {
    const got = g.reads.map(r => ({ ...r, value: num(r.section ? sectionOf(screens[r.screen], r.section) : screens[r.screen], r.re) }));
    const readable = got.filter(x => x.value != null);
    if (readable.length < 2) {
      out.push({ group: g.name, kind: "unmeasured",
        msg: `only ${readable.length} of ${g.reads.length} counts could be read` +
             ` (${got.map(x => `${x.screen}/${x.label}=${x.value == null ? "absent" : x.value}`).join(", ")})` +
             ` — the copy changed or the screen was not captured, so nothing was compared` });
      continue;
    }
    if (g.sameScreenPair) {
      const [a, b] = readable;
      if (a.value !== b.value)
        out.push({ group: g.name, kind: "disagree",
          msg: `${a.screen} says ${a.label}=${a.value} and ${b.label}=${b.value} on the same screen` });
      continue;
    }
    const byScreen = Object.fromEntries(got.map(x => [x.screen, x]));
    // FAIL CLOSED ON A MISSING SIDE. Skipping a relation whose screen was not captured is a
    // vacuous pass: deleting the Profile from a snapshot made this report NOTHING, because the
    // group still had two readable counts and the pair quietly had an undefined half. A relation
    // that cannot be evaluated has to say so.
    const needed = new Set([...(g.equal || []), ...(g.atLeast || []).flat()]);
    const missing = [...needed].filter(sc => !byScreen[sc] || byScreen[sc].value == null);
    if (missing.length) {
      out.push({ group: g.name, kind: "unmeasured",
        msg: `cannot compare — ${missing.join(", ")} did not state its count` +
             ` (${got.map(x => `${x.screen}/${x.label}=${x.value == null ? "absent" : x.value}`).join(", ")})` });
      continue;
    }
    if (g.equal) {
      const [x, y] = g.equal.map(s => byScreen[s]);
      if (x && y && x.value != null && y.value != null && x.value !== y.value)
        out.push({ group: g.name, kind: "disagree",
          msg: `${x.screen} says ${x.label}=${x.value} but ${y.screen} says ${y.label}=${y.value}` +
               ` — these answer the SAME question and cannot differ` });
    }
    for (const [hi, lo] of (g.atLeast || [])) {
      const a = byScreen[hi], b = byScreen[lo];
      if (a && b && a.value != null && b.value != null && a.value < b.value)
        out.push({ group: g.name, kind: "disagree",
          msg: `${a.screen} says ${a.label}=${a.value}, which is LESS than ${b.screen}'s ${b.label}=${b.value}` +
               ` — a total cannot be smaller than the part of it still unfinished` });
    }
  }
  return out;
}
