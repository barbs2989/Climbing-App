import { ME, CAT, C } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import Bar from "./Bar.tsx";

/* ProvenancePanel (the DATA CONFIDENCE box) was removed with its only call site: it and
   DATA QUALITY both answered "how complete is this route's data" at the top of Overview,
   and per-section GapNotes answer it where it is actionable instead. Its 'Confirm accurate'
   action went with it — nothing else called onConfirmData, so that wiring is gone from
   ClimbMatch.jsx too. */
function axBlurb(key: string,disc?: string | null){
  const D: Record<string, Record<string, string>>={
    physical:{_:"How hard your body has to work — power, stamina, and endurance.",bouldering:"Raw power and body tension — how hard you pull and squeeze on each move.",sport:"Sustained pump and power held over the whole pitch.",trad:"Strenuous climbing, plus hanging on long enough to place gear.",ice:"Calf and forearm endurance from swinging tools and kicking crampons.",mixed:"Power and core tension on steep tooling with little rest.",aid:"Less raw power, more grind — hauling, jugging, and long hours on the wall.",alpine:"Whole-day endurance: vertical gain, pack weight, altitude, and distance.",mountaineering:"Whole-day endurance: vertical gain, pack weight, altitude, and distance.",scrambling:"Aerobic effort — distance, elevation gain, and time on your feet.",hiking:"Aerobic effort — distance, elevation gain, and time on your feet."},
    technical:{_:"How skilled and precise the movement and technique need to be.",bouldering:"Intricate, precise movement — balance, heel hooks, exact body positions.",sport:"Movement difficulty — how technical the hardest sequences are.",trad:"Hard moves, plus the skill to place solid protection while climbing.",ice:"Tool and crampon technique — reading the ice and placing tools cleanly.",mixed:"Dry-tooling precision and linking moves from rock to ice.",aid:"Aid craft — placing and trusting marginal gear and running the systems.",alpine:"Mixed skills — snow, rock, and route management while moving.",mountaineering:"Mixed skills — snow, rock, and route management while moving.",scrambling:"Hands-on moves and careful footwork on steep, exposed ground.",hiking:"Footing and balance on rough or steep trail."},
    exposure:{_:"How airy the position feels and how consequential a fall would be.",bouldering:"Usually low — you are close to the pads, though highballs raise the stakes.",ice:"Airy positions, plus the danger of falling onto tools and ice.",mixed:"Airy positions, plus the danger of falling onto tools and ice.",aid:"How airy the wall feels and how serious a fall or gear failure would be.",alpine:"Big-mountain exposure — drop-offs where a slip has real consequences.",mountaineering:"Big-mountain exposure — drop-offs where a slip has real consequences.",scrambling:"Big drop-offs with no rope — a slip can be serious.",hiking:"Generally low; any notable drop-offs are flagged."},
    commitment:{_:"How committing the route is and how hard it is to back off once started.",bouldering:"Low — you can step or down-climb off most problems anytime.",sport:"Moderate — retreat usually just means lowering off.",trad:"How hard it is to retreat once committed, and how much gear it takes.",ice:"Retreat can mean cold V-thread rappels; weather closes the window.",mixed:"Retreat can mean cold V-thread rappels; weather closes the window.",aid:"High — a wall commits you to the route and a planned descent.",alpine:"How much of a full day (or more) it demands, and how hard it is to turn back.",mountaineering:"How much of a full day (or more) it demands, and how hard it is to turn back.",scrambling:"Committing ground where reversing can be harder than going up.",hiking:"Mostly distance and daylight — turning back is usually straightforward."},
    routefinding:{_:"How hard it is to find and follow the correct line.",bouldering:"Minimal — the problem and its holds are right in front of you.",sport:"Usually straightforward — follow the bolts.",trad:"Reading the line and the right gear placements as you go.",ice:"Picking and protecting a line through the ice features.",mixed:"Picking and protecting a line through ice and rock features.",aid:"Following the crack systems and the topo.",alpine:"Real navigation — glaciers, couloirs, and finding the way in changing conditions.",mountaineering:"Real navigation — glaciers, couloirs, and finding the way in changing conditions.",scrambling:"Easy to wander off the safe line; staying on route is a skill.",hiking:"Following the trail and any junctions or off-trail sections."},
    power:{_:"How much raw strength the hardest moves demand.",bouldering:"Raw power and body tension — how hard you pull and squeeze on each move.",sport:"Big, strenuous moves — how much pull the crux needs."},
    endurance:{_:"How long the pump lasts — many hard moves in a row, with little rest.",sport:"How long the pump lasts — many hard moves in a row, with little rest."},
    fingery:{_:"How much the holds demand small edges, crimps and pinches.",bouldering:"How much the holds demand small edges, crimps and pinches.",sport:"How much the holds demand small edges, crimps and pinches."},
    mental:{_:"How much headspace the route asks for.",sport:"How much headspace the route asks for — run-outs, fluttery moves or a big fall."},
    protection:{_:"How far apart the gear is and how bad a fall would be.",trad:"How far apart the gear is and how bad a fall would be. Higher means bolder, with long runouts between placements."},
    sustained:{_:"How long the difficulty lasts with few rests.",trad:"How long the difficulty lasts with few rests, from the first move to the anchor."},
    strenuous:{_:"How hard the body works overall.",trad:"How hard the body works overall — pulling, jamming and stemming across the whole pitch."},
    height:{_:"How far a fall would be.",bouldering:"How high the problem is, so how far a fall would be. Higher means more landing to worry about."},
    landing:{_:"How rough the landing is and how well it is covered.",bouldering:"How rough or uneven the landing is, and how well the pads and spotters cover it. Higher means a worse landing."}
  };
  const m=D[key]||{};return m[disc as string]||m._;
}
/* The radar's axes are per discipline: sport, trad and bouldering each ask their own questions
   (migration 0374 widened the stored axis list to match). Every other discipline keeps the
   original five, so the ratings already stored for those routes still read the same way. */
const DIFF_AXES_BY_DISC: Record<string, string[][]>={
  sport:[["power","Power","Pow"],["technical","Technical","Tech"],["endurance","Endurance","Endu"],["fingery","Fingery","Fing"],["mental","Mental","Ment"]],
  trad:[["protection","Protection","Prot"],["technical","Technical","Tech"],["sustained","Sustained","Sust"],["strenuous","Strenuous","Stren"],["commitment","Commitment","Comm"]],
  bouldering:[["power","Power","Pow"],["technical","Technical","Tech"],["fingery","Fingery","Fing"],["height","Height","Ht"],["landing","Landing","Land"]]
};
const DIFF_AXES_DEFAULT: string[][]=[["physical","Physical","Phys"],["technical","Technical","Tech"],["exposure","Exposure","Expo"],["commitment","Commitment","Comm"],["routefinding","Route-finding","Route"]];
function diffAxesFor(disc?: string | null){return DIFF_AXES_BY_DISC[disc as string]||DIFF_AXES_DEFAULT;}
export interface DiffRadarProps {
  /** The route's discipline category; picks the axes. */
  disc?: string | null;
  /** Climbers' 1-5 reads: axis -> climber id -> rating. */
  ratings?: Record<string, Record<string, number>> | null;
  /** Records the viewer's read of one axis; the buttons do nothing without it. */
  onRate?: ((axis: string, value: number) => void) | null;
  meta?: {
    /** Whose read is "yours"; defaults to the signed-in climber. */
    myId?: string | number | null;
    /** The ratings could not be loaded. */
    unavailable?: boolean;
    loading?: boolean;
    /** The viewer's read is shared (signed in), not kept on this device. */
    shared?: boolean;
  } | null;
}

/* Moved verbatim from RouteDetail.jsx; only the types were added.
   DIFFICULTY BREAKDOWN is the CLIMBERS' read, and only theirs. It used to blend in a seeded
   base profile (`route.difficulty`, written by enrichment on ~8k routes) at the weight of six
   votes, so a route nobody had rated still printed a confident 4/5 and the first real climber's
   read barely moved it. The owner reset it on 2026-09-30: every route starts unrated and the
   score is the plain average of climbers' own reads, so it fills in as the app grows. The column
   is still in the DB and deliberately unread here — check:field-renders records that in KNOWN. */
export default function DiffRadar({disc,ratings,onRate,meta}: DiffRadarProps){
  const rt=ratings||{};const mt=meta||{};const myId=mt.myId!=null?mt.myId:ME.id;const votesOf=(k: string)=>Object.keys(rt[k]||{}).map(function(uid){return rt[k][uid];});const dv=(k: string)=>{const votes=votesOf(k);if(!votes.length)return null;return Math.round((votes.reduce(function(s,v){return s+v;},0)/votes.length)*10)/10;};
  const ax=diffAxesFor(disc),N=ax.length,R=50,cx=70,cy=62,pt=(i: number,r: number)=>{const a=-Math.PI/2+i*2*Math.PI/N;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];},anyRated=ax.some(x=>dv(x[0])!=null),raters=new Set(([] as string[]).concat.apply([],ax.map(x=>Object.keys(rt[x[0]]||{})))).size,poly=ax.map((x,i)=>pt(i,((dv(x[0])||0)/5)*R).join(",")).join(" "),grid=[1,2,3,4,5].map(g=>ax.map((_,i)=>pt(i,(g/5)*R).join(",")).join(" "));
  const dl=(CAT[disc as keyof typeof CAT]||{}).label||disc||"this route";const col=(v: number | null)=>v==null?C.textMuted:v>=4?C.red:v>=3?C.amber:C.green;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:2}}>DIFFICULTY BREAKDOWN</CardHead><div style={{fontSize:12,color:C.textMuted,marginBottom:9,lineHeight:1.5}}>{anyRated?<>A 1–5 read on what makes this hard, and what each part means for {dl} — the average of {raters===1?"one climber's own read":raters+" climbers' own reads"} below.</>:mt.unavailable?<>Couldn’t load climbers' ratings for this route — try again in a moment.</>:mt.loading?<>Loading climbers' ratings…</>:<>Nobody has rated this one yet. Climbed it? Add your 1–5 read on each part below, and it fills in as more climbers do.</>}</div><div style={{marginBottom:8}}><svg width="200" height="186" viewBox="0 -6 140 130" style={{display:"block",margin:"0 auto 12px"}}>{grid.map((g,i)=><polygon key={i} points={g} fill="none" stroke={C.border} strokeWidth="1"/>)}{ax.map((_x,i)=>{const[ex,ey]=pt(i,R);return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke={C.border} strokeWidth="1"/>;})}{anyRated?<polygon points={poly} fill={`${C.blue}33`} stroke={C.blue} strokeWidth="2"/>:null}{ax.map((x,i)=>{const[lx,ly]=pt(i,R+10);return <text key={i} x={lx} y={ly} fontSize="7.5" fill={C.textSub} textAnchor="middle" dominantBaseline="middle">{x[2]}</text>;})}</svg><div>{ax.map(x=>{const cur=dv(x[0]);const mine=(rt[x[0]]||{})[myId];const nRated=votesOf(x[0]).length;return <div key={x[0]} style={{marginBottom:7}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:12,color:C.textSub,width:74,flexShrink:0}}>{x[1]}</span><div style={{flex:1}}><Bar val={cur||0} max={5} color={col(cur)} h={5}/></div><span style={{fontSize:13,fontWeight:600,color:cur==null?C.textMuted:C.textSub,width:34,textAlign:"right"}}>{cur==null?"—":cur+"/5"}</span></div><div style={{display:"flex",alignItems:"center",gap:7,paddingLeft:80,flexWrap:"wrap",marginTop:4}}><span style={{fontSize:11.5,color:C.textMuted,marginRight:2}}>your read</span>{[1,2,3,4,5].map(v=><button key={v} onClick={()=>onRate&&onRate(x[0],v)} aria-pressed={mine===v} aria-label={x[1]+": rate "+v+" of 5"} style={{width:44,height:44,margin:-7,display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",cursor:"pointer",padding:0,flexShrink:0}}><span style={{width:30,height:30,boxSizing:"border-box",borderRadius:"50%",border:"1.5px solid "+(mine===v?C.blue:C.border),background:mine===v?C.blueSolid:"transparent",color:mine===v?C.onSolid:C.textMuted,fontSize:14,fontWeight:700,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>{v}</span></button>)}{mine!=null?<span style={{fontSize:11.5,color:C.blue,marginLeft:3}}>{mt.shared?("✓ counted · "+(nRated>1?nRated+" climbers rated":"the first read")):"only you see this — sign in to share it"}</span>:(nRated?<span style={{fontSize:11.5,color:C.textMuted,marginLeft:3}}>{nRated+" climber"+(nRated!==1?"s":"")+" rated"}</span>:anyRated?<span style={{fontSize:11.5,color:C.textMuted,marginLeft:3}}>no reads yet</span>:null)}</div></div>;})}</div></div><div style={{marginTop:6,borderTop:`1px solid ${C.borderLight}`,paddingTop:8}}>{ax.map(x=><div key={x[0]} style={{marginBottom:7}}><div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:12,fontWeight:700,color:col(dv(x[0]))}}>{x[1]}</span><span style={{fontSize:12,color:C.textMuted}}>{dv(x[0])==null?"not rated yet":dv(x[0])+"/5 · "+votesOf(x[0]).length+" rated"}</span></div><div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:1}}>{axBlurb(x[0],disc)}</div></div>)}</div></div>;
}
