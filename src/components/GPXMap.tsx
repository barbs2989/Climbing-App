import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C, WP_COLORS, WP_STYLE, uDistMi, uElev, wpDivIcon, wpIs, wpPlaced, wpType } from "../../ClimbMatchCore.jsx";
import { BaseLayerToggle, applyBaseLayer, baseTileLayer, fitZoomToLayer, layerSharpZoom, loadLeaflet, locateLabel, useFollowMe } from "../../lib/mapKit";
import { POP_CLOSE, POP_CLOSE_MEDIA } from "../../lib/popupChrome.js";
import { trackIsJustTheWaypoints, waypointLinePins } from "../../lib/track.js";
import Lbl from "./Lbl.tsx";

/** A route waypoint as the route row stores it; placement is decided ONLY by core's `wpPlaced()`. */
export interface Waypoint {
  lat?: number | null;
  lng?: number | null;
  type?: string | null;
  name?: string | null;
  elevFt?: number | null;
  elev?: number | null;
  distMi?: number | null;
  anchorType?: string | null;
  note?: string | null;
}
/** A waypoint `wpPlaced()` accepted: it has a coordinate. */
export interface PlacedWaypoint extends Waypoint { lat: number; lng: number }
export interface Coord { lat?: number | null; lng?: number | null; name?: string | null }
export interface BaseSpot { lat: number; lng: number; n: number; mine?: boolean; confirmed?: boolean }
export interface GPXMapProps {
  /** The recorded track as [lat, lng, ...] samples; fewer than two draws no line. */
  pts?: ReadonlyArray<readonly number[]> | null;
  waypoints?: ReadonlyArray<Waypoint> | null;
  /** The peak or crag coordinate: the empty-state pin when there is no track and no waypoint. */
  peakCoord?: Coord | null;
  /** What the two ends of the track are called; alpine routes pass legend types ("Trailhead"/"Summit"). */
  endpointLabels?: { startLabel: string; startColor: string; finishLabel: string; finishColor: string } | null;
  /** Tapping a waypoint row below the map: its index plus a nonce so the same row re-fires. */
  focusWp?: { i?: number | null; n?: number } | null;
  /** The trailhead the Directions button uses when it lives only in approach_logistics. */
  derivedTrailhead?: Coord | null;
  /** Where climbers checked in at the base (0188), clustered by the database (0363 route_base_spots). */
  baseSpots?: ReadonlyArray<BaseSpot> | null;
}
interface WpStyle { color: string; glyph: string }
/** One drawn pin: its position and the card every layer that draws it opens. */
interface Pin { ll: LeafletAny; html: string; chip: string }
// Named so it cannot collide with core's own `escHtml` when the guard stitch pastes this body into
// core; this one deliberately keeps GPXMap's original four-character set (no apostrophe).
const ESC_PIN: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escPinHtml = (t: unknown) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ESC_PIN[c]);

/**
 * The route page map: the recorded track (or a dashed line through the waypoints), one pin per placed
 * waypoint with ONE shared popup card, the derived trailhead, the peak as empty state, and the base
 * check-ins drawn in their own layer. Leaflet arrives through `loadLeaflet` as `window.L`, untyped —
 * there are no Leaflet typings in this repo because it is CDN-loaded — so `L`, the map and its layers
 * are `any` here, declared once in `src/types/leaflet-global.d.ts`. The body is core's, moved by
 * script; only types and narrowing (`track`, `pk`, `placed`) were added.
 */
export default function GPXMap({pts,waypoints,peakCoord,endpointLabels,focusWp,derivedTrailhead,baseSpots}: GPXMapProps) {
  /* The ONE placement test, as a type predicate over core's wpPlaced() — every other test below goes
     through it (check:waypoint-placement scopes to this body and requires exactly that). */
  const placed = (w: Waypoint | null | undefined): w is PlacedWaypoint => wpPlaced(w);
  const styles: Record<string, WpStyle> = WP_STYLE;
  const colors: Record<string, string> = WP_COLORS;
  /* A stored "track" that is only the route's own pins joined up is drawn by the same rule as no
     track at all (`waypointLinePins`), because its order was made by the same mistake: a pin with
     no distance sorted to mile 0, so the line ran from the trailhead to the summit and back. */
  const track = pts && pts.length >= 2 && !trackIsJustTheWaypoints(pts, waypoints) ? pts : null;
  const pk = peakCoord && peakCoord.lat != null && peakCoord.lng != null ? peakCoord : null;
  const mapDiv=useRef<HTMLDivElement | null>(null),mapRef=useRef<LeafletAny>(null),tileRef=useRef<LeafletAny>(null);
  /* Keyed by the waypoint's index in the ORIGINAL `waypoints` array — the same index the
     list below the map renders — so tapping a row can open that row's own pin. Pins with no
     coordinate are never added here, and the list is what tells the climber so; a row that
     silently did nothing was indistinguishable from a broken map. */
  const markersRef=useRef<Record<number, Pin>>({}),openPinsRef=useRef<((p: Pin, z?: number) => void) | null>(null);
  const [ready,setReady]=useState(false),[mapFail,setMapFail]=useState(false),[locatedOnce,setLocatedOnce]=useState(false),[fullscreen,setFullscreen]=useState(false);const boundsRef=useRef<LeafletAny>(null);
  /* Counts map builds. `ready` turns true once and stays true, so a layer drawn AFTER the build (the
     base check-ins below) needs this to know a rebuild — fullscreen, a new route — wiped it. */
  const [mapGen,setMapGen]=useState(0);
  const [baseLayer,setBaseLayer]=useState<string>("sat");
  const wc=colors;
  const ep=endpointLabels||{startLabel:"Start",startColor:C.green,finishLabel:"Finish",finishColor:C.red};
  const hasPts=!!track;
  const wpPts=(waypoints||[]).filter(placed);
  /* The dashed line joins only the pins that are ON the way, from one trailhead to the summit; a
     camp before the trailhead or down a side trail is still a pin, just not a stop on the line. */
  const wpLine: PlacedWaypoint[]=hasPts?[]:waypointLinePins(wpPts);
  const hasWpLine=wpLine.length>=2;
  const hasPeak=!hasPts&&!(waypoints&&waypoints.length)&&!!pk;
  /* The point the Snow layer lists satellite passes for: the peak, else the track's start, else the first placed pin. */
  const snowAt=(()=>{if(pk)return {lat:pk.lat,lng:pk.lng};if(track)return {lat:track[0][0],lng:track[0][1]};const w=(waypoints||[]).find(placed);return w?{lat:w.lat,lng:w.lng}:null;})();
  /* The derived trailhead is part of the signature: the effect is what draws it, and without it in
     here a route whose only change is that coordinate would keep the previous route's map. */
  const dtSig=derivedTrailhead&&derivedTrailhead.lat!=null?("t"+derivedTrailhead.lat+","+derivedTrailhead.lng):"";
  const sig=(track?(track.length+":"+track[0][0]+","+track[0][1]):((waypoints&&waypoints.length)?("w"+waypoints.length):(hasPeak&&pk?("p"+pk.lat+","+pk.lng):"none")))+dtSig;
  useEffect(()=>{let cancelled=false;const init=()=>{if(cancelled||!mapDiv.current||mapRef.current||!window.L)return;const L: LeafletAny=window.L;const map=L.map(mapDiv.current,{attributionControl:false});if(map.zoomControl)map.zoomControl.getContainer().style.marginTop="46px";tileRef.current=baseTileLayer(L,baseLayer).addTo(map);let b: LeafletAny=null;
    /* ONE POPUP FOR EVERY PIN, and it lists every pin within a fingertip of the one tapped.
       Each pin used to carry its own popup AND a tooltip — on two layers, the icon and a hit
       circle under it — and Leaflet opens a bound tooltip on CLICK as well as hover, so a tap
       put two boxes on screen saying the same thing. Worse, pins are 20px icons and the map
       opens fitted to the whole route, so two real places close together were drawn on top of
       each other: Forbidden Peak's West Ridge opens with its notch 6px from the summit, the
       notch covered it, and tapping the summit opened the notch. The summit could not be
       reached at all. Measured 2026-10-01 (`scripts/oneoff/audit-overlapping-map-pins.mjs`):
       458 of 1,069 routes with pins open with two of them overlapping, 358 with one more than
       half covered. So a tap gathers every pin drawn within PIN_TAP_PX of the tapped one AT THE
       CURRENT ZOOM and shows them in one card, tapped pin first: every pin is reachable at every
       zoom, and nothing moves a coordinate that is correct. The autopan padding keeps the card
       clear of the layer buttons along the top and the Me button along the bottom, which it
       used to open underneath.
       ONE WAYPOINT PER CARD (owner, 2026-10-23: "2 boxes pull up and are overlapping"). The card
       for a crowded tap used to STACK every nearby pin's full card under a "N waypoints here"
       line, which read as two boxes on top of each other, and in the 300px inline map it ran
       past the bottom edge under the Me button. Now the card shows the tapped pin only, and the
       other pins under the finger are an "Also here" row of buttons that swap the SAME card to
       that pin (and move its tip there) — Gaia GPS's pick-from-what-you-tapped list and
       Mapbox/Google's one-place card, in one box. The height cap is fitted to the map so the
       card never outgrows it. */
    const PIN_TAP_PX=22,pins: Pin[]=[];
    const pinPopup=L.popup({minWidth:150,maxWidth:260,maxHeight:280,autoPanPaddingTopLeft:[12,58],autoPanPaddingBottomRight:[12,52]});
    const pinCard=(p: Pin,near: Pin[]): HTMLElement=>{const el: HTMLElement=L.DomUtil.create("div");L.DomEvent.disableClickPropagation(el);el.innerHTML=p.html;const others=near.filter(q=>q!==p);
      if(others.length){const box: HTMLElement=L.DomUtil.create("div","",el);box.style.cssText="border-top:1px solid rgba(127,127,127,0.35);margin-top:8px;padding-top:7px";box.innerHTML='<div style="font-size:11.5px;opacity:0.75;margin-bottom:5px">Also here</div>';
        others.forEach(q=>{const bt: HTMLButtonElement=L.DomUtil.create("button","",box);bt.type="button";bt.innerHTML=q.chip;bt.style.cssText="display:inline-flex;align-items:center;gap:5px;min-height:32px;margin:0 6px 6px 0;padding:5px 10px;border-radius:999px;border:1px solid rgba(127,127,127,0.45);background:transparent;color:inherit;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer";
          L.DomEvent.on(bt,"click",(e: Event)=>{L.DomEvent.stop(e);pinPopup.setLatLng(q.ll).setContent(pinCard(q,near));});});}
      return el;};
    const openPins=(p: Pin,z?: number)=>{const zz=z!=null?z:map.getZoom();const at=map.project(p.ll,zz);const near=[p,...pins.filter(q=>q!==p&&map.project(q.ll,zz).distanceTo(at)<PIN_TAP_PX)];
      pinPopup.options.maxHeight=Math.max(140,Math.min(280,map.getSize().y-120));
      pinPopup.setLatLng(p.ll).setContent(pinCard(p,near)).openOn(map);};
    /* `layers` are every Leaflet layer that draws this one pin; they all open the same card. */
    /* `chip` is the pin's button in a neighbour's "Also here" row: its legend glyph and its name. */
    const addPin=(layers: LeafletAny[],ll: LeafletAny,html: string,name: string,type: string): Pin=>{const st=styles[type];const chip=(st?'<span aria-hidden="true" style="color:'+(wc[type]||st.color)+'">'+st.glyph+'</span>':"")+'<span>'+escPinHtml(name)+'</span>';const p: Pin={ll:L.latLng(ll),html,chip};pins.push(p);layers.forEach(m=>m.on("click",()=>openPins(p)).addTo(map));return p;};
    const pinHead=(name: string,type?: string)=>'<div style="font-weight:700;margin-bottom:2px">'+name+'</div>'+(type?'<div style="font-size:11.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;opacity:0.7">'+type+'</div>':"");
    openPinsRef.current=openPins;
    if(track){const ll=track.map(p=>[p[0],p[1]]);const line=L.polyline(ll,{color:C.blue,weight:4,opacity:0.9}).addTo(map);b=line.getBounds();const nearWp=(pt: readonly number[])=>(waypoints||[]).some(w=>placed(w)&&Math.hypot(pt[0]-w.lat,pt[1]-w.lng)<0.0015);
    // A generic Start/Finish dot is only worth drawing when no NAMED waypoint already says
    // what that end of the track is. The proximity test alone was not enough: Mount Olympus'
    // Blue Glacier standard route has a recorded track that stops ~0.9 km short of the
    // summit — well outside the 0.0015° window — so the map drew a "Finish" pin beside the
    // "Summit" pin and the mountain appeared to have two summits. A named waypoint is
    // strictly more informative than "Finish", and the dashed connector below still shows
    // that the track runs out before it.
    const hasWpType=(...ts: string[])=>(waypoints||[]).some(w=>placed(w)&&ts.indexOf(String(w.type))>=0);
    /* The track endpoints follow the legend too WHEN THEY NAME A LEGEND TYPE. On an alpine route
       endpointLabels is literally {startLabel:"Trailhead", finishLabel:"Summit"}, so these are the
       same two types the legend lists and drawing them as bare dots was the same mismatch. A
       non-alpine route labels them "Start"/"Finish", which are positions on a GPS track rather than
       waypoint types — those keep a plain dot, because giving them a Trailhead glyph would assert a
       type nobody recorded. */
    if(!nearWp(ll[0])&&!hasWpType("Trailhead"))addPin([styles[ep.startLabel]?L.marker(ll[0],{icon:wpDivIcon(L,ep.startLabel),keyboard:false}):L.circleMarker(ll[0],{radius:6,color:"#ffffff",weight:2,fillColor:ep.startColor,fillOpacity:1,bubblingMouseEvents:false})],ll[0],'<div style="font-size:13px;line-height:1.45">'+pinHead(ep.startLabel)+'<div style="font-size:12px;opacity:0.8;margin-top:3px">Where the recorded GPS track starts</div></div>',ep.startLabel,ep.startLabel);
    if(!nearWp(ll[ll.length-1])&&!hasWpType("Summit","Topout"))addPin([styles[ep.finishLabel]?L.marker(ll[ll.length-1],{icon:wpDivIcon(L,ep.finishLabel),keyboard:false}):L.circleMarker(ll[ll.length-1],{radius:6,color:"#ffffff",weight:2,fillColor:ep.finishColor,fillOpacity:1,bubblingMouseEvents:false})],ll[ll.length-1],'<div style="font-size:13px;line-height:1.45">'+pinHead(ep.finishLabel)+'<div style="font-size:12px;opacity:0.8;margin-top:3px">Where the recorded GPS track ends</div></div>',ep.finishLabel,ep.finishLabel);
    // A named Trailhead/Summit can sit a little past where the recorded GPS track starts/stops
    // (the recorder often starts the track after leaving the car, or loses lock near an exposed
    // summit) without being wrong data. Rather than leave it as a stray dot, draw a short dashed
    // connector out to it — but only within CONNECT_DEG, so a genuinely different real-world
    // location (a different trailhead entirely) still reads as visually separate, not "connected".
    const CONNECT_DEG=0.02;const connect=(trackPt: readonly number[],wp: Waypoint | undefined,color: string)=>{if(!placed(wp))return;const d=Math.hypot(trackPt[0]-wp.lat,trackPt[1]-wp.lng);if(d>0.0015&&d<=CONNECT_DEG)L.polyline([trackPt,[wp.lat,wp.lng]],{color,weight:2,opacity:0.6,dashArray:"3,7"}).addTo(map);};
    connect(ll[0],(waypoints||[]).find(w=>placed(w)&&wpIs(w,"Trailhead")),wc.Trailhead);
    connect(ll[ll.length-1],(waypoints||[]).find(w=>placed(w)&&(wpIs(w,"Summit")||wpIs(w,"Topout"))),wc.Summit);
    }else if(hasWpLine){const ll=wpLine.map(w=>[w.lat,w.lng]);const line=L.polyline(ll,{color:C.blue,weight:3,opacity:0.7,dashArray:"7,7"}).addTo(map);line.bindTooltip("Approximate line — joins the waypoints along the way, not a recorded track",{direction:"top",sticky:true});b=line.getBounds();}markersRef.current={};(waypoints||[]).forEach((wp,wi)=>{if(!placed(wp))return;
    // Waypoints carried a hover tooltip and nothing else, so on a phone — which is what this
    // app is built for — tapping one did nothing at all, on every route. A tooltip is a
    // pointer affordance; a popup is what opens on tap. The icon is also under a comfortable
    // touch target, so a transparent 14px circle sits underneath it purely to catch the tap.
    // Both open the ONE shared card (see openPins above) — no tooltip, which a tap opened too.
    const esc=escPinHtml;
    const bits=[];
    if(wp.elevFt!=null||wp.elev!=null)bits.push(uElev(wp.elevFt!=null?wp.elevFt:wp.elev));
    if(wp.distMi!=null)bits.push(uDistMi(wp.distMi)+" from start");
    const html='<div style="font-size:13px;line-height:1.45">'
      +pinHead(esc(wp.name||wp.type||"Waypoint"),wp.type?esc(wp.type):"")
      +(bits.length?'<div style="font-size:12px;opacity:0.8;margin-top:3px">'+esc(bits.join(" · "))+'</div>':"")
      +(wp.anchorType?'<div style="font-size:12px;margin-top:4px">'+esc(wp.anchorType)+'</div>':"")
      +(wp.note?'<div style="font-size:12px;margin-top:4px">'+esc(wp.note)+'</div>':"")
      +'</div>';
    const hit=L.circleMarker([wp.lat,wp.lng],{radius:14,stroke:false,fillOpacity:0,interactive:true,bubblingMouseEvents:false});
    const mk=L.marker([wp.lat,wp.lng],{icon:wpDivIcon(L,wpType(wp)),keyboard:false});
    markersRef.current[wi]=addPin([hit,mk],[wp.lat,wp.lng],html,String(wp.name||wp.type||"Waypoint"),wpType(wp));
    if(!b){b=L.latLngBounds([[wp.lat,wp.lng]]);}else{b.extend([wp.lat,wp.lng]);}});
    /* THE START POINT THE DIRECTIONS BUTTON USES, when it lives only in approach_logistics and so
       has no waypoint marker of its own. Drawn through `wpDivIcon` with derived=true — hollow and
       dashed, carrying the Trailhead glyph and colour — rather than as a bare circleMarker: a
       colour-only dot is a mystery the legend cannot explain, which is the defect #1194 removed
       everywhere else on this map. The hollow form is the language for "the app worked this out",
       so it cannot read as an N+1st pin somebody surveyed: the WAYPOINTS list below still shows N
       rows and this is deliberately not the N+1st.
       Gated on the map already having real content, so the 10 routes that draw NO map keep drawing
       none — there the button and the map do not contradict each other and there is nothing to fix.
       Extending `b` is safe for the same reason: where `b` is empty this never runs, so the
       `hasPeak` empty-state fallback below is untouched. */
    if((hasPts||wpPts.length>0)&&derivedTrailhead&&derivedTrailhead.lat!=null&&derivedTrailhead.lng!=null){
      const dt=derivedTrailhead,dll=[dt.lat,dt.lng];
      const dEsc=escPinHtml;
      const dHtml='<div style="font-size:13px;line-height:1.45">'
        +pinHead(dEsc(dt.name||"Trailhead"),"Trailhead")
        +'<div style="font-size:12px;opacity:0.8;margin-top:4px">Where the Directions button sends you. Recorded in this route&#8217;s approach logistics rather than as a waypoint, so it is not in the list below.</div></div>';
      addPin([L.marker(dll,{icon:wpDivIcon(L,"Trailhead",22,null,true),keyboard:false})],dll,dHtml,String(dt.name||"Trailhead"),"Trailhead");
      if(!b){b=L.latLngBounds([dll]);}else{b.extend(dll);}
    }
    if(b&&b.isValid()){map.fitBounds(b.pad(0.25),{maxZoom:layerSharpZoom(baseLayer)});}else if(hasPeak&&pk){L.marker([pk.lat,pk.lng],{icon:wpDivIcon(L,"Summit",26,null,true),keyboard:false}).addTo(map).bindTooltip(pk.name||"Peak location",{direction:"top"});map.setView([pk.lat,pk.lng],12);}else{map.setView([39.5,-98.5],4);}fitZoomToLayer(map,baseLayer);boundsRef.current=b;mapRef.current=map;setReady(true);setMapGen(g=>g+1);setTimeout(()=>{try{map.invalidateSize();}catch{/* the map is already gone */}},150);};loadLeaflet(init,()=>setMapFail(true));const ft=setTimeout(()=>{if(!cancelled&&!mapRef.current)setMapFail(true);},9000);return ()=>{cancelled=true;clearTimeout(ft);if(mapRef.current){try{mapRef.current.remove();}catch{/* the map is already gone */}mapRef.current=null;tileRef.current=null;openPinsRef.current=null;}};
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is rebuilt on `sig` (route identity incl. the derived trailhead) and `fullscreen` ONLY, by design: every other value is read at build time, and re-running on them would re-fit the view (see the comments above)
  },[sig,fullscreen]);
  /* The base layer is swapped IN PLACE rather than rebuilding the map (it used to sit in the deps above).
     The Snow layer's day stepper changes it once per tap, and a rebuild re-fitted the route every time. */
  useEffect(()=>{if(!mapRef.current)return;applyBaseLayer(mapRef.current,tileRef,baseLayer);},[baseLayer]);
  const me=useFollowMe(mapRef,{C,zoom:16,onFix:(_f,first)=>{if(first)setLocatedOnce(true);}}),locate=me.locate,geoErr=me.err;
  useEffect(()=>{if(!mapRef.current)return;const t=setTimeout(()=>{try{mapRef.current.invalidateSize();}catch{/* the map is already gone */}},220);return ()=>clearTimeout(t);},[fullscreen]);
  /* Tapping a waypoint row below the map pans to that pin and opens its popup. `focusWp`
     carries a nonce as well as the index so that tapping the SAME row twice re-fires — an
     index alone is unchanged on the second tap and the effect would not run, which reads as
     the row having stopped working. `ready` is a dependency because a tap can land before
     Leaflet has finished loading, and the markers do not exist until it has. */
  useEffect(()=>{if(!focusWp||focusWp.i==null)return;const map=mapRef.current;if(!map)return;const p=markersRef.current[focusWp.i];if(!p||!openPinsRef.current)return;try{const z=Math.max(map.getZoom()||0,14);map.setView(p.ll,z,{animate:true});openPinsRef.current(p,z);}catch{/* the map is already gone */}},[focusWp,ready]);
  /* WHERE CLIMBERS CHECKED IN AT THE BASE (0188), drawn on the map they are looking at. The spots
     used to be a coordinate pair in a card elsewhere on the page, so a climber standing at the crag
     had to copy numbers into another app to see where the start was. A spot is a cluster of on-site
     GPS check-ins, so it is drawn as a Base pin with a RING — the ring says "climbers stood here",
     which a surveyed Base waypoint does not. Drawn in its own layer after the map is built, because
     check-ins arrive later than the route; it does not refit the view, except where the map had
     nothing but the peak/crag coordinate to show. Keyed on the spots' content, so a refetch that
     returns the same points redraws nothing. */
  const baseSig=(baseSpots||[]).map(function(b){return b.lat.toFixed(6)+","+b.lng.toFixed(6)+":"+b.n+(b.mine?"m":"")+(b.confirmed?"c":"");}).join("|");
  useEffect(()=>{const map=mapRef.current;if(!mapGen||!map||!window.L||!baseSig)return;const L: LeafletAny=window.L;const grp=L.layerGroup().addTo(map);
    (baseSpots||[]).forEach(function(b,i){const html='<div style="font-size:13px;line-height:1.45"><div style="font-weight:700;margin-bottom:2px">'+(b.confirmed?"Base of the climb":i===0?"Reported base":"Another reported base")+'</div><div style="font-size:11.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;opacity:0.7">'+(b.confirmed?"Confirmed by climbers":"Climber check-in · not confirmed yet")+'</div><div style="font-size:12px;opacity:0.8;margin-top:3px">Checked in on-site by '+b.n+' climber'+(b.n!==1?"s":"")+(b.mine?", including you":"")+'</div></div>';
      L.circleMarker([b.lat,b.lng],{radius:14,stroke:false,fillOpacity:0,interactive:true,bubblingMouseEvents:false}).addTo(grp).bindPopup(html);
      L.marker([b.lat,b.lng],{icon:wpDivIcon(L,"Base",i===0?24:20,true),keyboard:false,zIndexOffset:i===0?500:0}).addTo(grp).bindPopup(html);});
    if(!boundsRef.current&&hasPeak&&pk){try{const fb=L.latLngBounds([[pk.lat,pk.lng]]);(baseSpots||[]).forEach(function(b){fb.extend([b.lat,b.lng]);});map.fitBounds(fb.pad(0.4),{maxZoom:Math.min(17,layerSharpZoom(baseLayer))});}catch{/* the map is already gone */}}
    return ()=>{try{grp.remove();}catch{/* the map is already gone */}};
  // eslint-disable-next-line react-hooks/exhaustive-deps -- redrawn when the map is rebuilt (`mapGen`) or the spots' CONTENT changes (`baseSig`), by design; a refetch returning the same points must redraw nothing
  },[mapGen,baseSig]);
  if(!hasPts&&!(waypoints&&waypoints.length)&&!hasPeak)return null;
  const resetView=()=>{const map=mapRef.current;if(!map)return;me.release();if(boundsRef.current&&boundsRef.current.isValid())map.fitBounds(boundsRef.current.pad(0.25),{maxZoom:layerSharpZoom(baseLayer)});else if(hasPeak&&pk)map.setView([pk.lat,pk.lng],12);else map.setView([39.5,-98.5],4);};
  const mapUI=<div style={fullscreen?{position:"fixed",inset:0,zIndex:9700,background:C.bg,padding:12,display:"flex",flexDirection:"column"}:{position:"relative"}} role={fullscreen?"dialog":undefined} aria-modal={fullscreen?"true":undefined} aria-label={fullscreen?"Route map":undefined}>{fullscreen?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>Route map</span><button onClick={()=>setFullscreen(false)} aria-label="Close full-screen map" style={POP_CLOSE}>✕</button></div>:null}<div style={{position:"relative",flex:fullscreen?1:"none"}}><div ref={mapDiv} style={{height:fullscreen?"100%":300,borderRadius:9,border:`1px solid ${C.border}`,overflow:"hidden",background:"#0a0f1a"}}/>{!ready?<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:C.textMuted,fontSize:12,pointerEvents:"none",textAlign:"center",padding:16}}>{mapFail?"Map couldn’t load — see waypoints below.":"Loading map…"}</div>:null}<BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} snow snowAt={snowAt}/>{fullscreen?null:<button onClick={()=>setFullscreen(true)} aria-label="Full screen" title="Full screen" style={{...POP_CLOSE_MEDIA,position:"absolute",top:10,right:10,zIndex:1000}}>⤢</button>}{locatedOnce?<button onClick={resetView} style={{position:"absolute",bottom:26,left:10,zIndex:1000,background:C.surface,color:C.text,border:"1px solid "+C.border,borderRadius:9,padding:"7px 11px",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>↺ Reset view</button>:null}<button onClick={locate} style={{position:"absolute",bottom:26,right:10,zIndex:1000,background:C.blueSolid,color:"#ffffff",border:"none",borderRadius:9,padding:"7px 11px",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>{<Lbl s={"📍 "+locateLabel(me,"Me")}/>}</button></div>{geoErr?<div style={{fontSize:11.5,color:C.amber,marginTop:6}}>{geoErr}</div>:null}<div style={{padding:"7px 2px 0",display:"flex",gap:5,flexWrap:"wrap"}}>{/* A legend describes THE MAP ABOVE IT, so it lists only the types this route actually uses. It used to print all of WP_STYLE unconditionally, which was already listing types the map did not draw; at 13 styled types that becomes a wall of pills that is mostly about other routes. Normalise before comparing — a raw "lake" must light the Water row. */Object.keys(WP_STYLE).filter(function(k){return (waypoints||[]).some(function(w){return wpType(w)===k;});}).map(k=><span key={k} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,padding:"3px 8px",borderRadius:999,background:C.surface,border:"1px solid "+C.border,whiteSpace:"nowrap"}}><span aria-hidden="true" style={{color:styles[k].color,fontSize:12.5,lineHeight:1}}>{styles[k].glyph}</span><span style={{color:C.textSub}}>{k}</span></span>)}</div></div>;
  return fullscreen?createPortal(mapUI,document.body):<div>{mapUI}</div>;
}
