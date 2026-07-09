// One-off enrichment writer for 7 WA routes. GET -> merge -> PATCH -> verify.
import fs from 'fs';

const env = fs.readFileSync(new URL('./.env.local', import.meta.url), 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : null; };
const SUPABASE_URL = get('VITE_SUPABASE_URL');
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const TODAY = '2026-07-09';

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

// ---- Per-route new content ----
const ROUTES = {

  wa_north_ridge_2: {
    crowds: {
      peakTraffic: "Very low; Mountain Project rates it 2.5/5 on only 4 votes — among the lowest-engagement routes in the range. Whatcom Peak is repeatedly described as 'seldom climbed' and deep in the North Cascades NP interior.",
      solitudeRating: 5,
    },
    partner_requirements: {
      experienceLevel: "Advanced alpine scrambler — remote, glacier-adjacent terrain with real exposure",
      fitnessSpec: "Multi-day backcountry fitness for the remote Whatcom Pass approach with an overnight pack",
      requiredSkills: [
        "3rd–4th class scrambling with sustained exposure in the final ~400 ft",
        "Self-arrest",
        "Glacier-travel awareness — route passes near Challenger Glacier crevasse terrain",
        "Strong routefinding; Mountain Project stresses staying on the ridge crest, especially higher up",
      ],
      approachTime: "Multi-day approach via Whatcom Pass, North Cascades NP backcountry",
    },
    seasonal_guidance: {
      optimalWindow: "July — snow patches on the ridge are manageable before late-season snowfield deterioration",
      monthBreakdown: {
        June: { status: "risky", reason: "Early-season snow loading on approach and no documented June ascents found" },
        July: { status: "optimal", reason: "Best-documented working window; residual snow patches manageable" },
        August: { status: "marginal", reason: "Connecting snowfields become more treacherous as the season progresses" },
        September: { status: "risky", reason: "Beyond the documented working window; snowfield deterioration and increasing storm frequency in this remote range" },
      },
    },
    seasonal_hazards: {
      avalanche: { zone: "NWAC West Slopes North (Mt. Baker zone) — most relevant to shoulder-season snow travel on approach" },
      crevasses: { location: "Route passes near Challenger Glacier", timing: "Glacier terrain reported increasingly bare-ice/crevassed by late August (2017 NPS ranger account)" },
      exposure: "Ridge-crest exposure steepens noticeably in the final ~400 ft; loose/chossy rock reported in places (CascadeClimbers trip reports)",
    },
    confidence: "MEDIUM",
    gapNotes: [
      "FA audit: the on-file 1936 initials 'L.B./F.B.' are corroborated by The Mountaineer, Vol. 29 No. 1 (Dec. 1936) — a Mountaineers party on Sept 3, 1936 found summit-rock crayon initials matching Berry/Buchanan and inferred a prior north-ridge ascent from Whatcom Pass. Full first names and the correct spelling of 'Buchanan' vs. on-file 'Buchanen' are not independently confirmed beyond initials (Wikipedia carries the same 'Buchanen' spelling, suggesting a shared, possibly erroneous, source chain) — fa left unchanged pending better sourcing.",
      "An AAC obituary tribute for Helmy Beckey claims a Fred & Helmy Beckey 'first ascent' of Whatcom Peak in 1940 (no route specified, no AAJ report found) — likely an overgeneralization given the earlier 1936 evidence; unresolved, flagged but not applied.",
      "SummitPost/CascadeClimbers/Mountaineers.org sources were only accessible via search snippets (403 on direct fetch) — some claims not independently re-verified from primary text.",
    ],
    newHazards: [
      "Route passes near Challenger Glacier crevasse terrain, reported increasingly bare-ice/crevassed by late August (2017 NPS ranger account)",
    ],
    // fa: no change — corroborated in substance, spelling/full names unconfirmed
  },

  wa_south_spur: {
    crowds: {
      estimatePerSeason: "Extremely low — Mountain Project's route page shows only 893 total views (~8/month) since posted Aug 2017",
      peakTraffic: "A documented 4-day trip (trailcatjim.com) encountered only one other party the entire trip",
      solitudeRating: 5,
    },
    partner_requirements: {
      experienceLevel: "Advanced — glacier travel plus a remote multi-day approach with technical obstacles",
      fitnessSpec: "Recorded loop: 37 miles, ~13,700 ft cumulative gain/loss over 4 days (Hannegan Pass–Chilliwack River–Easy Ridge approach)",
      requiredSkills: [
        "Glacier travel and crevasse rescue (Whatcom Glacier crossing, Perfect Pass to summit col)",
        "Gear placement on poor-quality rock in the final ~100 ft",
        "Belayed Class 4 downclimbing through the 'Imperfect/Perfect Impasse' (deep moats, down-sloping slabs)",
        "Strong routefinding over a multi-day approach",
      ],
      approachTime: "2-day approach via Hannegan Pass, Chilliwack River, and Easy Ridge",
    },
    seasonal_guidance: {
      optimalWindow: "Late July — solid snow cover for a manageable glacier crossing",
      monthBreakdown: {
        July: { status: "optimal", reason: "A documented late-July ascent found solid snow cover and a manageable glacier crossing" },
        August: { status: "risky", reason: "A late-August NPS ranger visit found bare ice, open crevasses, and a summit-blocking moat (~5 ft wide) that turned the party back" },
      },
    },
    seasonal_hazards: {
      crevasses: { location: "Whatcom Glacier, Perfect Pass to the summit col", timing: "Bare ice and open crevasses documented by late August (2017 NPS ranger account); a summit-blocking moat ~5 ft wide can be impassable depending on year" },
      avalanche: { zone: "NWAC West Slopes North (Mt. Baker zone)" },
      exposure: "Poor rock quality on the final ~100 ft to the summit; a belayed Class 4 downclimb is often required through the Impasse on approach",
    },
    confidence: "MEDIUM",
    gapNotes: [
      "FA audit: on-file 'unknown' is independently corroborated — Mountain Project's dedicated route page explicitly lists 'First Ascent: Unknown', an exact match. No change made.",
      "SummitPost/CascadeClimbers blocked direct fetch (403); relied on 2–3 substantive independent trip accounts, including a 2017 NPS ranger account and a 4-day trailcatjim.com trip report.",
    ],
    newHazards: [
      "Late-August conditions can produce bare ice, open crevasses, and a summit-blocking moat ~5 ft wide that has turned back at least one documented NPS ranger party",
    ],
  },

  wa_e_se_face: {
    crowds: {
      peakTraffic: "The Enchantments overall are extremely popular and permit-limited (Core Zone lottery success ≈2%, daily quota 24 people/day across advance-lottery + walk-up spots), but this specific face has almost no independent trip-report footprint — only one first-hand account (yellowleaf.org, 2006) describes climbing it; most other Witches Tower reports describe the West Buttress or an easy scramble instead.",
      solitudeRating: 4,
    },
    partner_requirements: {
      experienceLevel: "Intermediate — comfortable with 3rd–4th class scrambling and significant summit exposure; low-5th-class/mixed skill needed if snow/ice lingers",
      fitnessSpec: "Long alpine day: Colchuck Lake TH to Witches Tower via Aasgard Pass documented as ~14 mi RT with ~5,400 ft gain, often done as a single 14+ hour push to avoid the Core Zone permit",
      requiredSkills: [
        "3rd–4th class scrambling with a short, exposed slabby ledge",
        "Basic mixed/ice competency if attempted with lingering snow/ice (route graded as low as Ice 2/M1b in early-season conditions per Mountain Project)",
        "Comfort with heavy exposure on all sides near the summit",
      ],
      approachTime: "Long day via Colchuck Lake and Aasgard Pass (Aasgard alone gains ~2,200 ft in ~0.9 mi)",
    },
    seasonal_guidance: {
      optimalWindow: "Mid-July through August",
      monthBreakdown: {
        June: { status: "risky", reason: "Aasgard Pass commonly holds significant snow into late June" },
        July: { status: "good", reason: "Snow typically clearing; core of the climbing season" },
        August: { status: "optimal", reason: "Best combination of snow-free approach and stable weather" },
        September: { status: "good", reason: "Generally climbable but cooling with shorter days" },
        October: { status: "risky", reason: "Shortened daylight and increasing snow risk — a documented late-October ascent finished its descent in the dark with failing headlamps" },
      },
    },
    seasonal_hazards: {
      avalanche: { zone: "Aasgard Pass is explicitly flagged as avalanche-prone in early season; a WTA trip report documents avalanche debris at the pass base after a Memorial Day snowfall" },
      weather: { typical: "High winter/spring precipitation as snow; summers typically clear/high-pressure, consistent with the July–August optimal window" },
      exposure: "Consistently described as high relative to the technical grade — the SE-side slabby ledge and summit area are exposed even on the easiest line",
    },
    confidence: "LOW",
    gapNotes: [
      "Only one first-hand trip report (yellowleaf.org, Oct 2006) documents climbing this specific face; the route's own catalog record (Mountain Project) carries two conflicting grade descriptions ('4th class, 1 pitch' vs '2 pitches, Ice 2/M1b') for the same line — likely reflecting seasonal (dry-rock vs. snow/ice) variability rather than error.",
      "SummitPost, Mountaineers.org, and CascadeClimbers.com sources returned HTTP 403 on direct fetch; only search-snippet corroboration was available for those.",
      "FA audit: no first-ascent record found for the E/SE Face specifically in Mountain Project, SummitPost, Wikipedia, or AAC Publications/AAJ — appears genuinely undocumented. On-file 'unknown' left unchanged.",
    ],
    newHazards: [
      "A short, exposed slabby ledge near the summit carries real fall consequence despite the low technical grade (2006 first-hand account)",
    ],
  },

  wa_south_face_5: {
    crowds: {
      peakTraffic: "Low; approach requires a roped Terror Glacier crossing and 4,000+ ft gain. Only a handful of documented ascents across two decades (CascadeClimbers trip reports dated 8/10/2005, 9/2/2018, 7/14/2024).",
      solitudeRating: 5,
    },
    partner_requirements: {
      experienceLevel: "Advanced — roped glacier travel plus sustained 5.8 alpine trad leading",
      fitnessSpec: "12-hour round trip from high camp per the FA party's 1970 AAJ account, atop a multi-day remote approach",
      requiredSkills: [
        "Roped glacier travel and crevasse rescue (Terror Glacier crossing)",
        "Solid 5.8 trad leading with chimney/inside-corner technique — crux is the ~400 ft 'Great Gash' (5.8)",
        "Routefinding through a branching ramp system",
        "Self-rescue mindset given the Picket Range's remoteness",
      ],
      approachTime: "Multi-day approach into the Southern Pickets via the Terror Glacier",
    },
    seasonal_guidance: {
      optimalWindow: "Mid-July to early September",
      monthBreakdown: {
        July: { status: "optimal", reason: "Documented ascent 7/14/2024; matches the general Cascades reliable-weather window" },
        August: { status: "optimal", reason: "Documented ascent 8/10/2005; peak of Picket Range climbing season" },
        September: { status: "good", reason: "Documented ascent 9/2/2018; still climbable early in the month" },
      },
    },
    seasonal_hazards: {
      crevasses: { location: "Terror Glacier approach", timing: "Crevasse hazard worsens as the glacier 'opens up' later in the season (general Picket Range pattern; no South-Face-specific August account found)" },
      exposure: "Significant fall/exposure consequence with a genuinely remote, no-easy-bailout descent (scramble to a notch plus rappels)",
    },
    confidence: "MEDIUM",
    gapNotes: [
      "FA lead audit (Bill Sumner & Mike Heath, June 18): AAC Publications/AAJ directly confirms via Heath's own first-person account, filed in the 1970 AAJ volume, that he and Sumner made the first ascent on 'June 18' — but the article text never states a year for that date. Per AAJ's convention of reporting the prior season's climbs, the ascent likely occurred June 18, 1969, not 1970. A secondary source (search-snippet only, not independently verified) states '1969'. This remains effectively single-source at the primary-verification level — on-file fa left as 'unknown' pending independent corroboration of both the date and a second, truly independent source.",
      "General route-quality sources describe the peak's rock as excellent (granodiorite/Skagit gneiss) overall — the on-file 'loose rock in the upper gash/chimney' hazard may be specific to that one feature rather than the face as a whole; left unchanged as it's still plausible and unconfirmed either way.",
      "No specific avalanche-hazard data found for this route; Terror Glacier crevasse hazard is generalized from the broader Picket Range pattern, not South-Face-specific accounts.",
      "SummitPost and CascadeClimbers.com trip reports returned 403 on direct fetch; some detail available only via search snippets.",
    ],
    newHazards: [
      "Terror Glacier crevasse hazard increases later in the season as the glacier 'opens up' (general Picket Range pattern)",
    ],
  },

  wa_east_ridge_4: {
    crowds: {
      peakTraffic: "Low but the most-documented technical route on the peak; independent trip reports found for 2016, 2017 (Labor Day), and 2024. A 2016 party reported at least three other parties camped in Terror Basin concurrently, suggesting modest but real peak-season traffic.",
      solitudeRating: 4,
    },
    partner_requirements: {
      experienceLevel: "Advanced — a serious multi-day alpine-rock commitment, not a beginner outing",
      fitnessSpec: "Multi-day approach with a roped Terror Glacier crossing and a long technical descent (6–14 rappels documented)",
      requiredSkills: [
        "Roped glacier travel with real crevasse/moat judgment (unstable snow bridges documented firsthand)",
        "Solid 5.9 crack-climbing ability for the crux — a sustained ~30m hand/fist crack per a 2024 trip report",
        "Tolerance for loose, runout lower pitches before reaching solid rock",
        "Strong multi-rappel descent/anchor-building skill (6 double-length raps per a 2017 account; 14 rappels per a 2024 account, down the West Ridge/gully)",
      ],
      approachTime: "Multi-day approach into Terror Basin via the Terror Glacier crossing",
    },
    seasonal_guidance: {
      optimalWindow: "Late July through early September",
      monthBreakdown: {
        July: { status: "optimal", reason: "Documented ascent 7/21/2024" },
        August: { status: "optimal", reason: "Documented ascent 8/21/2016" },
        September: { status: "good", reason: "Documented Labor Day weekend ascent (2017)" },
      },
    },
    seasonal_hazards: {
      crevasses: { location: "Terror Glacier crossing to reach the route", timing: "Large crevasses and unreliable snow bridges documented firsthand in 2016; still 'mellow' but crevassed with a spicy moat crossing in 2024" },
      exposure: "Loose rock/rockfall flagged on both the route's lower pitches and especially on the long multi-rappel descent, in two independent accounts",
    },
    confidence: "MEDIUM",
    gapNotes: [
      "FA audit (Beckey, Collins, Cooper, 1958): consistently repeated across an American Alpine Institute guide-service blog, SummitPost (search-snippet only), and three independent trip reports, but no primary AAJ or Beckey-guidebook text was directly verified. Treat as well-corroborated by secondary/tertiary repetition rather than primary-source-confirmed; no conflicting claims found anywhere. On-file fa left unchanged (no correction needed).",
      "The Terror Basin cross-country zone was NPS-closed for wildlife/bear activity in parts of 2023, delaying a 2024 ascent party into late July — access can be gated independent of route conditions.",
      "No specific avalanche-hazard data found for this route beyond general early-season Cascades guidance.",
    ],
    newHazards: [
      "NPS has closed the Terror Basin cross-country zone in some seasons for wildlife activity, which can delay or block access independent of climbing conditions",
    ],
  },

  wa_west_face_3: {
    fa: "Gary Hehn & Dave Stephens, September 16, 2001",
    crowds: {
      estimatePerSeason: "Very low — Mountain Project shows 854 total page views (13/month) and only 1 rating/1 comment; only two documented ascents 21 years apart (FA 2001, next known ascent 2022)",
      peakTraffic: "Mountain Project's own protection note states the peak 'doesn't get climbed or descended very often and the rap stations are often in disarray'",
      solitudeRating: 5,
    },
    partner_requirements: {
      experienceLevel: "Advanced — loose alpine rock with a serious, poorly-protected rappel descent",
      fitnessSpec: "Multi-day/~25-mile PCT approach with a 2–3 hour technical descent",
      requiredSkills: [
        "Solid 5.6 trad leading on runout, loose alpine rock — crux P4 is 'two mini dihedrals with good gear but pretty loose and licheny rock' (Mountain Project)",
        "Comfort building and testing marginal rappel anchors (degrading tat on rock piles, horns, trees, even a bush anchor requiring a test-weight)",
        "Multi-pitch efficiency",
        "Big-day fitness",
      ],
      approachTime: "Multi-day approach via the PCT (Snoqualmie Pass corridor), ~25-mile round trip",
    },
    seasonal_guidance: {
      optimalWindow: "August–September",
      monthBreakdown: {
        August: { status: "marginal", reason: "Documented second ascent 11 Aug 2022; some PCT approach terrain reportedly snow-impassable until well into August in some years (WTA, PCT Section J)" },
        September: { status: "optimal", reason: "FA occurred 16 Sept 2001; best-documented window" },
        October: { status: "risky", reason: "An earlier reconnaissance attempt by the FA team was aborted in the fall due to incoming wet, cold, cloudy weather — fall conditions can deteriorate quickly" },
      },
    },
    seasonal_hazards: {
      avalanche: { zone: "Not a typical avalanche objective — a low-elevation (5,878 ft), non-glaciated rock route outside typical NWAC forecast relevance (inference, not directly sourced)" },
      weather: { typical: "Fast-moving, unstable mountain weather; the FA team's earlier fall scouting attempt was turned back overnight by incoming wet/cold weather, and a 2022 party woke to mist/fog the morning after their summit" },
      exposure: "Sustained exposed multi-pitch climbing with no easy mid-route bail; the East Face rappel descent (4 raps through degrading tat anchors) plus ~800 ft of loose scree/gully downclimbing is the route's most serious hazard, independently corroborated by Mountain Project and a 2022 trip report",
    },
    confidence: "HIGH",
    gapNotes: [
      "FA upgraded from a single forum-snippet source to three independent, mutually consistent sources: Gary Hehn's own CascadeClimbers.com thread (2005), his personal FA writeup recovered via Wayback Machine (exact date Sept 16, 2001, pitch-by-pitch description, and his contemporaneous FA-report email to Fred Beckey), and Mountain Project's independently-authored route page — all agree on team and date. All three ultimately trace back to Hehn's own account (not fully independent-origin), but the near-contemporaneous Beckey-report detail strengthens confidence considerably. fa field updated to include the exact date.",
      "No avalanche-hazard source specific to this route; it is a low-elevation, non-glaciated rock objective likely outside typical NWAC forecast relevance — this is an inference, not directly sourced.",
      "No winter or spring trip reports exist; only two documented ascents total (2001, 2022), 21 years apart, so seasonal guidance beyond Aug–Sept is a real gap.",
      "One Mountain Project comment on the route page could not be extracted (likely JS-gated) and may contain additional beta.",
    ],
    newHazards: [
      "East Face descent (4 rappels) uses degrading, marginal tat anchors — a rock pile, a horn, a tree, and a bush anchor that must be test-weighted — independently corroborated by Mountain Project and a 2022 trip report; followed by ~800 ft of loose scree/gully downclimbing",
    ],
  },

  wa_northeast_ridge_1963_route: {
    crowds: {
      estimatePerSeason: "Very low — Mountain Project shows only ~1,220 total page views (~17/month) for this route's page; a separate account estimates only 3–5 ascents per year by any route on the NE face as a whole (not this line specifically)",
      peakTraffic: "One first-hand trip report states the peak 'rarely gets climbed by any route'",
      solitudeRating: 5,
    },
    partner_requirements: {
      experienceLevel: "Advanced/expert — Grade IV alpine rock on a mountain with a documented history of epics",
      fitnessSpec: "~12 pitches, ~4,000 ft gain per Mountain Project; a short (~1 mile) but very steep approach crossing/fording the Cascade River, moraine, and glacier-adjacent slabs, plus vertical brushwhacking to ~4,400 ft before roped climbing starts",
      requiredSkills: [
        "5.7+ YDS multi-pitch trad leading",
        "Comfort with loose rock and moving fast on exposed 4th/5th class terrain, including simul-climbing when needed",
        "Serious routefinding on confusing, braided rib/ridge terrain",
        "Solid downclimbing judgment for the Doug's Direct descent (steep heather down-climbing)",
      ],
      approachTime: "Short distance (~1 mile) but very steep and technical, including a Cascade River crossing/ford",
    },
    seasonal_guidance: {
      optimalWindow: "Late July through August",
      monthBreakdown: {
        July: { status: "optimal", reason: "Multiple documented ascents in late July (e.g. July 26–27, mid-July, and July on the NE Buttress)" },
        August: { status: "optimal", reason: "Multiple documented ascents in August (Aug 1–2, Aug 21); the range has little/no cloud cover in summer per general climate data" },
      },
    },
    seasonal_hazards: {
      avalanche: { zone: "Mountain 'frequently looses enormous avalanches' from several hanging glaciers per route descriptions; maritime snowpack is wet and heavy, elevating hazard especially outside the stable summer window" },
      crevasses: { location: "Route crosses beneath/adjacent to a hanging glacier and the Sill Glacier", timing: "Steep snow sections (45–60°) on approach/descent carry real fall consequence; most hazardous outside the summer stable window" },
      weather: { typical: "Summers relatively dry/clear; the range is otherwise cloudy and wet, which would sharply increase rockfall/routefinding risk if encountered mid-climb" },
      exposure: "Grade IV, sustained, remote terrain with a difficult descent (Doug's Direct or the C-J Couloir); bail-out options are poor once committed",
    },
    confidence: "MEDIUM",
    gapNotes: [
      "FA audit: the on-file date '1963' is sourced only to a crowdsourced Mountain Project route page (submitted by a user in 2020), not a primary source (AAJ, Beckey guidebook, club journal). Other sources describe similar NE-side lines dated 1951 ('Northeast Rib') and 1957 ('NE Rib') — it's unclear whether this is a distinct route or a conflation/renaming of an earlier line. Treat '1963' as unverified rather than a confirmed historical FA date; no correction applied since no confident alternative was found either.",
      "No climbers' names found for the Northeast Ridge (1963 Route) FA in any source checked (Mountain Project, Wikipedia, SummitPost, AAC Publications, CascadeClimbers). The mountain's overall FA (East Ridge/CJ Couloir, a different route) is well documented: July 26, 1938, by Calder Bressler, Bill Cox, Ray W. Clough, and Tom Myers (Wikipedia) — do not conflate with this route.",
      "CascadeClimbers.com forum threads returned HTTP 403 and could not be read directly, and no AAC Publications/AAJ accident or route report specific to this line was found.",
      "No source discusses September+ conditions for this route — late-season window is an unresearched gap.",
    ],
    newHazards: [
      "Notorious rockfall hazard — the mountain is repeatedly called Beckey-era Cascades' 'most notorious' peak for danger, with loose rock cited across multiple trip reports and a documented near-miss rockfall incident on a 2020 descent",
      "Frequent large avalanches/icefall from several hanging glaciers on the peak, including the Sill Glacier near this route",
      "Steep (45–60°) snow sections on approach/descent with real fall consequence; one trip report calls the heather descent 'the most dangerous part of the trip'",
      "Difficult, routefinding-intensive Doug's Direct descent through suspect rappel anchors and loose terrain, with a documented history of parties returning a day or two late",
      "Cascade River crossing/ford required on approach",
    ],
  },
};

function mergeJsonbObject(existing, incoming) {
  if (!incoming) return existing;
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return { ...existing, ...incoming };
  }
  return incoming;
}

function appendUnique(existingArr, newItems) {
  const base = Array.isArray(existingArr) ? existingArr.slice() : [];
  for (const item of newItems || []) {
    if (!base.includes(item)) base.push(item);
  }
  return base;
}

async function run() {
  const results = [];
  for (const [id, spec] of Object.entries(ROUTES)) {
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,name,fa,crowds,partner_requirements,seasonal_guidance,seasonal_hazards,data_quality,hazards`,
      { headers }
    );
    const rows = await getRes.json();
    if (!rows.length) {
      console.error(`!! Route not found: ${id}`);
      continue;
    }
    const current = rows[0];

    const mergedDataQuality = {
      ...(current.data_quality || {}),
      confidence: spec.confidence,
      lastVerified: TODAY,
      gaps: appendUnique(current.data_quality && current.data_quality.gaps, spec.gapNotes),
    };

    const patchBody = {
      crowds: mergeJsonbObject(current.crowds, spec.crowds),
      partner_requirements: mergeJsonbObject(current.partner_requirements, spec.partner_requirements),
      seasonal_guidance: mergeJsonbObject(current.seasonal_guidance, spec.seasonal_guidance),
      seasonal_hazards: mergeJsonbObject(current.seasonal_hazards, spec.seasonal_hazards),
      data_quality: mergedDataQuality,
      hazards: appendUnique(current.hazards, spec.newHazards),
    };
    if (spec.fa) {
      patchBody.fa = spec.fa;
    }

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(patchBody),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error(`PATCH FAILED for ${id}: ${patchRes.status} ${errText}`);
      results.push({ id, ok: false, error: errText });
      continue;
    }

    // Verify
    const verifyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,fa,crowds,partner_requirements,seasonal_guidance,seasonal_hazards,data_quality,hazards`,
      { headers }
    );
    const verifyRows = await verifyRes.json();
    results.push({ id, ok: true, verified: verifyRows[0] });
    console.log(`OK: ${id}`);
  }

  fs.writeFileSync(new URL('./enrich_results.json', import.meta.url), JSON.stringify(results, null, 2));
  console.log('\nDone. Wrote enrich_results.json');
}

run().catch((e) => { console.error(e); process.exit(1); });
