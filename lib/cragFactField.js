// Which field the editor opens at for a crag fact row. Moved verbatim out of RouteDetail.jsx (2026-10-29, PR56 of
// the component extraction): CragFactRows and CragFactSection in src/components/ both read it.

/** @type {Record<string, string>} */
export const FACT_FIELD={"Pitches":"pitchCount","Route length":"length","Wall height":"length","Rope":"ropeLen","Location":"location","Bolts":"bolts","Protection":"protRating","Anchor":"anchor","Aspect":"aspect","Season":"season","Rock quality":"rockQuality","Wet":"wet","Fixed gear":"fixedGear","Landing":"landing","Crash pads":"pads","Start":"startType"};

/* Facts that belong to the CRAG, WALL or PEAK, not to each line on it (owner, 2026-11-13: "if we don't need to
   have things on every route and can just consolidate it to the specific crag or subarea, that is better — or
   peak"). A route that does not state one shows its area's (or an ancestor's), and its Add opens the AREA's
   editor at that field, so one edit fills every route there. Value: the areas column AreaSuggestFix edits. */
/** @type {Record<string, string>} */
export const AREA_FACT_FIELD={"Aspect":"aspect","Season":"season_months"};
