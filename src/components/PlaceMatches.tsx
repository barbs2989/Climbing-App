import { C } from "../../ClimbMatchCore.jsx";
import DbClimbPicker from "./DbClimbPicker.tsx";
import { usePlaceSearch } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";
import { clickable } from "../../lib/clickable";

/** A route the picker hands back (`dbRouteToCamel` shape; only the fields this seam names are promised). */
export interface PickedRoute {
  id: string | number;
  name: string;
}

/** One place-search hit: an `areas` row plus the `where` line `usePlaceSearch` composes. */
export interface PlaceHit {
  id: string;
  name: string;
  where?: string;
  parent?: { name?: string } | null;
  via?: unknown;
  route_count?: number | null;
}

interface PlaceSearchData {
  total: number;
  rows: PlaceHit[];
}

export interface PlaceMatchesProps {
  /** The search box's text. */
  q: string;
  /** The place whose climbs are open in the picker, or null for the hit list. */
  open: PlaceHit | null;
  setOpen: (place: PlaceHit | null) => void;
  onPickRoute: (route: PickedRoute) => void;
}

/**
 * PLACES above the route hits of a climb search: the areas whose name matches, each opening `DbClimbPicker`
 * inside the list; a "+N more places with this name" hint when the cap cut some, and the ROUTES heading that
 * the caller's route rows sit under. Renders nothing while there are no place hits.
 */
export default function PlaceMatches({ q, open, setOpen, onPickRoute }: PlaceMatchesProps) {
  const placesQ = usePlaceSearch(USE_DB ? q : "");
  if(open)return <div style={{marginTop:8,padding:12,background:C.card,border:"1px solid "+C.border,borderRadius:10,maxHeight:420,overflowY:"auto",overscrollBehavior:"contain"}}><DbClimbPicker key={open.id} start={open} onExit={function(){setOpen(null);}} onPickRoute={onPickRoute} pickLabel="Pick →"/></div>;
  const d: PlaceSearchData | undefined = placesQ.data, rows = (d && d.rows) || [];
  if (!rows.length || !d) return null;
  const more = d.total - rows.length, ex = rows.find(function (a) { return a.parent && a.parent.name && !a.via; });
  const head = function (t: string) { return <div style={{fontSize:11,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.textMuted,padding:"4px 2px 6px"}}>{t}</div>; };
  return <div style={{marginTop:8}}>{head("Places")}{rows.map(function(a){return <div key={a.id} {...clickable(function(){setOpen(a);})} aria-label={"Open "+a.name+(a.where?", "+a.where:"")} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",marginBottom:6,background:C.card,border:"1px solid "+C.border,borderRadius:10,cursor:"pointer"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600}}>{a.name}</div><div style={{fontSize:12,color:C.textSub}}>{a.where}</div></div><span style={{fontSize:12,color:C.textMuted,flexShrink:0,whiteSpace:"nowrap"}}>{(a.route_count||0).toLocaleString()+(a.route_count===1?" route ›":" routes ›")}</span></div>;})}{more>0?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"0 2px 6px"}}>{"+"+more+" more place"+(more===1?"":"s")+" with this name. Add where it is"+(ex&&ex.parent&&ex.parent.name?", e.g. “"+ex.parent.name+" "+q.trim()+"”":"")+"."}</div>:null}{head("Routes")}</div>;
}
