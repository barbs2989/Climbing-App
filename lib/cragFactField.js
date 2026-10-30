// Which field the editor opens at for a crag fact row. Moved verbatim out of RouteDetail.jsx (2026-10-29, PR56 of
// the component extraction): CragFactRows and CragFactSection in src/components/ both read it.

/** @type {Record<string, string>} */
export const FACT_FIELD={"Pitches":"pitchCount","Route length":"length","Wall height":"length","Rope":"ropeLen","Location":"location","Bolts":"bolts","Protection":"protRating","Anchor":"anchor","Aspect":"aspect","Season":"season","Rock quality":"rockQuality","Wet":"wet","Fixed gear":"fixedGear","Landing":"landing","Crash pads":"pads","Start":"startType"};
