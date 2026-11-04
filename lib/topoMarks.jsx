import { useState } from "react";
import { C } from "../ClimbMatchCore.jsx";

// What a topo DRAWS with: the line colours, the marker categories and their glyphs, the numbering and
// the variation tags, the photo-fitting rule and the zoom maths. Moved verbatim out of RouteDetail.jsx
// (2026-10-29, PR54 of the component extraction) so the topo components in src/components/ can share
// them without importing back from the page; RouteDetail.jsx imports what it still reads. `TOPO_VAR`
// and `PIN_CATEGORIES` read the palette at module scope, which is safe here: core has finished
// evaluating before this module (it is reached only through the lazily loaded route page).

/* The topo's own colours, after the overlays climbers already read (Steph Abegg's, the reference
   the owner named): the route line is RED with a dark edge so it holds on pale granite, a
   variation is YELLOW, and a pitch's grade is white text beside its pitch. Variations are LINES
   (topo_lines.variants, 0330) drawn on the Draw line tab; they used to be a "Variant line" pin, a
   dot standing in for a line. */
export const TOPO_RED="#e3261b";
export const TOPO_VAR=C.amber;
/* Bolt and Crux joined the set on 2026-10-23 (owner: "specific icons that are easily recognized").
   A printed topo marks a bolt with a small ×, and the alpine topo legend Ortovox teaches (belay,
   abseil point, bolt, piton, variant) is the set climbers already read off guidebook topos; a crux
   is the one move a topo most often has to point at. The hazard is the one marker that is not a
   disc: a warning TRIANGLE, the shape every road sign and app uses for "careful here", so it
   cannot be mistaken for a station at a glance. */
export const PIN_CATEGORIES=[["belay","Belay station",C.blue],["grade","Grade",C.onSolid],["bolt","Bolt","#6e7681"],["rappel","Rappel station",C.purple],["natural","Natural anchor",C.green],["crux","Crux",C.magenta],["bivy","Bivy",C.teal],["hazard","Hazard",C.red]];
export function pinColor(cat){var f=PIN_CATEGORIES.find(function(p){return p[0]===cat;});return f?f[2]:C.textMuted;}
export function pinLabel(cat){var f=PIN_CATEGORIES.find(function(p){return p[0]===cat;});return f?f[1]:"Marker";}
/* Each pin category draws its own glyph. They used to be bare coloured dots, which asked a
   climber to remember that blue meant a belay and purple a rappel — on a phone, on a wall, in
   the sun. The glyphs follow the marks printed topos already use: two bolts joined at a master
   point for a belay, a ring over a down-arrow for a rappel, a tree for a natural anchor. Drawn
   in a 16-unit box of their own, NOT inside the topo's 0..100 SVG: that one is stretched by
   preserveAspectRatio="none", which would squash every icon to the photo's shape. */
export const PIN_GLYPHS={
  belay:<g><circle cx="4.5" cy="4.5" r="1.6" fill="#fff"/><circle cx="11.5" cy="4.5" r="1.6" fill="#fff"/><path d="M4.5 4.5 L8 11.5 L11.5 4.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="8" cy="12" r="1.9" fill="none" stroke="#fff" strokeWidth="1.5"/></g>,
  rappel:<g><circle cx="8" cy="3.8" r="2.2" fill="none" stroke="#fff" strokeWidth="1.5"/><path d="M8 6 L8 13.5 M4.8 10.4 L8 13.6 L11.2 10.4" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></g>,
  natural:<g><path d="M8 2 L13 10 L3 10 Z" fill="#fff"/><rect x="7" y="10" width="2" height="4" fill="#fff"/></g>,
  bivy:<g><path d="M1.5 13.5 L8 3 L14.5 13.5 Z" fill="#fff"/><path d="M5.8 13.5 L8 9.2 L10.2 13.5 Z" fill="#000" fillOpacity="0.45"/></g>,
  bolt:<g><path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></g>,
  crux:<g><path d="M9.6 1.5 L4 9 L7.6 9 L6.4 14.5 L12 6.8 L8.4 6.8 Z" fill="#fff"/></g>,
  hazard:<g><rect x="7" y="5" width="2" height="5.6" rx="1" fill="#fff"/><circle cx="8" cy="12.9" r="1.2" fill="#fff"/></g>
};
/* A topo point is stored as a percentage, and TopoLineOverlay is `inset:0` with
   preserveAspectRatio="none" — so a stored point means "this far across MY CONTAINER", not
   "this far across the photo". Those are the same thing only when the container IS the
   painted photo, and on all three surfaces that draw a topo it was not:

     surface                     container     object-fit   stored x=10% landed at
     editor  (TopoDrawer)        4:3           cover        14.4% of the photo
     thumbnail (TopoSection)     132x132 (1:1) cover        23.3%
     viewer  (TopoPhotoModal)    auto          contain      10.0%

   (measured on a 3:2 photo — the middle of a line agrees at 50% because cover crops
   symmetrically, which is precisely why the drift is easy to miss: the centre looks right
   and both ends are wrong.) A belay pin placed on the correct flake in the editor rendered
   on a different flake in the strip.

   The fix is to make the container equal the painted photo everywhere: take the aspect ratio
   from the image once it has loaded and fit it with `contain`, so painted rect == container
   rect and a stored percentage means the same thing on every surface. `topos` and
   `topo_lines` were both EMPTY when this changed, so no drawn line moved; once climbers
   start drawing, changing this basis becomes a data migration. */
/** @returns {[string|null, (e: {currentTarget: HTMLImageElement}) => void]} */
export function useImgAspect(){
  const [ar,setAr]=useState(null);
  const onLoad=function(e){const t=e.currentTarget;if(t&&t.naturalWidth&&t.naturalHeight)setAr(t.naturalWidth+" / "+t.naturalHeight);};
  return [ar,onLoad];
}
/** @type {{position: "absolute", inset: number, width: string, height: string, objectFit: "contain", display: string}} */
export const TOPO_IMG={position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",display:"block"};
/* The number each marker wears: grade labels are text, not stations, so they take none and the
   belays still count 1, 2, 3 up the line. null for a grade. */
export function pinNums(pins){var n=0;return (pins||[]).map(function(p){return p&&p.category==="grade"?null:++n;});}
/* One drawn line: a dark edge under the colour, the way a printed topo keeps a red line legible
   on red rock and pale granite alike. Stroke widths are in screen pixels (non-scaling-stroke). */
export function topoPath(points){return (points||[]).map(function(p,i){return (i===0?"M":"L")+p.x+","+p.y;}).join(" ");}
/* The tag a variation wears on the photo — "V", or V1, V2… when there are several — so its row in
   the key ("V1 — 5.10a direct start") can be matched to the line it describes, as the pin numbers
   are. It sits on the line's middle vertex, where a variation is most clearly apart from the route. */
export function varTag(i,n){return n>1?"V"+(i+1):"V";}
export function varMid(v){return v[Math.floor((v.length-1)/2)];}
export const LOUPE_Z = 3;            // magnification
export const TAP_SLOP = 8;           // px a press may wander and still be a tap rather than a pan
export const ZOOM_MAX = 6;
/* The zoomed layer is scaled about its top-left corner; keep the photo covering the frame so a
   pan can never drag empty space into view. */
export function clampTopoView(v,W,H){
  const z=Math.min(ZOOM_MAX,Math.max(1,v.z));
  return {z:z,tx:Math.min(0,Math.max(W-W*z,v.tx)),ty:Math.min(0,Math.max(H-H*z,v.ty))};
}
/* Zoom to z keeping the photo point under (px,py) — frame pixels — where it is. */
export function zoomTopoView(b,z,px,py,W,H){
  const nz=Math.min(ZOOM_MAX,Math.max(1,z));
  return clampTopoView({z:nz,tx:px-(px-b.tx)*nz/b.z,ty:py-(py-b.ty)*nz/b.z},W,H);
}
