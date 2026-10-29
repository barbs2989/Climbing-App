import type { CSSProperties } from "react";
import { wpIs, trailheadPoint, distMiles, C, WP_STYLE, SUB_LABEL } from "../../ClimbMatchCore.jsx";
import { trailheadDirectionProblem } from "../../lib/trailheadDirectionShape";
import EditIconButton from "./EditIconButton.tsx";
import CopyCoordButton from "./CopyCoordButton.tsx";

export interface TrailheadCardProps {
  /** The route; only the fields the card reads are typed. */
  route: {
    approach?: string | null;
    approachLogistics?: {
      trailhead?: string | null;
      trailheadDirection?: string | null;
      trailheadLat?: number | string | null;
      trailheadLng?: number | string | null;
    } | null;
    waypoints?: Array<{ name?: string | null; type?: string | null }> | null;
  };
  /** Opens the approach editor; the pencil is hidden without it. */
  onEdit?: (() => void) | null;
}

/* Moved verbatim from RouteDetail.jsx; only the types were added.
   The trailhead was one line of text — `Trailhead: Killen Creek Trailhead (Trail #113,
   FR-2329)` — followed by prose. Everything else the row already knew was somewhere else or
   nowhere: the coordinates (650 routes carry trailheadLat/Lng and none of them rendered as a
   number you could read out or paste into a GPS). The card is the trailhead's name, its driving
   directions, and one compact row: Google Maps and Apple Maps (the same destination) + the copyable coordinates. Elevation and
   approach figures live in TECH STATS and are not repeated here. */
export default function TrailheadCard({route,onEdit}: TrailheadCardProps){
  const al=route.approachLogistics||{};
  const wp=(route.waypoints||[]).find(w=>wpIs(w,"Trailhead"))||null;
  /* THE DESTINATION COMES FROM trailheadPoint(), THE SAME FUNCTION THE MAP AND BOTH "Directions
     to…" BUTTONS USE. This card resolved approach_logistics FIRST and the pin second — the exact
     opposite precedence — so on 290 routes the map drew a pin in one place while this card's
     Directions link, its copy-to-clipboard value and its "To the peak" bearing all pointed
     somewhere else. CLAUDE.md has recorded that split as user-visible since the trailhead sweep;
     #1215 consolidated two of the three surfaces and this is the third.
     Consistency is the whole fix. WHICH record is true stays a data question — CLAUDE.md is
     explicit that swapping a priority to settle that would only move the error — but a page must
     not offer two destinations for one trailhead. */
  const tp=trailheadPoint(route);
  const lat=tp?Number(tp.lat):null,lng=tp?Number(tp.lng):null;
  const hasCoord=!!tp;
  /* THE NAME DOES NOT SIMPLY FOLLOW THE COORDINATE, and measuring is what settled it: taking the
     pin's name wholesale changed 530 cards and nearly all were DOWNGRADES — "Killen Creek
     Trailhead (Trail #113, FR-2329)" losing its road and trail number to a bare "Killen Creek
     Trailhead". approach_logistics.trailhead is the curated field and where both records mean the
     same place it is simply better copy.
     It is only wrong when the two records mean DIFFERENT places, and the measured distribution
     says where that boundary is rather than leaving it to taste: the split runs CONTINUOUSLY to
     457 m (p50 46, p90 290 — one trailhead recorded twice, imprecisely) and then jumps straight to
     5,733 m. Nothing lies between. The four beyond it are peaks with two GENUINE approaches, where
     the logistics name really is describing the other one, so those four take the pin's name. */
  const _nameFollows=!!(tp&&!tp.derived&&tp.alt&&distMiles(tp,tp.alt)*1609.34>1000);
  /* WHEN THE TITLE FOLLOWED THE PIN, THE DIRECTIONS PROSE BELOW IS ABOUT THE OTHER RECORD, and
     unlabelled it makes the card contradict itself: #1231 correctly flipped the NAME on the four
     routes past the 1,000 m gap and left `al.trailheadDirection` — which is the LOGISTICS record —
     rendering underneath it. Measured on screen (probe-trailheadcard-name-vs-directions.mjs): 3 of
     the 4 read as e.g. "Thirtymile Trailhead" titled above "From the Andrews Creek Trailhead…",
     two starts 7.8 km apart on one card. The fourth is already honest, because its own prose says
     "Two common trailheads on US-2 in Chelan County give access."
     ATTRIBUTED RATHER THAN SUPPRESSED: on these routes the other approach is real and worth
     keeping, and dropping it would lose the only description of it. And deliberately NOT worded as
     "this peak has two approaches" — the rule fires on DISTANCE, and CLAUDE.md is explicit that a
     disagreement says one record is wrong, not which. "Directions on file describe a different
     start" is true either way. */
  const _dirIsOther=_nameFollows&&!!al.trailhead;
  const name=(_nameFollows&&tp.name)?tp.name:(al.trailhead||(wp&&wp.name)||(tp&&tp.name)||null);
  /* NO STAT TILES. This card used to print Elevation, "Approach (one way)" and a straight-line
     "To the peak" bearing above the directions. The first two restated TECH STATS a scroll away
     and the third was a figure a climber could mistake for trail mileage, so the card now answers
     only where the trailhead is and how to drive there. check:trailhead-directions section 7
     keeps them from coming back. */
  /* A value that describes the WALK is not shown here. This line sits under the trailhead's name as
     its driving directions, and 230 routes once carried "backpack ~13 miles via the Whistler Cutoff",
     "Skyline Trail to Camp Muir" or a bare "North" in it. Those rows were repaired and
     check:trailhead-direction-shape scans the catalog daily, so this is the reader-side defence for
     a row written since: the card falls back to the name, the coordinates and "Drive here", and the
     walk is still on the page in the approach section. The rule refuses none of the 302 reviewed
     good values, which is what makes hiding safe (scripts/trailhead-directions-reviewed.json). */
  const dir=trailheadDirectionProblem(al.trailheadDirection)?null:al.trailheadDirection;
  const dup=dir&&(route.approach||"").slice(0,80).indexOf(dir.slice(0,40))!==-1;
  const thLink: CSSProperties={flex:"1 1 0",display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box",minHeight:44,padding:"8px 10px",borderRadius:8,border:"1px solid "+C.greenDim,background:C.greenBg,color:C.green,fontSize:12.5,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"};
  return <div style={{background:C.surface,borderRadius:12,padding:"12px 14px",border:"1px solid "+C.border,marginTop:12,marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
      <div style={{display:"flex",gap:8,minWidth:0,alignItems:"flex-start"}}>
        <span aria-hidden="true" style={{color:WP_STYLE.Trailhead.color,fontSize:14,lineHeight:1.35,flexShrink:0}}>{WP_STYLE.Trailhead.glyph}</span>
        <div style={{minWidth:0}}>
          <div style={{...SUB_LABEL,marginBottom:2}}>TRAILHEAD</div>
          <div style={{fontSize:13.5,fontWeight:700,color:C.text,lineHeight:1.4,wordBreak:"break-word"}}>{name||"Location on file"}</div>
        </div>
      </div>
      {onEdit?<EditIconButton onClick={onEdit} title="Edit trailhead and approach"/>:null}
    </div>
    {(dir&&!dup)?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,marginBottom:12}}>{_dirIsOther?<span style={{color:C.textMuted}}>{"Directions on file describe a different start \u2014 "+al.trailhead+": "}</span>:null}{dir}</div>:null}
    {/* THE COORDINATES GET THEIR OWN ROW, the two maps apps the row under it (owner note, 2026-10-25:
        "Directions to trailhead box doesn't have proper spacing"). With Apple Maps added beside Google
        Maps (#2831) the three controls shared one line, and at 390px the coordinate shrank to
        "48.85..." -- the one value on the card you read out or type into a GPS. Laid out as
        CragLocationCard already is: a full-width copy row, then two equal 44px buttons. */}
    {hasCoord?<><CopyCoordButton lat={lat as number} lng={lng as number} what="trailhead"/>
    <div style={{display:"flex",gap:8,marginTop:8}}>
      <a href={"https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng} target="_blank" rel="noreferrer" aria-label="Driving directions to the trailhead in Google Maps" style={thLink}>Google Maps</a>
      <a href={"https://maps.apple.com/?dirflg=d&daddr="+lat+","+lng} target="_blank" rel="noreferrer" aria-label="Driving directions to the trailhead in Apple Maps" style={thLink}>Apple Maps</a>
    </div></>:<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>No trailhead coordinates on file yet.</div>}
  </div>;
}
