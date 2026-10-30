import { fmtRappels, _rapEdited } from "./rappelEdits.js";

/* The rappel summary worth printing NEXT TO the pitch-by-pitch table. `rappels` is either a
   count, a {count,lengthM} object, or free prose ("Typically 0-1 short rappel, or a
   down-climb, on the South Ridge descent"). When a RappelTable is already on screen its
   header states the count and total length, so a bare count here would just repeat it —
   keep only the prose that says something the table cannot. */
export function rappelNoteText(route){var s=fmtRappels(route&&route.rappels);if(s==null)return null;var t=String(s).trim();if(!t)return null;if(!_rapEdited(route)&&route&&route.rappelDetail&&route.rappelDetail.length&&/^\d+(?:\.\d+)?x?(?:\s*·\s*\d+(?:\.\d+)?\s*(?:m|ft))?$/i.test(t))return null;return t;}
/* "Does this route have rappels at all?" is a yes/no question, and for 435 catalog routes the
   stored answer is NO — 195 store rappels:"0" and 240 store prose that says it in words
   ("None — unroped scramble; no rappels reported by parties ascending or descending"). Both
   still drew a RAPPELS heading with a box under it, and on the 195 the box's entire body was
   the character "0". A section header is a claim that there is something to read; on a
   walk-off there is not.

   The table wins over the summary when both exist, so a route that HAS rappels is never
   silenced by prose that opens with the word "No" — that phrasing is common and usually
   introduces which anchors are missing, not whether you rappel at all
   ("No fixed rappel anchors down the couloir itself — descend via the bolted West Face"). */
export const RAP_NONE_RE=/^\s*(?:none|no\b|n\/a|not required|zero|0)\b/i;
/* A denial that still offers a numbered alternative is not a denial. wa_lexington_tower_east_face
   stores "0 -- the standard descent is a walk-off ... A ~7-rappel line straight down the face is
   a documented but non-standard alternative some parties use in bad weather", and
   wa_garfield_mountain_preiss_route says "No fixed rappel line on the route — ... or rappel
   Infinite Bliss (~20 raps)". Suppressing those would delete real descent beta. Suppress only
   when the row denies rappels AND names no numbered rappel line anywhere in the value. */
export const RAP_ALT_RE=/\b\d+\s*(?:-|\s)?\s*(?:short\s+|full\s+)?raps?(?:pels?)?\b/i;
export function rappelsAreNone(route){
  if(!route)return false;
  // `!_rapEdited` for the reason #787 records: a climber who has agreed a correction must not
  // be out-voted by the stale station list. Without it, a route corrected to a walk-off would
  // keep rendering its old rappel table.
  if(!_rapEdited(route)&&route.rappelDetail&&route.rappelDetail.length)return false;
  const r=route.rappels;
  if(r==null)return false;
  if(typeof r==="object")return r.count===0;
  const s=String(r).trim();
  if(/^0+(?:\.0+)?$/.test(s))return true;
  if(!RAP_NONE_RE.test(s))return false;
  return !RAP_ALT_RE.test(s)&&!rapProseAffirms(s);
}
/* ...AND A DENIAL THAT GOES ON TO DESCRIBE A RAPPEL IS NOT A DENIAL EITHER, numbered or not. "No fixed
   anchors on the face ... Descending over the top involves one rappel of about 50 ft" (wa_fantasy_falls),
   "No published count. The descent is a full day of rappelling back down the line" (East McMillan NE
   Buttress), "No fixed rappel line. Descent is ... by rappelling the North Face" (Little Sister): the
   opening "No" says which ANCHORS or which LINE is missing, and the RAPPELS section was hidden with the beta
   in it. Measured 2026-10-15: 292 denials, 25 of which describe a rappel; those now render, the other 267
   (incl. "None — the route is down-climbed, not rappelled", "a walk-off, not a rappel descent") stay hidden.
   A match right after "not"/"than"/"no"/"instead of" is the denial itself, and "a rappel" before
   descent/line/station/route names the thing that is absent. */
export const RAP_AFFIRM_RE=/\b(?:rappelling|rappelled|(?:one|two|three|four|five|six|a|single|series of|couple of|several|few)\s+(?:short\s+|long\s+|full[- ]length\s+|double[- ]rope\s+|single[- ]rope\s+)?rappels?|rappels?\s+(?:the|back|down|off|from|to|of|leads?|into)|raps?\s+(?:the|back|down|off|from|to|into))\b/gi;
export function rapProseAffirms(s){var re=new RegExp(RAP_AFFIRM_RE.source,"gi"),m;while((m=re.exec(s))){var before=s.slice(Math.max(0,m.index-14),m.index);if(/\b(?:not|than|no|instead of)\s+(?:a\s+)?$/i.test(before))continue;if(/^a\s+rappels?$/i.test(m[0])&&/^\s*(?:descent|line|station|route)\b/i.test(s.slice(m.index+m[0].length)))continue;return true;}return false;}
/* The heading takes a count ONLY from an unambiguous source: a rappel table, a stored
   {count}, a bare number, or an explicit range. Free prose gets no numeric heading — it
   renders in full underneath instead.

   Deriving one from prose is how "~100 ft rappel from Sharkfin Col" became "~100 rappels" and
   "75 feet (single rappel possible on descent)" became "~75 rappels": rappelLabel falls back
   to rappelCount, whose last resort takes the leading integer of any sentence, and that
   integer is a LENGTH about as often as it is a count. The same mistake produced 56 fake
   conflicts in audit-rappel-count-conflicts.mjs. It mattered less when this fed a small stat
   tile and matters more now that it is a section heading — a heading is a claim, and the prose
   below it is the evidence. */
export function rappelHeadingCount(route){
  const plural=function(n){return n+" rappel"+(String(n)==="1"?"":"s");};
  // Same guard as the other readers, and this is the sharpest case: the heading states a
  // NUMBER, so a stale station count here silently contradicts the correction the climber
  // just watched pass the 3-agree gate.
  if(!_rapEdited(route)&&route&&route.rappelDetail&&route.rappelDetail.length)return plural(route.rappelDetail.length);
  const r=route&&route.rappels;
  if(r==null)return null;
  if(typeof r==="object")return r.count!=null?plural(r.count):null;
  const s=String(r).trim();
  if(/^\d+$/.test(s))return plural(parseInt(s,10));
  const m=s.match(/^~?\s*(\d+)\s*[-–]\s*(\d+)\b(?!\s*(?:ft|foot|feet|m|meter|metre)s?\b)/i);
  return m?(m[1]+"–"+m[2]+" rappels"):null;
}
