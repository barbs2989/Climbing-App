import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { C, hlMatch } from "../../ClimbMatchCore.jsx";
import { useAreaPath, useCatalogAreaSearch, useCountries, useStates } from "../../lib/db.js";
import { countryOfArea, subdivisionNoun } from "../../lib/countries.js";
import { searchTokens } from "../../lib/search";
import { clickable } from "../../lib/clickable";
import DbAreaLevel from "./DbAreaLevel.tsx";
import Lbl from "./Lbl.tsx";

/** One level of the picked chain, state first (`fetchAreaPath` starts at the country; the picker slices that off). */
export interface ChainArea {
  id: string;
  name: string;
}
/** A state or province row from useStates, and a country row from useCountries; countryOfArea reads the path. */
export interface StateRow { id: string; name: string; path?: string | null }
export interface CountryRow { id: string; name: string }
/** A catalog search hit (`useCatalogAreaSearch`): the area, its type and size, and the trail that tells namesakes apart. */
export interface AreaHit {
  id: string;
  name: string;
  area_type?: string | null;
  route_count?: number | null;
  trail?: ReadonlyArray<string> | null;
}
export interface DbAreaPickerProps {
  chain: ChainArea[];
  onChain: (chain: ChainArea[]) => void;
  /** The form's select and field styles, so the picker matches the rest of Add a climb. */
  sel: CSSProperties;
  fld: CSSProperties;
  /** An area to open AT (the form opened from a DB area page); its ancestors are resolved into the chain. */
  seedAreaId?: string | null;
  isLeaf?: boolean;
  settled?: boolean;
  kidsUnavailable?: boolean;
  /** The "crag not listed" box, when the form offers one. */
  newArea?: string;
  onNewArea?: (name: string) => void;
}

/* SEARCH FIRST, THE WHOLE CATALOG. The search box used to appear only once a country AND a
   state were picked, so on opening the form the only box was "Crag not listed? Type a new one":
   the owner typed "Jack Mountain" there and it filed a NEW crag beside the existing peak, six
   levels down (Washington › Northwest Region › Hwy 20… › North Cascades › North Cascades Core).
   Now the first thing is a search over every area in every state (useCatalogAreaSearch), each
   hit carrying its trail so namesakes can be told apart; the tree stays below it for browsing.
   Mountain Project files a route from inside its area page and nothing warns of a duplicate
   area — so the new-crag box lives here too, and offers what is already listed under the name
   typed into it before it calls anything new. */
export default function DbAreaPicker({chain,onChain,sel,fld,seedAreaId,isLeaf,settled,kidsUnavailable,newArea,onNewArea}: DbAreaPickerProps){
  const [q,setQ]=useState("");
  const statesQ=useStates();
  const states: StateRow[]=useMemo(()=>statesQ.data||[],[statesQ.data]);
  const stateId=chain.length?chain[0].id:"";
  const chosen=chain.length?chain[chain.length-1]:null;
  /* COUNTRY FIRST. useStates returns every child of every root in one alphabetical list, so the
     state select used to read "…Arkansas, British Columbia, California…" — a Canadian province
     filed among US states, and a list that only gets worse with each country added. The country
     is DERIVED from the chosen state when there is one (an area resolved from seedAreaId or a
     search hit sets the chain without touching this select), else it is whatever was picked.
     One country is not a choice, so the step is skipped until there are two; a country read that
     FAILS must not gate the state step either (useCountries has no offline fallback, useStates
     does) — the same two rules StatePicker on the Climbs tab follows. */
  const countriesQ=useCountries();
  const countries: CountryRow[]=countriesQ.data||[];
  const [countryPick,setCountryPick]=useState("");
  const onlyCountry=countries.length===1?countries[0].id:"";
  const countriesUnavailable=countriesQ.isError;
  const noCountryStep=!!onlyCountry||countriesUnavailable;
  const stateRow=stateId?states.find(function(x){return x.id===stateId;}):null;
  const countryId=countryOfArea(stateRow)||countryPick||onlyCountry;
  const noun=subdivisionNoun(countryId);
  const inCountry=states.filter(function(x){return !countryId||countryOfArea(x)===countryId;});
  /* Not scoped to a state any more: areas_in_subtree over the `usa` root times out, and naming
     the state first is the step that hid the box. "mount" matching 1,669 areas is handled by the
     ranking (exact, then starts-with, then size) and by saying how many there were. */
  const searchQ=useCatalogAreaSearch(q,12);
  const hits: AreaHit[]=(searchQ.data&&searchQ.data.rows)||[];
  const hitTotal=(searchQ.data&&searchQ.data.total)||0;
  const dupQ=useCatalogAreaSearch(newArea||"",4);
  const dupHits: AreaHit[]=(dupQ.data&&dupQ.data.rows)||[];
  const pick=function(id: string){setResolveId(id);setQ("");if(onNewArea)onNewArea("");};
  const hitRow=function(m: AreaHit,query: string){return <div key={m.id} {...clickable(function(){pick(m.id);})} style={{padding:"9px 12px",cursor:"pointer",borderBottom:"1px solid "+C.borderLight}}>
    <div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{hlMatch(m.name,query)}<span style={{fontSize:11.5,fontWeight:600,color:C.textMuted}}>{" · "+m.area_type+(m.route_count?(" · "+m.route_count+" climb"+(m.route_count===1?"":"s")):"")}</span></div>
    <div style={{fontSize:11.5,color:C.textMuted,marginTop:1,lineHeight:1.4}}>{(m.trail||[]).join(" › ")}</div>
  </div>;};
  /* An area reached by any route other than drilling — the form opened from a DB area page,
     or a search hit several levels down — arrives as a bare id, so its ANCESTORS have to be
     resolved before the cascade can show where it sits. Without this the levels above it
     render their placeholder while the breadcrumb names a formation, which reads as the
     picker having lost the selection.
     `fetchAreaPath` walks all the way to the root, so the chain it returns starts at the
     COUNTRY; the picker's chain starts at the state. Slicing at the first entry that is in
     `states` is self-correcting — while the state list is still loading no entry matches,
     the effect does nothing, and it re-runs when the list arrives. */
  const [resolveId,setResolveId]=useState<string | null>(seedAreaId||null);
  const pathQ=useAreaPath(resolveId);
  const pathData=pathQ.data;
  useEffect(function(){
    if(!resolveId||!pathData||!pathData.length)return;
    if(pathData[pathData.length-1].id!==resolveId)return;
    const stateIds: Record<string, 1>={};states.forEach(function(x){stateIds[x.id]=1;});
    const at=pathData.findIndex(function(a){return stateIds[a.id];});
    if(at<0)return;
    setResolveId(null);
    onChain(pathData.slice(at).map(function(a){return {id:a.id,name:a.name};}));
  },[resolveId,pathData,states,onChain]);
  const crumb=chain.map(function(a){return a.name;}).join(" › ");
  return <div>
    <div style={{marginBottom:10}}>
      <input aria-label="Search for a crag or peak" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search every crag, peak and area — e.g. Jack Mountain" style={fld}/>
      {searchQ.isError?<div style={{fontSize:12,color:C.amber,marginTop:5,lineHeight:1.45}}>{"Couldn’t run that search — this is not a claim nothing matched."}</div>
        :hits.length?<div style={{marginTop:4,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden",background:C.surface,maxHeight:260,overflowY:"auto",overscrollBehavior:"contain"}}>{hits.map(function(m){return hitRow(m,q);})}
          {hitTotal>hits.length?<div style={{padding:"8px 12px",fontSize:11.5,color:C.textMuted}}>{"Showing the top "+hits.length+" of "+hitTotal+" — keep typing to narrow it."}</div>:null}</div>
        :(searchTokens(q).join("").length>=2&&!searchQ.isLoading)?<div style={{fontSize:12,color:C.textMuted,marginTop:5,lineHeight:1.45}}>{"Nothing in the catalog matches that. Browse the tree below, or add it as a new crag at the bottom."}</div>:null}
    </div>
    <div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,margin:"0 0 5px"}}>{"Or browse: country → state → area → crag or peak"}</div>
    {noCountryStep?null:<div style={{position:"relative",marginBottom:7}}>
      <select aria-label="Country" value={countryId} onChange={e=>{setCountryPick(e.target.value);setResolveId(null);onChain([]);setQ("");}} style={sel}>
        <option value="">{countriesQ.isLoading?"Loading countries…":"Choose a country"}</option>
        {countries.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>}
    {(countryId||noCountryStep)?<div style={{position:"relative",marginBottom:7}}>
      <select aria-label={countryId?("Choose a "+noun):"State or province"} value={stateId} onChange={e=>{const v=e.target.value;const st=v?states.find(x=>x.id===v):null;setResolveId(null);onChain(st?[{id:st.id,name:st.name}]:[]);setQ("");}} style={sel}>
        <option value="">{statesQ.isLoading?("Loading "+noun+"s…"):("Choose a "+noun)}</option>
        {inCountry.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>:null}
    {statesQ.isError?<div style={{fontSize:12,color:C.amber,marginBottom:7,lineHeight:1.45}}>{"Couldn’t load the state list — this is not a claim the catalog is empty. Try again in a moment."}</div>:null}
    {resolveId?<div style={{fontSize:12,color:C.textMuted,padding:"6px 2px"}}>Opening that area…</div>:null}
    {chain.map(function(a,i){
      return <DbAreaLevel key={a.id} parentId={a.id} value={chain[i+1]?chain[i+1].id:""} placeholder={"Choose in "+a.name+"…"} sel={sel} onPick={function(k){setResolveId(null);onChain(chain.slice(0,i+1).concat(k?[{id:k.id,name:k.name}]:[]));}}/>;
    })}
    {chain.length?<div style={{fontSize:12,fontWeight:600,margin:"2px 0 4px",color:isLeaf?C.green:C.textMuted}}>{<Lbl s={"📍 "+crumb}/>}</div>:null}
    {(chosen&&kidsUnavailable)?<div style={{fontSize:11.5,color:C.amber,marginBottom:4,lineHeight:1.5}}>{"Couldn’t check what’s inside “"+chosen.name+"” — this is not a claim it is the right place to file a climb. Try again in a moment."}</div>
      :(chosen&&settled&&!isLeaf)?<div style={{fontSize:11.5,color:C.amber,marginBottom:4,lineHeight:1.5}}>{"“"+chosen.name+"” holds other areas, so a climb cannot be filed on it — pick the exact crag or peak inside it."}</div>:null}
    {onNewArea?<div style={{marginTop:8}}>
      <input aria-label="Crag not listed? Type a new one to add it" value={newArea||""} onChange={e=>onNewArea(e.target.value)} placeholder="Not in the catalog? Type the new crag’s name…" style={fld}/>
      {dupHits.length?<div style={{marginTop:6,border:"1px solid "+C.amber+"55",borderRadius:10,overflow:"hidden",background:C.amberBg}}>
        <div style={{padding:"8px 12px",fontSize:12,fontWeight:700,color:C.amber,lineHeight:1.45}}>{"Already in the catalog? Tap it to file your climb there instead:"}</div>
        <div style={{background:C.surface}}>{dupHits.map(function(m){return hitRow(m,newArea||"");})}</div>
      </div>:null}
    </div>:null}
  </div>;
}
