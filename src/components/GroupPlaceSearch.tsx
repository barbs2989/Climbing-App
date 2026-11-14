import { useState } from "react";
import { C, hlMatch } from "../../ClimbMatchCore.jsx";
import { useCatalogAreaSearch } from "../../lib/db.js";
import { clickable } from "../../lib/clickable";

/** A catalog area a climber picked: its id, its name, and the trail above it (state first, the country left off). */
export interface GroupPlacePick {
  id: string;
  name: string;
  trail: string[];
}
interface PlaceHit {
  id: string;
  name: string;
  area_type?: string | null;
  route_count?: number | null;
  trail?: ReadonlyArray<string> | null;
}
export interface GroupPlaceSearchProps {
  /** The box's placeholder and its accessible name. */
  label: string;
  onPick: (p: GroupPlacePick) => void;
}

/* ONE BOX OVER THE WHOLE CATALOG, for the two places Groups asks "where": the crag or area a group climbs
   from (its form), and the place a climber wants groups near (Discover). Every crag and peak is already
   an area, so a group's place and a trip's destination are picked from the same list the Climbs tab
   browses, each hit carrying its trail so namesakes can be told apart -- as Meetup lets you search any
   city and then measures a radius around it. */
export default function GroupPlaceSearch({label,onPick}: GroupPlaceSearchProps){
  const [q,setQ]=useState("");
  const searchQ=useCatalogAreaSearch(q,8);
  const hits: PlaceHit[]=(searchQ.data&&searchQ.data.rows)||[];
  const typed=q.trim().length>=2;
  return <div>
    <input aria-label={label} value={q} onChange={function(e){setQ(e.target.value);}} placeholder={label} style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13,outline:"none"}}/>
    {typed?<div style={{marginTop:6,background:C.card,border:"1px solid "+C.border,borderRadius:9,overflow:"hidden"}}>
      {searchQ.isError?<div role="alert" style={{padding:"10px 12px",fontSize:12.5,color:C.textMuted}}>Couldn’t search the places just now — try again.</div>:hits.length?hits.map(function(m){const trail=(m.trail||[]).slice();return <div key={m.id} {...clickable(function(){setQ("");onPick({id:m.id,name:m.name,trail:trail});})} aria-label={m.name+(trail.length?", "+trail.join(", "):"")} style={{padding:"9px 12px",minHeight:44,boxSizing:"border-box",cursor:"pointer",borderBottom:"1px solid "+C.borderLight}}>
        <div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{hlMatch(m.name,q)}{m.route_count?<span style={{fontSize:11.5,fontWeight:600,color:C.textMuted}}>{" · "+m.route_count+" climb"+(m.route_count===1?"":"s")}</span>:null}</div>
        {trail.length?<div style={{fontSize:11.5,color:C.textMuted,marginTop:1,lineHeight:1.4}}>{trail.join(" › ")}</div>:null}
      </div>;}):<div style={{padding:"10px 12px",fontSize:12.5,color:C.textMuted}}>{searchQ.isFetching?"Searching…":"No crag, peak or area by that name."}</div>}
    </div>:null}
  </div>;
}
