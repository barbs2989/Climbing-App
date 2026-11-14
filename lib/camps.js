import { wpIs, scarfHrs, cumMi, uDistMi, uElev, shortDate } from "../ClimbMatchCore.jsx";
import { pointOf } from "./track";

/* `bivy[].elev` holds FEET and `bivy[].elevM` holds METRES, and the two NEVER co-occur —
   measured on the live catalog: of 175 sites, 77 carry elev, 55 carry only elevM, 43 carry
   neither, and 0 carry both. So this column holds two conventions, the shape dist_km and
   gain_ft already record. uElev() takes feet, so reading `elev` alone silently rendered NO
   elevation for 31% of sites. Converted at READ time, never normalised in the DB — the same
   rule the waypoint vocabulary follows. */
export function campElevFt(s){
  if(!s)return null;
  if(s.elev!=null)return s.elev;
  if(s.elevM!=null)return s.elevM*3.28084;
  return null;
}
/* The TRAILHEAD is the only thing either number can be measured FROM, and the waypoint store is
   its only record. Measured on the live catalog: of 800 routes carrying camping, 687 have a
   trailhead elevation on a waypoint, ZERO have one only in `approach_logistics`, and the 2 that
   carry both agree exactly — so there is no second source to reconcile and the figure cannot
   depend on which record happened to be read. The other way this silently goes wrong is a route
   with TWO trailheads, where "the" trailhead is arbitrary; measured at 0 of 757 camping routes,
   so taking the first is safe here in a way it would not be catalog-wide. */
export function trailheadPin(route){
  const ws=Array.isArray(route.waypoints)?route.waypoints:[];
  for(let i=0;i<ws.length;i++)if(wpIs(ws[i],"Trailhead"))return ws[i];
  return null;
}
export function trailheadFt(route){
  const w=trailheadPin(route);
  return w?campElevFt(w):null;
}
/* TRAIL distance, and only trail distance. A campsite WAYPOINT records distMi/distKm — the walked
   path — on 410 of 445 sites. The researched `bivy` store records no distance under any spelling
   (measured: 5,083 sites, zero distance-ish keys) and carries a coordinate on 4 of them, so there
   is nothing to read and nothing to compute. A straight line between two points is NOT this
   number and must never be substituted for it: a trail cannot be SHORTER than its own chord,
   which is the entire premise of audit:waypoint-distances. A site with no recorded distance
   therefore shows none, which is the honest answer rather than a plausible one. */
export function campDistMi(w){
  if(!w)return null;
  if(w.distMi!=null&&w.distMi!=="")return Number(w.distMi);
  if(w.distKm!=null&&w.distKm!=="")return Number(w.distKm)/1.60934;
  return null;
}
/* A camp's distinctive words: the FIRST clause of its name ("Home Lake, below Constance Pass" ->
   "Home Lake"), minus the landform and camp words every name shares. Upper/lower/middle are KEPT —
   "Lower Blum Lake" and "Middle Blum Lake" are two lakes 100 ft apart on one route. */
export const CAMP_WORDS=new Set(["the","and","of","at","on","to","in","near","below","above","under","beside","basin","camp","camps","campsite","site","sites","bivy","bivies","bivouac","bivouacs","lake","lakes","pass","col","saddle","ridge","creek","glacier","valley","meadow","meadows","summit","peak","high","low","former","trail","end","base","area","mount","mt"]);
export function campWords(name){
  const head=String(name||"").split(/[,(—–]|\s-\s/)[0].toLowerCase().replace(/[^a-z0-9]+/g," ");
  return new Set(head.split(" ").filter(t=>t.length>2&&!CAMP_WORDS.has(t)));
}
/* ONE PLACE, TWO RECORDS: both carry a height, the heights agree within 150 ft, and every distinctive
   word of the shorter name is in the longer. A name alone is not enough ("Eldorado Basin camp" and
   "Eldorado East Ridge rock bivies" are a basin and a ridge), and a height alone is not either; so a
   record with no height never matches, and the two stay listed rather than one being guessed away.
   Exported so check:camping asks the rule directly. */
export function samePlaceCamp(a,b){
  const ea=campElevFt(a),eb=campElevFt(b);
  if(ea==null||eb==null||Math.abs(ea-eb)>150)return false;
  const x=campWords(a&&a.name),y=campWords(b&&b.name);
  if(!x.size||!y.size)return false;
  const [s,l]=x.size<=y.size?[x,y]:[y,x];
  return [...s].every(t=>l.has(t));
}
/* WHICH NIGHT OF THE PUBLISHED TRIP PLAN SLEEPS HERE. A day's camp is where the day ENDS, so only
   the destination half of a day is read: the text after the title's last " to " ("Approach to
   Glacier Gap camp"), an objective that starts by naming an arrival ("Reach Camp Muir"), or what
   follows "return to" ("Climb Mount Christie and return to Low Divide"). Reading the whole day
   tagged the place a day LEAVES — "Ferry Basin to Queets Basin" would have put night 3 in Ferry
   Basin. The last day is never a night. Returns the night numbers; empty when the plan does not
   name this place, which is the common case and says nothing. */
export function campNightsOf(route,name){
  const days=(route&&route.itinerary&&Array.isArray(route.itinerary.days))?route.itinerary.days:[];
  if(days.length<2)return [];
  const place=String(name||"").split(/[,(—–]|\s-\s/)[0].trim().toLowerCase();
  if(place.length<4)return [];
  const low=v=>String(v==null?"":v).toLowerCase();
  const out=[];
  days.slice(0,-1).forEach(function(d,i){
    const t=low(d&&d.title),o=low(d&&d.objective);
    const k=t.lastIndexOf(" to "),r=o.indexOf("return to ");
    const ends=[k>=0?t.slice(k+4):"",/^(reach|establish|set up|backpack in to|hike in to|camp at)\b/.test(o)?o:"",r>=0?o.slice(r+10):""];
    if(ends.some(e=>e.includes(place)))out.push(i+1);
  });
  return out;
}
export function campNightsLabel(nights,dayCount){
  if(!nights||!nights.length)return "";
  const run=nights.length>1&&nights[nights.length-1]-nights[0]===nights.length-1;
  return (nights.length>1?"Nights ":"Night ")+(run?nights[0]+"–"+nights[nights.length-1]:nights.join(", "))+" of the "+dayCount+"-day trip plan";
}
/* THE WALK IN, AT THE PACE THE CLIMBER SET IN THE PLANNER. The same scarfHrs() the planner's
   approach tile uses, fed the camp's trail distance and its gain or loss from the trailhead — so it
   moves when they change fitness or pack, which is what makes it THEIR number. Null unless BOTH are
   known: a time from distance alone would leave out the climb, which is most of the effort to a high
   camp, and would read fast in exactly the dangerous direction. */
export function campWalkHrs(s,calc){
  if(!s||s.distMi==null||!isFinite(s.distMi)||s.distMi<0.2||s.gainFt==null||!isFinite(s.gainFt))return null;
  const c=calc||{};
  return scarfHrs(s.distMi*1.60934,Math.max(s.gainFt,0)/3.28084,Math.max(-s.gainFt,0)/3.28084,c.fit||"intermediate",c.pack!=null?c.pack:10);
}
/* Exported so the log form asks WHERE YOU CAMPED from the same list the Planner draws. */
export function campSites(route){
  /* role "hidden" is a STUB naming a Campsite PIN that does not belong in this route's list (another
     approach's camp, or a second pin for a place already listed). The pin stays on the map; only the
     camping list skips it. It lives in `bivy`, not on the pin, because the waypoint editor rebuilds
     every pin from a fixed key list and would wipe a flag the next time anybody edited a waypoint. */
  const _all=Array.isArray(route.bivy)?route.bivy:[];
  const _hk=v=>String((v==null?"":v)).trim().toLowerCase();
  const hidden=new Set(_all.filter(b=>b&&String(b.role||"").toLowerCase()==="hidden").map(b=>_hk(b.name)));
  const bivy=_all.filter(b=>!(b&&String(b.role||"").toLowerCase()==="hidden"));
  const thFt=trailheadFt(route);
  const gainOf=function(ft){return (ft==null||thFt==null)?null:ft-thFt;};
  const key=v=>String((v==null?"":v)).trim().toLowerCase();
  const seen=new Set(bivy.map(b=>key(b&&b.name)).filter(Boolean));
  const wpAll=(Array.isArray(route.waypoints)?route.waypoints:[]).filter(w=>wpIs(w,"Campsite"));
  /* THE SAME CAMP UNDER TWO SPELLINGS. An exact name is the only match the two stores used to
     share, and on 2026-10-22 22 of 745 route lists still drew a place twice because the pin and the
     researched site spelled it differently — Black Peak "Wing Lake" at 6,900 ft and "Wing Lake camp"
     at 6,923, five Monk routes "Upper Cathedral Lake basin" and "Upper Cathedral Lake"
     (scripts/oneoff/measure-camp-list-duplicates.mjs --strict). Glacier Peak's "Mackinaw Shelter
     camp, North Fork Sauk" had been kept single only by a hidden stub, which also kept it from the
     pin's 5-mile distance.
     samePlaceCamp() pairs a pin with a site when both carry a height and they agree; that pin then
     merges in exactly as a same-named one does, lending its distance. Even a pin a hidden stub keeps
     out of the list may lend it — hiding it says "not its own row", not "not this place". */
  const fuzzy=new Map();
  bivy.forEach(function(b){
    if(!b||wpAll.some(w=>key(w&&w.name)===key(b.name)))return;
    let best=null;
    wpAll.forEach(function(w){
      if(seen.has(key(w&&w.name))||[...fuzzy.values()].includes(w)||!samePlaceCamp(b,w))return;
      if(!best||Math.abs(campElevFt(w)-campElevFt(b))<Math.abs(campElevFt(best)-campElevFt(b)))best=w;
    });
    if(best)fuzzy.set(b,best);
  });
  const merged=new Set(fuzzy.values());
  const wps=wpAll.filter(w=>!seen.has(key(w&&w.name))&&!hidden.has(key(w&&w.name))&&!merged.has(w));
  /* A researched site and a Campsite PIN with the same name are one place, and the pin is the half
     that knows how far up the trail it is (92% of pins carry a distance, 0 of the bivy store do).
     The pin used to be DROPPED on a name match, taking its distance with it; now the site keeps
     the researched prose and borrows the pin's distance and its "on the track" chip. */
  const pinOf=function(b){const k=key(b&&b.name);return (k?wpAll.find(w=>key(w&&w.name)===k):null)||fuzzy.get(b)||null;};
  /* AND THE SAME TEST THE WAYPOINT LIST APPLIES TO A LEG, applied to the whole walk in. A camp's
     `distMi` is cumulative from the trailhead, so it cannot be less than the straight line from
     the trailhead PIN either — and 35 of the 412 distances this panel prints are.
     `wa_poltergeist_pinnacle` printed "Boundary Camp · 8.0 mi" for a camp 21.8 miles out. It
     matters more here than in the list above: this is the number a party uses to decide whether
     they can reach camp on day one. `legMi` is the same one-sided rule — the trailhead's own
     `distMi` is 0, so |camp - trailhead| IS the cumulative distance. A site whose number cannot
     be true shows none, never a substituted chord. */
  const _campMi=function(w){
    const mi=campDistMi(w);
    return mi==null?null:cumMi(route.waypoints,Object.assign({},w,{distMi:mi}));
  };
  /* "Marked on the track" (`onTrack`) means the camp is a pin the ROUTE TRACK map DRAWS, so it needs a
     coordinate, not just a pin: audit:camp-pins found 48 Campsite pins with no lat/lng wearing the chip
     (2026-10-28). A pin that cannot be drawn lends its name and distance, never that claim. */
  /* `type` is camp | bivy | hut on the 77 sites that carry it. It is the one field that says
     WHICH of the two things this section merges you are looking at, so it earns a chip. */
  /* The label for `camp` is deliberately the neutral "Camp", NOT "Established camp": a dispersed
     basin site and a developed campground are both stored as `camp`, so the stronger word would
     be a false claim on every dispersed site. The capacity chip carries that distinction. */
  const TYPE={camp:"Camp",bivy:"Bivy",hut:"Hut"};
  /* The waypoint half reads its elevation through campElevFt() too, not `w.elev` raw. Waypoints
     carry the same two conventions the bivy store does, so reading one spelling silently rendered
     no elevation for the sites that use the other — and an elevation missing is also a GAIN
     missing, so the defect compounds now rather than merely showing one blank. */
  /* `role` says what the site is FOR on this route: "main" = where a typical party on this route
     sleeps, "route" = on the route's own line, kept for a slow party, weather or an emergency.
     Researched per route (enrichment-wip/camping-roles), because one corridor-wide list had been
     handed to every route in it — 799 routes shared 174 lists, up to 16 camps each. A Campsite
     pin is on the route's own track by definition, so an unmatched pin is "route". A site with no
     role (a contribution from before the field existed, or one marked "Not sure") is null and carries
     no use tag (campRoleLabel). */
  const ROLE={main:"main",route:"route"};
  return campRouteOrder(bivy.map(b=>{const p=pinOf(b);const el=campElevFt(b)!=null?campElevFt(b):(p?campElevFt(p):null);return {name:b&&b.name,elev:el,gainFt:gainOf(el),distMi:p?_campMi(p):null,kind:(b&&TYPE[String(b.type||"").toLowerCase()])||null,capacity:b&&b.capacity,water:b&&b.water,permit:b&&b.permit,notes:b&&b.notes,onTrack:!!(p&&pointOf(p)),role:(b&&ROLE[String(b.role||"").toLowerCase()])||null,sorted:!!(b&&ROLE[String(b.role||"").toLowerCase()]),nights:campNightsOf(route,b&&b.name)};})
    .concat(wps.map(w=>({name:w&&w.name,elev:campElevFt(w),gainFt:gainOf(campElevFt(w)),distMi:_campMi(w),kind:null,notes:(w&&w.directions)||"",onTrack:!!pointOf(w),role:"route",nights:campNightsOf(route,w&&w.name)}))));
}
/* IN THE ORDER A PARTY REACHES THEM, walking in from the trailhead (owner, 2026-10-24: "ordered by
   where people would camp if they were doing the whole route"). It replaced three USE groups —
   where most parties sleep / other options / not yet sorted — under which a high camp could print
   above the valley campground you sleep at the night before; the use is now a tag on each site.
   Distance from the trailhead decides first: every site with one is a fixed point on the walk in.
   A site with no distance is placed by its HEIGHT, before the first fixed site higher than it — a
   walk in to a climb goes UP, and a campground below the trailhead is where the trip starts. A
   site with neither keeps its stored place at the END, never guessed into the middle. Ties keep
   the stored order, which the research wrote in walking order. Exported so check:camping asks it. */
export function campRouteOrder(list){
  const all=(list||[]).map(function(s,i){return {s:s,i:i};});
  const num=function(v){return v!=null&&isFinite(v);};
  const chain=all.filter(function(x){return num(x.s&&x.s.distMi);}).sort(function(a,b){return a.s.distMi-b.s.distMi||(num(a.s.elev)&&num(b.s.elev)?a.s.elev-b.s.elev:0)||a.i-b.i;});
  const byElev=all.filter(function(x){return !num(x.s&&x.s.distMi)&&num(x.s&&x.s.elev);}).sort(function(a,b){return a.s.elev-b.s.elev||a.i-b.i;});
  const rest=all.filter(function(x){return !num(x.s&&x.s.distMi)&&!num(x.s&&x.s.elev);});
  const out=chain.slice();
  byElev.forEach(function(x){
    /* Before the first FIXED site above it, and after any height-placed site already there at or below its height. */
    let at=out.findIndex(function(y){return num(y.s.distMi)&&num(y.s.elev)&&y.s.elev>x.s.elev;});
    if(at<0)at=out.length;
    while(at>0&&!num(out[at-1].s.distMi)&&out[at-1].s.elev>x.s.elev)at--;
    out.splice(at,0,x);
  });
  return out.concat(rest).map(function(x){return x.s;});
}
/* The list SAYS it runs in walking order, and says which sites it could not place: a site with no
   distance and no height on file sits last because nothing says where it is, not because it is the
   highest. Nothing to say for one site, or when no site can be placed at all. */
export function campOrderNote(sites){
  const num=function(v){return v!=null&&isFinite(v);};
  const placed=(sites||[]).filter(function(s){return s&&(num(s.distMi)||num(s.elev));}).length;
  if((sites||[]).length<2||!placed)return "";
  const loose=sites.length-placed;
  return " Listed in the order you reach them walking in from the trailhead"+(loose?"; "+(loose===1?"the site":"the "+loose+" sites")+" with no distance or height on file "+(loose===1?"comes":"come")+" last.":".");
}
/* What the site is FOR on this route, as the tag the list carries in place of the old group heading.
   The words are the contribute form's role options, so a climber who picks one sees it come back.
   No role → no tag: an unsorted site claims no use (the 2026-10-14 entry in docs/guards/camping.md). */
export function campRoleLabel(role){
  return role==="main"?"Where most parties sleep":role==="route"?"Other option":"";
}
/* THE STRETCH FROM THE CAMP BEFORE — the number FarOut prints beside every tent site: how far on,
   and how much higher, the next place to sleep is. Only from two known distances (and, for the
   height, two known heights) — never a chord or a guess. Exported so check:camping asks it. */
export function campFromPrev(s,prev){
  if(!s||!prev||!String(prev.name||"").trim())return "";
  if(s.distMi==null||prev.distMi==null||!isFinite(s.distMi)||!isFinite(prev.distMi)||s.distMi-prev.distMi<0.05)return "";
  const dg=(s.elev!=null&&prev.elev!=null&&isFinite(s.elev)&&isFinite(prev.elev))?Math.round(s.elev-prev.elev):0;
  return uDistMi(s.distMi-prev.distMi)+" on from "+String(prev.name).trim()+(dg?" · "+uElev(Math.abs(dg))+(dg>0?" higher":" lower"):"");
}
/* ONE chip, not two, because both numbers answer the same question — how far from the road is
   this? — and repeating "the trailhead" on the same row reads as two unrelated facts.
   A site BELOW the trailhead says "below" rather than rendering a negative gain. That is not
   cosmetic: 527 of 3,243 comparable sites (16%) sit below their trailhead, and they are
   overwhelmingly valley car-campgrounds — roadside vocabulary appears in 72% of them against 9%
   of the sites above, a 63-point gap, so the population is real and not an artefact of bad
   elevations. "-1,250 ft of gain" for a campground you DRIVE to is both ugly and the wrong
   framing; "1,250 ft below the trailhead" is the same arithmetic worded as the fact it is, and
   it tells a climber the useful thing — this is a valley basecamp, not a high camp.
   A gain that rounds to zero is dropped rather than shown as "0 ft above", which is noise.
   Exported for the same reason campDetail() is: what a site SAYS is a pure question a static
   guard can answer, where whether it reaches the screen needs a render. */
export function campFromTrailhead(s){
  if(!s)return "";
  const d=(s.distMi!=null&&isFinite(s.distMi))?uDistMi(s.distMi):null;
  const g=(s.gainFt!=null&&isFinite(s.gainFt)&&Math.round(s.gainFt)!==0)?s.gainFt:null;
  if(d==null&&g==null)return "";
  const head=[d,g!=null?uElev(Math.abs(g)):null].filter(Boolean).join(" \u00b7 ");
  return head+(g!=null?(g>0?" above":" below"):" from")+" the trailhead";
}
export function campDetail(b){
  return [["Capacity",b&&b.capacity],["Water",b&&b.water],["Permit",b&&b.permit]]
    .filter(function(r){return String(r[1]==null?"":r[1]).trim()!=="";});
}
/* WHERE CLIMBERS SAY THEY SLEPT. The log form's WHERE DID YOU CAMP? (cond.camps, 0358) names camps by
   the names this list uses, so a report is matched to a site by its NAME, case aside; nothing fuzzier,
   because a near-miss counted against the wrong camp is a false claim about where parties sleep. `by`
   is keyed by the site's index in `sites`; `extra` holds the camps reports name that the list does not
   have, which the panel offers to the next climber to ADD — through the contribute editor, never by
   writing a report's typed name into the route. A count is of REPORTS, not parties: two partners who
   each log the climb are two. Private reports arrive here anonymised (0329), so they count too.
   Exported so check:camping asks it directly. */
export function campReportsOf(sites,activity){
  const key=v=>String(v==null?"":v).trim().toLowerCase();
  const idx=new Map();(sites||[]).forEach(function(x,i){const k=key(x&&x.name);if(k&&!idx.has(k))idx.set(k,i);});
  const by=new Map(),extra=new Map();
  (activity||[]).forEach(function(a){
    const cs=a&&a.cond&&Array.isArray(a.cond.camps)?a.cond.camps:[];
    const seen=new Set();
    cs.forEach(function(c){const k=key(c);if(!k||seen.has(k))return;seen.add(k);
      const bump=function(m,id,name){const o=m.get(id)||{name:name,n:0,last:""};o.n++;if(a.date&&String(a.date)>o.last)o.last=String(a.date);m.set(id,o);};
      if(idx.has(k))bump(by,idx.get(k),String(c).trim());else bump(extra,k,String(c).trim());
    });
  });
  return {by:by,extra:[...extra.values()].sort(function(x,y){return y.n-x.n||y.last.localeCompare(x.last);})};
}
export function campSleptLine(r){
  if(!r||!r.n)return "";
  return "Slept here in "+r.n+" trip report"+(r.n===1?"":"s")+(r.last?(r.n===1?", ":", latest ")+shortDate(r.last):"");
}
