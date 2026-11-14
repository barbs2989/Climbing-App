import { useState, useEffect, useMemo } from "react";
import { C, ROUTES, ROUTE_GAP, RSL as SL, rxOf } from "../../ClimbMatchCore.jsx";
import { USE_DB } from "../../lib/supabase.js";
import { useRoutePairings, useRouteLoggedWith, submitRoutePairing, deleteRoutePairing, useRoutesByIds, dbRouteToCamel } from "../../lib/db.js";
import { clickable } from "../../lib/clickable";
import { useSession } from "../AuthContext.tsx";
import DbClimbPicker from "./DbClimbPicker.tsx";

export interface PairsWellWithProps {
  route: { id: string };
  /** Opens the paired climb; without it the cards do nothing when tapped. */
  onOpenRoute?: ((route: PairRoute) => void) | null;
  /** Shows a toast. */
  notify?: ((message: string) => void) | null;
}
/** A climb a pairing points at, as the card prints it. */
export interface PairRoute { id: string | number; name: string; grade?: string | null }
/** A pairing from the hand-written seed examples. */
interface SeedPair { id: string; note: string; kind: "seed"; mine?: undefined }
/** A pairing climbers suggested; several suggestions of one climb are counted together. */
interface SuggPair { id: string; kind: "sugg"; people: Record<string, number>; n: number; note: string; noteAt: string; mine: string | null }
/** A climb logged the same day by other climbers, as a count. */
interface LoggedPair { id: string; kind: "logged"; n: number; note?: undefined; mine?: undefined }
type PairCard = SeedPair | SuggPair | LoggedPair;
/** One `contributions` row of kind 'pair'. */
interface PairRow { id: string; route_id: string; value?: { with?: string; note?: string } | null; contributor?: string | null; created_at?: string | null }
/** One row of route_logged_with. */
interface LoggedRow { route_id?: string | null; climbers?: number | null }
/** What a caught error exposes (a thrown string or null has neither field). */
interface ErrLike { code?: string; message?: string }
function errLike(x: unknown): ErrLike | null { return typeof x==="object" && x!==null ? x : null; }

/** PAIRS WELL WITH, from real climbers (0223). It used to render only on seven seed Little Cottonwood
   routes, from the hand-written ROUTE_EXTRAS.pairsWith, so no catalog route could ever have one. Now:
     - SUGGESTED: a climber picks another climb and says why (a `contributions` row of kind 'pair').
       A pairing shows on BOTH climbs' pages; several climbers suggesting the same one are counted
       together, and you can take your own back.
     - LOGGED TOGETHER: other climbs the same climber logged on the same day, from shared logs only,
       as a count and never a name (route_logged_with reads with the viewer's own privileges).
   The seed pairings still render on the seed routes, which are examples themselves. "More on <peak>"
   below already lists the same area's routes, so nothing here is padded out with neighbours.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; the types were added, a caught error is read through `errLike` (null for a thrown primitive, which has neither field, so the same message results), `filter(Boolean)` is a type-guard filter, `f&&f(x)` statements are `if(f)f(x)` (lint forbids the expression statement; not `f?.(x)`, which the toast guards' `notify(` pattern would not match), a logged climb's id is `String(r.route_id)` (the filter above already proved it set), and `sugg.concat(logged)` is a spread (same order) because a list of suggestions cannot concat a list of logged climbs in TypeScript.
 */
export default function PairsWellWith({route,onOpenRoute,notify}: PairsWellWithProps){
  const _pwSess=useSession();const uid=(USE_DB&&_pwSess&&_pwSess.user)?_pwSess.user.id:null;
  const pairQ=useRoutePairings(USE_DB?route.id:null);const withQ=useRouteLoggedWith(USE_DB?route.id:null);
  const pairsUnavailable=!!(USE_DB&&pairQ.isError);
  const [open,setOpen]=useState(false);const [pick,setPick]=useState<PairRoute | null>(null);const [note,setNote]=useState("");const [busy,setBusy]=useState(false);
  useEffect(function(){setOpen(false);setPick(null);setNote("");},[route.id]);
  const seedCards: PairCard[]=(rxOf(route.id).pairsWith||[]).map(function(pp: {id: string; note: string}){const r2=ROUTES.find(function(x){return x.id===pp.id;});return r2?{id:r2.id,note:pp.note,kind:"seed"}:null;}).filter(function(c: SeedPair | null): c is SeedPair {return !!c;});
  const sugg=useMemo(function(){const by: Record<string,SuggPair>={};(pairQ.data||[]).forEach(function(row: PairRow){const v=row.value||{};const other=row.route_id===route.id?v.with:row.route_id;if(!other||other===route.id)return;const g=by[other]||(by[other]={id:other,kind:"sugg",people:{},n:0,note:"",noteAt:"",mine:null});if(row.contributor&&!g.people[row.contributor]){g.people[row.contributor]=1;g.n++;}if(v.note&&String(row.created_at||"")>=g.noteAt){g.note=v.note;g.noteAt=String(row.created_at||"");}if(uid&&row.contributor===uid)g.mine=row.id;});return Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return b.n-a.n;});},[pairQ.data,route.id,uid]);
  const logged=useMemo(function(){return (withQ.data||[]).filter(function(r: LoggedRow){return r.route_id&&r.route_id!==route.id&&!sugg.some(function(s){return s.id===r.route_id;});}).map(function(r: LoggedRow): LoggedPair {return {id:String(r.route_id),kind:"logged",n:r.climbers||0};});},[withQ.data,sugg,route.id]);
  const needIds=useMemo(function(){const out: string[]=[];[...sugg,...logged].forEach(function(c: PairCard){if(out.indexOf(c.id)<0&&!ROUTES.some(function(x){return x.id===c.id;}))out.push(c.id);});return out;},[sugg,logged]);
  const pwRoutesQ=useRoutesByIds(needIds);
  const pwById=useMemo(function(){const m: Record<string,PairRoute>={};(pwRoutesQ.data||[]).forEach(function(r: {id: string}){m[r.id]=dbRouteToCamel(r);});return m;},[pwRoutesQ.data]);
  const resolve=function(id: string): PairRoute | null{return ROUTES.find(function(x){return x.id===id;})||pwById[id]||null;};
  const cards=seedCards.concat(sugg,logged).map(function(c){const r2=resolve(c.id);return r2?Object.assign({},c,{r2:r2}):null;}).filter(function(c: (PairCard & {r2: PairRoute}) | null): c is PairCard & {r2: PairRoute} {return !!c;});
  const plural=function(n: number){return n+" climber"+(n===1?"":"s");};
  async function save(){
    if(!pick||busy)return;
    if(pick.id===route.id){if(notify)notify("Pick a different climb — this is the one you’re on.");return;}
    if(sugg.some(function(s){return s.id===pick.id&&s.mine;})){if(notify)notify("You’ve already suggested that pairing.");return;}
    setBusy(true);
    try{const row=await submitRoutePairing(route.id,pick,note);if(!row)throw new Error("the database is not connected");setOpen(false);setPick(null);setNote("");await pairQ.refetch();if(notify)notify("Pairing added — it now shows on both climbs.");}
    catch(err){const e=errLike(err);if(notify)notify(e&&e.code==="23505"?"You’ve already suggested that pairing.":"Couldn’t save the pairing — "+((e&&e.message)||"try again."));}
    finally{setBusy(false);}
  }
  async function remove(rowId: string | null){
    if(busy)return;setBusy(true);
    try{await deleteRoutePairing(rowId);await pairQ.refetch();if(notify)notify("Your suggestion was removed.");}
    catch(err){const e=errLike(err);if(notify)notify("Couldn’t remove it — "+((e&&e.message)||"try again."));}
    finally{setBusy(false);}
  }
  if(!cards.length&&!uid&&!pairsUnavailable)return null;
  const btn={padding:"8px 12px",borderRadius:9,fontSize:12.5,fontWeight:700,cursor:busy?"default":"pointer"};
  /* A section of its own, so it takes the route page's section header (RSL): the 30px gap and the rule every other section has. It used a card title 16px under the "Got beta?" box and read as part of it (owner, 2026-10-15). */
  return <div style={{marginBottom:8}}><SL>PAIRS WELL WITH</SL>
    {pairsUnavailable?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:7}}>Couldn’t load the suggested pairings — this is not a claim that there are none. Check your connection and try again.</div>:null}
    {!cards.length&&!pairsUnavailable?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:7}}>No pairings yet. Know a climb worth doing the same day? Suggest it and it shows here and on that climb.</div>:null}
    {cards.map(function(o){return <div key={o.kind+o.id} {...clickable(function(){if(onOpenRoute)onOpenRoute(o.r2);})} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:ROUTE_GAP,border:"1px solid "+C.border,cursor:"pointer"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,minWidth:0,overflowWrap:"anywhere"}}>{o.r2.name}</span><span style={{fontSize:12,color:C.blue,fontWeight:600,flexShrink:0,marginLeft:8,whiteSpace:"nowrap"}}>{(o.r2.grade?o.r2.grade+" ":"")+"→"}</span></div>
      {o.note?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:3}}>{o.note}</div>:null}
      {o.kind!=="seed"?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:5}}><span style={{fontSize:11.5,color:C.textMuted}}>{o.kind==="logged"?"Logged the same day by "+plural(o.n):"Suggested by "+(o.mine?(o.n>1?"you and "+plural(o.n-1):"you"):plural(o.n))}</span>{o.mine?<button onClick={function(e){e.stopPropagation();remove(o.mine);}} disabled={busy} aria-label={"Remove your suggestion to pair with "+o.r2.name} style={{fontSize:11.5,fontWeight:700,color:C.textSub,background:"none",border:"none",padding:"8px 10px",margin:"-4px -6px -4px 4px",cursor:busy?"default":"pointer"}}>Remove</button>:null}</div>:null}
    </div>;})}
    {uid?(open?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:10,padding:"10px 12px",marginBottom:7}}>
      {pick?<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8}}><span style={{fontSize:13.5,fontWeight:700,minWidth:0,overflowWrap:"anywhere"}}>{pick.name}</span><button onClick={function(){setPick(null);}} disabled={busy} style={Object.assign({},btn,{background:C.surface,color:C.textSub,border:"1px solid "+C.border,padding:"5px 10px"})}>Change</button></div>
        <textarea value={note} onChange={function(e){setNote(e.target.value.slice(0,280));}} maxLength={280} rows={2} aria-label="Why these two climbs pair well" placeholder="Why do they pair well? (optional — e.g. same approach, both in the shade by noon)" style={{width:"100%",boxSizing:"border-box",background:C.surface,color:C.text,border:"1px solid "+C.border,borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"inherit",resize:"vertical"}}/>
        <div style={{fontSize:11,color:C.textMuted,textAlign:"right",marginTop:2}}>{note.length+" / 280"}</div>
      </div>:<div><div style={{fontSize:12.5,color:C.textSub,marginBottom:6}}>Pick the climb that pairs with this one.</div><DbClimbPicker onPickRoute={function(r){setPick(r);}}/></div>}
      <div style={{display:"flex",gap:12,marginTop:8}}>
        {pick?<button onClick={save} disabled={busy} aria-busy={busy?"true":undefined} style={Object.assign({},btn,{background:busy?C.border:C.blueSolid,color:C.onSolid,border:"none"})}>{busy?"Saving…":"Add pairing"}</button>:null}
        <button onClick={function(){setOpen(false);setPick(null);setNote("");}} disabled={busy} style={Object.assign({},btn,{background:C.surface,color:C.textSub,border:"1px solid "+C.border})}>Cancel</button>
      </div>
    </div>:<button onClick={function(){setOpen(true);}} style={Object.assign({},btn,{width:"100%",background:C.surface,color:C.blue,border:"1px solid "+C.border,marginBottom:7})}>+ Suggest a climb that pairs with this</button>):null}
  </div>;
}
