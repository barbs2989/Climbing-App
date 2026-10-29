/* `essentials` is route.whatToBring, which is CATALOG ENRICHMENT — import-alpine.mjs maps it
   from catalog/ JSON, the same path as approach/descent/beta. It is not submitted by app
   users and there is no editor for it (the RACK box above has a pencil; this list has none).
   So it must not be attributed to people: #732 shipped this block captioned "Called out by
   climbers who have been up it", which reads as first-hand testimony from named ascensionists
   the row does not contain. Same family as #756 printing a real partner as "Climber" and the
   hash-fabricated user data before it — enrichment described as if a person said it. "on
   file" is the vocabulary the rest of the screen already uses for this, including the
   standard-kit caption two elements down. Do not warm it back up. */
export function fmtRappels(r){if(r==null)return null;if(typeof r!=="object")return r;var n=r.count!=null?r.count+"x":"";var len=r.lengthM!=null?r.lengthM+"m":(r.lengthFt!=null?r.lengthFt+"ft":"");return [n,len].filter(Boolean).join(" · ")||null;}
/* `_rappelsFromContrib` is set by the contribution merge in ClimbMatch.jsx when climbers have
   agreed a correction to the rappel count/length. All FIVE readers below prefer `rappelDetail`
   (the station-by-station enrichment) over `rappels`, so on the 155 routes that carry it an
   accepted correction passed the 3-agree gate and then displayed nothing at all — rappelCount
   returned the stale station count and rappelNoteText suppressed the new value outright. The
   station list is not deleted; it just stops out-voting the humans who climbed it.

   The count was three when #787 wrote this and is five now — #784 added rappelsAreNone and
   rappelHeadingCount, and both shipped without the guard. Nothing catches a reader that
   forgets it: that merge was clean and every gate stayed green. If you add a sixth, the
   `!_rapEdited(route)&&` prefix is the whole contract. */
export function _rapEdited(route){return !!(route&&route._rappelsFromContrib);}
