import { C, MOUNTAINS, stateCatalogLine, fmtAgo } from "../../ClimbMatchCore.jsx";
import { POP_BACK } from "../../lib/popupChrome.js";
import { USE_DB } from "../../lib/supabase";
import { clickable } from "../../lib/clickable";
import ActionIcon from "./ActionIcon.tsx";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import { BTN_SM } from "../../lib/buttonStyles.js";
import { SavedRouteMaps } from "../../lib/SaveMapOffline.jsx";

/* manageAreasOpen? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
interface ManageAreasSheetDbState { route_count?: number | null }
interface ManageAreasSheetCountry { id: string; name: string }
export interface ManageAreasSheetProps {
  areaMatchCount: (areaId: string) => number;
  /** State name to its catalog row (the database path). */
  dbStateByName: Record<string, ManageAreasSheetDbState | undefined>;
  /** The state being downloaded right now, if any. */
  dlBusy: string | null;
  dlTimes: Record<string, number>;
  downloadState: (name: string) => unknown;
  downloadedStates: string[] | null | undefined;
  manageCountries: ManageAreasSheetCountry[];
  manageCountry: string;
  manageStateNames: string[];
  myPins: string[];
  openRoute: (route: unknown) => void;
  pinState: (name: string, on: boolean) => unknown;
  removeState: (name: string) => unknown;
  /** The words the catalog uses for a region ("state" / "province"). */
  rwHere: { one: string };
  setManageAreasOpen: (v: boolean) => void;
  setManageCountry: (id: string) => void;
  setRouteView: (v: string) => void;
  setSelArea: (area: (typeof MOUNTAINS)[number]) => void;
  setStateJumpReq: (req: { state: ManageAreasSheetDbState; id: number }) => void;
  setTab: (tab: string) => void;
  showToast: (t: string, d?: number) => void;
  statesLoading: boolean;
  statesUnavailable: boolean;
  uid: string | null | undefined;
  updateState: (name: string) => unknown;
}
export default function ManageAreasSheet({areaMatchCount,dbStateByName,dlBusy,dlTimes,downloadState,downloadedStates,manageCountries,manageCountry,manageStateNames,myPins,openRoute,pinState,removeState,rwHere,setManageAreasOpen,setManageCountry,setRouteView,setSelArea,setStateJumpReq,setTab,showToast,statesLoading,statesUnavailable,uid,updateState}: ManageAreasSheetProps){
  return <div style={{position:"fixed",inset:0,zIndex:200,background:C.bg,overflowY:"auto",overscrollBehavior:"contain",maxWidth:520,margin:"0 auto",boxSizing:"border-box"}} role="dialog" aria-modal="true" aria-label="Manage areas"><div style={{position:"sticky",top:0,background:C.bg,borderBottom:"1px solid "+C.border,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,zIndex:1,maxWidth:520,margin:"0 auto"}}><button onClick={function(){setManageAreasOpen(false);}} style={POP_BACK}>← Back</button><span style={{fontSize:16,fontWeight:800}}>Manage areas</span></div><div style={{padding:16,maxWidth:520,margin:"0 auto"}}><div style={{fontSize:12.5,color:C.textMuted,marginBottom:14,lineHeight:1.5}}>{"Every "+rwHere.one+" can be browsed while you have signal. "}{uid?"Pinning a "+rwHere.one+" downloads it: the full catalog — areas, climbs, gear, hazards, plus recent trip reports and corrections — is saved on this device and keeps working with no signal. The pin follows your account, so it downloads on any device you sign in on, and unpinning removes it from this one.":"Downloading a "+rwHere.one+" saves the full catalog — areas, climbs, gear, hazards, plus recent trip reports and corrections — on this device so it keeps working with no signal, with a one-tap shortcut from Home. Sign in to pin it to your account."}</div>{manageCountries.length>1?<div role="group" aria-label="Country" style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{manageCountries.map(function(c){const on=c.id===manageCountry;return <button key={c.id} onClick={function(){setManageCountry(c.id);}} aria-pressed={on} style={{padding:"7px 12px",borderRadius:14,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{c.name}</button>;})}</div>:null}{manageStateNames.map(function(nm){const dl=(downloadedStates||[]).indexOf(nm)>=0,busy=dlBusy===nm,pinned=myPins.indexOf(nm)>=0;const dbSt=dbStateByName[nm];const st=MOUNTAINS.find(function(m){return m.areaType==="state"&&m.name===nm;});const cnt=USE_DB?(dbSt?(dbSt.route_count||0):0):(st?areaMatchCount(st.id):0);const openState=function(){if(!cnt)return;setManageAreasOpen(false);setTab("routes");if(dbSt)setStateJumpReq({state:dbSt,id:Date.now()});else if(st){setSelArea(st);setRouteView("areas");}};/* The row is NOT the button: its Refresh / Pin / Download buttons would be controls nested inside a control (axe nested-interactive, 49 rows). The name block opens the state; the buttons sit beside it. */return <div key={nm} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",background:C.card,border:"1px solid "+(dl?C.blue+"66":C.border),borderRadius:12,marginBottom:8,opacity:cnt||statesLoading?1:0.6}}><div {...(cnt?clickable(openState):{})} style={{flex:1,minWidth:0,cursor:cnt?"pointer":"default",alignSelf:"stretch",display:"flex",flexDirection:"column",justifyContent:"center"}}><div style={{fontSize:14,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:5}}>{uid&&pinned?<ActionIcon name="pin" size={13} color={C.blue}/>:null}{nm}</div><div style={{fontSize:11.5,color:C.textMuted}}>{stateCatalogLine(cnt,nm,statesUnavailable,dl?" · "+(uid&&pinned?"pinned, ":"")+"downloaded "+fmtAgo(dlTimes[nm]):(uid&&pinned?" · pinned, not on this device yet":""),statesLoading)}</div></div>{!cnt?null:dl?<div style={{display:"flex",gap:12,flexShrink:0}}><button onClick={function(e){e.stopPropagation();updateState(nm);}} disabled={busy} style={{flexShrink:0,background:C.blueBg,color:C.onSolid,border:"1px solid "+C.blueDim,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?"Working…":"Refresh"}</button><button onClick={function(e){e.stopPropagation();if(uid){pinState(nm,false);return;}askConfirm({title:"Remove "+nm+" from this device?",body:"Its offline catalog is deleted. You can download it again later.",confirmLabel:"Remove download"}).then(function(ok){if(ok)removeState(nm);});}} disabled={busy} title={uid?"Unpin "+nm+" and delete its catalog from this device":"Delete "+nm+"'s catalog from this device"} style={{flexShrink:0,background:"transparent",color:C.textMuted,border:"1px solid "+C.border,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:busy?"default":"pointer"}}>{uid?"Unpin":"Remove"}</button></div>:<button onClick={function(e){e.stopPropagation();if(uid)pinState(nm,true);else downloadState(nm);}} disabled={busy} style={{...BTN_SM,flexShrink:0,background:C.blueSolid,color:C.onSolid,border:"none",cursor:busy?"default":"pointer"}}>{busy?"Downloading…":uid&&!pinned?"Pin & download":"Download"}</button>}</div>;})}{USE_DB?<SavedRouteMaps notify={showToast} onOpen={function(r: unknown){setManageAreasOpen(false);openRoute(r);}}/>:null}</div></div>;
}
