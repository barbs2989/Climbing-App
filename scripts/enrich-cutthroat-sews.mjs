// One-off enrichment writer for 10 WA routes (Cutthroat Peak + South Early Winters Spire).
// GET -> merge -> PATCH -> verify(re-GET) per route. Run with: node scripts/enrich-cutthroat-sews.mjs
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const URL_BASE = env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const AVAL_NA = (months) => ({ zone: "NWAC — North Cascades (forecast program runs mid-Nov–mid-Apr only; no product exists during the summer rock season)", byMonth: Object.fromEntries(months.map(m => [m, "N/A"])) });
const WEATHER = { typical: "Standard North Cascades convective pattern — afternoon thunderstorms build over the Cascade Crest in summer; standard guidance is an early start and being off exposed terrain by early/mid-afternoon." };
const NO_CREVASSE = { location: "None — dry granite formation, no glacier travel on any approach or route variant", timing: "N/A" };

const routes = {
  wa_complete_south_buttress: {
    crowds: {
      estimatePerSeason: "Low as a distinct variant (only 2 Mountain Project votes vs. 108 for the standard South Buttress it extends)",
      peakTraffic: "Can merge into standard South Buttress weekend traffic (e.g. July 4th) once the routes rejoin above the unique lower pitches",
      solitudeRating: 3,
    },
    partnerRequirements: {
      experienceLevel: "Alpine rock party comfortable with a long day (Grade III+, ~1,200 ft / 22 pitches vs. 850 ft / 12 pitches for the standard line)",
      fitnessSpec: { pitches: 22, lengthFt: 1200 },
      requiredSkills: [
        "Off-trail routefinding/contouring southeast from ~6,500 ft to reach the buttress — no established trail",
        "Judgment to inspect and back up questionable fixed rappel anchors (tat on 2 half-rope raps into gaps/cols)",
        "3rd/4th-class and easy 5th-class simul-travel for a long day",
      ],
      approachTime: "No route-specific approach time found; standard South Buttress car-to-car reports range ~8.5–15 hrs depending on party speed/pitching style",
    },
    seasonalGuidance: {
      optimalWindow: "July–September (reliable dry rock season). SR-20 gate + residual snow make June a shoulder month; historical pass reopening has ranged from mid-March to mid-June depending on snowpack.",
      monthBreakdown: {
        June: { status: "marginal", reason: "SR-20 reopening is highly variable year to year; approach/descent gullies can still hold snow or verglas" },
        July: { status: "optimal", reason: "Reliable dry rock season; also the peak weekend-traffic period" },
        August: { status: "optimal", reason: "Reliable dry rock season" },
        September: { status: "good", reason: "Dry granite season continues; shorter days" },
        October: { status: "marginal", reason: "Dry but short days and rising early-snow risk ahead of SR-20's fall closure" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["June", "July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Two half-rope rappels into gaps/cols on fixed tat anchors that may be old and need inspection or backup; extended exposure to afternoon weather given the added pitch count versus the standard South Buttress",
    },
    hazardsAppend: [
      "Two half-rope rappels into gaps/cols use fixed tat anchors that may be old and should be inspected/backed up before weighting",
    ],
    dataQuality: {
      confidence: "MEDIUM",
      gapsAppend: [
        "No route-specific approach time found for the Complete variant specifically (only the standard South Buttress route's approach was timed in trip reports).",
        "SummitPost was inaccessible (403) during this research pass for cross-verification.",
        "No trip report found describing a full end-to-end ascent of the Complete variant; hazard/character detail is partly inferred from the standard South Buttress route it extends.",
        "FA for the Complete South Buttress extension itself remains undocumented in all sources checked (Mountain Project, AAC Publications) — 'unknown' left on file. The base South Buttress route it extends was first climbed by Fred Beckey and Don Gordon in 1958 per an AAC obituary for Gordon, but that credit applies to the standard route, not this variant.",
      ],
    },
    fa: null, // confirmed correct as "unknown" — no change
  },

  wa_north_ridge_3: {
    crowds: {
      estimatePerSeason: "Moderate-low (24 Mountain Project votes, ~82 monthly page views — roughly 1/4–1/5 the engagement of the standard South Buttress)",
      peakTraffic: "Steady secondary-classic traffic; no trip report found mentions encountering another party on route",
      solitudeRating: 4,
    },
    partnerRequirements: {
      experienceLevel: "Alpine rock party comfortable with loose, runout low-fifth-class terrain",
      fitnessSpec: { grade: "Grade III, ~600 ft, 8 pitches", rack: "Single rack 0.4\"–3\" cams plus nuts" },
      requiredSkills: [
        "Loose, runout 5.7 PG13 pitch gaining the North Ridge Notch, protectable with only 1–2 marginal cams",
        "Unprotected 5.6 slab climbing low on the route",
        "Simul-climbing efficiency for a long day (documented car-to-car times range ~6–16 hrs)",
      ],
      approachTime: "~2.5 hours car-to-base (one documented party: 7:30am trailhead departure, roped up ~10:00am); no established trail for the final stretch",
    },
    seasonalGuidance: {
      optimalWindow: "July–September; SR-20 gate makes June a shoulder month",
      monthBreakdown: {
        June: { status: "marginal", reason: "SR-20 reopening is variable year to year; shaded gullies can hold snow patches" },
        July: { status: "optimal", reason: "Reliable dry rock season" },
        August: { status: "good", reason: "Reliable dry rock season, though one August trip report still crossed residual snowfields in shaded terrain" },
        September: { status: "good", reason: "Dry granite season continues; shorter days" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["June", "July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Loose, runout 5.7 PG13 pitch gaining the notch with minimal reliable protection; unprotected 5.6 slab above the notch",
    },
    hazardsAppend: [
      "First two pitches carry the worst rock quality on the route (multiple independent trip reports flag a shifting flake); rock quality improves sharply above pitch 2",
    ],
    dataQuality: {
      confidence: "HIGH",
      gapsAppend: [
        "FA date/team (Beckey, Crooks, Kenney, Aug 19 1940) matches Mountain Project's route page exactly but could not be independently corroborated in AAJ/AAC archives during this pass — treat as single-primary-source verified rather than multi-source confirmed.",
      ],
    },
    fa: null, // confirmed matches Mountain Project exactly — no change
  },

  wa_boving_roofs: {
    crowds: {
      estimatePerSeason: "Low — rarely climbed as a standalone route (usually just the first 3 pitches, shared with Southwest Rib); ~51 monthly Mountain Project views",
      peakTraffic: "No evidence of a concentrated peak-traffic period",
      solitudeRating: 4,
    },
    partnerRequirements: {
      experienceLevel: "Confident 5.10 trad leader",
      fitnessSpec: "Grade covers a powerful ~100 ft roof pitch (P5) plus loose 5.2 terrain lower on the route",
      requiredSkills: [
        "Roof/overhang crack technique on P5",
        "Comfort on loose rock at P4 and a loose block at the start of the roof",
        "Strong second recommended — documented pendulum-fall hazard pulling gear through the roof",
      ],
      approachTime: null,
    },
    seasonalGuidance: {
      optimalWindow: "June–September; SR-20 gate applies",
      monthBreakdown: {
        June: { status: "good", reason: "Pass open but early-season moisture/snow possible" },
        July: { status: "optimal", reason: "Reliable dry rock season" },
        August: { status: "optimal", reason: "Reliable dry rock season" },
        September: { status: "good", reason: "Dry granite continues; shorter days" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["June", "July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Powerful roof pitch (P5) with pendulum-fall risk for the second if gear is pulled through the roof; loose block at the roof start",
    },
    hazardsAppend: [
      "Loose rock on P4 and a loose block at the start of the roof pitch (P5)",
      "Documented pendulum-fall hazard for the second climber if gear is pulled through the roof on P5",
    ],
    dataQuality: {
      confidence: "MEDIUM",
      gapsAppend: [
        "FA and route description corroborated by two independent sources (Mountain Project, a Wayne Wallace blog post); solitude rating is inferred from view counts rather than an explicit statement.",
      ],
    },
    fa: null, // matches Mountain Project exactly — no change
  },

  wa_northwest_face_boving_pollock: {
    crowds: {
      estimatePerSeason: "Low — only 27 total Mountain Project votes (avg 2.6/5), much less traveled than South Arete",
      peakTraffic: "No concentrated peak period found",
      solitudeRating: 4,
    },
    partnerRequirements: {
      experienceLevel: "Solid 5.11 trad leader",
      fitnessSpec: "Grade III, 6 pitches, full-day objective",
      requiredSkills: [
        "Committing opening traverse with poor feet and hard-to-place gear",
        "Chimney and two roof/overhang pitches",
        "Hand-crack finish",
        "Comfort on dirty/lichenous lower pitches typical of a low-traffic line",
      ],
      approachTime: null,
    },
    seasonalGuidance: {
      optimalWindow: "June–September; SR-20 gate applies. North/west-facing aspect plausibly holds snow/moisture longer into shoulder months than sunnier SEWS lines.",
      monthBreakdown: {
        June: { status: "marginal", reason: "North/west-facing aspect may hold early-season snow/moisture longer than south-facing SEWS routes" },
        July: { status: "optimal", reason: "Reliable dry rock season" },
        August: { status: "optimal", reason: "Reliable dry rock season" },
        September: { status: "good", reason: "Dry granite continues; shorter days" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["June", "July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Committing opening traverse with poor feet/hard gear placements; low traffic means slower potential rescue response",
    },
    hazardsAppend: [
      "Dirty/lichenous rock on lower pitches typical of a low-traffic line",
      "Committing opening traverse with poor feet and hard-to-place gear",
    ],
    dataQuality: {
      confidence: "MEDIUM",
      gapsAppend: [
        "The route name credits 'Boving-Pollock' while the on-file fa string reads 'Boving and Kerns 1977' — this likely reflects two distinct historical events (a 1976 aid FA by Boving/Pollock and a separate 1977 first free ascent by Boving/Kerns, which the on-file fa field captures), but the key corroborating source (a Cascade Climbers forum thread) could not be directly opened during this research pass.",
      ],
    },
    fa: null, // matches Mountain Project exactly; Pollock-vs-Kerns judged to be two real distinct events, not an error — no change
  },

  wa_free_mojo: {
    crowds: {
      estimatePerSeason: "Very low — a firsthand 2016 account (~3 yrs post-FA) estimated only about 5 ascents to date; lowest Mountain Project monthly views (~24) among the SEWS technical routes researched",
      peakTraffic: "N/A",
      solitudeRating: 5,
    },
    partnerRequirements: {
      experienceLevel: "Solid 5.11 trad leader with thin-finger/seam-crack skill",
      fitnessSpec: { approach: "~1 hr via Blue Lake Trail to base (general SEWS approach beta, not route-specific)" },
      requiredSkills: [
        "Crux P2: wet vertical crack requiring gastons/deadpoints",
        "Tolerance for lichen/loose debris typical of an underused line",
        "Route joins the existing Mojo Rising line at its P5",
      ],
      approachTime: "~1 hour (Blue Lake Trail, general SEWS approach beta, not confirmed route-specific)",
    },
    seasonalGuidance: {
      optimalWindow: "June–September, though the route stays shaded until ~1pm (north-facing) and may run colder/wetter longer into the season than sunnier SEWS lines",
      monthBreakdown: {
        June: { status: "marginal", reason: "Shady, north-facing aspect plus wet-crack conditions noted at the FA make early season less viable" },
        July: { status: "optimal", reason: "Reliable dry rock season" },
        August: { status: "optimal", reason: "Reliable dry rock season; shade keeps it comfortable on hot days" },
        September: { status: "good", reason: "Dry granite continues; shorter days" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["June", "July", "August", "September"]),
      weather: { typical: "North Cascades afternoon-thunderstorm pattern (area-wide); the route's shaded, north-facing aspect can leave cracks seeping/wet longer after precipitation than sunnier lines" },
      crevasses: NO_CREVASSE,
      exposure: "Seeping/wet finger locks reported on the crux pitch; lichen/loose rock from low traffic; goat activity noted near the summit",
    },
    hazardsAppend: [
      "Crux pitch (P2) crack can be wet/seeping even in dry weather due to the route's shaded, north-facing aspect",
      "Lichen and loose rock typical of a rarely-climbed line",
      "Goat activity reported near the summit",
    ],
    dataQuality: {
      confidence: "MEDIUM",
      gapsAppend: [
        "Crowd and hazard specifics are traceable to a small number of firsthand accounts (primarily one 2016 post-FA trip report) rather than broad independent corroboration; FA itself is HIGH confidence (confirmed by both Mountain Project and the first ascensionist's own blog).",
      ],
    },
    fa: null, // matches exactly across two independent sources (MP + Herrington's own blog) — no change
  },

  wa_south_arete: {
    crowds: {
      estimatePerSeason: "High — by far the most trafficked SEWS technical route; 31,125 total Mountain Project page views / ~148 monthly (vs. 6,887/51 for Boving Roofs, 2,020/24 for Free Mojo, 27 total votes for NW Face)",
      peakTraffic: "Described as 'probably the second most popular route in the Liberty Bell Group' after the Beckey Route on Liberty Bell; guides advise an early start and weekday timing to avoid crowds",
      solitudeRating: 2,
    },
    partnerRequirements: {
      experienceLevel: "Beginner-friendly — commonly cited as a good first alpine rock lead",
      fitnessSpec: { approach: "~2.5 mi / ~2,000 ft gain from the Blue Lake trailhead", carToSummit: "~5–7 hrs (one source estimate)" },
      requiredSkills: [
        "Mostly 3rd/4th class with one 5.5 crux pitch, climbed first",
        "Comfort with exposure on an airy, broad/broken knife-edge ridge",
        "Basic routefinding — the broken ridge is easy to wander off of",
      ],
      approachTime: "~2.5 mi / ~2,000 ft gain from the Blue Lake trailhead",
    },
    seasonalGuidance: {
      optimalWindow: "June–September; south-southwest aspect clears early and holds condition later than shadier SEWS routes — described as 'nearly year-round' once SR-20 is open in low-snow years",
      monthBreakdown: {
        May: { status: "risky", reason: "SR-20 typically still closed or only just reopening" },
        June: { status: "good", reason: "South-southwest aspect clears early; pass-opening timing varies year to year" },
        July: { status: "optimal", reason: "Reliable dry rock season, also the peak-traffic period" },
        August: { status: "optimal", reason: "Reliable dry rock season" },
        September: { status: "optimal", reason: "Sunny aspect holds good condition later into the season than shadier routes" },
        October: { status: "marginal", reason: "Snow/moisture risk rising ahead of SR-20's seasonal closure" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["May", "June", "July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Real fall/exposure consequence on the knife-edge/exposed ridge sections despite the modest 5.5 grade; the route is explicitly marketed to beginners as a first alpine lead, which plausibly skews its user base toward less-experienced parties on genuinely exposed terrain",
    },
    hazardsAppend: [
      "Airy, exposed knife-edge ridge sections carry real fall consequence despite the low technical grade",
      "Broad, broken ridge makes it easy to wander off-route",
    ],
    dataQuality: {
      confidence: "HIGH",
      gapsAppend: [
        "FA on file ('Fred Beckey') was updated to add the co-first-ascensionist and date per Mountain Project's full credit — see fa field.",
      ],
    },
    fa: "Fred Beckey, Helmy Beckey. June 19, 1942", // well-sourced correction: MP credits both Beckey brothers + exact date; on-file value ("Fred Beckey" only) was directionally correct but incomplete
  },

  wa_the_hitchhiker: {
    crowds: {
      estimatePerSeason: "Best-trafficked of the SEWS technical (non-South-Arete) routes — 3.8★/178 votes on Mountain Project, ~19,900 total views, ~127 monthly",
      peakTraffic: "No explicit peak-period data beyond overall popularity",
      solitudeRating: 3,
    },
    partnerRequirements: {
      experienceLevel: "Solid 5.11 trad/face leader",
      fitnessSpec: { grade: "Grade IV, 900 ft, 9 pitches", carToCar: "~8 hrs (2012 trip report)" },
      requiredSkills: [
        "Mixed dihedrals, thin slabs, flakes, and roofs",
        "~20 bolts but still needs a real trad rack (doubles to 2\", 60m rope)",
        "One documented party needed an aider on a section — be ready for occasional aid if needed",
      ],
      approachTime: "~1.5–2 hrs via the east-side hairpin/Spire Gully (shared approach with neighboring routes, not fully route-specific-confirmed); descent is a downclimb plus 2 rappels down South Arete, ~1 hr",
    },
    seasonalGuidance: {
      optimalWindow: "Late June–September; one documented ascent was done in mid-September specifically for 'more sunshine'",
      monthBreakdown: {
        June: { status: "marginal", reason: "SR-20 gate and early-season conditions; late June is more reliable than early June" },
        July: { status: "optimal", reason: "Reliable dry rock season" },
        August: { status: "optimal", reason: "Reliable dry rock season" },
        September: { status: "good", reason: "One documented ascent specifically chose September for more sunshine on the route" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["June", "July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Sustained, 'mentally demanding' exposure per a first-person trip report; no rockfall-specific incident reports found for this line",
    },
    hazardsAppend: [
      "Sustained, mentally demanding exposure per a first-person trip report — the route requires composure over a long, committing pitch sequence",
    ],
    dataQuality: {
      confidence: "HIGH",
      gapsAppend: [
        "No extractable Mountain Project comments beyond the vote/rating aggregate; no hard route-specific approach time (shared estimate with neighboring routes); no documented hazard/incident reports specific to this line.",
      ],
    },
    fa: null, // matches Mountain Project exactly — no change
  },

  wa_southern_man: {
    crowds: {
      estimatePerSeason: "Low-moderate — 3.6★/23 votes on Mountain Project, ~4,638 total views, ~35 monthly; shares lower pitches with Direct East Buttress",
      peakTraffic: "N/A",
      solitudeRating: 4,
    },
    partnerRequirements: {
      experienceLevel: "Confident 5.11 crack/corner climber comfortable building your own belays",
      fitnessSpec: { grade: "Grade IV, 900 ft, 9 pitches" },
      requiredSkills: [
        "Lower pitches ('funky 10a') shared with Direct East Buttress",
        "Headwall is sustained, thin technical 5.11d corner cracks",
        "Belays on the headwall are vague/unfixed per Mountain Project — must be comfortable building solid gear anchors, not clipping bolted stations",
      ],
      approachTime: "~1.5–2 hrs (inferred/shared with neighboring routes, not route-specific-confirmed)",
    },
    seasonalGuidance: {
      optimalWindow: "Late June–September (no route-specific refinement found beyond the area-wide SR-20-gated window)",
      monthBreakdown: {
        July: { status: "optimal", reason: "Reliable dry rock season" },
        August: { status: "optimal", reason: "Reliable dry rock season" },
        September: { status: "good", reason: "Dry granite continues; shorter days" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Vague/unfixed belays on the sustained 5.11d headwall require confident, self-built anchor judgment; real consequence if a belay is under-built",
    },
    hazardsAppend: [
      "Shared lower pitches (1–2) with Direct East Buttress have documented loose 'kitty litter' rock",
      "Headwall belays are vague/unfixed per Mountain Project — requires confident, self-built anchor judgment",
    ],
    dataQuality: {
      confidence: "MEDIUM",
      gapsAppend: [
        "Free-ascent history has an unresolved discrepancy: on-file FFA credit 'B. Matthews, B. Burdo (2010)' matches Mountain Project, but Ian Nicholson's October 2011 blog states the free ascent was by 'Bryan Burdo and Bobby [surname unclear]' in September 2009 at 5.12a — a full letter grade harder than the 5.11d on file. Year and free-grade conflict between sources could not be resolved during this pass; likely the same climbers, but not confirmed, so the on-file fa was left unchanged. No first-person trip report was found describing the full route in one piece.",
      ],
    },
    fa: null, // genuine unresolved discrepancy between sources — left unchanged per merge rule, discrepancy flagged in gaps instead
  },

  wa_mojo_rising: {
    crowds: {
      estimatePerSeason: "Most obscure SEWS route researched — 3★/2 votes on Mountain Project, ~1,446 total views; largely eclipsed by the fully-free sister route Free Mojo",
      peakTraffic: "N/A",
      solitudeRating: 5,
    },
    partnerRequirements: {
      experienceLevel: "Genuine aid competence required, not just strong 5.11 free climbing — the route has never been fully freed",
      fitnessSpec: { grade: "Grade III, ~800 ft, 9 pitches" },
      requiredSkills: [
        "P1: 105 ft 5.11b/A0 with a runout 5.6 section below the first bolt",
        "P2: thin flaring aid seam (5.6 C1+)",
        "P3: 10a free mixed with C1 aid plus a wide-crack traverse",
        "P4 'Skywalker Traverse' needs tension moves",
        "P5 has a documented totally detached block",
        "Rack: 2 sets small-medium cams, extra small nuts, 11+ draws",
      ],
      approachTime: null,
    },
    seasonalGuidance: {
      optimalWindow: "Late June–September; a ~40 ft flare/seam pitch has been reported actively wet on at least one ascent — may only go cleanly late-season when dry",
      monthBreakdown: {
        July: { status: "good", reason: "Reliable dry rock season, though the flare/seam pitch can still be wet" },
        August: { status: "optimal", reason: "Driest, most reliable window for the wet flare/seam pitch" },
        September: { status: "optimal", reason: "Driest, most reliable window for the wet flare/seam pitch" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["July", "August", "September"]),
      weather: WEATHER,
      crevasses: NO_CREVASSE,
      exposure: "Runout 5.6 section before P1's first bolt; explicitly documented 'totally detached block' on P5 — a genuine active rockfall/structural hazard, not just loose debris",
    },
    hazardsAppend: [
      "Runout 5.6 section before the first bolt on P1",
      "Documented totally detached block on P5 — treat as an active rockfall/structural hazard, not just loose rock",
    ],
    dataQuality: {
      confidence: "MEDIUM",
      gapsAppend: [
        "Crowd and season color rest on a small number of voters/single-source inference rather than broad corroboration; route mechanics (pitch-by-pitch beta) are unusually well-documented by comparison.",
      ],
    },
    fa: "Mark Allen, Tom Smith, Joel Kauffman. October 13-14, 2006", // confident, well-sourced addition: exact date corroborated by both Mountain Project and a Cascade Climbers FA thread; refines (does not contradict) the on-file team/year
  },

  wa_dolphin_chimney: {
    crowds: {
      estimatePerSeason: "Rarely climbed — Mountain Project's own text states 'a lack of good protection has probably minimized the number of ascents'; 4★/2 votes, ~2,752 total views, ~33 monthly",
      peakTraffic: "N/A",
      solitudeRating: 5,
    },
    partnerRequirements: {
      experienceLevel: "Real offwidth/chimney comfort with tolerance for sparse protection",
      fitnessSpec: { length: "Short — 75 ft (23 m), typically climbed as part of a longer link-up via the Southwest Rib/Boving-Pollock variation" },
      requiredSkills: [
        "Offwidth/chimney technique, 1–2 ft wide",
        "Minimal gear until near the top of the pitch (rated R)",
        "Backpacks reportedly hauled separately at the belay given the chimney's width",
      ],
      approachTime: "No route-specific approach time found; likely shares the Blue Lake Trail west-side approach (~1–1.5 hrs to basin, not confirmed for this line specifically)",
    },
    seasonalGuidance: {
      optimalWindow: "June–September (area-wide SR-20-gated window); no route-specific season notes found beyond this",
      monthBreakdown: {
        July: { status: "good", reason: "Area-wide reliable rock season; no route-specific data found" },
        August: { status: "good", reason: "Area-wide reliable rock season; no route-specific data found" },
      },
    },
    seasonalHazards: {
      avalanche: AVAL_NA(["July", "August"]),
      weather: { typical: "North Cascades afternoon-thunderstorm pattern (area-wide); no route-specific mention found" },
      crevasses: NO_CREVASSE,
      exposure: "Rated R — minimal protection for most of the pitch; Mountain Project's own description attributes the route's low traffic to this protection gap",
    },
    hazardsAppend: [
      "Rated R — minimal protection for most of the pitch per Mountain Project's own route description",
    ],
    dataQuality: {
      confidence: "LOW",
      gapsAppend: [
        "Only two substantive sources found (Mountain Project's own thin page plus passing mentions on SEWS overview pages); no trip report, no Cascade Climbers thread, no AAJ entry, and no independent corroboration of the FA despite targeted searches. Treat crowds/partner/seasonal fields above as provisional pending better sourcing.",
        "FA 'Fred Beckey and Jim Madsen, 1967' could not be independently corroborated beyond Mountain Project (no second source — guidebook, AAJ, or Beckey route inventory — confirms spelling or date); left unchanged. Do not conflate with the separately well-documented Direct East Buttress FA (Beckey with Doug Leen, 1968) — a different SEWS route.",
      ],
    },
    fa: null, // single-source only, correctly flagged LOW confidence per instructions — left unchanged
  },
};

function mergeDataQuality(existing, patch) {
  const out = { ...(existing || {}) };
  out.confidence = patch.confidence;
  out.lastVerified = "2026-07-09";
  const existingGaps = Array.isArray(out.gaps) ? out.gaps : [];
  const newGaps = patch.gapsAppend.filter(g => !existingGaps.includes(g));
  out.gaps = [...existingGaps, ...newGaps];
  return out;
}

function mergeHazards(existing, appendList) {
  const cur = Array.isArray(existing) ? existing : [];
  const additions = (appendList || []).filter(h => !cur.includes(h));
  return [...cur, ...additions];
}

async function getRoute(id) {
  const res = await fetch(`${URL_BASE}/rest/v1/routes?id=eq.${id}&select=id,fa,hazards,crowds,partner_requirements,seasonal_guidance,seasonal_hazards,data_quality`, { headers: H });
  const rows = await res.json();
  if (!rows[0]) throw new Error(`Route not found: ${id}`);
  return rows[0];
}

async function patchRoute(id, body) {
  const res = await fetch(`${URL_BASE}/rest/v1/routes?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH failed for ${id}: ${res.status} ${txt}`);
  }
}

(async () => {
  for (const [id, spec] of Object.entries(routes)) {
    console.log(`\n=== ${id} ===`);
    const current = await getRoute(id);

    const body = {
      crowds: { ...(current.crowds || {}), ...spec.crowds },
      partner_requirements: { ...(current.partner_requirements || {}), ...spec.partnerRequirements },
      seasonal_guidance: {
        ...(current.seasonal_guidance || {}),
        optimalWindow: spec.seasonalGuidance.optimalWindow,
        monthBreakdown: { ...(current.seasonal_guidance?.monthBreakdown || {}), ...spec.seasonalGuidance.monthBreakdown },
      },
      seasonal_hazards: { ...(current.seasonal_hazards || {}), ...spec.seasonalHazards },
      hazards: mergeHazards(current.hazards, spec.hazardsAppend),
      data_quality: mergeDataQuality(current.data_quality, spec.dataQuality),
    };
    if (spec.fa) body.fa = spec.fa;

    await patchRoute(id, body);
    const verify = await getRoute(id);
    console.log(`fa: ${verify.fa}`);
    console.log(`confidence: ${verify.data_quality?.confidence}`);
    console.log(`crowds set: ${!!verify.crowds?.solitudeRating}`);
    console.log(`partner_requirements set: ${!!verify.partner_requirements?.experienceLevel}`);
    console.log(`seasonal_guidance months: ${Object.keys(verify.seasonal_guidance?.monthBreakdown || {}).length}`);
    console.log(`seasonal_hazards exposure set: ${!!verify.seasonal_hazards?.exposure}`);
    console.log(`hazards count: ${(verify.hazards || []).length}`);
  }
  console.log("\nDone.");
})();
