// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
import { DISC_LABELS as DL } from "./discLabels";
import { clickable } from "./clickable";
import { useState } from "react";
import { useLeaderboard, useTopClimbs, useAreaChildren, useAreaPath, dbRouteToCamel, useVerifiedUsers } from "./db";
import { C, CAT, CLIMBERS, DEMO_FILLERS, FILLER_CLIMBERS, ME, MOUNTAINS, NONCOMPLETION_TICKS, ROUTES, SZ1, catOf, distMiles, haveMyLoc, inArea, lbRowName, pubName, routeAscentFt, seedHistoryFor, uDistMi, uDistMiUnitLong, uElev } from "../ClimbMatchCore.jsx";
import Av from "../src/components/Av.tsx";
import DiscIcon from "../src/components/DiscIcon.tsx";
import CountUp from "../src/components/CountUp.tsx";
import { rankGrade, styleGrade } from "./rankGrade";

// Two populations. Signed in with the DB on, every row is a REAL climber from leaderboard()
// (0194), which counts on the server under anti-padding rules the ranked climber cannot edit.
// Otherwise (the signed-out demo, or no DB) the board is the seed example set plus you, and
// says so. The two never mix: a real climber is never ranked against an invented one.
export default function Leaderboards({meLive,onView,onClimb,logs,connections,catchCredits,showOnRanks,blocked,rankDisc,setRankDisc,rankBoard,setRankBoard,routeById,logsUnavailable,connectionsUnavailable,uid,useDb,onReport}){
  const real=!!(useDb&&uid);
  const [backedOnly,setBackedOnly]=useState(false);
  const board=rankBoard,setBoard=setRankBoard;
  const [scope,setScope]=useState("overall");const [lbN,setLbN]=useState(15);
  const [areaId,setAreaId]=useState("usa");
  const [radiusMi,setRadiusMi]=useState(120);
  const disc=rankDisc,setDisc=setRankDisc;
  const gv=g=>{const m=g&&g.match(/5\.(\d+)([a-d]?)/);return m?parseInt(m[1])+(m[2]?("abcd".indexOf(m[2])+1)/4:0.5):0;};
  const vv=g=>{const m=g&&g.match(/V(\d+)/);return m?parseInt(m[1]):-1;};const wv=g=>{const m=g&&g.match(/WI(\d+)/);return m?parseInt(m[1]):-1;};
  // A discipline board reads the climber's counts IN that discipline (0323's stats.by); a real row
  // carries them, and the demo pool falls back to its totals.
  const byOf=pp=>(disc!=="all"&&pp._by)?(pp._by[disc]||{}):null;
  const peaksOf=(pp,k)=>{const b=byOf(pp);return b?((b.peaks&&b.peaks[k])||0):((pp.stats&&pp.stats.peaks&&pp.stats.peaks[k])||0);};
  const sendsOf=(pp,d,k)=>(pp.stats&&pp.stats.sends&&pp.stats.sends[d]&&pp.stats.sends[d][k])||0;
  const onsightsOf=(pp,d,k)=>(pp.stats&&pp.stats.onsights&&pp.stats.onsights[d]&&pp.stats.onsights[d][k])||0;
  const PEAK=["mountaineering","alpine","scrambling"];
  // Mirrors leaderboard() (0323) for the signed-out demo board: a conditions report is not a climb,
  // a Project is not a send, vert counts the climbs you finished, and a route scores its best log.
  const NOT_SENT=NONCOMPLETION_TICKS.concat(["Project"]);
  const meStats=(()=>{
    const oneYrAgo=Date.now()-365*86400000;
    const rOf=l=>(routeById?routeById(l.routeId):ROUTES.find(x=>x.id===l.routeId));
    const climbs=(logs||[]).filter(l=>l.tickType!=="Conditions");
    const yrLogs=climbs.filter(l=>l.date&&new Date(l.date).getTime()>=oneYrAgo);
    const vertYr=yrLogs.filter(l=>NOT_SENT.indexOf(l.tickType)<0).reduce((s,l)=>{const r=rOf(l);return s+(r?(routeAscentFt(r)||r.routeFt||0):0);},0);
    const daysYr=new Set(yrLogs.map(l=>l.date)).size;
    const onsightRock={life:0,yr:0},onsightBoulder={life:0,yr:0};const onsightSplit={sport:{life:0,yr:0},trad:{life:0,yr:0}};
    const peaks={life:0,yr:0};const sends={};const classicIds=new Set();
    // Points weigh each DISTINCT sent route by that route's own grade, on ONE scale (lib/rankGrade.js).
    const gOf=r=>{const c=catOf(r);const sys=c==="bouldering"?"v":c==="ice"?"wi":c==="mixed"?"m":"yds";if(r.gradeNum!=null&&!isNaN(+r.gradeNum))return rankGrade(sys,r.gradeNum);const mm=(r.grade||"").match(/M(\d+)/);return sys==="v"?(/V/.test(r.grade||"")?rankGrade("v",vv(r.grade)):0):sys==="wi"?rankGrade("wi",Math.max(0,wv(r.grade))):sys==="m"?(mm?rankGrade("m",+mm[1]):0):gv(r.grade);};
    const best={},osRoutes={},seenRoute={};
    climbs.forEach(l=>{
      const r=rOf(l);if(!r)return;
      const recent=!!(l.date&&new Date(l.date).getTime()>=oneYrAgo);
      const firstOnRoute=!seenRoute[r.id];seenRoute[r.id]=1;
      if((l.tickType==="Onsight"||l.tickType==="Flash")&&firstOnRoute)osRoutes[r.id]=r;
      if(l.tickType==="Onsight"||l.tickType==="Flash"){
        const cat=catOf(r);const bucket=cat==="bouldering"?onsightBoulder:(cat==="trad"||cat==="sport")?onsightRock:null;
        if(bucket){bucket.life++;if(recent)bucket.yr++;}
        // sport and trad rank as separate boards, so keep their own tallies as well as the
        // combined `rock` one the "All" board and the legacy `rock` scope still read.
        if(cat==="trad"||cat==="sport"){const ob=onsightSplit[cat];ob.life++;if(recent)ob.yr++;}
      }
      if(NOT_SENT.indexOf(l.tickType)>=0)return;
      if(r.classic)classicIds.add(r.id);
      if(l.tickType==="Summit"&&PEAK.includes(r.discipline)){peaks.life++;if(recent)peaks.yr++;}
      const cat=catOf(r);const bucketKey=(cat==="trad"||cat==="sport")?"rock":cat;
      const bump=k=>{if(!sends[k])sends[k]={life:0,yr:0};sends[k].life++;if(recent)sends[k].yr++;};
      bump(bucketKey);if(bucketKey==="rock")bump(cat);
      const g=styleGrade(gOf(r),l.tickType),v=8+g*g*0.35;if(!best[r.id]||best[r.id].v<v)best[r.id]={r,v};
    });
    const keysOf=r=>{const c=catOf(r);return (c==="trad"||c==="sport")?[c,"rock"]:[c];};
    const pts={all:0},osPts={};
    Object.values(best).forEach(({r,v})=>{pts.all+=v;keysOf(r).forEach(k=>{pts[k]=(pts[k]||0)+v;});});
    Object.values(osRoutes).forEach(r=>{const c=catOf(r);if(c!=="trad"&&c!=="sport"&&c!=="bouldering")return;const g=gOf(r),v=10+g*g*0.3;keysOf(r).forEach(k=>{osPts[k]=(osPts[k]||0)+v;});});
    Object.keys(pts).forEach(k=>{pts[k]=Math.round(pts[k]);});Object.keys(osPts).forEach(k=>{osPts[k]=Math.round(osPts[k]);});
    return {logged:climbs.length,vertYr,daysYr,onsights:{rock:onsightRock,bouldering:onsightBoulder,sport:onsightSplit.sport,trad:onsightSplit.trad},peaks,sends,classicIds,pts,osPts};
  })();
  /* Spread the SELF OBJECT, not a bare ME. ME's catchLedger is zeroed by the sign-in reset, so this row used to score a climber's belay catches at 0 while the Profile counted them in full -- one climber, two answers, on the metric this board is ABOUT. */const me={...(meLive||ME),routesLogged:meStats.logged,vertYr:meStats.vertYr,daysYr:meStats.daysYr,classics:(()=>{const had=new Set(seedHistoryFor(meLive||ME).filter(t=>t.route.classic).map(t=>t.route.id));return [...meStats.classicIds].filter(id=>!had.has(id)).length;})(),stats:{...ME.stats,onsights:meStats.onsights,peaks:meStats.peaks,sends:meStats.sends},_pts:meStats.pts,_osPts:meStats.osPts};
  // ── the real population (signed in) ──
  const version=(logs||[]).map(l=>(l._dbId||l.id||"")+(l.tickType||"")+(l.date||"")+((l.partnerIds||[]).length)).join("|");
  const radiusQ=radiusMi>=9000?500:radiusMi;
  const lbQ=useLeaderboard({scope,areaId:scope==="area"?areaId:null,radiusMi:scope==="near"?radiusQ:null,enabled:real,version});
  const topQ=useTopClimbs({scope,areaId:scope==="area"?areaId:null,disc,radiusMi:scope==="near"?radiusQ:null,enabled:real&&board==="climbs",version});
  const areaPathQ=useAreaPath(real&&scope==="area"&&areaId?areaId:null);
  /* "" is the level ABOVE the countries. By area used to bottom out at United States with no way
     up, so a Canadian area could never be ranked. Its children are the root areas (the countries);
     it ranks nothing itself, since "All" already ranks everywhere and the area RPCs need an area. */
  const atAllCountries=real&&scope==="area"&&!areaId;
  const areaKidsQ=useAreaChildren(areaId||null,{enabled:real&&scope==="area"});
  const lbRows=real?(lbQ.data||[]):[];
  /* The ✓ for real rows (0232/0306): the RPC returns no verified column, so it read as seed-only. Unknown reads as no ✓. */const lbVerQ=useVerifiedUsers(lbRows.filter(r=>!r.is_me).map(r=>r.user_id));
  const noOrigin=real&&scope==="near"&&lbRows.some(x=>x.no_origin);
  const rowToPP=row=>{const all=(row.stats&&row.stats.all)||{};const s=(row.stats&&row.stats[backedOnly?"backed":"all"])||{};const base=row.is_me?{...(meLive||ME),id:0}:{id:row.user_id,name:row.name||"",username:row.username||"",showName:!!row.show_name,avatar:row.avatar||"",disciplines:Array.isArray(row.disciplines)?row.disciplines:[]};
    return {...base,_real:!row.is_me,...(row.is_me?{}:{verified:!!(lbVerQ.data&&lbVerQ.data.has(row.user_id))}),_uid:row.user_id,location:row.dist_mi!=null?(uDistMi(row.dist_mi)+" away"):(row.is_me?(base.location||row.location||""):(row.location||"")),_home:row.location||"",routesLogged:s.logged||0,vertYr:s.vertYr||0,daysYr:s.daysYr||0,classics:s.classics||0,stats:{sends:s.sends||{},peaks:s.peaks||{life:0,yr:0},onsights:s.onsights||{}},_by:s.by||{},_pts:s.points||{},_osPts:s.onsightPts||{},_catches:row.catches||0,_vouches:row.vouches||0,_contribs:row.contribs||0,_backed:all.backed||0,_logged:all.logged||0};};
  const ALL=real?lbRows.map(rowToPP).filter(pp=>(pp.id!==0||showOnRanks)&&!(blocked&&blocked.some(b=>b.id===pp._uid))):[...CLIMBERS,...(showOnRanks?[me]:[]),...(DEMO_FILLERS?FILLER_CLIMBERS:[])].filter(pp=>!(blocked&&blocked.some(b=>b.id===pp.id)));
  const acount=id=>ROUTES.filter(r=>inArea(r.mountainId,id)).length;const aCur=real?(atAllCountries?{id:"",name:"All countries"}:((areaPathQ.data||[]).slice(-1)[0]||{})):(MOUNTAINS.find(m=>m.id===areaId)||{});const aChain=real?[{id:"",name:"All countries"}].concat(atAllCountries?[]:(areaPathQ.data||[])):(()=>{const out=[];let cur=MOUNTAINS.find(m=>m.id===areaId);let g=0;while(cur&&g++<10){out.unshift(cur);if(cur.id==="usa"||!cur.parentId||cur.parentId==="world")break;cur=MOUNTAINS.find(m=>m.id===cur.parentId);}return out;})();const aKids=real?(areaKidsQ.data||[]).filter(a=>(a.route_count||0)>0).map(a=>({id:a.id,name:a.name,n:a.route_count})):MOUNTAINS.filter(m=>m.parentId===areaId&&acount(m.id)>0).map(m=>({id:m.id,name:m.name,n:acount(m.id)}));
  const personInArea=(pp,aid)=>!!(pp.objectiveIds&&pp.objectiveIds.some(id=>{const r=ROUTES.find(x=>x.id===id);return r&&inArea(r.mountainId,aid);}));
  const friendIdSet=new Set([0,...(connections||[]).map(c=>c.id)]);
  const withinRadius=pp=>radiusMi>=9000||!haveMyLoc()||distMiles(ME,pp)<=radiusMi;
  // The server already scoped the real population; the demo pool is scoped here.
  const scopePeople=real?ALL:ALL.filter(pp=>scope==="near"?withinRadius(pp):scope==="friends"?friendIdSet.has(pp.id):scope==="area"?personInArea(pp,areaId):true);
  // Empty means nobody BUT you. Real friends are uuids the demo pool never held, so the old
  // `connections.length` test called a board of one full and ranked you #1 of 1.
  const othersInScope=scopePeople.filter(pp=>pp.id!==0).length;
  const friendsEmpty=scope==="friends"&&othersInScope===0;
  const nearEmpty=scope==="near"&&othersInScope===0;
  // sport and trad are their own boards, so match on catOf — `r.discipline` is the coarse
  // catalog value ("rock") and would put every crag route on both.
  const discMatch=r=>disc==="all"?true:((disc==="sport"||disc==="trad")?catOf(r)===disc:disc==="rock"?(catOf(r)==="trad"||catOf(r)==="sport"):r.discipline===disc);
  const scopeRoutes=ROUTES.filter(r=>{const mt=MOUNTAINS.find(m=>m.id===r.mountainId);return (scope==="area"?inArea(r.mountainId,areaId):scope==="near"?!!(mt&&withinRadius(mt)):true)&&discMatch(r);});
  const loggedOf=pp=>{const b=byOf(pp);return b?(b.logged||0):(pp.routesLogged||0);};
  const peopleForBoard=scopePeople.filter(pp=>pp.id===0||disc==="all"||(pp._real&&(sendsOf(pp,disc,"life")>0||loggedOf(pp)>0))||(disc==="rock"?(pp.disciplines||[]).some(d=>d==="sport"||d==="trad"||d==="rock"):(pp.disciplines||[]).includes(disc)));
  const SCOPES=[["overall","Overall"],["near","Near me"],["friends","Friends"],["area","By area"]];
  /* Every discipline the catalog files a climb under has a board: Top rope, Mixed and Aid sends used to count only on All. */const DISCS=[["all","All"],["sport",DL.sport],["trad",DL.trad],["toprope",DL.toprope],["bouldering",DL.bouldering],["alpine",DL.alpine],["mountaineering",DL.mountaineering],["scrambling",DL.scrambling],["ice",DL.ice],["mixed",DL.mixed],["aid",DL.aid]];
  const dn=disc;
  const vertOf=pp=>{const b=byOf(pp);return b?(b.vertYr||0):(pp.vertYr||0);};
  const daysOf=pp=>{const b=byOf(pp);return b?(b.daysYr||0):(pp.daysYr||0);};
  // The grade that scores a board. Sport and trad rank separately, so each reads its own
  // ladder rather than the max of the two — a 5.13 sport climber must not carry that number
  // onto the trad board.
  const gradeFor=pp=>disc==="sport"?gv(pp.sportGrade):disc==="trad"?gv(pp.tradGrade):disc==="bouldering"?vv(pp.boulderGrade):disc==="ice"?wv(pp.iceGrade):Math.max(gv(pp.sportGrade),gv(pp.tradGrade));
  const onsightPts=pp=>{
    // Real rows and your own demo row carry points computed from each ROUTE's grade.
    if(pp._osPts){const o=pp._osPts;return disc==="all"?((o.rock||0)+(o.bouldering||0)):disc==="rock"?(o.rock||0):(o[disc]||0);}
    const w=g=>10+Math.max(0,g)*Math.max(0,g)*0.3;
    const rockW=w(Math.max(gv(pp.sportGrade),gv(pp.tradGrade)));
    const boulderW=w(vv(pp.boulderGrade));
    if(disc==="bouldering")return Math.round(onsightsOf(pp,"bouldering","life")*boulderW);
    if(disc==="sport"||disc==="trad")return Math.round(onsightsOf(pp,disc,"life")*w(gradeFor(pp)));
    if(disc==="rock")return Math.round(onsightsOf(pp,"rock","life")*rockW);
    return Math.round(onsightsOf(pp,"rock","life")*rockW+onsightsOf(pp,"bouldering","life")*boulderW);
  };
  const perfPts=pp=>{if(pp._pts)return pp._pts[disc]||0;const gi=gradeFor(pp);let vol;if(disc==="all"){const sends=pp.stats&&pp.stats.sends||{};vol=(sends.rock&&sends.rock.life||0)+(sends.bouldering&&sends.bouldering.life||0)+(sends.alpine&&sends.alpine.life||0)+(sends.ice&&sends.ice.life||0)+(sends.scrambling&&sends.scrambling.life||0)+(sends.mountaineering&&sends.mountaineering.life||0);}else{vol=sendsOf(pp,dn,"life");}return Math.round(vol*(8+Math.max(0,gi)*Math.max(0,gi)*0.35));};
  const B={
    catches:{id:"catches",icon:"🤝",label:"Belay",val:pp=>real?(pp._catches||0):(pp.catchLedger.totalCatches+(catchCredits&&catchCredits[pp.id]||0)),suffix:"catches",note:real?"Falls safely caught, as recorded by the climber who was caught — a belayer can’t credit themselves.":"Falls safely caught. A track record of dependable belaying."},vouched:{id:"vouched",icon:"✍️",label:"Vouched",val:pp=>real?(pp._vouches||0):(pp.vouches?pp.vouches.length:0),suffix:"vouches",note:"Peer references from partners they’ve climbed with — reputation in their partners’ own words."},
    active:{id:"active",icon:"🧗",label:"Logged",val:pp=>loggedOf(pp),suffix:"logged",note:"Climbs logged, attempts included. Rewards getting out."},points:{id:"points",icon:"💯",label:"Send points",val:pp=>perfPts(pp),disp:pp=>perfPts(pp).toLocaleString(),suffix:"pts"},
    peaksYr:{id:"peaksYr",icon:"⛰️",label:"Peaks 1yr",val:pp=>peaksOf(pp,"yr"),suffix:"peaks · 12mo",note:"Different summits logged as Summit in the last 12 months."},
    peaksLife:{id:"peaksLife",icon:"🏔️",label:"Peaks all-time",val:pp=>peaksOf(pp,"life"),suffix:"summits",note:"Different summits logged as Summit, all time."},
    sendsYr:{id:"sendsYr",icon:"✅",label:"Sends 1yr",val:pp=>sendsOf(pp,dn,"yr"),suffix:"sends · 12mo",note:"Routes sent in this discipline over the last 12 months."},
    sendsLife:{id:"sendsLife",icon:"📊",label:"Total sends",val:pp=>sendsOf(pp,dn,"life"),suffix:"sends",note:"All sends logged in this discipline."},
    vert:{id:"vert",icon:"📈",label:"Vert 1yr",val:pp=>vertOf(pp),disp:pp=>uElev(vertOf(pp)),suffix:"climbed · 12mo",note:"Height of the climbs you finished in the last 12 months — a peak’s gain from the trailhead, a crag route’s length."},
    onsight:{id:"onsight",icon:"⚡",label:"Onsight pts",val:pp=>onsightPts(pp),disp:pp=>onsightPts(pp).toLocaleString(),suffix:disc==="bouldering"?"flash pts":"onsight pts",note:"A cumulative score for first-try sends — onsights and flashes across every climb, weighted by grade. Rewards depth, not just your single hardest first-try."},
    days:{id:"days",icon:"📅",label:"Days 1yr",val:pp=>daysOf(pp),suffix:"days out · 12mo",note:"Days with a logged climb in the last 12 months. Rewards showing up."},
    climbs:{id:"climbs",icon:"🔥",label:"Top climbs",routes:true,note:real?"The climbs the most climbers have shared a public trip report for in this scope, then the highest rated.":"The most-logged and highest-rated climbs in this scope."},
    contribs:{id:"contribs",icon:"🧭",label:"Contributions",val:pp=>pp._contribs||0,suffix:"pts",note:"Points for what a climber has added to the catalog once it went live: an approved new climb 10, a route photo or a topo 5, a correction or area detail that was approved 2, a line drawn on a topo 2, a sun vote, start location or pairing 1. Each kind counts once per climb, so refining one fact or adding a second photo adds nothing. By area counts only what was added in that area and the places inside it."},classics_b:{id:"classics_b",icon:"🏛️",label:"Classic climbs",val:pp=>real?(byOf(pp)?(byOf(pp).classics||0):(pp.classics||0)):new Set(seedHistoryFor(pp).filter(t=>t.route.classic).map(t=>t.route.id)).size+(pp.classics||0),suffix:"classics",note:"Distinct regional classic climbs logged — the must-do lines. Repeating one does not count twice."}
  };
  let ids;
  const ROPED=disc!=="bouldering"&&disc!=="scrambling"&&disc!=="hiking";
  const base=ROPED?["catches","vouched"]:["vouched"];
  if(disc==="all")ids=["catches","vouched","active","points","onsight","vert","days","peaksLife","climbs"];
  else if(PEAK.includes(disc))ids=[...base,...(disc==="alpine"?["points"]:[]),"peaksYr","peaksLife","sendsYr","vert","days","active","climbs"];
  else ids=[...base,...((disc==="rock"||disc==="bouldering"||disc==="ice"||disc==="sport"||disc==="trad"||disc==="toprope"||disc==="mixed"||disc==="aid")?["points"]:[]),...((disc==="rock"||disc==="bouldering"||disc==="sport"||disc==="trad")?["onsight"]:[]),"sendsYr","sendsLife","vert","days","active","climbs"];
  ids=ids.concat(["classics_b"]);if(real)ids=ids.concat(["contribs"]);const BOARDS=ids.map(k=>B[k]);const REL=["catches","vouched","active"];const LISTS=["classics_b"];const COMM=["contribs"];const relBoards=BOARDS.filter(b=>REL.includes(b.id)),listBoards=BOARDS.filter(b=>LISTS.includes(b.id)),commBoards=BOARDS.filter(b=>COMM.includes(b.id)),perfBoards=BOARDS.filter(b=>!REL.includes(b.id)&&!LISTS.includes(b.id)&&!COMM.includes(b.id));
  const cur=BOARDS.find(b=>b.id===board)||perfBoards[0]||BOARDS[0];
  const medal=i=>String(i+1);
  const disp=pp=>cur.disp?cur.disp(pp):cur.val(pp);
  // Only a climber with something on THIS board is ranked on it (a row of 0s ranked nobody), and
  // equal scores share a rank (1, 2, 2, 4), as a results table does.
  const ranked=cur.routes?[]:peopleForBoard.filter(pp=>cur.val(pp)>0).sort((a,b)=>cur.val(b)-cur.val(a)||String(pubName(a)).localeCompare(String(pubName(b))));
  const rankAt=i=>{const v=cur.val(ranked[i]);let j=i;while(j>0&&cur.val(ranked[j-1])===v)j--;return j+1;};
  const meIdx=ranked.findIndex(pp=>pp.id===0);
  const meUnranked=!cur.routes&&meIdx<0&&peopleForBoard.some(pp=>pp.id===0);
  const top=ranked.slice(0,100);
  const shown=top.slice(0,lbN);
  // Your own row is pinned under the table whenever the part on screen does not include it.
  const showMe=meIdx>=shown.length;
  const showFlag=real&&!!onReport;
  const rankColor=n=>n===1?C.amber:n===2?C.textSub:n===3?C.orange:C.textMuted;
  const myByRoute={};if(cur.routes)(logs||[]).forEach(l=>{if(l.routeId)(myByRoute[l.routeId]=myByRoute[l.routeId]||[]).push(l);});const rr=cur.routes&&real?(topQ.data||[]).map(x=>{const r=dbRouteToCamel(x.route);return {r,reps:x.climbers||0,st:x.avg_stars!=null?+x.avg_stars:null,areaName:x.area_name};}):cur.routes?[...scopeRoutes].map(r=>{const a=(r.activity||[]).concat(myByRoute[r.id]||[]);const _rt=a.filter(x=>x&&x.stars>0);const st=_rt.length?_rt.reduce((q,x)=>q+x.stars,0)/_rt.length:null;return {r,reps:a.length,st};}).sort((a,b)=>b.reps-a.reps||(b.st||0)-(a.st||0)).slice(0,40):[];
  // A ranking row carries every board's numbers; the profile it opens gets only a profile.
  const viewOf=pp=>pp._real?{id:pp._uid,name:pp.name,username:pp.username,showName:pp.showName,avatar:pp.avatar,location:pp._home||"",disciplines:pp.disciplines||[],objectiveIds:[],_real:true}:pp;
  // Boards counted from logs -- the ones the backed switch and the "N of M backed" line apply to.
  const logBoard=!cur.routes&&!["catches","vouched","contribs"].includes(cur.id);
  const lbRow=(pp,i,last)=>{const isMe=pp.id===0;const n=rankAt(i);return <div key={pp.id} {...clickable(()=>onView&&onView(viewOf(pp)))} aria-label={lbRowName("#"+n,pubName(pp),isMe,pp.verified,pp.location,disp(pp),cur.suffix)} style={{display:"flex",alignItems:"center",gap:10,minHeight:50,padding:"7px 8px",background:isMe?C.blueBg:(i%2?C.surface:"transparent"),boxShadow:isMe?`inset 3px 0 0 ${C.blue}`:"none",borderBottom:last?"none":`1px solid ${C.borderLight}`,cursor:"pointer"}}><div style={{width:30,textAlign:"center",flexShrink:0,fontSize:14,fontWeight:800,color:rankColor(n),fontVariantNumeric:"tabular-nums"}}>{n}</div><Av src={pp.avatar} size={32}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{pubName(pp)}{isMe?<span style={{marginLeft:6,fontSize:12,fontWeight:700,color:C.blue,background:C.surface,border:`1px solid ${C.blueDim}`,borderRadius:5,padding:"1px 5px",verticalAlign:"middle"}}>YOU</span>:pp.verified?<span style={{marginLeft:5,fontSize:12,color:C.green}}>✓</span>:null}</div><div style={{fontSize:12,color:C.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{[pp.location,(real&&logBoard&&pp._logged)?(pp._backed+" of "+pp._logged+" backed"):""].filter(Boolean).join(" · ")}</div></div><div style={{minWidth:60,textAlign:"right",flexShrink:0,fontSize:15,fontWeight:700,color:C.blue,fontVariantNumeric:"tabular-nums"}}>{disp(pp)}</div>{showFlag?<div style={{width:30,flexShrink:0,display:"flex",justifyContent:"center"}}>{pp._real?<button onClick={e=>{e.stopPropagation();onReport(viewOf(pp));}} aria-label={"Report "+pubName(pp)+"’s climbs or ranking"} title="Report" style={{width:30,height:30,padding:0,borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,fontSize:12,cursor:"pointer"}}>⚑</button>:null}</div>:null}</div>;};
  const lbUnavailable=real&&(cur.routes?topQ.isError:lbQ.isError),lbLoading=real&&!atAllCountries&&!lbUnavailable&&(cur.routes?topQ.isPending:lbQ.isPending);
  return (<div>
    {/* Your OWN row is `{...ME,routesLogged:logs.length,vertYr,...}`, so a failed climb_logs read
        does not blank this board -- it silently reports you as having climbed nothing and drops
        you down it. The "0 climbs to go" shape again, on a screen whose whole subject is counts.
        `check:outage` measured the screen changing and saying nothing; this is what changed. */}
    {logsUnavailable?<div style={{fontSize:12,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 10px",marginBottom:9,lineHeight:1.45}}>Couldn’t load your climbs, so your own standing here is understated — this is not your real position.</div>:null}
    {(connectionsUnavailable&&scope==="friends")?<div style={{fontSize:12,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 10px",marginBottom:9,lineHeight:1.45}}>Couldn’t load your friends, so this board is unread rather than empty.</div>:null}
    {lbUnavailable?<div style={{fontSize:12,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 10px",marginBottom:9,lineHeight:1.45}}>Couldn’t load the rankings, so this board is unread rather than empty. Try again in a moment.</div>:null}
    <div style={SZ1}>{SCOPES.map(x=>{const on=scope===x[0];return <button key={x[0]} onClick={()=>setScope(x[0])} aria-current={on?"true":undefined} style={{flexShrink:0,padding:"7px 9px",borderRadius:16,border:`1.5px solid ${on?C.blue:C.border}`,background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{x[1]}</button>;})}</div>
    {scope==="near"?<div style={{marginBottom:10}}><div style={{fontSize:11.5,color:C.textMuted,marginBottom:7}}>{real?"Climbers whose home zip code is within this distance of yours":"Climbers based near "+ME.location}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={{fontSize:12.5,color:C.textSub,fontWeight:600}}>Distance</span><span style={{fontSize:13,fontWeight:700,color:C.blue}}>{real?("Within "+uDistMi(radiusMi>=9000?500:radiusMi)):!haveMyLoc()?"Needs your location":radiusMi>=9000?"Any distance":("Within "+uDistMi(radiusMi))}</span></div><input aria-label={"Search radius in "+uDistMiUnitLong()} type="range" min={10} max={260} step={10} value={radiusMi>=9000?260:radiusMi} onChange={e=>{const v=+e.target.value;setRadiusMi(v>=260?99999:v);}} style={{width:"100%",accentColor:C.blue,cursor:"pointer"}}/>{noOrigin?<div style={{fontSize:12,color:C.textMuted,marginTop:7,lineHeight:1.45}}>Your account has no home zip code yet, so there is nothing to measure distance from — this board shows only you until it has one. Add a zip code in Edit profile.</div>:null}</div>:null}
    {scope==="area"?<div style={{marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:aKids.length?8:7}}>{aChain.map((a,i)=><span key={a.id} style={{display:"flex",alignItems:"center",gap:5}}>{i>0?<span style={{color:C.textMuted,fontSize:12}}>›</span>:null}<span {...clickable(()=>{if(i<aChain.length-1)setAreaId(a.id);})} style={{fontSize:13,fontWeight:i===aChain.length-1?"700":"600",color:i===aChain.length-1?C.amber:C.blue,cursor:i<aChain.length-1?"pointer":"default"}}>{a.name}</span></span>)}</div>{aKids.length>0?<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[...aKids].sort((a,b)=>b.n-a.n).slice(0,real?24:aKids.length).map(a=><button key={a.id} onClick={()=>setAreaId(a.id)} aria-label={a.name+", "+a.n+" routes"} style={{padding:"9px 11px",borderRadius:14,border:`1px solid ${C.border}`,background:C.surface,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{a.name} <span style={{color:C.textMuted,fontWeight:400}}>{a.n.toLocaleString()}</span> ›</button>)}</div>:null}<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4,marginTop:aKids.length?9:7}}>{atAllCountries?"Pick a country to rank the climbers who have logged climbs there.":real?<>Climbers who have logged climbs in <span style={{color:C.amber,fontWeight:700}}>{aCur.name||"this area"}</span>{aKids.length?" · tap a sub-area to narrow":""}.</>:<>Climbers with objectives in <span style={{color:C.amber,fontWeight:700}}>{aCur.name||"the USA"}</span> · {acount(areaId)} route{acount(areaId)!==1?"s":""}{aKids.length?" · tap a sub-area to narrow":""}.</>}</div></div>:null}
    <div style={{position:"sticky",top:0,zIndex:6,background:C.bg,paddingTop:6,paddingBottom:9,marginBottom:2}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><div style={{fontSize:13,color:C.text,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>CLIMBING TYPE</div><select aria-label="Ranking discipline" value={disc} onChange={e=>setDisc(e.target.value)} className="cm-fsm" style={{width:"100%",padding:"9px 11px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:12,fontWeight:600,cursor:"pointer",outline:"none"}}>{DISCS.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></div><div><div style={{fontSize:13,color:C.text,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>RANKING</div><select aria-label="Ranking board" value={cur.id} onChange={e=>setBoard(e.target.value)} className="cm-fsm" style={{width:"100%",padding:"9px 11px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:12,fontWeight:600,cursor:"pointer",outline:"none"}}>{[["Performance",perfBoards],["Lists",listBoards],["Reliability",relBoards],["Community",commBoards]].map((grp,gi)=>grp[1].length?<optgroup key={gi} label={grp[0]}>{grp[1].map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</optgroup>:null)}</select></div></div></div>
    {real&&logBoard?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:C.card,borderRadius:11,padding:"9px 12px",border:`1px solid ${C.border}`,marginBottom:9}}><div style={{minWidth:0}}><div style={{fontSize:13,color:C.textSub,fontWeight:600}}>Backed climbs only</div><div style={{fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{backedOnly?"Counting only climbs a tagged partner confirmed, or backed by a photo taken that day or a recorded GPS track of the climb.":"Counting every logged climb. On points boards an unbacked one scores half."}</div></div><button onClick={()=>setBackedOnly(v=>!v)} role="switch" aria-checked={backedOnly} aria-label="Backed climbs only" style={{width:46,height:26,borderRadius:13,border:"none",background:backedOnly?C.green:C.border,position:"relative",cursor:"pointer",flexShrink:0}}><div style={{position:"absolute",top:3,left:backedOnly?23:3,width:20,height:20,borderRadius:"50%",background:"#fff"}}/></button></div>:null}
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"13px 14px"}}>
      {cur.note?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>{cur.note}</div>:null}{!cur.routes&&!showOnRanks?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:11,padding:"9px 12px",marginBottom:10,fontSize:12,color:C.textMuted,lineHeight:1.5}}>You’re hidden from leaderboards — you won’t appear in any ranking. Turn it back on in Settings › Privacy & safety.</div>:!cur.routes&&meIdx>=0?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:C.blueBg,border:`1px solid ${C.blueDim}`,borderRadius:11,padding:"9px 12px",marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}><Av src={ME.avatar} size={30}/><div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.blue}}>You’re #{rankAt(meIdx)}<span style={{color:C.textMuted,fontWeight:500}}> of {ranked.length}</span></div><div style={{fontSize:12,color:C.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(scope==="overall"?"Overall":scope==="near"?"Near you":scope==="friends"?"Among friends":"In "+(aCur.name||"this area"))+" · "+cur.label}</div></div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{display:"flex",alignItems:"baseline",gap:4,justifyContent:"flex-end"}}><div style={{fontSize:17,fontWeight:700,color:C.blue}}><CountUp value={disp(ranked[meIdx])}/></div><div style={{fontSize:12,color:C.textMuted}}>{cur.suffix}</div></div></div></div>:meUnranked?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:11,padding:"9px 12px",marginBottom:10,fontSize:12,color:C.textMuted,lineHeight:1.5}}>You’re not ranked on this board yet — nothing you’ve logged counts toward it.</div>:null}
      {atAllCountries?<div style={{textAlign:"center",color:C.textMuted,fontSize:13,padding:"18px 0",lineHeight:1.5}}>Pick a country above to see its rankings.</div>:lbUnavailable?<div style={{textAlign:"center",color:C.textMuted,fontSize:13,padding:"18px 0",lineHeight:1.5}}>This board couldn’t be read.</div>:lbLoading?<div style={{textAlign:"center",color:C.textMuted,fontSize:13,padding:"18px 0"}}>Loading rankings…</div>:cur.routes?(rr.length?<div>{rr.map((o,i)=><div key={o.r.id} {...clickable(()=>onClimb&&onClimb(o.r))} style={{display:"flex",alignItems:"center",gap:11,padding:"8px 4px",borderTop:i?`1px solid ${C.borderLight}`:"none",cursor:"pointer"}}><div style={{width:26,textAlign:"center",fontSize:i<3?17:13,fontWeight:800,color:i<3?C.amber:C.textSub,flexShrink:0}}>{medal(i)}</div><div style={{width:34,height:34,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:(CAT[catOf(o.r)]||{}).bg||C.surface}}><DiscIcon d={catOf(o.r)} size={18}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{o.r.name}</div><div style={{fontSize:12,color:C.textMuted}}>{(o.areaName||(MOUNTAINS.find(m=>m.id===o.r.mountainId)||{}).name||"")+" · "+o.r.grade}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:14,fontWeight:700,color:C.amber}}>{o.st!=null?"★ "+o.st.toFixed(1):"★ —"}</div><div style={{fontSize:12,color:C.textMuted}}>{real?(o.reps+(o.reps===1?" climber":" climbers")):(o.reps+" logged")}</div></div></div>)}</div>:<div style={{textAlign:"center",color:C.textMuted,fontSize:12,padding:"18px 0"}}>No climbs in this scope yet.</div>):((top.length&&!friendsEmpty&&!nearEmpty)?<div><div aria-hidden="true" style={{display:"flex",alignItems:"center",gap:10,padding:"0 8px 7px",fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:0.4,textTransform:"uppercase",borderBottom:`1px solid ${C.border}`}}><div style={{width:30,textAlign:"center"}}>#</div><div style={{flex:1,paddingLeft:42}}>Climber</div><div style={{minWidth:60,textAlign:"right",whiteSpace:"nowrap"}}>{cur.suffix}</div>{showFlag?<div style={{width:30}}/>:null}</div><div>{shown.map((pp,i)=>lbRow(pp,i,i===shown.length-1))}</div>{top.length>lbN?<button onClick={()=>setLbN(n=>n+15)} style={{width:"100%",padding:14,margin:"8px 0 2px",background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:11,fontSize:13.5,fontWeight:700,cursor:"pointer"}}>{"Show more · "+(top.length-lbN)+" left"}</button>:null}{showMe?<div style={{marginTop:8,paddingTop:8,borderTop:`1px dashed ${C.border}`}}>{lbRow(ranked[meIdx],meIdx,true)}</div>:null}<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",marginTop:9}}>{ranked.length>100?("The top 100 of "+ranked.length.toLocaleString()+" climbers ranked"):(ranked.length+(ranked.length===1?" climber":" climbers")+" ranked")}</div></div>:<div style={{textAlign:"center",color:C.textMuted,fontSize:13,padding:"18px 0",lineHeight:1.5}}>{friendsEmpty?"No climbing friends yet — tap any climber to view their profile and add them, then compare here.":nearEmpty?"No climbers logged near you yet — try widening the distance.":"Nobody has scored on this board yet."}</div>)}
    </div>
    {real?null:<div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginTop:10,fontStyle:"italic",lineHeight:1.4}}>Trust, belay, and activity reward reliability — not just hard numbers. Tap anyone to view and connect.</div>}
  </div>);
}
