// ROPEWORK says three things and only these: the rope length, whether the pitches link, and whether
// the party simul-climbs. Nothing else from the rope note is shown here (owner's note, 2026-10-25:
// "some information is redundant"). The note's other sentences — rappel beta, gear, "no rope needed" —
// already have their own cards, and printing the whole note here repeated them.
//
// Research (2026-10-28): Mountain Project, theCrag and OpenBeta have no structured rope or linking
// field; rope length is free prose in the description. Rockfax leaves a sport route's length out
// because a wrong length is worse than none. So the length comes from the stored number when there
// is one, and from the note only as a sentence that states a length. Nothing here is written back.

import { ropeLenText } from "./rack";

const LENGTH_RE=/\b\d{2,3}\s?(?:m|M|metres?|meters?)\b|\b\d{2,3}\s?(?:m\b)?\s*(?:or|\/)\s*\d{2,3}\s?m\b/;
const LINK_RE=/\bpitch(?:es)? (?:can be |are |may be |could be |get |to be |often |often be )?(?:link|linked|linking|combined|combine|joined)\b|\b(?:link|linked|linking|combine|combined|join|joined) (?:\w+ ){0,2}pitch|\bpitches? together\b|\bone (?:long )?rope run\b|\bcontinuous (?:rope|lead)\b|\bmove continuously\b|\bfewer,? longer pitches\b|\bpitch(?:ing)? (?:it|them|the \w+) out\b/i;
// A simul-RAPPEL is a descent technique and a simul-SOLO is unroped, so neither is simul-climbing.
const SIMUL_RE=/\bsimul[- ]?climb|\bsimul\b(?![- ]?(?:rap|solo))|moving together|move together|running belay/i;

// Every string inside a stored value (a pitch table, a trip plan, a list of tips), in order.
function textsIn(v,out){
  if(typeof v==="string"){if(v.trim())out.push(v);}
  else if(Array.isArray(v)){for(const x of v)textsIn(x,out);}
  else if(v&&typeof v==="object"){for(const k of Object.keys(v))textsIn(v[k],out);}
  return out;
}

// Where a route can say its party simul-climbs: whole-route summaries first, then a pitch or a day,
// whose terse notes ("Loose, simul-climbed") read out of context on their own. ROPEWORK used to read
// only the rope note, beta, descent and pitch notes, so 151 routes that said it in their description,
// climbing route, trip plan, tips or partner requirements showed "Not stated" (owner, 2026-11-23:
// "if the route says there is simul climbing elsewhere, that section needs to say that"). A route's
// `desc` is the same description under the seed key.
const SIMUL_FIELDS=["ropeNote","beta","overview","desc","climbingRoute","proTips","partnerRequirements","watchOut","pitchDetail","itinerary","timing","approach","descent","descentText"];

// Split prose into sentences so each fact can be quoted on its own. Keeps the sentence's own words.
export function ropeSentences(text){
  return String(text||"").split(/(?<=[.;!?])\s+|\n+/).map(function(s){return s.trim();}).filter(Boolean);
}

// The one sentence of `text` that matches `re`, or "" when none does.
export function firstMatch(text,re){
  const hit=ropeSentences(text).find(function(s){return re.test(s);});
  return hit||"";
}

// The confidence key (contribution_fields.form_key) of each field the card can quote. `desc` is the
// description under the seed key, and `descent` the short descent line beside descent_text.
const FORM_KEY={desc:"overview",descent:"descentText"};
const LEVEL_RANK={low:0,medium:1,high:2};

export function ropeworkFacts(route){
  const note=route&&route.ropeNote?String(route.ropeNote).trim():"";
  /* A whole sentence beats a label: a pitch's "Simul (running gear)" says less than the description's
     "commonly simul-climbed for 300-plus feet", so a short hit is the answer only when it is the only one. */
  const hits=[];
  for(const k of SIMUL_FIELDS){
    for(const t of textsIn(route&&route[k],[])) for(const s of ropeSentences(t)) if(SIMUL_RE.test(s)) hits.push({s:s,k:FORM_KEY[k]||k});
  }
  const simulHit=hits.find(function(h){return h.s.split(/\s+/).length>=5;})||hits[0]||null;
  const lenStored=ropeLenText(route);
  const length=lenStored||firstMatch(note,LENGTH_RE);
  const link=firstMatch(note,LINK_RE);
  /* The fields the rows were read from, so the heading can say how sure THEY are. */
  const keys=[];
  if(length)keys.push(lenStored?"ropeLen":"ropeNote");
  if(link)keys.push("ropeNote");
  if(simulHit)keys.push(simulHit.k);
  return {length:length,link:link,simul:simulHit?simulHit.s:"",keys:keys};
}

// The level the ROPEWORK heading wears: the WEAKEST of the fields its rows were read from. It wore the
// rope note's alone, so a note locked by the gear check read "High · locked" over a Simul-climbing row
// quoted from a description nobody had checked (owner, 2026-11-23: "not sure why ropework is locked at
// high confidence if it's wrong"). A key with no level is skipped; no keys at all leaves the note's own.
export function ropeworkLevel(levels,keys){
  if(!levels)return null;
  let best=null;
  for(const k of keys||[]){const lv=levels[k];if(typeof lv!=="string"||!(lv in LEVEL_RANK))continue;if(best===null||LEVEL_RANK[lv]<LEVEL_RANK[best])best=lv;}
  return best||levels.ropeNote||null;
}
