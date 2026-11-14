import type { CSSProperties } from "react";
import { C, blankItinDay, intOnly, uDistMiUnit, uElevUnit, uMassUnit } from "../../ClimbMatchCore.jsx";
import { POP_REMOVE } from "../../lib/popupChrome.js";

/** One timed entry in a day's schedule. */
export interface ItinSched { time: string; label: string; detail: string; }
/** One day of the itinerary, every figure as the climber typed it (strings; `blankItinDay()` makes an empty one). */
export interface ItinDay {
  title: string;
  objective: string;
  gainFt: string;
  lossFt: string;
  hours: string;
  miles: string;
  packLb: string;
  note: string;
  schedule?: ItinSched[] | null;
}
/** The draft itinerary: its days, plus whatever else the caller keeps on it (`Object.assign` preserves the rest). */
export interface Itinerary { days?: ItinDay[] | null; [key: string]: unknown; }

export interface ItineraryEditorProps {
  itin?: Itinerary | null;
  onChange: (itin: Itinerary) => void;
}

/** The quick-add times under a day's schedule. Moved with the editor: nothing else read them. */
const TIME_PRESETS = ["3:00 AM","5:00 AM","7:00 AM","9:00 AM","12:00 PM","3:00 PM","6:00 PM"];

/**
 * The day-by-day itinerary editor (crew plan, log, add-a-climb, route page): title, objective, gain/loss, hours,
 * distance, pack weight, notes and a timed schedule per day. Units in the labels follow the climber's setting
 * (`check:units` renders this component through its probe).
 */
export default function ItineraryEditor({itin,onChange}: ItineraryEditorProps){
  const fld: CSSProperties={width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none"};
  const days: ItinDay[]=(itin&&itin.days&&itin.days.length)?itin.days:[blankItinDay()];
  const setDays=function(fn: (ds: ItinDay[]) => ItinDay[]){onChange(Object.assign({},itin,{days:fn(days)}));};
  const setDayField=function(i: number,k: keyof ItinDay,v: string){setDays(function(ds){const nd=ds.slice();nd[i]=Object.assign({},nd[i],{[k]:v});return nd;});};
  const addDay=function(){setDays(function(ds){return ds.concat([blankItinDay()]);});};
  const rmDay=function(i: number){setDays(function(ds){return ds.filter(function(_,j){return j!==i;});});};
  const addSched=function(di: number,t?: string){setDays(function(ds){const nd=ds.slice();nd[di]=Object.assign({},nd[di],{schedule:(nd[di].schedule||[]).concat([{time:t||"",label:"",detail:""}])});return nd;});};
  const setSchedField=function(di: number,si: number,k: keyof ItinSched,v: string){setDays(function(ds){const nd=ds.slice();const sched=(nd[di].schedule||[]).slice();sched[si]=Object.assign({},sched[si],{[k]:v});nd[di]=Object.assign({},nd[di],{schedule:sched});return nd;});};
  const rmSched=function(di: number,si: number){setDays(function(ds){const nd=ds.slice();nd[di]=Object.assign({},nd[di],{schedule:(nd[di].schedule||[]).filter(function(_,j){return j!==si;})});return nd;});};
  return <div>{days.map(function(d,di){return <div key={di} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{"Day "+(di+1)}</span>{days.length>1?<button onClick={function(){rmDay(di);}} aria-label="Remove day" style={POP_REMOVE}>{"✕"}</button>:null}</div>
    <input aria-label="Day title" value={d.title} onChange={function(e){setDayField(di,"title",e.target.value);}} placeholder="Day title (e.g. Approach to base camp)" style={Object.assign({},fld,{marginBottom:6})}/>
    <input aria-label="Objective (optional)" value={d.objective} onChange={function(e){setDayField(di,"objective",e.target.value);}} placeholder="Objective (optional)" style={Object.assign({},fld,{marginBottom:6})}/>
    <div style={{display:"flex",gap:6,marginBottom:6}}>
      <div style={{flex:1}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>{"GAIN ("+uElevUnit().toUpperCase()+")"}</div><input aria-label={"Gain ("+uElevUnit()+")"} value={d.gainFt} onChange={function(e){setDayField(di,"gainFt",intOnly(e.target.value));}} inputMode="numeric" placeholder="0" style={fld}/></div>
      <div style={{flex:1}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>{"LOSS ("+uElevUnit().toUpperCase()+")"}</div><input aria-label={"Loss ("+uElevUnit()+")"} value={d.lossFt} onChange={function(e){setDayField(di,"lossFt",intOnly(e.target.value));}} inputMode="numeric" placeholder="0" style={fld}/></div>
      <div style={{flex:1}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>HOURS</div><input aria-label="Hours" value={d.hours} onChange={function(e){setDayField(di,"hours",e.target.value.replace(/[^0-9.]/g,""));}} inputMode="decimal" placeholder="0" style={fld}/></div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:6}}>
      <div style={{flex:1}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>{"DISTANCE ("+uDistMiUnit().toUpperCase()+")"}</div><input aria-label={"Distance ("+uDistMiUnit()+")"} value={d.miles} onChange={function(e){setDayField(di,"miles",e.target.value.replace(/[^0-9.]/g,""));}} inputMode="decimal" placeholder="0" style={fld}/></div>
      <div style={{flex:1}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,marginBottom:3}}>{"PACK WEIGHT ("+uMassUnit().toUpperCase()+")"}</div><input aria-label={"Pack weight ("+uMassUnit()+")"} value={d.packLb} onChange={function(e){setDayField(di,"packLb",intOnly(e.target.value));}} inputMode="numeric" placeholder="0" style={fld}/></div>
    </div>
    <textarea aria-label="Notes for this day" value={d.note} onChange={function(e){setDayField(di,"note",e.target.value);}} rows={2} placeholder="Notes for this day" style={Object.assign({},fld,{resize:"vertical",marginBottom:6})}/>
    <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:5}}>SCHEDULE (optional)</div>
    {(d.schedule||[]).map(function(st,si){return <div key={si} style={{marginBottom:6,paddingBottom:si<((d.schedule||[]).length-1)?6:0,borderBottom:si<((d.schedule||[]).length-1)?"1px solid "+C.borderLight:"none"}}><div style={{display:"flex",gap:5,marginBottom:4}}><input aria-label="Time" value={st.time} onChange={function(e){setSchedField(di,si,"time",e.target.value);}} placeholder="5:00 AM" style={Object.assign({},fld,{width:76,flex:"none"})}/><input aria-label="Leave trailhead" value={st.label} onChange={function(e){setSchedField(di,si,"label",e.target.value);}} placeholder="Leave trailhead" style={Object.assign({},fld,{flex:1})}/><button onClick={function(){rmSched(di,si);}} aria-label="Remove schedule entry" style={POP_REMOVE}>{"✕"}</button></div><input aria-label="Detail (optional)" value={st.detail} onChange={function(e){setSchedField(di,si,"detail",e.target.value);}} placeholder="Detail (optional)" style={fld}/></div>;})}
    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{TIME_PRESETS.map(function(t){return <button key={t} onClick={function(){addSched(di,t);}} style={{padding:"5px 9px",borderRadius:7,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{t}</button>;})}<button onClick={function(){addSched(di);}} style={{padding:"5px 10px",borderRadius:7,border:"1px dashed "+C.border,background:C.card,color:C.textSub,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>{"+ Custom time"}</button></div>
  </div>;})}<button onClick={addDay} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Add day"}</button></div>;
}
