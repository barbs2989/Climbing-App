import { useState, type CSSProperties } from "react";
import { C, SUB_LABEL, WaypointMapPicker } from "../../ClimbMatchCore.jsx";

/** What the form submits: the pin, and the optional photo (an object URL) and identifying note. */
export interface StartLocation {
  lat: number;
  lng: number;
  photo?: string;
  note?: string;
}

/** The peak's own coordinate, which centres the picker map when the form has no pin yet. */
export interface PeakCoord {
  lat?: number | null;
  lng?: number | null;
  name?: string | null;
}

export interface StartLocationFormProps {
  onSubmit: (location: StartLocation) => void;
  onCancel: () => void;
  peakCoord?: PeakCoord | null;
}

/**
 * ADD A START LOCATION: tap the map (or type a latitude and longitude) to pin where a route begins, with an
 * optional photo of the start and a note on how to recognise it. Submit is disabled until both coordinates parse.
 */
export default function StartLocationForm({ onSubmit, onCancel, peakCoord }: StartLocationFormProps) {
  const [lat,setLat]=useState("");const [lng,setLng]=useState("");const [photo,setPhoto]=useState("");const [note,setNote]=useState("");
  const fld: CSSProperties={width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none"};
  const ok=lat!==""&&lng!==""&&!isNaN(parseFloat(lat))&&!isNaN(parseFloat(lng));
  const pinLat=parseFloat(lat),pinLng=parseFloat(lng);
  return <div style={{background:C.surface,borderRadius:10,padding:"11px 12px",border:`1px solid ${C.border}`,marginTop:8}}>
    <div style={{...SUB_LABEL,marginBottom:5}}>TAP THE MAP TO PLACE IT</div>
    <WaypointMapPicker waypoints={[{lat:isNaN(pinLat)?null:pinLat,lng:isNaN(pinLng)?null:pinLng,type:"Trailhead",name:"Start"}]} activeIdx={0} peakCoord={peakCoord} onPick={function(la: number,ln: number){setLat(la.toFixed(5));setLng(ln.toFixed(5));}}/>
    <div style={{display:"flex",gap:8,marginBottom:9}}>
      <div style={{flex:1}}><div style={{...SUB_LABEL,marginBottom:5}}>LATITUDE</div><input aria-label="Latitude" type="number" value={lat} onChange={e=>setLat(e.target.value)} placeholder="e.g. 48.7860" style={fld}/></div>
      <div style={{flex:1}}><div style={{...SUB_LABEL,marginBottom:5}}>LONGITUDE</div><input aria-label="Longitude" type="number" value={lng} onChange={e=>setLng(e.target.value)} placeholder="e.g. -121.8430" style={fld}/></div>
    </div>
    <div style={{...SUB_LABEL,marginBottom:5}}>PHOTO OF THE START (optional)</div>
    <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 10px",borderRadius:9,border:`1px dashed ${photo?C.green:C.border}`,background:photo?C.greenBg:C.card,color:photo?C.green:C.textSub,fontSize:12,cursor:"pointer",fontWeight:600,marginBottom:9}}>{photo?"✓ Photo attached":"Add a photo"}<input type="file" accept="image/*" onChange={e=>{const f=e.target.files&&e.target.files[0];if(f)setPhoto(URL.createObjectURL(f));}} className="cm-file-input"/></label>
    <div style={{...SUB_LABEL,marginBottom:5}}>HOW TO IDENTIFY IT</div>
    <textarea aria-label="How to identify it" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. left-facing corner below a detached block, 200ft climber's-left of the gully…" rows={3} style={Object.assign({},fld,{resize:"vertical",marginBottom:10})}/>
    <div style={{display:"flex",gap:12}}>
      <button onClick={onCancel} style={{flex:1,padding:8,background:C.surface,color:C.textSub,border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button>
      <button disabled={!ok} onClick={()=>onSubmit({lat:parseFloat(lat),lng:parseFloat(lng),photo:photo||undefined,note:note.trim()||undefined})} style={{flex:2,padding:8,background:ok?C.blueSolid:C.border,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:ok?"pointer":"default"}}>Add start location</button>
    </div>
  </div>;
}
