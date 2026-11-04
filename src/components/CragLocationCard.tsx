import type { CSSProperties, ReactNode } from "react";
import { C, SUB_LABEL, trailheadPoint, wpPlaced } from "../../ClimbMatchCore.jsx";
import { trailheadDirectionProblem } from "../../lib/trailheadDirectionShape.js";
import CopyCoordButton from "./CopyCoordButton.tsx";
import EditIconButton from "./EditIconButton.tsx";

export interface CragLocationCardProps {
  route: {
    approachLogistics?: { trailheadDirection?: string | null } | null;
    /** The crag's own area row (parking_* columns), camelCased. */
    _dbArea?: { parkingNote?: string | null; parkingLat?: number | string | null; parkingLng?: number | string | null } | null;
  };
  /** The crag's area: its coordinate is the CRAG point. */
  mtn?: { lat?: number | string | null; lng?: number | string | null } | null;
  /** Opens the parking-pin editor; without it there is no Add parking button. */
  onEditParking?: (() => void) | null;
}

/** WHERE THE CLIMBING IS, AND WHERE YOU PARK — the two places a crag visit needs, side by side under
   the map. A crag route used to give neither as a number: the map drew the crag, and the only
   control was "Directions to crag (Google Maps)", which in fact resolved trailheadPoint() — the
   PARKING — so it was named for one place and drove to another.
   CRAG is the route's own area coordinate, the point the map already draws as peakCoord.
   PARKING is trailheadPoint(), the one function every trailhead surface resolves through
   (see TrailheadCard). On 2026-10-07 it resolved for 85 of 290,855 crag-family routes, so the
   card must be honest in the common case: it says parking is not on file, offers to add it, and
   the Getting there links fall back to the crag itself — SAYING so, because a maps app routes to
   the nearest road to a cliff, which is not always the lot climbers use.
   This card replaces TrailheadCard on a crag route, so the parking coordinate and the drive
   control are each offered once per page (check:trailhead-directions).
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function CragLocationCard({route,mtn,onEditParking}: CragLocationCardProps){
  const crag=(mtn&&mtn.lat!=null&&mtn.lng!=null&&mtn.lat!==""&&mtn.lng!==""&&isFinite(Number(mtn.lat))&&isFinite(Number(mtn.lng)))?{lat:Number(mtn.lat),lng:Number(mtn.lng)}:null;
  const tp=trailheadPoint(route);
  const park=tp?{lat:Number(tp.lat),lng:Number(tp.lng),name:tp.name}:null;
  const al=route.approachLogistics||{};
  const dir=park&&!trailheadDirectionProblem(al.trailheadDirection)?al.trailheadDirection:null;
  /* The note is the CRAG's (areas.parking_note), written about the crag's own parking pin
     (areas.parking_*). trailheadPoint() reaches that pin LAST, after the route's own Trailhead pin,
     its logistics trailhead and a parking-named pin, so the pin shown here can be a different spot
     from the one the note describes. The note sits directly above the pin only when the pin IS the
     crag's; under any other pin it is labelled crag-wide parking. With no pin at all the note is the
     only answer to "where do I park", so the Directions line points at it instead of saying none. */
  const ar=route._dbArea||{};
  const note=(ar.parkingNote&&String(ar.parkingNote).trim())||null;
  const parkIsCrag=!!(park&&wpPlaced({lat:ar.parkingLat,lng:ar.parkingLng})&&Number(ar.parkingLat)===park.lat&&Number(ar.parkingLng)===park.lng);
  const addPin={display:"inline-flex",alignItems:"center",minHeight:44,flexShrink:0,background:"none",border:"none",padding:"0 2px",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"};
  const dest=park||crag;
  if(!crag&&!park&&!note)return null;
  const row=function(label: string,glyphColor: string,title: string | null,body: ReactNode,action?: ReactNode){return <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}><span aria-hidden="true" style={{width:8,height:8,borderRadius:4,background:glyphColor,flexShrink:0}}/><div style={{...SUB_LABEL,margin:0}}>{label}</div>{title?<div style={{fontSize:12.5,fontWeight:700,color:C.text,overflowWrap:"anywhere",minWidth:0}}>{title}</div>:null}</div>{action||null}</div>{body}</div>;};
  const ll=dest?dest.lat+","+dest.lng:"";
  const linkSt: CSSProperties={flex:"1 1 0",display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box",minHeight:44,padding:"8px 10px",borderRadius:8,border:"1px solid "+C.greenDim,background:C.greenBg,color:C.green,fontSize:12.5,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"};
  return <div style={{background:C.surface,borderRadius:12,padding:"12px 14px",border:"1px solid "+C.border,marginTop:10,marginBottom:12}}>
    {row("CRAG",C.orange,null,crag?<CopyCoordButton lat={crag.lat} lng={crag.lng} what="crag"/>:<div style={{fontSize:11.5,color:C.textMuted}}>No crag coordinates on file yet.</div>)}
    {row("PARKING",C.green,park&&park.name&&park.name!=="Trailhead"?park.name:null,park?<>{note&&parkIsCrag?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:6}}>{note}</div>:null}{dir?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:6}}>{dir}</div>:null}<CopyCoordButton lat={park.lat} lng={park.lng} what="parking"/>{note&&!parkIsCrag?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:8}}><span style={{fontWeight:700,color:C.text}}>{"Crag-wide parking — "}</span>{note}</div>:null}</>:note?<><div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{note}</div>{onEditParking?<button onClick={onEditParking} style={addPin}>Add the pin</button>:null}</>:<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>No parking spot on file yet.</div>{onEditParking?<button onClick={onEditParking} style={addPin}>Add parking</button>:null}</div>,park&&onEditParking?<EditIconButton onClick={onEditParking} title="Edit the parking pin"/>:null)}
    {dest?<div>
      <div style={{...SUB_LABEL,marginBottom:5}}>{park?"DIRECTIONS TO PARKING":"DIRECTIONS"}</div>
      {park?null:<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:6}}>{note?"No parking pin on file yet, so these go to the crag itself — the note above says where climbers park.":"No parking spot on file, so these go to the crag itself — your maps app will stop at the nearest road, which may not be where climbers park."}</div>}
      <div style={{display:"flex",gap:8}}>
        <a href={"https://www.google.com/maps/dir/?api=1&travelmode=driving&destination="+ll} target="_blank" rel="noreferrer" aria-label={"Driving directions to the "+(park?"parking":"crag")+" in Google Maps"} style={linkSt}>Google Maps</a>
        <a href={"https://maps.apple.com/?dirflg=d&daddr="+ll} target="_blank" rel="noreferrer" aria-label={"Driving directions to the "+(park?"parking":"crag")+" in Apple Maps"} style={linkSt}>Apple Maps</a>
      </div>
    </div>:null}
  </div>;
}
