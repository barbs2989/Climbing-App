import { C } from "../../ClimbMatchCore.jsx";
import Bar from "./Bar.tsx";

/** The belay record as App builds it: the seed shape (`totalCatches`…), your real one (`real`: counted / awaiting / took, 0361) or another real climber's (`otherReal`, 0315). */
export interface Ledger {
  real?: boolean;
  otherReal?: boolean;
  counted?: number | null;
  partners?: number | null;
  awaiting?: number | null;
  took?: number | null;
  lastCatch?: string | null;
  totalCatches?: number | null;
  highFactorCatches?: number | null;
  partnersSigned?: number | null;
}
export interface CatchLedgerProps {
  ledger?: Ledger | null;
  /** The belay_catches read FAILED (not: the account has no catches) — every count prints "—". */
  unavailable?: boolean;
  /** Present on your own card only; opens Log a catch. */
  onLog?: () => void;
}
/** One count tile: label, value (a number, or "—"), colour. */
type Tile = [string, string | number | null | undefined, string];

/** CATCH RECORD on a profile: the counts something actually produces, a dash when the read failed, and Log a catch on your own. */
export default function CatchLedger({ledger,unavailable,onLog}: CatchLedgerProps){
  if(!ledger)return null;
  /* `unavailable` is the belay_catches read having FAILED, not the account having no
     catches. Those two produce a byte-identical ledger — totalCatches 0 and lastCatch ""
     — so without it this card tells a climber who has caught falls that they have caught
     none, and invites them to go log one. A dash says the number did not arrive; a 0 in a
     strip of three counts reads as a measurement. FullProfile renders another climber's
     ledger through the same component and passes nothing, which is correct: that data
     comes down with the profile rather than from this query. */
  const _n=(v?: number | string | null)=>(unavailable||v==null)?"—":v;
  /* A REAL ACCOUNT'S RECORD (`ledger.real`) says what the SERVER counts. Since 0361 a catch
     counts toward the Belay board only when BOTH climbers have recorded it (0194/0203 counted the
     caught climber's word alone). The card used to sum every "I caught X" row into a number
     headed VERIFIED, beside High-Factor and Partners Signed tiles nothing ever writes for a real
     account, while the Belay board counted none of it. So: what counts, what is waiting on the
     partner to log it, and the falls you took — each a number something actually produces. */
  /* ANOTHER real climber's record (0315, belay_ledgers): the catches their Belay board counts -- each
     recorded by both climbers (0361) -- how many climbers that covers, and the latest. Nothing records
     a fall's severity, so there is no High-Factor tile to fill, and none is shown. */
  if(ledger.otherReal){
    const tiles: Tile[]=[["Counted catches",_n(ledger.counted),C.green],["Climbers caught",_n(ledger.partners),C.blue]];
    return <div style={{background:C.card,borderRadius:12,padding:"15px 16px",border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:13}}>CATCH RECORD</div><div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:9,marginBottom:12}}>{tiles.map(x=><div key={x[0]} style={{textAlign:"center",background:C.surface,borderRadius:9,padding:"12px 6px"}}><div style={{fontSize:19,fontWeight:700,color:x[2]}}>{x[1]}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{x[0]}</div></div>)}</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>{unavailable?"Couldn’t load this climber’s catch record — try again in a moment.":(ledger.counted||0)>0?((ledger.lastCatch?"Last catch: "+ledger.lastCatch+". ":"")+"Each catch here was recorded by both climbers."):"No catches counted yet."}</div></div>;
  }
  if(ledger.real){
    const tiles: Tile[]=[["Counted",_n(ledger.counted),C.green],["Waiting on partner",_n(ledger.awaiting),C.amber],["Falls you took",_n(ledger.took),C.blue]];
    const any=(ledger.counted||0)+(ledger.awaiting||0)+(ledger.took||0)>0;
    return <div style={{background:C.card,borderRadius:12,padding:"15px 16px",border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:13}}>CATCH RECORD</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:12}}>{tiles.map(x=><div key={x[0]} style={{textAlign:"center",background:C.surface,borderRadius:9,padding:"12px 6px"}}><div style={{fontSize:19,fontWeight:700,color:x[2]}}>{x[1]}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{x[0]}</div></div>)}</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>{unavailable?"Couldn’t load your catch record — try again in a moment.":any?((ledger.lastCatch?"Last catch: "+ledger.lastCatch+". ":"")+"A catch counts toward the belayer’s record and the Belay board once both climbers have recorded it — whoever logs it, the other confirms."):"No catches logged yet. When a partner catches your fall, log it here or when you log the climb — it counts on their belay record once they confirm it."}</div>{onLog&&!unavailable?<button onClick={onLog} style={{width:"100%",marginTop:12,padding:10,background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:10,fontSize:13.5,cursor:"pointer",fontWeight:700}}>Log a catch</button>:null}</div>;
  }
  const seedTiles: Tile[]=[["Total Catches",_n(ledger.totalCatches),C.blue],["High-Factor",_n(ledger.highFactorCatches),C.amber],["Partners Signed",_n(ledger.partnersSigned),C.green]];
  const _hfr=(unavailable||!((ledger.totalCatches||0)>0))?null:Math.round(((ledger.highFactorCatches||0)/(ledger.totalCatches||0))*100);
  return <div style={{background:C.card,borderRadius:12,padding:"15px 16px",border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:13}}>CATCH RECORD</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:14}}>{seedTiles.map(x=><div key={x[0]} style={{textAlign:"center",background:C.surface,borderRadius:9,padding:"12px 6px"}}><div style={{fontSize:19,fontWeight:700,color:x[2]}}>{x[1]}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{x[0]}</div></div>)}</div><div style={{fontSize:12,color:C.textMuted,marginBottom:7}}>{"High-factor catch ratio"+(unavailable?" · —":_hfr==null?"":" · "+_hfr+"%")}</div><Bar val={_hfr||0} color={C.amber}/>{/* With no catches lastCatch is "", which rendered a dangling "Last catch: · 0". */}
  <div style={{fontSize:12,color:C.textMuted,marginTop:10}}>{ledger.lastCatch?("Last catch: "+ledger.lastCatch+" · "+ledger.partnersSigned+" partner"+(ledger.partnersSigned===1?"":"s")+" signed"):unavailable?"Couldn’t load "+(onLog?"your":"this climber’s")+" catch record — try again in a moment.":((ledger.totalCatches||0)>0)?(ledger.partnersSigned+" partner"+(ledger.partnersSigned===1?"":"s")+" signed these catches"):"No catches logged yet."}</div>{onLog&&!unavailable?<button onClick={onLog} style={{width:"100%",marginTop:12,padding:10,background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:10,fontSize:13.5,cursor:"pointer",fontWeight:700}}>Log a catch</button>:null}</div>;
}
