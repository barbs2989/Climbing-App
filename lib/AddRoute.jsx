// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
import { ACCESS_KEYS, ROAD_KEYS, TIMING_KEYS } from "./objKeys";
import { USE_DB } from "./supabase";
import { clickable } from "./clickable";
import { submitContribution, useAreaChildren, useRouteSearch } from "./db";
import { searchMatches } from "./search";
import { useCallback, useMemo, useState } from "react";
import { ADDR_COMMIT, ADDR_GRADES, ADDR_HAZ, ADDR_STYLE, C, CAT, DISC, DbAreaPicker, DiscIcon, ItineraryEditor, Lbl, MOUNTAINS, ROUTES, areaPathNames, blankItinDay, fuzzyMatch, hlMatch, itinDraftToStructured, uImp } from "../ClimbMatchCore.jsx";
import { POP_CLOSE, POP_REMOVE_MEDIA } from "./popupChrome.js";

export default function AddRoute({onClose,defaultArea,defaultAreaName,dbAreaId,session,onSubmit,onAddRoute}){
  // Until now this form persisted NOTHING. `onSubmit` pushed a row into React state and
  // `onAddRoute` pushed into the in-memory ROUTES array — and only `if(areaId)`, where
  // areaId is a SEED MOUNTAINS id, so from a DB area page it did not even do that. The
  // climber got "Submitted for review" over a proposal that died on refresh.
  // It now files a `new_route` row in `contributions`, the same ledger every field edit
  // already uses. Measured against the live DB 2026-08-09: signed-in INSERT returns 201
  // with `contributor` stamped from the JWT, anon INSERT returns 401/42501, and the
  // 4000-char cap on `value` is live — so photos are counted, never embedded.
  const uid=(USE_DB&&session&&session.user)?session.user.id:null;
  const [saveErr,setSaveErr]=useState("");const [saving,setSaving]=useState(false);
  const [cat,setCat]=useState("");const [sub,setSub]=useState("");const disc=cat==="rock"?(sub==="bouldering"?"bouldering":(sub?"rock":"")):cat;
  const [path,setPath]=useState(()=>{if(!defaultArea)return [];const chain=[];let m=MOUNTAINS.find(x=>x.id===defaultArea);while(m){chain.unshift(m.id);if(m.areaType==="state")break;m=m.parentId?MOUNTAINS.find(x=>x.id===m.parentId):null;}return chain;});const [newArea,setNewArea]=useState(defaultAreaName||"");
  const [areaQ,setAreaQ]=useState("");
  /* The DB destination, kept BESIDE the seed `path` rather than replacing it: seed mode is
     still a supported build (check:bare, and every render guard that runs with no database)
     and the seed picker is the one that works there.
     Leaf-ness is read HERE rather than reported up from the picker, so it is ordinary render
     state: the picker asks the same query key, and react-query serves both from one fetch. */
  const [dbChain,setDbChain]=useState([]);
  const dbArea=dbChain.length?dbChain[dbChain.length-1]:null;
  const dbKidsQ=useAreaChildren(dbArea?dbArea.id:null,{enabled:!!(USE_DB&&dbArea)});
  /* A FAILED children read leaves leaf-ness UNKNOWN, and unknown is not "leaf". Letting the
     submit through here would file a proposal against an area that may be a container, which
     approve_new_route refuses — so this keeps the button shut and the picker says the check
     did not complete rather than claiming the area holds other areas. */
  const dbAreaKidsUnavailable=!!(USE_DB&&dbArea&&dbKidsQ&&dbKidsQ.isError);
  const dbSettled=!!dbArea&&!dbKidsQ.isLoading&&!dbAreaKidsUnavailable;
  const dbAreaOk=dbSettled&&!(dbKidsQ.data||[]).length;
  const chainTo=id=>{const chain=[];let m=MOUNTAINS.find(x=>x.id===id);while(m){chain.unshift(m.id);if(m.areaType==="state")break;m=m.parentId?MOUNTAINS.find(x=>x.id===m.parentId):null;}return chain;};
  const leafAreas=useMemo(()=>MOUNTAINS.filter(m=>m.areaType!=="world"&&m.areaType!=="country"&&m.areaType!=="state"&&!MOUNTAINS.some(x=>x.parentId===m.id)),[]);
  const areaHits=areaQ.trim().length>=2?leafAreas.filter(m=>fuzzyMatch(areaQ,m.name+" "+areaPathNames(m.id))).slice(0,8):[];
  const [name,setName]=useState("");const [grade,setGrade]=useState("");const [pitch,setPitch]=useState("");
  const [height,setHeight]=useState(""),[gain,setGain]=useState(""),[dist,setDist]=useState("");
  const [rock,setRock]=useState(""),[aspect,setAspect]=useState(""),[season,setSeason]=useState(""),[commit,setCommit]=useState(""),[descent,setDescent]=useState("");
  const [style,setStyle]=useState([]),[haz,setHaz]=useState([]);
  // The audit that prompted this: AddRoute offered 13 distinct fields across ALL nine
  // disciplines while SuggestFix offers 49 and the merge allow-list SS accepts 53 — and
  // the tailoring ran backwards, `rock` getting 10 fields against alpine's 8. These are
  // the discipline-differentiating ones that were missing entirely. Every key here is in
  // SS, so the merge can actually apply it; check:add-route-fields holds that.
  const [protRating,setProtRating]=useState(""),[fa,setFa]=useState(""),[crux,setCrux]=useState("");
  const [landing,setLanding]=useState(""),[startType,setStartType]=useState("");
  const [rap,setRap]=useState(""),[turn,setTurn]=useState("");
  const [comms,setComms]=useState(""),[loss,setLoss]=useState(""),[overview,setOverview]=useState(""),[face,setFace]=useState(""),[ropeType,setRopeType]=useState(""),[ropeNote,setRopeNote]=useState(""),[ascender,setAscender]=useState(""),[whatToBring,setWhatToBring]=useState(""),[watchOut,setWatchOut]=useState(""),[objHaz,setObjHaz]=useState("");
  const [bestSeason,setBestSeason]=useState(""),[outingShape,setOutingShape]=useState(""),[rappelCountNote,setRappelCountNote]=useState(""),[alpineDraws,setAlpineDraws]=useState(""),[rack,setRack]=useState("");
  /* pitch_detail is the one field here that is a LIST OF OBJECTS rather than a value, so it
     gets a row builder. The keys and their weights are measured, not guessed — over 1,155
     live entries: notes 100%, pitch 99.7%, grade 99.0%, lengthM 32.4%, and crux/anchor/bolts
     around 27% each. The builder offers the first four. Seven inputs per row would not survive
     a 390px phone, which check:overflow guards, and the long tail can be filled in later
     through SuggestFix, which already has a pitch builder for an existing route.
     `pitch` is a LABEL, not a number: on walk-ups these entries are STAGES ("Trailhead to
     Yellow Aster meadows"), which is why adding rows here deliberately does NOT touch the
     pitch COUNT. */
  /* road / access / timing are jsonb OBJECTS and all three are the same shape: a fixed list of
     [key, label, placeholder] rows. One builder drives all three off the SHARED lists in
     lib/objKeys.js — the same lists SuggestFix uses — so the two forms cannot drift on which
     sub-key is canonical. That matters most for `access`, which carries two spellings of the
     land manager and only one is what the panel reads first.
     Stored as the object minus empty values, or null when the climber filled none in: an object
     of empty strings would make a route look documented and would satisfy the 3-agree gate on
     nothing at all. */
  const [objVals,setObjVals]=useState({road:{},access:{},timing:{}});
  /* itinerary reuses ItineraryEditor and itinDraftToStructured verbatim — both are module-level
     in this file and already drive the crew planner and SuggestFix. Rebuilding a day editor here
     would be a second one to keep in step, which is the drift this repo keeps paying for.
     itinDraftToStructured already drops days with nothing in them, so an untouched builder
     yields no days and this submits null rather than {days:[]} — an empty itinerary would read
     as a documented plan with no days rather than as no plan. */
  const [itinDraft,setItinDraft]=useState({days:[blankItinDay()]});
  const cleanItin=function(){var st=itinDraftToStructured(itinDraft);return (st&&st.days&&st.days.length)?st:null;};
  const setObjAt=function(field,k,v){setObjVals(function(p){var o=Object.assign({},p);o[field]=Object.assign({},o[field]);o[field][k]=v;return o;});};
  const cleanObj=function(field){var src=objVals[field]||{},o={};Object.keys(src).forEach(function(k){var v=String(src[k]==null?"":src[k]).trim();if(v)o[k]=v;});return Object.keys(o).length?o:null;};
  const OBJ_LISTS={road:ROAD_KEYS,access:ACCESS_KEYS,timing:TIMING_KEYS};
  const [pitchRows,setPitchRows]=useState([]);
  const setPitchAt=function(i,k,v){setPitchRows(function(p){var o=p.slice();o[i]=Object.assign({},o[i]);o[i][k]=v;return o;});};
  const addPitchRow=function(){setPitchRows(function(p){return p.concat([{pitch:"",grade:"",lengthM:"",notes:""}]);});};
  const removePitchRow=function(i){setPitchRows(function(p){return p.filter(function(_,j){return j!==i;});});};
  /* Empty rows and empty keys are dropped, so an accidental "+ Add pitch" cannot write
     {pitch:"",grade:"",...} into the column and make a route look documented when it is not. */
  const cleanPitches=function(){return pitchRows.map(function(r){var o={};["pitch","grade","notes"].forEach(function(k){if(String(r[k]||"").trim())o[k]=String(r[k]).trim();});var lm=parseFloat(r.lengthM);if(isFinite(lm)&&lm>0)o.lengthM=lm;return o;}).filter(function(o){return Object.keys(o).length;});};
  /* These three are LISTS on the way out, not strings, and the difference is not cosmetic.
     `whatToBring` and `watchOut` are read as `route.X.join("\n")` behind a `route.X && route.X.length`
     guard — and a non-empty STRING passes that guard, then `.join` throws. So a string here does not
     render thinly, it breaks the route page. `objHaz` is read tolerantly
     (`Array.isArray(x)?x:(x?[x]:[])`) but is a list conceptually, so it goes the same way.
     One item per line, which is exactly how SuggestFix's `type:"long"` boxes for these already
     read back (`join("\n")`). `linesOf` is the conversion, applied in BOTH exits below — AddRoute
     has no CONV on either path, so nothing else will do it. */
  const linesOf=function(s){return String(s||"").split("\n").map(function(x){return x.trim();}).filter(Boolean);};
  /* The form asks in the SUBMITTER's units and canonicalises here, once. Everything else in
     the app renders through uElev/uDist, so a metric climber met four inputs hard-labelled
     (ft) and (mi) and had to convert by hand — and a number typed as metres into a field the
     approval reads as feet is wrong by 3.28x with nothing to catch it.

     CANONICAL IS WHAT approve_new_route READS, which is NOT what SuggestFix's CANON uses:
       length / gain / loss -> FEET   (0143: length_m = round(len * 0.3048), gain_ft = gain)
       dist                 -> MILES  (0143: dist_km = round(dist * 1.609344, 3))
     SuggestFix canonicalises dist to KM and gain to METRES for the same field names. The two
     paths genuinely disagree; do not "align" one to the other without changing its reader.

     Converted in ONE place and reused by both exits. Converting again downstream is exactly
     the 3.28x corruption the CONV comment in ClimbMatch.jsx warns about. */
  const _num=function(v){var n=parseFloat(v);return isFinite(n)?n:null;};
  const canonFt=function(v){var n=_num(v);return n==null?null:(uImp()?n:n*3.28084);};
  const canonMi=function(v){var n=_num(v);return n==null?null:(uImp()?n:n/1.60934);};
  const uEl=uImp()?"ft":"m", uDi=uImp()?"mi":"km";
  const [gear,setGear]=useState({qd:0,screws:0,pads:0,cams:{},nuts:{},items:[]});
  const [desc,setDesc]=useState("");
  const [photos,setPhotos]=useState([]),[coverIdx,setCoverIdx]=useState(0);
  const [climbed,setClimbed]=useState(false),[attest,setAttest]=useState(false),[sent,setSent]=useState(false);
  const byName=(a,b)=>(a.name||"").localeCompare(b.name||"");
  const kidsOf=useCallback(pid=>MOUNTAINS.filter(m=>m.parentId===pid).sort(byName),[]);
  const states=useMemo(()=>MOUNTAINS.filter(m=>m.areaType==="state").sort(byName),[]);
  const nameOf=id=>(MOUNTAINS.find(m=>m.id===id)||{}).name||"";
  const areaId=path.length?path[path.length-1]:"";
  /* In DB mode the destination is the picked catalog area; in seed mode it is the seed chain,
     unchanged. `dbAreaOk` is what keeps the submit honest — a proposal with no area_id is
     refused outright by approve_new_route, so offering the button would promise a review that
     cannot happen. */
  const areaName=newArea.trim()?newArea.trim():(USE_DB?(dbArea?dbArea.name:""):(areaId?nameOf(areaId):""));
  const locOk=USE_DB?(dbAreaOk||!!newArea.trim()):(!!areaId||!!newArea.trim());
  const FIELDS={rock:["grade","pitches","height","rock","aspect","style","season","descent","haz","protRating","fa","crux","rap","overview","face","ropeType","ropeNote","whatToBring","watchOut","bestSeason","rappelCountNote","rack","pitchDetail","road","access"],bouldering:["grade","height","rock","style","season","haz","landing","startType","fa","crux","overview","whatToBring","watchOut","bestSeason","road","access"],ice:["grade","pitches","height","aspect","season","haz","descent","rap","commit","turn","fa","overview","face","ropeType","ropeNote","whatToBring","watchOut","objHaz","bestSeason","rappelCountNote","alpineDraws","rack","pitchDetail","road","access","timing","itinerary"],mixed:["grade","pitches","height","aspect","season","haz","descent","rap","commit","turn","protRating","fa","overview","face","ropeType","ropeNote","whatToBring","watchOut","objHaz","bestSeason","rappelCountNote","alpineDraws","rack","pitchDetail","road","access","timing","itinerary"],aid:["grade","pitches","height","aspect","haz","season","descent","rap","fa","crux","overview","face","ropeType","ropeNote","ascender","whatToBring","watchOut","bestSeason","rappelCountNote","rack","pitchDetail","road","access"],alpine:["grade","gain","loss","dist","commit","aspect","season","descent","haz","height","rap","turn","comms","protRating","fa","crux","overview","face","ropeType","ropeNote","whatToBring","watchOut","objHaz","bestSeason","outingShape","rappelCountNote","alpineDraws","rack","pitchDetail","road","access","timing","itinerary"],mountaineering:["grade","gain","loss","dist","commit","season","haz","aspect","descent","turn","comms","rap","overview","face","ropeType","ropeNote","whatToBring","watchOut","objHaz","bestSeason","outingShape","rappelCountNote","rack","pitchDetail","road","access","timing","itinerary"],scrambling:["grade","gain","loss","dist","season","haz","aspect","descent","turn","comms","overview","whatToBring","watchOut","objHaz","bestSeason","outingShape","pitchDetail","road","access","timing","itinerary"],hiking:["gain","loss","dist","season","haz","turn","comms","overview","whatToBring","watchOut","bestSeason","outingShape","road","access","timing","itinerary"]};
  const sf=k=>disc&&(FIELDS[disc]||[]).indexOf(k)>=0;
  const GSEC=disc==="rock"?(sub==="trad"?["qd","cams","nuts"]:["qd"]):(disc==="bouldering"?["pads"]:({ice:["screws"],mixed:["qd","screws","cams"],aid:["cams","nuts"],alpine:["cams","nuts","screws"],mountaineering:["screws"]}[disc]||[]));const gsec=k=>disc&&GSEC.indexOf(k)>=0;
  const OTHER={rock:["60m rope","70m rope","Helmet","Belay device","Nut tool","Alpine draws","Long slings","Stick clip","Approach shoes"],bouldering:["Brush","Chalk","Tape","Approach shoes"],ice:["60m rope","Half ropes","Helmet","Ice tools","Crampons","V-thread tool","Belay device"],mixed:["60m rope","Helmet","Ice tools","Crampons","Belay device","Long slings"],aid:["Aiders / etriers","Hooks","Pitons / beaks","Nut tool","Helmet","Daisy chains"],alpine:["60m rope","Half ropes","Helmet","Crampons","Ice axe","Pickets","Belay device"],mountaineering:["Crampons","Ice axe","Pickets","Helmet","Rope","Beacon · probe · shovel"],scrambling:["Helmet","Approach shoes","Light rope"],hiking:["Trekking poles","Navigation","Bear spray","Headlamp"]};
  const CAMS=[".2",".3",".4",".5",".75","1","2","3","4","5","6"];const NUTS=["Brass","Micro","Small","Med","Large"];
  const gradeScale=disc?(ADDR_GRADES[disc]||[]):[];const otherList=disc==="rock"?(sub==="sport"?["60m rope","70m rope","Helmet","Belay device","Stick clip","Approach shoes"]:["60m rope","70m rope","Helmet","Belay device","Nut tool","Alpine draws","Long slings","Cordelette","Approach shoes"]):(OTHER[disc]||[]);
  const rockDisc=disc==="rock"||disc==="bouldering";
  const setCount=(k,v)=>setGear(g=>Object.assign({},g,{[k]:Math.max(0,v)}));
  const setSize=(kind,sz,v)=>setGear(g=>{const o=Object.assign({},g[kind]);if(v<=0)delete o[sz];else o[sz]=v;return Object.assign({},g,{[kind]:o});});
  const togItem=v=>setGear(g=>Object.assign({},g,{items:g.items.indexOf(v)>=0?g.items.filter(x=>x!==v):g.items.concat([v])}));
  const tog=(arr,setArr,v)=>setArr(arr.indexOf(v)>=0?arr.filter(x=>x!==v):arr.concat([v]));
  const dbDupeSearch=useRouteSearch(USE_DB&&name.trim().length>=3?name.trim():"");
  const dupes=name.trim().length>=3?(function(){var seedD=ROUTES.filter(r=>searchMatches(name,r.name||""));return seedD.concat((dbDupeSearch.data||[]).filter(d=>!seedD.some(s=>s.id===d.id))).slice(0,3);})():[];
  const gearAny=gear.qd||gear.screws||gear.pads||Object.keys(gear.cams).length||Object.keys(gear.nuts).length||gear.items.length;
  const checks=[!!name.trim(),locOk,!!disc,sf("grade")?!!grade:null,sf("pitches")?!!pitch:null,sf("height")?!!height:null,sf("gain")?!!gain:null,sf("loss")?!!loss:null,sf("dist")?!!dist:null,sf("aspect")?!!aspect:null,sf("season")?!!season:null,sf("descent")?!!descent.trim():null,sf("commit")?!!commit:null,sf("protRating")?!!protRating:null,sf("rap")?!!rap:null,sf("road")?!!cleanObj("road"):null,sf("access")?!!cleanObj("access"):null,sf("timing")?!!cleanObj("timing"):null,sf("itinerary")?!!cleanItin():null,sf("landing")?!!landing:null,sf("startType")?!!startType:null,sf("turn")?!!turn:null,sf("comms")?!!comms:null,sf("fa")?!!fa:null,sf("crux")?!!crux:null,sf("overview")?!!overview.trim():null,sf("face")?!!face:null,sf("ropeType")?!!ropeType:null,sf("ropeNote")?!!ropeNote.trim():null,sf("ascender")?!!ascender:null,sf("whatToBring")?linesOf(whatToBring).length>0:null,sf("watchOut")?linesOf(watchOut).length>0:null,sf("objHaz")?linesOf(objHaz).length>0:null,sf("bestSeason")?!!bestSeason.trim():null,sf("outingShape")?!!outingShape:null,sf("rappelCountNote")?!!rappelCountNote.trim():null,sf("alpineDraws")?!!alpineDraws:null,sf("rack")?linesOf(rack).length>0:null,sf("pitchDetail")?cleanPitches().length>0:null,sf("style")?style.length>0:null,sf("haz")?haz.length>0:null,gearAny?1:0,!!desc.trim(),photos.length>0,climbed];
  /* A field the chosen discipline never asks for belongs in NEITHER half of the fraction. Every
     `sf("x")?…:1` used to count it as SATISFIED, so an untouched form read 85% — survivable while
     the meter was vaguely labelled "trust score potential", and simply false under a label that
     says how complete this is. Non-applicable is `null` and drops out of the denominator.
     The trailing `.map(Boolean)` had to go with it: it coerced those nulls to `false`, which
     would have inverted the defect and counted unasked-for fields as MISSING. `filter(Boolean)`
     below treats 1 and true alike, so nothing else needed it. */
  const _applicable=checks.filter(function(c){return c!==null;}),pct=_applicable.length?Math.round(_applicable.filter(Boolean).length/_applicable.length*100):0;
  const ready=name.trim()&&locOk&&disc&&attest;const need=!name.trim()?"Add a climb name":!locOk?"Pick or name an area":!disc?"Pick a discipline":!attest?"Confirm the details are accurate":"";
  const fld={width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none"};
  const sel={width:"100%",padding:"11px 34px 11px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none",WebkitAppearance:"none",appearance:"none",cursor:"pointer"};
  const lab={fontSize:12,fontWeight:800,letterSpacing:0.3,textTransform:"uppercase",color:C.text,margin:"13px 0 6px"};
  const grp={fontSize:13,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",color:C.text,borderLeft:"3px solid "+C.blue,paddingLeft:9,margin:"20px 0 2px"};
  const chip=on=>({padding:"7px 13px",borderRadius:18,border:"1.5px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:13,fontWeight:600,cursor:"pointer"});
  const sm=on=>({padding:"8px 12px",borderRadius:15,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"});
  const stepBtn={width:36,height:36,border:"1px solid "+C.border,background:C.card,color:C.blue,fontSize:17,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};
  const Stepper=(label,val,onCh)=><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"7px 8px 7px 13px",borderRadius:11,border:"1px solid "+(val?C.blue:C.border),background:val?C.blueBg:C.surface,marginBottom:8}}><span style={{fontSize:13.5,fontWeight:700,color:val?C.blue:C.text}}>{label}</span><div style={{display:"flex",alignItems:"center",border:"1px solid "+C.border,borderRadius:9,overflow:"hidden",background:C.bg}}><button aria-label="Decrease" onClick={()=>onCh(val-1)} style={stepBtn}>{<Lbl s={"−"}/>}</button><span style={{minWidth:28,textAlign:"center",fontSize:14,fontWeight:800,color:C.text}}>{val||0}</span><button aria-label="Increase" onClick={()=>onCh(val+1)} style={stepBtn}>{"+"}</button></div></div>;
  const Sized=(label,sizes,kind)=>{const obj=gear[kind];const total=Object.keys(obj).reduce((s,k)=>s+obj[k],0);return <div style={{marginBottom:4}}><div style={lab}>{label}<span style={{textTransform:"none",fontWeight:600,color:C.textMuted,letterSpacing:0}}>{total?" · "+total+" total":" · tap a size"}</span></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{sizes.map(sz=>{const n=obj[sz]||0;return <div key={sz} style={{display:"flex",alignItems:"center",borderRadius:15,border:"1px solid "+(n?C.blue:C.border),background:n?C.blueBg:C.surface,overflow:"hidden"}}>{n?<span {...clickable(()=>setSize(kind,sz,n-1))} style={{padding:"5px 9px",fontSize:15,color:C.blue,cursor:"pointer",lineHeight:1}}>{<Lbl s={"−"}/>}</span>:null}<span {...clickable(()=>setSize(kind,sz,n+1))} style={{padding:"6px 11px",fontSize:12.5,fontWeight:700,color:n?C.blue:C.textSub,cursor:"pointer"}}>{sz+(n?" ×"+n:"")}</span></div>;})}</div></div>;};
  const cascade=(()=>{const out=[{opts:states,val:path[0]||"",lvl:0,ph:"Choose a state"}];for(let i=0;i<path.length;i++){const kids=kidsOf(path[i]);if(kids.length)out.push({opts:kids,val:path[i+1]||"",lvl:i+1,ph:"Choose in "+nameOf(path[i])+"…"});}return out;})();
  const TwoCol=(a,b)=><div style={{display:"flex",gap:8}}>{a}{b}</div>;
  const numF=(key,label,ph,val,setV,wrap)=>{const el=<div style={{flex:1}}><div style={lab}>{label}</div><input aria-label={label} value={val} onChange={e=>setV(e.target.value.replace(/[^0-9.]/g,""))} inputMode="decimal" placeholder={ph} style={fld}/></div>;return wrap?el:<div style={{marginBottom:0}}>{el}</div>;};
  return <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Add a climb" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:900,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 12px",overflowY:"auto",overscrollBehavior:"contain"}}>
  <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:460,border:"1px solid "+C.border,overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"92vh"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid "+C.border,flexShrink:0}}><div style={{fontSize:16,fontWeight:800}}>{sent?"Submitted for review":"Add a climb"}</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button></div>
  <div style={{minHeight:0,padding:16,overflowY:"auto",flex:1}}>{sent?<div><div style={{fontSize:40,textAlign:"center",marginBottom:8}}>{"✓"}</div><div style={{fontSize:14,color:C.text,lineHeight:1.6,marginBottom:6,textAlign:"center"}}><b>{"“"+(name||"Your climb")+"”"}</b>{" in "+(areaName||"the area you chose")+" is in the review queue."}</div><div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginBottom:14}}>{pct+"% complete · the more detail, the higher its trust score once verified."}</div><div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",marginBottom:14,lineHeight:1.5,padding:"0 6px"}}>{(uid?"It is filed against your account and visible to other climbers, but it does not appear as a route on the map until a moderator promotes it.":"It was filed anonymously and is visible to other climbers, but it does not appear as a route on the map until a moderator promotes it.")}</div><button onClick={onClose} style={{width:"100%",padding:12,background:C.blueSolid,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>{"Done"}</button></div>:<div>
  <div style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,letterSpacing:0.3,color:C.textSub,marginBottom:4}}><span>{"HOW COMPLETE THIS IS"}</span><span style={{color:pct>=70?C.green:pct>=40?C.amber:C.textMuted}}>{pct+"%"}</span></div><div style={{height:7,borderRadius:4,background:C.borderLight,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:pct>=70?C.green:pct>=40?C.amber:C.blueSolid,borderRadius:4,transition:"width .2s"}}></div></div><div style={{fontSize:12,color:C.textMuted,marginTop:5,lineHeight:1.5}}>{"Only the basics are required. Everything else is optional — the more you fill in, the more useful the route page is."}</div></div>
  <div style={grp}>{"1 · Discipline"}</div><div style={{fontSize:12,color:C.textMuted,margin:"3px 0 8px"}}>{"Pick the type — the form adapts to it."}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["trad","sport","toprope","bouldering","ice","mixed","aid","alpine","mountaineering","scrambling"].map(k=>{/* No "Rock" type (owner decision): the four crag types are picked directly, and still set the form's internal cat "rock" + sub so its crag fields apply. */const crag=k==="trad"||k==="sport"||k==="toprope"||k==="bouldering";const on=crag?(cat==="rock"&&sub===k):cat===k;const d=CAT[k];return <button key={k} onClick={()=>{setCat(crag?"rock":k);setSub(crag?k:"");setGrade("");setGear({qd:0,screws:0,pads:0,cams:{},nuts:{},items:[]});}} style={Object.assign({},chip(on),on?{borderColor:d.color,background:d.bg,color:d.color}:{})}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><DiscIcon d={k} size={14} color={d.color}/>{d.label}</span></button>;})}</div>
  {disc?<div><div style={grp}>{"2 · Where is it?"}</div><div style={{fontSize:12,color:C.textMuted,margin:"3px 0 8px"}}>{"Search for the crag or peak, or drill down country → state → exact crag below."}</div>{USE_DB?<DbAreaPicker chain={dbChain} onChain={setDbChain} sel={sel} fld={fld} seedAreaId={dbAreaId} isLeaf={dbAreaOk} settled={dbSettled} kidsUnavailable={dbAreaKidsUnavailable}/>:<><div style={{position:"relative",marginBottom:8}}><input aria-label="Search for a crag or peak" value={areaQ} onChange={e=>setAreaQ(e.target.value)} placeholder="Search for a crag or peak…" style={fld}/>{areaHits.length?<div style={{marginTop:4,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden",background:C.surface}}>{areaHits.map(m=><div key={m.id} {...clickable(()=>{setPath(chainTo(m.id));setNewArea("");setAreaQ("");})} style={{padding:"9px 12px",cursor:"pointer",borderBottom:"1px solid "+C.borderLight}}><div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{hlMatch(m.name,areaQ)}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:1}}>{chainTo(m.id).slice(0,-1).map(nameOf).join(" › ")}</div></div>)}</div>:null}</div>{cascade.map(s=><div key={s.lvl} style={{position:"relative",marginBottom:7}}><select aria-label={"Area level "+(s.lvl+1)} value={s.val} onChange={e=>{const v=e.target.value;setPath(p=>p.slice(0,s.lvl).concat(v?[v]:[]));setNewArea("");}} style={sel}><option value="">{s.ph}</option>{s.opts.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>)}{path.length?<div style={{fontSize:12,color:C.green,fontWeight:600,margin:"2px 0 4px"}}>{<Lbl s={"📍 "+path.map(nameOf).join(" › ")}/>}</div>:null}</>}<input aria-label="Crag not listed? Type a new one to add it" value={newArea} onChange={e=>{setNewArea(e.target.value);}} placeholder="Crag not listed? Type a new one to add it…" style={Object.assign({},fld,{marginTop:4})}/>{newArea.trim()?<div style={{fontSize:11.5,color:C.amber,marginTop:5,lineHeight:1.5}}>{<Lbl s={"⊕ New crag — a moderator has to create the area before this climb can go live, so it takes longer than adding to a crag that is already listed."}/>}</div>:null}
  <div style={grp}>{"3 · Route name"}</div><input aria-label="Route name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Northeast Ridge" style={Object.assign({},fld,{marginTop:6})}/>{dupes.length?<div style={{fontSize:12,color:C.amber,marginTop:6,lineHeight:1.5,background:C.amberBg,border:"1px solid "+C.amber+"44",borderRadius:9,padding:"8px 11px"}}>{"Possible match: "+dupes.map(r=>r.name).join(", ")+". If it's the same line, add your beta there instead."}</div>:null}
  <div style={grp}>{"4 · The climb"}</div>{sf("grade")?<div><div style={lab}>{"Grade"}</div>{gradeScale.length?<div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"2px 0"}}>{gradeScale.map(g=>{const on=grade===g;return <button key={g} onClick={()=>setGrade(on?"":g)} style={sm(on)}>{g}</button>;})}</div>:<input aria-label="Grade" value={grade} onChange={e=>setGrade(e.target.value)} placeholder="Grade" style={fld}/>}</div>:null}
  {/* A NUMBER, because that is what the column holds. This was two chips writing "single"/"multi",
     and `approve_new_route` runs the value through `proposal_num(...)::int` — which returns NULL for
     anything non-numeric — so a REQUIRED question stored nothing on the DB path, and the seed path's
     `parseInt(pitch)||1` made every multi-pitch route 1 pitch. Same class as the Approach bucket keys
     removed in #1713: check:add-route-fields asks whether a field is STORABLE, never whether the value
     FITS the column. Integers only — `proposal_num` refuses a decimal pitch count anyway. */}
  {sf("pitches")?<div><div style={lab}>{"Pitches"}</div><input aria-label="Pitches" value={pitch} onChange={e=>setPitch(e.target.value.replace(/[^0-9]/g,""))} inputMode="numeric" placeholder="How many pitches" style={fld}/></div>:null}
  {(function(){/* ONE list, laid out two per row, rather than a hand-rolled pair of nested
     ternaries. The old version had slots for height, gain and dist and NONE for `loss` — so
     alpine, mountaineering, scrambling and hiking each declared a field the form never drew.
     Two things followed, and the second is why this is a bug rather than a missing feature:
     `loss` was submitted as null forever, and `checks` counts `sf("loss")?!!loss:1`, so the
     completeness meter could never reach 100% on those four disciplines no matter what the
     climber filled in. Driving the layout off the same sf() gate the rest of the form uses
     means a field can no longer be declared without being drawn. */
    var nums=[];
    if(sf("height"))nums.push(["h","Height / length ("+uEl+")",uImp()?"e.g. 600":"e.g. 180",height,setHeight]);
    if(sf("gain"))nums.push(["g","Elevation gain ("+uEl+")",uImp()?"e.g. 4100":"e.g. 1250",gain,setGain]);
    if(sf("loss"))nums.push(["l","Elevation loss ("+uEl+")",uImp()?"e.g. 4100":"e.g. 1250",loss,setLoss]);
    if(sf("dist"))nums.push(["d","Distance ("+uDi+")",uImp()?"e.g. 9.5":"e.g. 15",dist,setDist]);
    if(!nums.length)return null;
    var rows=[];
    for(var i=0;i<nums.length;i+=2){var a=nums[i],b=nums[i+1];
      rows.push(<div key={"num"+a[0]}>{TwoCol(numF(a[0],a[1],a[2],a[3],a[4],1),b?numF(b[0],b[1],b[2],b[3],b[4],1):<div style={{flex:1}}/>)}</div>);}
    return <div>{rows}</div>;})()}
  {/* "Face / route-group" is SuggestFix's own label for this column, reused verbatim so the two
     forms name one thing the same way. It is NOT "Aspect" below it: aspect is the compass
     direction the rock points, this is which named face or route-group the line belongs to
     (`route.face` renders in its own card on the route page). */}
  {sf("face")?<div><div style={lab}>{"Face / route-group"}</div><input aria-label="Face / route-group" value={face} onChange={function(e){setFace(e.target.value);}} placeholder="Which face or group of routes this line is on — e.g. North Face, Beckey Wall" style={fld}/></div>:null}
  {sf("rock")?<div><div style={lab}>{"Rock type"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Granite","Limestone","Sandstone","Quartzite","Basalt","Gneiss"].map(r=>{const on=rock===r;return <button key={r} onClick={()=>setRock(on?"":r)} style={sm(on)}>{r}</button>;})}</div></div>:null}
  {sf("aspect")?<div><div style={lab}>{"Aspect (faces)"}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{["N","NE","E","SE","S","SW","W","NW"].map(a=>{const on=aspect===a;return <button key={a} onClick={()=>setAspect(on?"":a)} style={sm(on)}>{a}</button>;})}</div></div>:null}
  {sf("commit")?<div><div style={lab}>{"Time commitment"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ADDR_COMMIT.map(o=>{const on=commit===o;return <button key={o} onClick={()=>setCommit(on?"":o)} style={sm(on)}>{o}</button>;})}</div></div>:null}
  {/* The Approach chips were REMOVED, not relabelled. They wrote an opaque bucket key — "u1" /
     "1to3" / "3to6" / "6plus" — into the proposal as `approach`, and approve_new_route (0135)
     inserts `v->>'approach'` straight into `routes.approach`, which is PROSE: the walk-in
     narrative the Planner renders. An approved contribution would have shown "3to6" as its
     APPROACH section. Nothing anywhere read those four keys back, so no information is lost;
     for the disciplines that need a number the form already asks `dist`. */}
{sf("road")?<div><div style={lab}>{"Road & driving"}</div><div style={{fontSize:11.5,color:C.textMuted,margin:"0 0 7px"}}>{"How you reach the trailhead, and what the road is like."}</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{OBJ_LISTS.road.map(function(k){return <div key={k[0]}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>{k[1]}</div><input aria-label={k[1]} value={(objVals.road||{})[k[0]]||""} onChange={function(e){setObjAt("road",k[0],e.target.value);}} inputMode={k[3]==="num"?"decimal":undefined} placeholder={k[2]} style={fld}/></div>;})}</div></div>:null}
  {sf("access")?<div><div style={lab}>{"Permits & land manager"}</div><div style={{fontSize:11.5,color:C.textMuted,margin:"0 0 7px"}}>{"Who manages it, what you need, and what closes when."}</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{OBJ_LISTS.access.map(function(k){return <div key={k[0]}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>{k[1]}</div><input aria-label={k[1]} value={(objVals.access||{})[k[0]]||""} onChange={function(e){setObjAt("access",k[0],e.target.value);}} inputMode={k[3]==="num"?"decimal":undefined} placeholder={k[2]} style={fld}/></div>;})}</div></div>:null}
  {sf("season")?<div><div style={lab}>{"Best season"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Spring","Summer","Fall","Winter","Year-round"].map(o=>{const on=season===o;return <button key={o} onClick={()=>setSeason(on?"":o)} style={sm(on)}>{o}</button>;})}</div></div>:null}
  {sf("bestSeason")?<div><div style={lab}>{"When it is actually in"}</div><textarea aria-label="When it is actually in" value={bestSeason} onChange={function(e){setBestSeason(e.target.value);}} rows={2} placeholder="Why that window — when the snow leaves, when the creek drops, what makes it out of condition" style={Object.assign({},fld,{resize:"vertical"})}/></div>:null}
  {/* `season` above is a WINDOW ("Jul-Sep") and renders in the header strap beside elevation;
     this is the prose that explains it and renders on Conditions. Keeping them apart is the
     whole point — a sentence written into `season` wraps over the cover photo. See the
     enrichment note in CLAUDE.md. */}
  {/* A SENTENCE, because `descentText` lands in `routes.descent_text` — the PROSE column
     descentBeta() renders as a block on the route page, and which holds a median of 530
     characters across the 1,013 live routes that populate it. This was two chips writing
     "rappel"/"walkoff", so an approved contribution would have shown a Descent card containing
     the single lowercase word "rappel". Same class as the Approach bucket keys removed in
     #1713. Nothing read those keys back — `passesFilters` reads the FINDER's own `f.descent`
     and derives from `r.rappels != null`, not from anything this control stored. */}
  {sf("descent")?<div><div style={lab}>{"Descent"}</div><textarea aria-label="Descent" value={descent} onChange={function(e){setDescent(e.target.value);}} rows={2} placeholder="How you get off — rappel or walk-off, which way, and anything easy to get wrong" style={Object.assign({},fld,{resize:"vertical"})}/></div>:null}
  {sf("outingShape")?<div><div style={lab}>{"How you get back"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["outback","Out and back"],["loop","Loop"],["point","Point to point"]].map(function(o){const on=outingShape===o[0];return <button key={o[0]} onClick={function(){setOutingShape(on?"":o[0]);}} style={sm(on)}>{o[1]}</button>;})}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:5}}>{"Out and back retraces the approach, so the app doubles your distance. On a loop or point to point it must not."}</div></div>:null}
  {/* NOT free text: the three values are a vocabulary the app computes with. `outback` means
      round trip = 2 x dist_km; `loop` and `point` mean doubling is WRONG. A typo here is a
      wrong distance on the route page, so it is chips and the stored value is the key. */}
  {sf("style")?<div><div style={lab}>{"Style / character"}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{ADDR_STYLE.map(t=>{const on=style.indexOf(t)>=0;return <button key={t} onClick={()=>tog(style,setStyle,t)} style={sm(on)}>{t}</button>;})}</div></div>:null}
  {sf("pitchDetail")?<div><div style={lab}>{"Pitch by pitch"}</div>
    <div style={{fontSize:11.5,color:C.textMuted,margin:"0 0 7px"}}>{"One row per pitch — or per stage on a walk-up. This does not change the pitch count above."}</div>
    {pitchRows.map(function(r,i){return <div key={"pr"+i} style={{border:"1px solid "+C.border,borderRadius:10,padding:9,marginBottom:8,background:C.surface}}>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
        <div style={{fontSize:11.5,fontWeight:800,color:C.textMuted,letterSpacing:0.3}}>{"PITCH "+(i+1)}</div>
        <div style={{flex:1}}/>
        <button onClick={function(){removePitchRow(i);}} aria-label={"Remove pitch "+(i+1)} style={{background:"none",border:"none",color:C.red,fontSize:12.5,fontWeight:700,padding:"2px 4px",cursor:"pointer"}}>{"Remove"}</button>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input aria-label={"Pitch "+(i+1)+" label"} value={r.pitch} onChange={function(e){setPitchAt(i,"pitch",e.target.value);}} placeholder="P1, or “Trailhead to meadows”" style={Object.assign({},fld,{flex:2})}/>
        <input aria-label={"Pitch "+(i+1)+" grade"} value={r.grade} onChange={function(e){setPitchAt(i,"grade",e.target.value);}} placeholder="5.9" style={Object.assign({},fld,{flex:1})}/>
        <input aria-label={"Pitch "+(i+1)+" length in metres"} value={r.lengthM} onChange={function(e){setPitchAt(i,"lengthM",e.target.value.replace(/[^0-9.]/g,""));}} inputMode="decimal" placeholder="m" style={Object.assign({},fld,{flex:1})}/>
      </div>
      <textarea aria-label={"Pitch "+(i+1)+" notes"} value={r.notes} onChange={function(e){setPitchAt(i,"notes",e.target.value);}} rows={2} placeholder="What the pitch is actually like, and where the belay is" style={Object.assign({},fld,{resize:"vertical",marginTop:6})}/>
    </div>;})}
    <button onClick={addPitchRow} aria-label="Add a pitch" style={{background:C.surface,border:"1.5px dashed "+C.border,borderRadius:10,color:C.blue,fontSize:13,fontWeight:800,padding:"9px 12px",width:"100%",cursor:"pointer"}}>{pitchRows.length?"+ Add another pitch":"+ Add the first pitch"}</button>
  </div>:null}
  {(gsec("qd")||gsec("cams")||gsec("nuts")||gsec("screws")||gsec("pads")||otherList.length)?<div><div style={grp}>{"5 · Gear to bring"}</div>
  {/* Rope and ascender sit in "Gear to bring" because that is where a submitter looks for them,
     and each one is shaped by how its reader consumes it:
       ropeType  renders as `Rope — <type> <length>`, so it is a SHORT closed vocabulary — chips,
                 not free text, matching the Rock type row below.
       ropeNote  feeds RopeworkBox and simulMentioned(), which regex-scans it for "simul" and
                 "moving together" — so it is PROSE and gets a textarea. Do not shorten it to a
                 chip set; the sentence is what carries the technique.
       ascender  renders as `Ascender — <value>` and its reader explicitly skips "Not needed",
                 so that exact string is offered rather than left to be typed. */}
  {sf("ropeType")?<div><div style={lab}>{"Rope"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Single","Half / double","Twin","Two ropes","No rope"].map(function(o){const on=ropeType===o;return <button key={o} onClick={function(){setRopeType(on?"":o);}} style={sm(on)}>{o}</button>;})}</div></div>:null}
  {sf("ropeNote")?<div><div style={lab}>{"Ropework notes"}</div><textarea aria-label="Ropework notes" value={ropeNote} onChange={function(e){setRopeNote(e.target.value);}} rows={2} placeholder="Rope length, whether pitches link, any simul-climbing or moving together" style={Object.assign({},fld,{resize:"vertical",fontFamily:"inherit"})}/></div>:null}
  {sf("ascender")?<div><div style={lab}>{"Ascender"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Not needed","Useful","Required"].map(function(o){const on=ascender===o;return <button key={o} onClick={function(){setAscender(on?"":o);}} style={sm(on)}>{o}</button>;})}</div></div>:null}
  {/* One per line. The label is SuggestFix's own ("Route-specific essentials") so both forms name
     the column identically, and the hint says one-per-line because that is what the reader's
     `join("\n")` implies — a comma-separated blob would render as a single bullet. */}
  {sf("alpineDraws")?<div><div style={lab}>{"Alpine draws"}</div><input aria-label="Alpine draws" value={alpineDraws} onChange={function(e){setAlpineDraws(e.target.value.replace(/[^0-9]/g,""));}} inputMode="numeric" placeholder="e.g. 8" style={fld}/></div>:null}
  {sf("rack")?<div><div style={lab}>{"Rack, one item per line"}</div><textarea aria-label="Rack, one item per line" value={rack} onChange={function(e){setRack(e.target.value);}} rows={3} placeholder={"Cams .3-3\nNuts 1 set\n8 alpine draws"} style={Object.assign({},fld,{resize:"vertical"})}/></div>:null}
  {sf("whatToBring")?<div><div style={lab}>{"Route-specific essentials"}</div><textarea aria-label="Route-specific essentials" value={whatToBring} onChange={function(e){setWhatToBring(e.target.value);}} rows={3} placeholder={"One per line — the things THIS route needs that a general rack does not\ne.g. 6mm cord for the rap anchors\nhelmet, the gully is loose"} style={Object.assign({},fld,{resize:"vertical",fontFamily:"inherit"})}/></div>:null}<div style={{fontSize:12,color:C.textMuted,margin:"3px 0 10px"}}>{"Add counts and rack sizes so partners pack right."}</div>{gsec("qd")?Stepper("Quickdraws",gear.qd,v=>setCount("qd",v)):null}{gsec("screws")?Stepper("Ice screws",gear.screws,v=>setCount("screws",v)):null}{gsec("pads")?Stepper("Crash pads",gear.pads,v=>setCount("pads",v)):null}{gsec("cams")?Sized("Cams",CAMS,"cams"):null}{gsec("nuts")?Sized("Nuts / stoppers",NUTS,"nuts"):null}<div style={lab}>{"Other gear"}</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{otherList.map(it=>{const on=gear.items.indexOf(it)>=0;return <button key={it} onClick={()=>togItem(it)} style={sm(on)}>{it}</button>;})}</div></div>:null}
  {/* Rappel counts are ROPE-DEPENDENT — most apparent conflicts in the catalog are one rope
      versus two. This is the field that says which, so the number above stops looking wrong. */}
  {(sf("protRating")||sf("rap")||sf("landing")||sf("startType"))?<div><div style={grp}>{"6 · Protection & landing"}</div><div style={{fontSize:12,color:C.textMuted,margin:"3px 0 8px"}}>{"How well it protects, and what happens if you come off."}</div><div style={{display:"flex",flexDirection:"column",gap:11}}>{sf("protRating")?<div><div style={lab}>{"Protection rating"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["G","PG","PG-13","R","X"].map(function(o){var on=protRating===o;var danger=/^(R|X)$/.test(o);return <button key={o} onClick={function(){setProtRating(on?"":o);}} style={Object.assign({},sm(on),on&&danger?{borderColor:C.red,background:C.redBg,color:C.red}:{})}>{o}</button>;})}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:5,lineHeight:1.45}}>{"R = a fall could injure you. X = a fall could kill you. Leave blank if you are not sure."}</div></div>:null}{sf("rap")?<div><div style={lab}>{"Rappels on the descent"}</div><input aria-label="Rappels on the descent" value={rap} onChange={function(e){setRap(e.target.value);}} placeholder="e.g. 4 single-rope raps from bolted stations" style={fld}/></div>:null}{sf("rappelCountNote")?<div><div style={lab}>{"Rappel count caveat"}</div><input aria-label="Rappel count caveat" value={rappelCountNote} onChange={function(e){setRappelCountNote(e.target.value);}} placeholder="e.g. 4 on a single 60, 2 with double ropes" style={fld}/></div>:null}
  {sf("landing")?<div><div style={lab}>{"Landing"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Flat","Uneven","Sloping","Rocky","Bad / dangerous"].map(function(o){var on=landing===o;var danger=/bad|rocky/i.test(o);return <button key={o} onClick={function(){setLanding(on?"":o);}} style={Object.assign({},sm(on),on&&danger?{borderColor:C.amber,background:C.amberBg,color:C.amber}:{})}>{o}</button>;})}</div></div>:null}{sf("startType")?<div><div style={lab}>{"Start"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Stand","Sit","Crouch","Hang / jump"].map(function(o){var on=startType===o;return <button key={o} onClick={function(){setStartType(on?"":o);}} style={sm(on)}>{o}</button>;})}</div></div>:null}</div></div>:null}{(sf("turn")||sf("comms"))?<div><div style={grp}>{"7 · Timing & coverage"}</div><div style={{fontSize:12,color:C.textMuted,margin:"3px 0 8px"}}>{"When you have to turn around, and whether you can call for help from up there."}</div><div style={{display:"flex",flexDirection:"column",gap:11}}>{sf("turn")?<div><div style={lab}>{"Turnaround time"}</div><input aria-label="Turnaround time" value={turn} onChange={function(e){setTurn(e.target.value);}} placeholder="e.g. turn around at 11am if not at the notch" style={fld}/></div>:null}{sf("itinerary")?<div><div style={lab}>{"Day by day"}</div><div style={{fontSize:11.5,color:C.textMuted,margin:"0 0 7px"}}>{"Only worth filling in for a multi-day outing. Leave it alone for a day trip."}</div><ItineraryEditor itin={itinDraft} onChange={setItinDraft}/></div>:null}
  {sf("timing")?<div><div style={lab}>{"How long it takes"}</div><div style={{fontSize:11.5,color:C.textMuted,margin:"0 0 7px"}}>{"Real hours, if you know them — the planner shows these beside its own estimate."}</div><div style={{display:"flex",flexDirection:"column",gap:8}}>{OBJ_LISTS.timing.map(function(k){return <div key={k[0]}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>{k[1]}</div><input aria-label={k[1]} value={(objVals.timing||{})[k[0]]||""} onChange={function(e){setObjAt("timing",k[0],e.target.value);}} inputMode={k[3]==="num"?"decimal":undefined} placeholder={k[2]} style={fld}/></div>;})}</div></div>:null}
  {sf("comms")?<div><div style={lab}>{"Cell / satellite coverage"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["None","Summit only","Patchy","Good"].map(function(o){var on=comms===o;return <button key={o} onClick={function(){setComms(on?"":o);}} style={sm(on)}>{o}</button>;})}</div></div>:null}</div></div>:null}{(sf("fa")||sf("crux"))?<div><div style={grp}>{"8 · First ascent & crux"}</div><div style={{display:"flex",flexDirection:"column",gap:11,marginTop:8}}>{sf("fa")?<div><div style={lab}>{"First ascent"}</div><input aria-label="First ascent" value={fa} onChange={function(e){setFa(e.target.value);}} placeholder="Who and when, if you know — e.g. Beckey & Doorish, 1961" style={fld}/></div>:null}{sf("crux")?<div><div style={lab}>{"The crux"}</div><input aria-label="The crux" value={crux} onChange={function(e){setCrux(e.target.value);}} placeholder="What the hardest part actually is" style={fld}/></div>:null}</div></div>:null}{/* The GROUP gate is the union of its three fields, following group 8's `(sf("fa")||sf("crux"))`
     shape, while each field keeps its own gate inside. Widening it rather than nesting matters:
     objHaz and watchOut are declared for different discipline sets than `haz`, so nesting them
     under sf("haz") would have shown them wherever haz shows and nowhere else — silently wrong
     for exactly the disciplines that need them most.
     THREE fields, deliberately not merged into one box. The route page reads them as three
     separate things and MERGES them itself (mergeHazards(route.hazards, objHaz, watchOut), then
     subtracts the already-shown items), so collapsing them here would throw away the distinction
     the reader depends on: `haz` is a tag from a fixed vocabulary, `objHaz` is what the mountain
     does to you regardless of skill, `watchOut` is everything else worth saying. */}
  {(sf("haz")||sf("objHaz")||sf("watchOut"))?<div><div style={grp}>{"9 · What to watch for"}</div>{sf("haz")?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>{ADDR_HAZ.map(t=>{const on=haz.indexOf(t)>=0;return <button key={t} onClick={()=>tog(haz,setHaz,t)} style={Object.assign({},sm(on),on?{borderColor:C.amber,background:C.amberBg,color:C.amber}:{})}>{t}</button>;})}</div>:null}{sf("objHaz")?<div style={{marginTop:9}}><div style={lab}>{"Objective hazards"}</div><textarea aria-label="Objective hazards" value={objHaz} onChange={function(e){setObjHaz(e.target.value);}} rows={2} placeholder={"One per line — what the mountain does regardless of how well you climb\ne.g. serac fall over the lower glacier until mid-morning\nrockfall down the couloir once it thaws"} style={Object.assign({},fld,{resize:"vertical",fontFamily:"inherit"})}/></div>:null}{sf("watchOut")?<div style={{marginTop:9}}><div style={lab}>{"Watch out for"}</div><textarea aria-label="Watch out for" value={watchOut} onChange={function(e){setWatchOut(e.target.value);}} rows={2} placeholder={"One per line — anything else worth a heads-up\ne.g. the second belay is a single fixed pin"} style={Object.assign({},fld,{resize:"vertical",fontFamily:"inherit"})}/></div>:null}</div>:null}
  <div style={grp}>{"10 · Notes & photos (optional)"}</div>{/* TWO prose boxes, deliberately, and they are not interchangeable. `overview` is what the route
     DESCRIPTION card renders (`route.overview||route.desc`); `beta` is the climber's own tips, and
     reaches the ROUTE BETA section and the short-tips list. Before this the form offered only the
     beta box — correctly labelled, correctly routed — so a newly added route could never supply a
     description and its description card showed the "No route description" gap note however much
     the submitter wrote. SuggestFix has offered both for a while ("Route description" / "Beta &
     pro tips"); this brings AddRoute level. A STRING is the right shape for both here: `overview`
     is a text column whose reader takes a string, unlike `beta` — see the shape note on _nr. */}
  {sf("overview")?<div><div style={lab}>{"Route description"}</div><textarea aria-label="Route description" value={overview} onChange={e=>setOverview(e.target.value)} rows={3} placeholder="What the climb is — the line it takes, what the climbing is like, how it ends." style={Object.assign({},fld,{marginTop:6,resize:"vertical",fontFamily:"inherit"})}/></div>:null}<textarea aria-label="Your own beta on the approach, the climbing and the descent." value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder="Your own beta on the approach, the climbing and the descent." style={Object.assign({},fld,{marginTop:6,resize:"vertical",fontFamily:"inherit"})}/>{photos.length?<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,margin:"8px 0"}}>{photos.map((p,i)=>{const cov=coverIdx===i;return <div key={p.id} {...clickable(()=>setCoverIdx(i))} style={{position:"relative",paddingBottom:"100%",borderRadius:8,background:p.url?"url("+p.url+") center/cover":C.card,border:cov?"2px solid "+C.blue:"1px solid "+C.border,cursor:"pointer"}}><span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:C.textMuted}}>{<Lbl s={""}/>}</span>{cov?<span style={{position:"absolute",left:3,top:3,fontSize:10,fontWeight:800,color:"#fff",background:C.blueSolid,borderRadius:4,padding:"1px 5px"}}>{"COVER"}</span>:null}<button onClick={e=>{e.stopPropagation();setPhotos(a=>a.filter((_,j)=>j!==i));setCoverIdx(0);}} aria-label={"Remove photo "+(i+1)} style={Object.assign({},POP_REMOVE_MEDIA,{position:"absolute",right:3,top:3})}>{"✕"}</button></div>;})}</div>:null}<button onClick={()=>{var inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=function(e){var f=e.target.files&&e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){setPhotos(function(p){return p.concat([{id:Date.now()+Math.random(),url:rd.result}]);});};rd.readAsDataURL(f);};inp.click();}} style={{width:"100%",marginTop:8,padding:10,borderRadius:10,border:"1px dashed "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add your own photos"}</button>
  <div style={grp}>{"11 · Integrity"}</div><div {...clickable(()=>setClimbed(!climbed))} style={{display:"flex",alignItems:"center",gap:9,marginTop:8,padding:"10px 12px",borderRadius:11,border:"1px solid "+(climbed?C.green:C.border),background:climbed?C.greenBg:C.surface,cursor:"pointer"}}><span style={{flexShrink:0,width:18,height:18,borderRadius:5,border:"1.5px solid "+(climbed?C.green:C.textMuted),background:climbed?C.green:"transparent",color:"#04110a",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{climbed?"✓":""}</span><span style={{fontSize:12.5,color:C.text,lineHeight:1.4}}>{"I've climbed this — log it as the first confirmation"}</span></div><div {...clickable(()=>setAttest(!attest))} style={{display:"flex",alignItems:"flex-start",gap:9,marginTop:8,padding:"10px 12px",borderRadius:11,border:"1px solid "+(attest?C.green:C.amber+"66"),background:attest?C.greenBg:C.amberBg,cursor:"pointer"}}><span style={{flexShrink:0,width:18,height:18,borderRadius:5,border:"1.5px solid "+(attest?C.green:C.amber),background:attest?C.green:"transparent",color:"#04110a",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>{attest?"✓":""}</span><span style={{fontSize:12,color:C.text,lineHeight:1.5}}>{"This is my own description and photos, or public factual data — not copied from a guidebook, app or site. Required."}</span></div>
  </div>:null}</div>}</div>
  {sent?null:<div style={{borderTop:"1px solid "+C.border,flexShrink:0}}>{saveErr?<div role="alert" style={{margin:"10px 16px 0",background:C.redBg,border:"1px solid "+C.red+"55",borderRadius:10,padding:"9px 11px",fontSize:12.5,color:C.red,lineHeight:1.5}}>{saveErr}</div>:null}{(USE_DB&&!uid&&!saveErr)?<div style={{margin:"10px 16px 0",background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:10,padding:"9px 11px",fontSize:12.5,color:C.amber,lineHeight:1.5}}>{"You are not signed in, so this will be filed anonymously — it still reaches the review queue, but it will not appear in your contributions and cannot count toward the agreement that verifies a climb. Sign in first if you want the credit."}</div>:null}<div style={{display:"flex",gap:8,padding:"12px 16px"}}><button onClick={onClose} style={{flex:1,padding:12,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:"pointer",fontWeight:600}}>{"Cancel"}</button><button onClick={function(){if(!ready||saving)return;/* This refused when signed out, because on 2026-08-09 an anon INSERT on `contributions` was 401/42501. 0079 has since been applied and the same publishable key now gets 201 with `contributor` null — re-measured, and the openness is scoped: `routes` and `areas` still refuse an anon write. So refusing here blocked a contribution the database accepts. It submits either way now and discloses what signing out costs, rather than blocking or quietly filing an unattributable row. */var _prop={name:name.trim(),discipline:disc==="rock"?sub:disc,rockStyle:disc==="rock"?sub:null,grade:grade||null,pitchCount:pitch||null,length:canonFt(height),gain:canonFt(gain),dist:canonMi(dist),rock:rock||null,aspect:aspect||null,season:season||null,commit:commit||null,descentText:descent||null,protRating:protRating||null,fa:fa||null,crux:crux||null,landing:landing||null,pads:gear.pads||null,startType:startType||null,rap:rap||null,turn:turn||null,comms:comms||null,loss:canonFt(loss),style:style,haz:haz,gear:gear,beta:desc||null,bestSeason:bestSeason||null,outingShape:outingShape||null,rappelCountNote:rappelCountNote||null,alpineDraws:alpineDraws||null,rack:linesOf(rack).length?linesOf(rack):null,road:cleanObj("road"),access:cleanObj("access"),timing:cleanObj("timing"),itinerary:cleanItin(),pitchDetail:cleanPitches().length?cleanPitches():null,overview:overview||null,face:face||null,ropeType:ropeType||null,ropeNote:ropeNote||null,ascender:ascender||null,whatToBring:linesOf(whatToBring).length?linesOf(whatToBring):null,watchOut:linesOf(watchOut).length?linesOf(watchOut):null,objHaz:linesOf(objHaz).length?linesOf(objHaz):null,areaName:areaName,climbed:climbed,photoCount:photos.length};var _local=function(){onSubmit&&onSubmit({type:"route",title:name,area:areaName,meta:((cat==="rock"&&sub)?CAT[sub].label:(disc?DISC[disc].label:""))+(grade?" · "+grade:""),status:"review",when:"just now",detail:_prop});/* SEED SHAPE, not DB shape, and the difference is load-bearing. This object is
     handed straight to onAddRoute, so it bypasses BOTH the contribute merge (and its CONV
     converters) and dbRouteToCamel. `beta` must therefore be an ARRAY here: two of the three
     route.beta readers are `Array.isArray(route.beta)?route.beta:[]` — the ROUTE BETA prose
     section and the short-tips list — and all 14 seed routes declare `beta:[…]`, none a string.
     It was `desc||""`, so a new route's description was dropped by both, rendering only in the
     third reader, which has a string fallback. #831 fixed this exact shape on the OTHER
     submission path; this is AddRoute's local one.
     Do NOT "unify" this with `_prop.beta`, which stays a STRING on purpose — that one is
     written to the `beta` column, and dbRouteToCamel wraps it into an array on read. */
  var _nr={id:"u"+Date.now(),mountainId:areaId,name:name.trim(),grade:grade||"",discipline:disc,style:disc==="rock"?sub:undefined,disciplines:[disc==="rock"?sub:disc],pitches:parseInt(pitch)||1,routeFt:canonFt(height),gainM:canonFt(gain)==null?null:canonFt(gain)/3.28084,lossM:canonFt(loss)==null?null:canonFt(loss)/3.28084,distKm:canonMi(dist)==null?null:canonMi(dist)*1.60934,rock:rock||"",aspect:aspect||"",features:Array.isArray(style)?style:[],hazards:Array.isArray(haz)?haz:[],beta:desc?[desc]:[],overview:overview||"",face:face||"",ropeType:ropeType||"",ropeNote:ropeNote||"",ascender:ascender||"",whatToBring:linesOf(whatToBring),watchOut:linesOf(watchOut),objHaz:linesOf(objHaz),activity:[],rack:[],userAdded:true};if(onAddRoute&&areaId)onAddRoute(_nr);};if(!USE_DB){_local();setSent(true);return;}setSaving(true);setSaveErr("");submitContribution({kind:"new_route",area_id:(dbArea&&dbArea.id)||dbAreaId||null,route_id:null,field:null,value:_prop}).then(function(){setSaving(false);_local();setSent(true);}).catch(function(e){setSaving(false);setSaveErr((e&&e.message)?("Couldn’t submit that climb — "+e.message):"Couldn’t submit that climb. Check your connection and try again.");});}} disabled={!ready||saving} style={{flex:2,padding:12,background:(ready&&!saving)?C.blueSolid:C.surface,color:(ready&&!saving)?"#fff":C.textMuted,border:(ready&&!saving)?"none":"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:(ready&&!saving)?"pointer":"default",fontWeight:700}}>{saving?"Submitting…":(ready?((USE_DB&&!uid)?"Submit anonymously":"Submit for review"):need)}</button></div></div>}
  </div></div>;
}
