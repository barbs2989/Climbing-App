/* A crossing is read from the way in's own HAZARDS, never its notes or name: "Icicle Creek Road"
   and "Mountaineer Creek trail" are places, not fords. The chip only repeats a hazard already
   recorded on the card, so it can never claim a crossing nobody wrote down. */
export const APPROACH_CROSSING_RE=/\b(?:ford(?:s|ed|ing)?|wad(?:e|es|ed|ing)|(?:creek|river|stream) crossings?|cross(?:es|ed|ing)? (?:the )?[\w'’ -]{0,30}?(?:creek|river|stream|fork))\b/i;
/* A LOG bridge or log crossing over a creek is a crossing too, and the first pattern missed it:
   "Slick or partly submerged log bridges over Mountaineer Creek early season" is the Colchuck
   outlet hazard every Let it Burn party meets. It counts only when the same hazard names the water,
   so "downed logs" in an avalanche path does not. Measured over all 4,634 stored hazards; the
   remaining non-matches that say "crossing" are railway, glacier, moat, rib and border crossings. */
export const APPROACH_LOG_CROSSING_RE=/\blog (?:bridges?|crossings?)\b/i;
export const approachHasCrossing=haz=>haz.some(h=>{const t=String(h||"");return APPROACH_CROSSING_RE.test(t)||(APPROACH_LOG_CROSSING_RE.test(t)&&/\b(?:creek|river|stream)\b/i.test(t));});
export const primaryApproachIndex=vars=>{const i=vars.findIndex(v=>v&&v.primary===true);return i>=0?i:0;};
export const longFormApproachIndex=vars=>{const i=vars.findIndex(v=>v&&v.longForm===true);return i>=0?i:primaryApproachIndex(vars);};
