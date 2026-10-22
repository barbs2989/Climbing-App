import { useEffect, type CSSProperties, type ReactNode } from "react";
import { C, MOUNTAINS, inArea } from "../../ClimbMatchCore.jsx";
import { useAreaChildren } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";

/** A seed area node (one entry of `MOUNTAINS`): what `hasArea` is asked about on the seed path. */
export type SeedArea = (typeof MOUNTAINS)[number];
/** The columns of an `areas` row this component reads (`useAreaChildren` selects every column). */
interface DbArea { id: string; name: string; route_count: number; }
/** The slice of a `useAreaChildren` result this component reads. */
interface AreaQuery { data?: DbArea[]; isLoading?: boolean; isError?: boolean; }
/** What both paths have in common once filtered: an option for a select. */
interface Place { id: string; name: string; }

export interface AreaRegionSelectProps {
  areaCountry: string;
  setAreaCountry: (id: string) => void;
  areaState: string;
  setAreaState: (id: string) => void;
  areaId: string;
  setAreaId: (id: string) => void;
  /** Seed path only: keeps an area in a list when the caller has something filed under it (a crew, a route). */
  hasArea: (a: SeedArea) => boolean;
  /** A line under the selects — a node, or a function of the selected place's name. */
  footer?: ReactNode | ((selName: string) => ReactNode);
  /** Told the selected place's name whenever it changes. */
  onName?: (name: string) => void;
}

/* THE WHOLE CATALOG, NOT THE SEED TREE. This picker read MOUNTAINS -- one country, four states --
   filtered by whether a SEED route sat inside, so on the live app a climber was offered the United
   States only, a handful of states, and under Washington just North Cascades and Mt Baker, while
   `areas` holds two countries, 52 states and provinces and twelve Washington regions. With the DB
   on, each level is that level's real children holding at least one route; the seed tree stays the
   demo's source. `footer` may be a function of the chosen place's NAME, and `onName` reports it,
   because a DB area id means nothing to MOUNTAINS -- the name is what both trees share.
   The State box used to carry cm-fsm (13px) while Country took the global 16px input rule, so the
   two sat side by side at different sizes; all three boxes now share the one rule. */
/**
 * Country › State/Province › Region/area: three selects over the catalog (the DB `areas` tree when `USE_DB`,
 * the seed `MOUNTAINS` tree otherwise). Each level narrows the next; the third is disabled until a state is
 * picked. A DB read that fails says so under the selects instead of offering an empty list.
 */
export default function AreaRegionSelect({ areaCountry, setAreaCountry, areaState, setAreaState, areaId, setAreaId, hasArea, footer, onName }: AreaRegionSelectProps) {
  const cQ: AreaQuery = useAreaChildren(null, { enabled: USE_DB }), sQ: AreaQuery = useAreaChildren(areaCountry || null, { enabled: USE_DB && !!areaCountry }), rQ: AreaQuery = useAreaChildren(areaState || null, { enabled: USE_DB && !!areaState });
  const byName = (a: DbArea, b: DbArea) => String(a.name).localeCompare(String(b.name));
  const live = (q: AreaQuery) => ((q && q.data) || []).filter(a => a.route_count > 0);
  const countries: Place[] = USE_DB ? live(cQ) : MOUNTAINS.filter(a => a.areaType === "country" && hasArea(a));
  const states: Place[] = USE_DB ? live(sQ).slice().sort(byName) : MOUNTAINS.filter(a => a.areaType === "state" && a.parentId === areaCountry && hasArea(a));
  const regions: Place[] = !areaState ? [] : USE_DB ? live(rQ).slice().sort(byName) : MOUNTAINS.filter(a => a.id !== areaState && ["range", "region", "canyon", "peak", "wall", "crag"].indexOf(a.areaType) >= 0 && inArea(a.id, areaState) && hasArea(a));
  const placesUnavailable = USE_DB && (cQ.isError || sQ.isError || rQ.isError);
  const sub = areaCountry === "canada" ? "Province" : "State";
  const nameOf = (list: Place[], id: string) => { const hit = id ? list.find(a => a.id === id) : undefined; return (hit && hit.name) || ""; };
  const selName = nameOf(regions, areaId) || nameOf(states, areaState) || nameOf(countries, areaCountry);
  useEffect(() => { if (onName) onName(selName); }, [selName]); // eslint-disable-line react-hooks/exhaustive-deps -- the effect is about the NAME changing; onName is an inline arrow in its caller, so listing it would re-fire the effect on every render
  const hd: CSSProperties = {fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9};
  const box: CSSProperties = {width:"100%",height:44,boxSizing:"border-box",padding:"0 11px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontWeight:600};
  const loading = (q: AreaQuery) => USE_DB && q.isLoading ? <option value="" disabled>Loading…</option> : null;
  const foot = typeof footer === "function" ? footer(selName) : footer;
  return <div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div style={{minWidth:0}}><div style={hd}>Country</div><select aria-label="Filter by country" value={areaCountry} onChange={e=>{setAreaCountry(e.target.value);setAreaState("");setAreaId("");}} style={box}>{!countries.length?loading(cQ):null}{countries.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div><div style={{minWidth:0}}><div style={hd}>{sub}</div><select aria-label={"Filter by "+sub.toLowerCase()} value={areaState} onChange={e=>{setAreaState(e.target.value);setAreaId("");}} style={box}><option value="">{"All "+sub.toLowerCase()+"s"}</option>{!states.length?loading(sQ):null}{states.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div><div style={{gridColumn:"1 / -1"}}><div style={hd}>Region / area</div><select aria-label="Filter by area" value={areaId} onChange={e=>setAreaId(e.target.value)} disabled={!areaState} style={{...box,background:areaState?C.surface:C.card,opacity:areaState?1:0.6}}><option value="">{areaState?"All areas in this "+sub.toLowerCase():"Pick a "+sub.toLowerCase()+" first"}</option>{areaState&&!regions.length?loading(rQ):null}{regions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div></div>{placesUnavailable?<div style={{fontSize:12,color:C.amber,marginTop:8,lineHeight:1.5}}>Couldn’t load the list of places — check your connection and try again.</div>:null}{foot?<div style={{fontSize:11.5,color:C.textMuted,marginTop:8}}>{foot}</div>:null}</div>;
}
