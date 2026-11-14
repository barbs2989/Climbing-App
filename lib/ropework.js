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
const SIMUL_RE=/\bsimul[- ]?climb|\bsimul\b|moving together|move together|running belay/i;

// Split prose into sentences so each fact can be quoted on its own. Keeps the sentence's own words.
export function ropeSentences(text){
  return String(text||"").split(/(?<=[.;!?])\s+|\n+/).map(function(s){return s.trim();}).filter(Boolean);
}

// The one sentence of `text` that matches `re`, or "" when none does.
export function firstMatch(text,re){
  const hit=ropeSentences(text).find(function(s){return re.test(s);});
  return hit||"";
}

export function ropeworkFacts(route){
  const note=route&&route.ropeNote?String(route.ropeNote).trim():"";
  const parts=[route&&route.ropeNote,route&&route.beta,route&&route.descentText];
  const pd=Array.isArray(route&&route.pitchDetail)?route.pitchDetail:[];
  for(const p of pd) parts.push(p&&(p.notes||p.note),p&&p.anchor,p&&p.grade);
  const simulFrom=parts.map(function(t){return firstMatch(t,SIMUL_RE);}).find(Boolean)||"";
  return {
    length: ropeLenText(route) || firstMatch(note,LENGTH_RE),
    link: firstMatch(note,LINK_RE),
    simul: simulFrom,
  };
}
