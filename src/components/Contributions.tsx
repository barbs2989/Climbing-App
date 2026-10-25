import { C, ROUTES, ago, areaPathNames } from "../../ClimbMatchCore.jsx";
import { useAreaPaths, useMyContributions } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";
import { clickable } from "../../lib/clickable";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import ActionIcon from "./ActionIcon.tsx";

/** The route a contribution row opens: the seed `ROUTES` shape, the caller's `routeById`, or a thin stand-in for a climb just added. */
export interface ContribRoute {
  id: string | number;
  name: string;
  mountainId?: string | number | null;
  _thin?: boolean;
}
/** One row of YOUR CONTRIBUTIONS, as the seed list hands it in or as a `contributions` row is shaped here. */
export interface ContributionItem {
  type: string;
  title: string;
  area?: string | null;
  meta?: string | null;
  status: string;
  when?: string | null;
  confirms?: number | null;
  routeObj?: ContribRoute | null;
  areaId?: string | number | null;
}
export interface ContributionsProps {
  /** The seed-path rows; the DB rows replace them when signed in. */
  items: ContributionItem[];
  onClose: () => void;
  onOpenRoute: (r: ContribRoute, type?: string) => void;
  /** Called only for a row whose `areaId` is set (`_canOpen`), so the id is never actually undefined. */
  onOpenArea: (id: string | number | null | undefined) => void;
  session?: { user?: { id: string } | null } | null;
  routeById?: (id: string | number) => ContribRoute | null | undefined;
}

/** YOUR CONTRIBUTIONS: climbs and areas you added, edits you suggested, each with its review status; a row opens what it changed. The backdrop is a mouse-only div by design (check:clickable baseline). */
export default function Contributions({items,onClose,onOpenRoute,onOpenArea,session,routeById}: ContributionsProps){
  const ST: Record<string, {lbl: string; icon: string; col: string; bg: string}>={review:{lbl:"Awaiting review",icon:"⚠",col:C.amber,bg:C.amberBg},community:{lbl:"Confirming",icon:"👥",col:C.blue,bg:C.blueBg},added:{lbl:"Added — live",icon:"✓",col:C.green,bg:C.greenBg},confirmed:{lbl:"You confirmed",icon:"✓",col:C.green,bg:C.greenBg},verified:{lbl:"Live & verified",icon:"✓",col:C.green,bg:C.greenBg},rejected:{lbl:"Not applied",icon:"✕",col:C.red,bg:C.redBg}};
  const STATUS_ICON: Record<string, string>={review:"alert",community:"user",added:"check",confirmed:"check",verified:"check",rejected:"alert"};
  const uid=(USE_DB&&session&&session.user)?session.user.id:null;
  const dbMine=useMyContributions(uid);
  const dbAreaIds=(dbMine.data||[]).map(function(row){return row.routes&&row.routes.area_id;}).filter(Boolean);
  const dbAreaPaths=useAreaPaths(dbAreaIds);
  const dbItems=(uid&&dbMine.data)?dbMine.data.filter(function(row){return row.kind!=="bailout";}/* bail points were removed from the app (2026-10-07); old rows stay in the table, unshown */).map(function(row){const rn=(row.routes&&row.routes.name)||(row.area_id&&row.areas&&row.areas.name)||null;const rt=routeById?routeById(row.route_id):ROUTES.find(function(r){return r.id===row.route_id;});const cv=row.value==null?"":Array.isArray(row.value)?row.value.join(", "):(typeof row.value==="object"?"updated":String(row.value));const fl=String(row.field||"").replace(/([A-Z])/g," $1").replace(/^./,function(s){return s.toUpperCase();});const areaId=row.routes&&row.routes.area_id;const dbPath=areaId&&dbAreaPaths[areaId];let area=rt?areaPathNames(rt.mountainId):"";if(!area&&dbPath&&dbPath.length)area=dbPath.map(function(a: { name?: string | null }){return a.name;}).join(" › ");/* Start locations and sun reports are live the moment they are filed, like a pairing, and their value is an object the generic line would print as "updated". */if(row.kind==="start_location"||row.kind==="sun"){const xv=row.value||{};const xl=row.kind==="start_location"?"start location":("sun report: "+(xv.vote==="more"?"more sun than shown":xv.vote==="less"?"more shade than shown":"about as described"));return {type:"edit",title:(rn||(rt&&rt.name)||"Route")+" — "+xl,area:area,meta:xv.note?"“"+xv.note+"”":"",status:"added",when:ago(row.created_at),confirms:undefined,routeObj:rt||undefined};}/* A climb or area you ADDED (kinds new_route / new_area) is a proposal, not an edit: its value is the whole form, which the generic line printed as "Suggested: updated" under "Edit suggested". It reads as what it is, and once approved opens what it became (result_id, 0367). */if(row.kind==="new_route"||row.kind==="new_area"){const nv=row.value||{};const _isR=row.kind==="new_route";const _ps=row.status==="approved"?"added":(row.status==="rejected"?"rejected":"review");const _ro=(_isR&&_ps==="added"&&row.result_id)?((routeById&&routeById(row.result_id))||{id:row.result_id,name:nv.name||"",_thin:true}):undefined;return {type:_isR?"route":"area",title:nv.name||(_isR?"A new climb":"A new area"),area:(row.areas&&row.areas.name)?((_isR?"In ":"Under ")+row.areas.name):"",meta:_ps==="added"?(_isR?"On the map — open it to log your climb.":"On the map — open it to add its climbs."):(_ps==="rejected"?("Not added"+(row.review_note?" · Reason: "+row.review_note:"")):"Waiting for review — not on the map yet. You’ll get a notification either way."),status:_ps,when:ago(row.created_at),confirms:undefined,routeObj:_ro,areaId:(!_isR&&_ps==="added"&&row.result_id)?row.result_id:undefined};}if(row.kind==="pair"){const pv=row.value||{};/* A pairing is live the moment it is filed — no confirmation gate — and its value is an object, which the generic line below would print as "updated". */return {type:"edit",title:(rn||(rt&&rt.name)||"Route")+" — pairs well with "+(pv.withName||"another climb"),area:area,meta:pv.note?"“"+pv.note+"”":"",status:"added",when:ago(row.created_at),confirms:undefined,routeObj:rt||undefined};}/* A field edit is HELD until the owner checks it (0307–0309) — unless the field was empty or a second climber sent the same value (0325): pending = awaiting review, approved = live (as the owner applied it, which may differ from what was sent), rejected = not applied, with the reason the owner gave. */const _st=row.status==="approved"?"added":(row.status==="rejected"?"rejected":"review");const _av=row.applied_value;const _avs=_av==null?"":Array.isArray(_av)?_av.join(", "):(typeof _av==="object"?"updated":String(_av));const _meta=_st==="added"?("Applied: "+(_avs||cv)):(_st==="rejected"?("Suggested: "+cv+(row.review_note?" · Reason: "+row.review_note:"")):("Suggested: "+cv));return {type:"edit",title:(rn||(rt&&rt.name)||"Route")+(fl?" — "+fl:""),area:area,meta:_meta,status:_st,when:ago(row.created_at),confirms:undefined,routeObj:rt||undefined};}):null;
  const list: ContributionItem[]=dbItems||items;
  return <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Your contributions" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:900,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 12px",overflowY:"auto",overscrollBehavior:"contain"}}>
    <div onClick={function(e){e.stopPropagation();}} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:460,border:"1px solid "+C.border,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"92vh"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid "+C.border,flexShrink:0}}><div style={{fontSize:16,fontWeight:700}}>Your contributions</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button></div>
      <div style={{minHeight:0,padding:16,overflowY:"auto",overscrollBehavior:"contain",flex:1}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"10px 12px",marginBottom:12}}>{"Routes you’ve added and edits you’ve suggested. An edit to an empty detail goes live at once; a change goes live when a second climber sends the same, or once ClimbMatch checks it — you’re told either way, and credited as the contributor."}</div>
      {list.length?list.map(function(c,i){const st=ST[c.status]||ST.review;const _canOpen=!!((c.routeObj&&onOpenRoute)||(c.areaId&&onOpenArea));return <div key={i} {...(_canOpen?clickable(function(){if(c.routeObj)onOpenRoute(c.routeObj,c.type);else onOpenArea(c.areaId);onClose();}):{})} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px",marginBottom:9,cursor:_canOpen?"pointer":"default"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:13,fontWeight:800,letterSpacing:0.4,color:C.text,textTransform:"uppercase",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{c.type==="route"?"Route added":(c.type==="area"?"Area added":(c.type==="confirm"?"Data confirmed":"Edit suggested"))}</span><span style={{fontSize:12,color:C.textMuted}}>{c.when}</span></div><div style={{fontSize:14.5,fontWeight:700}}>{c.title}</div><div style={{fontSize:12,color:C.textSub,marginTop:1}}>{c.area}</div>{c.meta?<div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{c.meta}</div>:null}<div style={{marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,fontWeight:700,color:st.col,background:st.bg,border:"1px solid "+st.col+"55",borderRadius:20,padding:"3px 10px"}}><ActionIcon name={STATUS_ICON[c.status]||"alert"} size={11} color={st.col}/>{st.lbl+(c.confirms?(" · "+c.confirms+" confirmation"+(c.confirms!==1?"s":"")):"")}</span>{_canOpen?<span style={{fontSize:11.5,color:C.blue,fontWeight:700}}>Edit →</span>:null}</div></div>;}):<div style={{textAlign:"center",padding:"30px 16px",color:C.textMuted,fontSize:13,lineHeight:1.6}}>{"Nothing yet — add a climb or suggest a fix on any route, and it’ll show up here with its review status."}</div>}
      </div>
    </div>
  </div>;
}
