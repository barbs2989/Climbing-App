// How a pitch_detail entry is classified and ordered for ROUTE BREAKDOWN: a roped pitch or a travel section.
// Moved verbatim out of RouteDetail.jsx (2026-10-29, PR56 of the component extraction) so BreakdownHandoff in
// src/components/ and RouteBreakdown on the page count the same pitches and legs; RouteDetail.jsx imports back
// what it still reads. `isPitched` moves with them: `pitchEntryKind` asks it for a bare number.

export function isPitched(r){return !["mountaineering","scrambling","hiking","scramble","hike","glacier","snow","bouldering"].includes((r&&r.discipline)||"");}
// isPitched asks the DISCIPLINE, but whether a pitch_detail entry is a roped pitch is a
// property of the ENTRY. 919 routes carry pitch_detail; classifying per route put 117 of
// them under "PITCH-BY-PITCH" whose entries are a walking itinerary ("Trailhead to
// Cathedral Pass", "Approach gully", "Summit snowfield") and 88 under "ROUTE STAGES"
// whose entries are numbered pitches. Worse, 144 routes hold BOTH — wa_big_four_mountain_
// tower_route is "Approach gully / First tower / Notch rappel / Second and third towers /
// Summit snowfield" — so no per-route verdict can be right about it.
// Classify per entry instead. Both kinds render in ROUTE BREAKDOWN, in the record's own
// array order, because that order is the sequence of the climb and a mixed route interleaves
// them; what the classification decides is how a row is DRAWN — a roped pitch gets the square
// P-badge and the per-pitch detail, a travel leg gets a round badge and a terrain chip.
// Nothing is dropped; 2,181 entries read as pitches and 1,388 as sections.
export const PITCH_NUM_RE=/^p?\s*\d+\s*(?:[-–]\s*p?\s*\d+)?$|^pitch(?:es)?\s*\d+/i;
export const TRAVEL_LBL_RE=/\b(approach|trailhead|trail\s?head|trail to|road|drive|parking|camp|bivy|bivouac|descent|descend|bushwhack|hike|walk|ford|shuttle|return)\b/i;
export const TECH_GRADE_RE=/\b5\.\d|\bV\d|\bAI\s?\d|\bWI\s?\d|\bM\d\b|\bA[0-5]\b|\bC[0-4]\b|\b(?:easy|low|mid|hard|moderate)\s+5th\b|\b5th\s+class\b/i;
// Order matters. A label naming travel wins outright ("Approach gully" is graded "low 5th
// class" and is still an approach). Then a real climbing grade, then bolts/anchor — only a
// roped pitch carries those. A bare "1" is decided last and by discipline, because on a
// walk-up it numbers a leg, not a pitch (wa_baldy_standard: "1","2", both Class 2).
export function pitchEntryKind(p,route){
  const lbl=String((p&&(p.pitch!=null?p.pitch:p.n))||"").trim();
  if(TRAVEL_LBL_RE.test(lbl))return "stage";
  if(TECH_GRADE_RE.test(String((p&&p.grade)||"")))return "pitch";
  if(p&&(p.bolts!=null||(p.anchor&&String(p.anchor).trim())))return "pitch";
  if(PITCH_NUM_RE.test(lbl))return isPitched(route)?"pitch":"stage";
  return "stage";
}
/* ONE SECTION, ONE SEQUENCE. `pitch_detail` was rendered as two boxes stacked on the Plan tab —
   ROUTE BETA (the travel legs) and then PITCH-BY-PITCH (the roped pitches) — and on the 144 routes
   that hold both kinds that ordering is a claim the record never made. wa_big_four_mountain_tower_
   route is "Approach gully / First tower / Notch rappel / Second and third towers / Summit
   snowfield": travel, climbing, descent, climbing, travel. Split into two boxes it read as three
   walks followed by two pitches, which is not the climb. The record's own array ORDER is the
   sequence, and the only way to show it is one list.
   WHAT DOES NOT MERGE IS THE VOCABULARY, and that was the explicit ask: a roped pitch and a walk
   are different kinds of ground and must stay distinguishable at a glance. So a pitch keeps its
   square P-badge, its blue accent and its full detail (length, bolts, anchor, per-pitch consensus,
   photos, beta comments); a section keeps a round badge, a terrain chip and its own three tiles.
   The spine down the left is what carries the integration — it runs through both kinds, in order.
   `data-kind` / `data-label` are on each row for check:pitch-split, which used to tell the two
   apart by which HEADING an entry landed under. With one heading the classification is only
   visible in the markup, and asserting it per row also lets that guard check the ORDER, which is
   the property this change is about. */
export function breakdownRows(route){
  const pd=(route&&Array.isArray(route.pitchDetail))?route.pitchDetail:[];
  let nP=0,nS=0,cum=0;
  let rows=pd.map(function(p,i){
    const kind=pitchEntryKind(p,route);
    const raw=p.n!=null?p.n:(p.pitch!=null?p.pitch:i+1);
    const lbl=String(raw==null?"":raw).trim();
    // `_n` is the raw label and stays the comment key. `_badge` is what the 26px badge can
    // actually hold and `_title` is the descriptive label — "Chimney pitch", "Gendarme" —
    // which had no reader at all: the badge rendered "P"+label, i.e. "PChimney pitch".
    const num=/^p?\s*(\d+)/i.exec(lbl);
    const bare=/^p?\s*\d+\s*(?:[-–]\s*p?\s*\d+)?$/i.test(lbl);
    const row=Object.assign({},p,{_i:i,_kind:kind,_n:raw,
      _note:p.note!=null?p.note:(p.notes||"")});
    if(kind==="pitch"){row._pIdx=nP++;row._badge=num?num[1]:String(nP);row._title=bare?"":lbl;}
    else {row._seq=++nS;row._label=lbl||("Section "+nS);}
    return row;
  });
  // Sort only when every label is a number and nothing is interleaved with it — descriptive
  // labels ("Chimney pitch") are already in route order and `a._n-b._n` on them is NaN, which
  // is not an ordering, and a mixed route's two label spaces ("1" and "Approach gully") cannot
  // be compared at all. On a pure-pitch route this is exactly the old behaviour.
  if(!nS){
    const allNum=rows.every(p=>typeof p._n==="number"||(typeof p._n==="string"&&p._n.trim()!==""&&!isNaN(Number(p._n))));
    if(allNum)rows=rows.slice().sort((a,b)=>Number(a._n)-Number(b._n));
  }
  // Cumulative height gained is a CLIMBING figure: it counts roped pitches and steps over the
  // walking between them, which is what "N ft up" has always meant on this row.
  rows.forEach(function(r){if(r._kind==="pitch"){cum+=(r.lengthM||0);r._cum=cum;}});
  return {rows:rows,pitchCount:nP,stageCount:nS};
}
