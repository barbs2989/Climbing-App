export const meta = {
  name: "wa-enrich-batch-tracks",
  description: "Deep-research dedicated GPS-track-only enrichment of a BATCH of WA alpine peaks + routes",
  phases: [{ title: "Research", detail: "one agent per peak" }],
};

// Peaks for this batch are injected below by next_batch.mjs (replacing the marker
// line), then launched via scriptPath. Driven in batches by the main loop so
// findings can be persisted to disk between batches (the workflow sandbox has no
// filesystem access of its own).
const PEAKS = []; //__PEAKS__

const S = t => ({ type: [t, "null"] });
const STRARR = { type: ["array", "null"], items: { type: "string" } };

const SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    peakId: { type: "string" },
    routes: { type: "array", items: {
      type: "object", additionalProperties: false,
      properties: {
        routeId: { type: "string" },
        gpx: { type: ["array", "null"], items: { type: "array", items: S("number") } },
        gpxVerified: { type: "boolean" },
        gpxAction: S("string"),
        waypointIssues: STRARR,
        corrections: S("string"),
        sources: { type: "array", items: { type: "string" } },
      },
      required: ["routeId", "gpxVerified"],
    }},
    sources: { type: "array", items: { type: "string" } },
  },
  required: ["peakId", "routes"],
};

function prompt(p) {
  return [
    "You are working on GPS track data for ONE Washington alpine peak's route(s) for a real climbing app. Each route below is in ONE of two states — read the 'gpx' and 'waypoints' fields already present on each route object to tell which:",
    "",
    "MODE A — route has NO gpx yet (gpx is null/missing): hunt for a REAL recorded GPS track. Spend real effort — check MANY sources, not just the first hit, with at least 2-3 distinct searches per route before concluding no track exists. PRIORITY SOURCES: peakbagger.com route/GPS-track pages (many have a downloadable GPX or an embedded track — look for a GPS Track link or the Async/GPSPKTRK endpoint), caltopo.com public maps (search for the peak/route name; public maps often embed a track extractable via their API, e.g. https://caltopo.com/api/v1/map/<id>/since/0), gaiagps.com public tracks, hikingproject.com / mountainproject.com embedded maps, wta.org trip reports, alltrails.com, wikiloc.com, strava public route/segment pages, and any peak-specific blog/trip-report site embedding a Caltopo/Gaia/AllTrails map widget. If you find and extract a real track, set gpx to the point array and gpxVerified:true. If no real track exists after a genuine search, leave gpx null and set gpxVerified:true anyway (verified-absent, not just untried) and gpxAction:'searched, none found'.",
    "",
    "MODE B — route already HAS a gpx array: your job is QUALITY CONTROL, not re-searching. (1) Scan the point sequence for obvious GPS noise or corruption: exact duplicate consecutive points, a single point that jumps far away from its neighbors and back (a spike), or a large gap/teleport that breaks the line's real-world continuity. If you find clear noise, remove ONLY those bad points (dedupe/drop spikes) — do not reshape, smooth, or resample the legitimate points; if the whole track already looks like a clean, plausible line for this peak/route, leave the points as-is. (2) Cross-check the route's 'waypoints' array against the gpx line: does each waypoint's lat/lng sit reasonably close (within a few hundred meters, more for imprecise features) to the track, and in the correct order along it given its distMi/type (e.g. Trailhead near one end, Summit near the other, camps/junctions in between in a sensible sequence)? If a waypoint looks clearly inconsistent (far off the line, or out of sequence), describe the specific problem in waypointIssues — do NOT silently move or delete the waypoint yourself, just flag it precisely (name, what's wrong, what you'd expect instead) so it can be fixed separately. Set gpxAction to a short summary ('clean, no changes needed' / 'removed N duplicate/spike points' / etc.), gpx to the (possibly lightly cleaned) point array, and gpxVerified:true.",
    "",
    "CURRENT PEAK DATA, including each route's existing gpx/waypoints where present (JSON):",
    JSON.stringify(p),
    "",
    "Load WebSearch and WebFetch via ToolSearch (query 'select:WebSearch,WebFetch') for Mode A routes.",
    "",
    "FOR EACH ROUTE (return 'routeId' EXACTLY as given; include EVERY route on the peak, both Mode A and Mode B):",
    "- gpx: the array of [lat,lng] pairs (found, or cleaned-existing, or left null if genuinely unavailable).",
    "- gpxVerified: true once you've done the Mode A search or Mode B check for this route (this is how progress is tracked — always set it).",
    "- gpxAction: one short sentence describing what you did (found/not-found/cleaned/no-change).",
    "- waypointIssues: array of strings describing any waypoint inconsistencies found in Mode B (empty array if none, or if Mode A).",
    "",
    "HARD RULES:",
    "- Only report a NEW track backed by an actual source you found — never synthesize points yourself. Only remove points from an existing track that are genuinely noise (exact duplicates, wild spikes) — never redraw or reshape a legitimate track.",
    "- Put the source URL(s) you used (for Mode A finds) in each route 'sources' and the peak 'sources'.",
    "Return the structured object for this peak covering every route.",
  ].join("\n");
}

phase("Research");
log("Enriching batch of " + PEAKS.length + " peaks (full-page)");
const out = await parallel(PEAKS.map(p => () =>
  agent(prompt(p), { label: "peak:" + p.name, schema: SCHEMA, agentType: "general-purpose", phase: "Research" })
));
const ok = out.filter(Boolean);
log("Batch done — " + ok.length + "/" + PEAKS.length + " researched");
return ok;
