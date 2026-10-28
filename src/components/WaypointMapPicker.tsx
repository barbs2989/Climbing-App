import { useEffect, useRef, useState } from "react";
import { C, wpDivIcon, wpPlaced, wpType } from "../../ClimbMatchCore.jsx";
import { applyBaseLayer, layerSharpZoom, loadLeaflet } from "../../lib/mapKit";
import type { Coord, Waypoint } from "./GPXMap.tsx";

export interface WaypointMapPickerProps {
  waypoints?: ReadonlyArray<Waypoint> | null;
  /** Which waypoint a tap places; its pin draws larger and blue. */
  activeIdx?: number | null;
  onPick?: (lat: number, lng: number) => void;
  /** The peak's own coordinate: the dashed orange ring, and the view when no waypoint has one yet. */
  peakCoord?: Coord | null;
  /** The caption over the map; the waypoint editor's "Tap the map to place Waypoint N" when absent. */
  tapHint?: string;
}

/** The waypoint editor's map: tap to place the active waypoint; existing pins, the peak ring and a Sat/Topo/Street toggle. Leaflet is CDN-loaded (`loadLeaflet`), so the map may fail and say so. */
export default function WaypointMapPicker({waypoints,activeIdx,onPick,peakCoord,tapHint}: WaypointMapPickerProps){
  const mapDiv=useRef<HTMLDivElement | null>(null),mapRef=useRef<LeafletAny>(null),markersRef=useRef<LeafletAny[]>([]),tileRef=useRef<LeafletAny>(null);
  const [ready,setReady]=useState(false),[mapFail,setMapFail]=useState(false);
  const [baseLayer,setBaseLayer]=useState("sat");
  const pickRef=useRef(onPick);pickRef.current=onPick;
  useEffect(function(){
    let cancelled=false;
    const init=function(){
      if(cancelled||!mapDiv.current||mapRef.current||!window.L)return;
      const L=window.L;const map=L.map(mapDiv.current,{attributionControl:false});
      applyBaseLayer(map,tileRef,baseLayer);
      const withCoords=(waypoints||[]).filter(function(w){return wpPlaced(w)&&w.lng!=null&&!isNaN(Number(w.lat))&&!isNaN(w.lng);});
      if(withCoords.length){map.fitBounds(L.latLngBounds(withCoords.map(function(w){return [w.lat,w.lng];})).pad(0.35),{maxZoom:layerSharpZoom(baseLayer)});}
      else if(peakCoord&&peakCoord.lat!=null){map.setView([peakCoord.lat,peakCoord.lng],15);}
      else{map.setView([39.5,-98.5],4);}
      map.on("click",function(e: LeafletAny){pickRef.current?.(e.latlng.lat,e.latlng.lng);});
      mapRef.current=map;setReady(true);
      setTimeout(function(){try{map.invalidateSize();}catch{/* the map is already gone */}},150);
    };
    loadLeaflet(init,function(){setMapFail(true);});
    const ft=setTimeout(function(){if(!cancelled&&!mapRef.current)setMapFail(true);},9000);
    return function(){cancelled=true;clearTimeout(ft);if(mapRef.current){try{mapRef.current.remove();}catch{/* the map is already gone */}mapRef.current=null;tileRef.current=null;}};
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is built ONCE, by design: the base layer, waypoints and peak are read at build time here and then kept current by the two effects below, which redraw the layer and the pins without rebuilding the map
  },[]);
  useEffect(function(){if(!mapRef.current)return;applyBaseLayer(mapRef.current,tileRef,baseLayer);},[baseLayer]);
  useEffect(function(){
    if(!mapRef.current||!window.L)return;
    const L=window.L,map=mapRef.current;
    markersRef.current.forEach(function(m){try{map.removeLayer(m);}catch{/* the map is already gone */}});markersRef.current=[];
    if(peakCoord&&peakCoord.lat!=null){
      const pk=L.circleMarker([peakCoord.lat,peakCoord.lng],{radius:5,color:C.orange,weight:2,fillColor:C.orange,fillOpacity:0.15,dashArray:"2,2"});
      pk.bindTooltip(peakCoord.name||"Peak location",{direction:"top"});pk.addTo(map);markersRef.current.push(pk);
    }
    (waypoints||[]).forEach(function(w,i){
      if(!w||w.lat==null||w.lng==null||isNaN(w.lat)||isNaN(w.lng))return;
      const isActive=i===activeIdx;
      const mk=L.marker([w.lat,w.lng],{icon:wpDivIcon(L,wpType(w),isActive?28:20,isActive?C.blue:null),keyboard:false});
      mk.bindTooltip((w.type||"")+(w.name?": "+w.name:""),{direction:"top"});mk.addTo(map);markersRef.current.push(mk);
    });
  },[waypoints,activeIdx,peakCoord]);
  return <div style={{position:"relative",marginBottom:10}}>
    <div ref={mapDiv} style={{height:190,borderRadius:9,border:"1px solid "+C.border,overflow:"hidden",background:"#0a0f1a",cursor:"crosshair"}}/>
    {!ready?<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:C.textMuted,fontSize:12,pointerEvents:"none",textAlign:"center",padding:16}}>{mapFail?"Map couldn't load — enter coordinates manually below.":"Loading map…"}</div>:null}
    {ready?<div style={{position:"absolute",top:7,left:7,zIndex:1000,display:"flex",gap:3}}>{[["sat","Sat"],["topo","Topo"],["street","St"]].map(([k,lbl])=><button key={k} onClick={()=>setBaseLayer(k)} aria-current={baseLayer===k?"true":undefined} style={{padding:"4px 7px",borderRadius:6,border:"1px solid "+(baseLayer===k?C.blue:C.border),background:baseLayer===k?C.blueBg:C.surface,color:baseLayer===k?"#fff":C.textSub,fontSize:10,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 6px rgba(0,0,0,0.4)"}}>{lbl}</button>)}</div>:null}
    {ready?<div style={{position:"absolute",bottom:7,left:7,right:7,background:"rgba(13,17,23,0.85)",borderRadius:7,padding:"4px 8px",fontSize:11,color:C.text,textAlign:"center",pointerEvents:"none"}}>{tapHint||("Tap the map to place Waypoint "+((activeIdx!=null?activeIdx:0)+1))}</div>:null}
  </div>;
}
