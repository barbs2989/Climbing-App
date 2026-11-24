/* ALPINE and MOUNTAINEERING were ONE temperature scope ("alpine") until 2026-11-23 (owner: "alpine and
   mountaineering need to be separated"). A range saved then was meant for walk-ups and scrambles too, so it
   is carried onto the new "mountaineering" scope — once: a copy saved by a build that knows about the split
   carries `split: true`, and from then on an absent mountaineering range means the climber removed it.

   KNOWN GAP, accepted for the rollout (code review of #3783): a tab still running a build from BEFORE the
   split rebuilds the prefs from its own key list, which has neither `split` nor `mountaineering`, and saves
   that on any change. The next new-build read then carries alpine onto mountaineering again — a climber's
   separate mountaineering range is replaced by their alpine one, or a removed one returns. No marker can
   prevent it (the old build strips every key it does not know), and it lasts only while such a tab stays
   open; a reload, or the chunk reload a deploy forces on a lazy screen, ends it.

   Pure, so check:alpine-conditions runs it. Returns a NEW temp object; never mutates its input. */
export function carryAlpineRange(temp, split) {
  const t = Object.assign({}, temp && typeof temp === "object" ? temp : {});
  if (!split && t.alpine && !t.mountaineering) t.mountaineering = t.alpine;
  return t;
}
