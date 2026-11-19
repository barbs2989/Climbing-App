// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
//
// FIRST RUN IS A STEPPED SETUP, one question per screen: welcome -> username -> photo -> home area ->
// climbing -> about you -> notifications -> "You're all set". Redesigned 2026-11-14 (owner: "make it
// look professional and complete with good ui and ux"), after a walkthrough as a new climber and a
// survey of how Strava, KAYA, Mountain Project, theCrag, Bumble BFF, Hinge, Meetup and Playtomic
// onboard people:
//   * On a phone it is a full-screen sheet; at 1024px+ it is a centred card with the steps listed in
//     a rail beside it, instead of a phone column floating in an empty window.
//   * "Step 2 of 6", one primary button per step, and "Skip for now" as a text link where a step is
//     optional -- never two buttons that do the same thing.
//   * Username: clean suggestions from the display name and a live "available / taken" line, so a
//     taken name is known before Continue (lib/username.js usernameIdeas, lib/db.js isUsernameFree).
//   * Home area: a typed town is looked up on Enter or the search button (never per keystroke, the
//     OpenStreetMap rule -- lib/homeFromDevice.js searchTowns) and the match is confirmed.
//   * Climbing: a grade box only for each discipline picked; "About you" adds EXPERIENCE LEVEL
//     (profiles.level), which Partners filters by and setup had never asked.
//   * A finish screen with the profile as others see it and the next steps (Partners, photo, areas),
//     the KAYA "set up 0/6" idea, instead of a toast.
//
// WHAT IS REQUIRED (owner, 2026-11-14). A signed-in account must choose a USERNAME, a HOME AREA and
// its CLIMBING (disciplines, plus one grade when a picked discipline has a grade ladder); there is
// no Skip setup for it, only Sign out. The username is saved the moment Continue is pressed, because
// it is locked once chosen (0432: one change in the first 7 days) and must not wait on the last step.
// Photo, about-you and notifications stay optional. A guest, with no account to keep anything in,
// can still skip the lot. Zip and photo are asked for where they matter instead: Partners asks for a
// zip before it lists real climbers, and sending a request asks for a photo.
// EDITING (opened over a profile that already has disciplines) is the climbing step alone, as it
// always was -- preceded by the username step for an older account that never chose one -- and it
// closes on Save, with no finish screen.
//
// Each answer is stored where the profile editor stores it, so the two cannot disagree: the photo
// is uploaded and saved the moment it is chosen (saveProfileAvatar says why it cannot wait), the
// alerts are the Settings switches themselves (lib/notif-pref.js), and the rest goes back to App's
// onFinish, which writes the same columns saveEdit writes.
import { USE_DB } from "./supabase";
import { clickable } from "./clickable";
import { useEffect, useState } from "react";
import { C, DISC, GENDERS, HERO_BG, HERO_SHEEN, LEVEL_DESC, LVL, MOUNTAINS, PROFILE_GRADES, VL, YDSL, fuzzyMatch } from "../ClimbMatchCore.jsx";
import { isUsernameFree, saveProfileAvatar, uploadProfilePhoto } from "./db";
import { saveProfile } from "./auth";
import { cleanUsername, usernameIdeas, usernameProblem, usernameSaveError, USERNAME_GRACE_DAYS } from "./username";
import { homeFromDevice, searchTowns } from "./homeFromDevice";
import { NOTIF_FLAGS } from "./notif-pref";
import { POP_BACK } from "./popupChrome.js";
import { useWideScreen } from "./wideLayout.js";
import DiscIcon from "../src/components/DiscIcon.tsx";
import ActionIcon from "../src/components/ActionIcon.tsx";
import Av from "../src/components/Av.tsx";

// The Settings > Notifications switches, in the words that screen uses.
const NOTIF_COPY = { crew: ["Crew updates", "Members joining, a climb coming up, how it went"], conditions: ["Condition reports", "Someone reports conditions on a climb you logged"], objectives: ["Your objectives", "Someone logs a climb you saved, or one you didn’t send is back in season"], requests: ["Requests & vouches", "Friend / crew requests and vouches"] };

// A Google account's photo, at a size worth keeping: its URL ends in a size suffix (=s96-c).
const bigGooglePhoto = (u) => String(u || "").replace(/=s\d+(-c)?$/, "=s400-c");

// Disciplines with a grade ladder: picking one of these means a grade is asked for before Continue.
const GRADED_DISC = ["rock", "bouldering", "ice", "mixed", "aid"];

// Each step's name in the desktop rail and its icon above the question.
const STEP_META = { username: ["Username", "user"], photo: ["Photo", "camera"], home: ["Home area", "pin"], climb: ["Your climbing", "mountain"], about: ["About you", "partners"], alerts: ["Notifications", "bell"] };

const LOGO = (size) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{display:"block",flexShrink:0}}><rect width="24" height="24" rx="5.5" fill={C.bg}/><g transform="translate(2.4 2.4) scale(0.8)"><path d="m8 3 4 8 5-5 5 15H2L8 3z" fill="none" stroke={C.blue} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g></svg>;

export default function Onboarding({onFinish,onSkip,onSignOut,onUsernameSaved,onDone,initial,onHelp,uid,googlePhoto,avatarNow,onAvatarChange,notifPrefs,onNotifChange}){
  const wide=useWideScreen();
  const [home,setHome]=useState(initial&&initial.homeArea||"");const [disc,setDisc]=useState(initial&&initial.disciplines||[]);
  const [sg,setSg]=useState(initial&&initial.sportGrade||"N/A");const [tg,setTg]=useState(initial&&initial.tradGrade||"N/A");const [bg,setBg]=useState(initial&&initial.boulderGrade||"N/A");
  /* Ice, mixed and aid have no grade column: their grade lives in `climb_grades` (0237), as the profile
     editor writes it. An emptied grade is DELETED from the map, keeping any lead/follow role. */
  const [cg,setCg]=useState(initial&&initial.climbGrades||{});
  const setCgGrade=(k,v)=>setCg(m=>{const o={...m};const x={...(o[k]||{})};if(v&&v!=="N/A")x.grade=v;else delete x.grade;if(Object.keys(x).length)o[k]=x;else delete o[k];return o;});
  /* Frozen at open, like needUser below: finishing writes disciplines into App's profile (our `initial`),
     and a live re-read would flip a first run into EDITING under the finish screen. */
  const [editing]=useState(()=>!!(initial&&initial.disciplines&&initial.disciplines.length));
  const tog=v=>setDisc(d=>d.includes(v)?d.filter(x=>x!==v):[...d,v]);
  const areas=MOUNTAINS.filter(m=>m.id!=="world");
  const [homeQ,setHomeQ]=useState(()=>{const a=areas.find(x=>x.id===home);return a?a.name:home;});
  const [gender,setGender]=useState(initial&&initial.gender||"");
  const [level,setLevel]=useState(initial&&LVL[initial.level]?initial.level:"");
  /* Detected location: the zip is offered for partner search only when the lookup found one, and only with a box the climber can untick. */
  const [locBusy,setLocBusy]=useState(false);const [locErr,setLocErr]=useState("");const [zip,setZip]=useState("");const [useZip,setUseZip]=useState(true);
  /* Typed-town lookup (submit only) and whether the box now holds a confirmed match. */
  const [towns,setTowns]=useState(null);const [townBusy,setTownBusy]=useState(false);const [townErr,setTownErr]=useState("");const [homeOkd,setHomeOkd]=useState(false);
  const [ava,setAva]=useState(avatarNow||"");const [avaBusy,setAvaBusy]=useState(false);const [avaErr,setAvaErr]=useState("");
  /* REQUIRED MODE: a real account. Guests keep every skip -- there is no account to require anything of. */
  const required=!!(uid&&USE_DB);
  /* Frozen at open: once the username is saved, App's profile (our `initial`) has one, and a live
     re-read would drop the step from `steps` and shift every later step's index under the climber. */
  const [needUser]=useState(()=>required&&!((initial&&initial.username)||"").trim());
  const [ideas]=useState(()=>usernameIdeas((initial&&initial.name)||""));
  const [un,setUn]=useState(()=>needUser?(ideas[0]||""):"");const [unErr,setUnErr]=useState("");const [unBusy,setUnBusy]=useState(false);const [unSaved,setUnSaved]=useState(!needUser);
  /* The live check: "" (nothing to say) | "checking" | "free" | "taken" | "unknown" (the read failed -- Continue still tries, and the save is the judge). */
  const [unState,setUnState]=useState("");
  /* The photo step needs somewhere to keep the photo: an account. Signed out there is no step rather than one that previews and forgets. */
  const steps=editing?(needUser?["username","climb"]:["climb"]):["intro"].concat(needUser?["username"]:[],required?["photo"]:[],["home","climb","about","alerts"]);
  const [si,setSi]=useState(0);const step=steps[si];
  const [doneShown,setDoneShown]=useState(false);
  const next=()=>setSi(i=>Math.min(i+1,steps.length-1));const back=()=>setSi(i=>Math.max(i-1,0));
  const counted=steps.filter(s=>s!=="intro");const stepNo=counted.indexOf(step)+1;
  /* The grade boxes on screen: one per picked discipline that has a ladder. A grade already on file for a discipline no longer picked is kept, not shown. */
  const gradeRows=[].concat(disc.includes("rock")?[["Sport",sg,setSg,YDSL],["Trad",tg,setTg,YDSL]]:[],disc.includes("bouldering")?[["Boulder",bg,setBg,VL]]:[],PROFILE_GRADES.filter(g=>!g.col&&disc.includes(g.k)).map(g=>[g.label,(cg[g.k]&&cg[g.k].grade)||"N/A",v=>setCgGrade(g.k,v),g.ladder]));
  /* One grade, when a picked discipline has a ladder: partner matching reads grades, and "N/A" everywhere matched nobody. */
  const gradeNeeded=disc.some(d=>GRADED_DISC.includes(d));
  const gradeOk=!gradeNeeded||gradeRows.some(r=>r[1]&&r[1]!=="N/A");
  const climbOk=disc.length>0&&gradeOk;
  const homeOk=!required||!!((homeQ||"").trim()||home);
  const finish=()=>{if(!disc.length)return;onFinish({/* homeArea is saved into profiles.location, which partner rows print as the climber's city. Send what the box shows -- the picked name or the city already on file -- and fall back to `home` so an untouched box never blanks it. */homeArea:(homeQ||"").trim()||home,disciplines:disc,sportGrade:sg,tradGrade:tg,boulderGrade:bg,climbGrades:cg,gender:gender,level:level,zip:zip&&useZip?zip:""},{keepOpen:!editing});if(!editing)setDoneShown(true);};
  const detect=()=>{setLocErr("");setTowns(null);setLocBusy(true);homeFromDevice().then(function(r){setLocBusy(false);setHome("");setHomeQ(r.location);setHomeOkd(true);setZip(r.zip);setUseZip(true);}).catch(function(e){setLocBusy(false);setLocErr((e&&e.message)||"Couldn’t find where you are — type your town instead.");});};
  const lookUp=()=>{const q=(homeQ||"").trim();if(!USE_DB||q.length<2||townBusy)return;setTownErr("");setTownBusy(true);searchTowns(q).then(function(rs){setTownBusy(false);setTowns(rs);}).catch(function(){setTownBusy(false);setTowns(null);setTownErr("Couldn’t look that up just now — you can keep what you typed.");});};
  /* Upload a COPY of a picked photo (or the Google one) into our own storage, the way the profile editor does, and save it at once. The Google URL is used as it is only if its image cannot be fetched to copy. */
  const keepPhoto=(file,fallbackUrl,onDoneP)=>{setAvaErr("");setAvaBusy(true);(file?uploadProfilePhoto(file):Promise.reject(new Error("no file"))).catch(function(e){if(fallbackUrl)return fallbackUrl;throw e;}).then(function(url){return saveProfileAvatar(uid,url).then(function(){return url;});}).then(function(url){setAvaBusy(false);setAva(url);if(onAvatarChange)onAvatarChange(url);if(onDoneP)onDoneP();}).catch(function(err){setAvaBusy(false);setAvaErr((err&&err.message)||"Couldn’t save that photo. Check your connection and try again.");});};
  const takeGooglePhoto=(onDoneP)=>{const u=bigGooglePhoto(googlePhoto);setAvaBusy(true);fetch(u).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.blob();}).then(function(b){keepPhoto(new File([b],"google-photo.jpg",{type:b.type||"image/jpeg"}),u,onDoneP);}).catch(function(){keepPhoto(null,u,onDoneP);});};
  /* Save the username NOW: Continue is the commitment, and the 0432 lock starts here. */
  const saveUsername=()=>{const u=cleanUsername(un);const p=usernameProblem(u);if(p){setUnErr(p);return;}if(unState==="taken"){setUnErr("@"+u+" is taken — try another.");return;}setUnErr("");setUnBusy(true);saveProfile(uid,{username:u}).then(function(r){if(r&&r.error)throw r.error;setUnBusy(false);setUnSaved(true);if(onUsernameSaved)onUsernameSaved(u);next();}).catch(function(e){setUnBusy(false);setUnErr(usernameSaveError(e,u));});};
  /* LIVE AVAILABILITY, 400 ms after typing stops. A stale answer (the box changed meanwhile) is dropped. */
  useEffect(()=>{if(step!=="username")return undefined;const u=cleanUsername(un);if(!u||usernameProblem(u)||!USE_DB){setUnState("");return undefined;}setUnState("checking");let live=true;const t=setTimeout(function(){isUsernameFree(u,uid).then(function(free){if(live)setUnState(free?"free":"taken");}).catch(function(){if(live)setUnState("unknown");});},400);return function(){live=false;clearTimeout(t);};},[un,step,uid]);
  /* No way out of a required setup but finishing it or signing out. Once the username is saved, an EDITING open may still be cancelled. */
  const canLeave=!required||(editing&&unSaved);
  const leave=canLeave&&!doneShown?onSkip:undefined;
  const finishDone=(action)=>{if(onDone)onDone(action);else if(onSkip)onSkip();};

  /* ── shared pieces ── */
  const H=(icon,t,sub,opt)=><div style={{marginBottom:22}}>
    {icon?<div aria-hidden="true" style={{width:44,height:44,borderRadius:13,background:C.blueBg,border:"1px solid "+C.blueDim,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}><ActionIcon name={icon} size={21} color={C.blue}/></div>:null}
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div role="heading" aria-level={2} style={{fontSize:wide?26:24,fontWeight:800,letterSpacing:-0.4,color:C.text,lineHeight:1.2}}>{t}</div>{opt?<span style={{fontSize:11,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.textSub,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"3px 9px"}}>Optional</span>:null}</div>
    {sub?<div style={{fontSize:14,color:C.textSub,lineHeight:1.55,marginTop:7}}>{sub}</div>:null}
  </div>;
  const chip=(on)=>({padding:"10px 15px",minHeight:44,boxSizing:"border-box",borderRadius:12,border:"1.5px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub,fontSize:14,fontWeight:700,cursor:"pointer"});
  const primaryStyle=(ok)=>({width:wide?"auto":"100%",minWidth:wide?220:0,minHeight:50,padding:"13px 22px",boxSizing:"border-box",background:ok?C.blueSolid:C.border,color:ok?C.onSolid:C.textMuted,border:"none",borderRadius:12,fontSize:15.5,cursor:ok?"pointer":"default",fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8});
  const linkBtn={background:"none",border:"none",color:C.textSub,fontSize:14,fontWeight:700,cursor:"pointer",padding:"12px 8px",minHeight:44};
  const label={display:"block",fontSize:12,color:C.textMuted,fontWeight:800,marginBottom:8,letterSpacing:0.5,textTransform:"uppercase"};
  const field={width:"100%",minHeight:48,padding:"12px 14px",borderRadius:12,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:16,boxSizing:"border-box",outline:"none"};

  /* The footer: ONE primary action, and "Skip for now" as a text link where the step is optional. A plain
     component holding only buttons, so its remount on each render costs no focus or typing. */
  const Foot=({primary,skip,extra})=><div style={{flexShrink:0,padding:wide?"16px 44px 22px":"12px 16px calc(14px + env(safe-area-inset-bottom))",borderTop:"1px solid "+C.border,background:C.surface}}>
    <div style={{display:"flex",flexDirection:wide?"row-reverse":"column",alignItems:wide?"center":"stretch",justifyContent:"space-between",gap:wide?12:2}}>{primary}{skip?<button onClick={skip} style={linkBtn}>Skip for now</button>:(wide?(extra||<span/>):null)}</div>
    {wide&&!skip?null:(extra||null)}
  </div>;

  /* ── the steps ── */
  let body=null,foot=null;
  if(doneShown){
    const shownName=(un||(initial&&initial.username)||"").trim();
    const where=(homeQ||"").trim()||home;
    const rows=[].concat(
      [["partners","Find climbing partners",required?"Add your zip and see climbers near you":"Browse climbers and crews near you","partners"]],
      required&&!ava?[["camera","Add a profile photo","Optional — helps partners recognise you at the crag","photo"]]:[],
      required?[["pin","List the areas you climb","So climbers there can find you","areas"]]:[],
      [["mountain","Explore climbs","Conditions, beta and plans for your next objective","climbs"]]);
    body=<div style={{textAlign:wide?"left":"center"}}>
      <div aria-hidden="true" style={{width:wide?52:64,height:wide?52:64,borderRadius:32,background:C.greenBg,border:"1px solid "+C.green,display:"flex",alignItems:"center",justifyContent:"center",margin:wide?"0 0 12px":"8px auto 16px"}}><ActionIcon name="check" size={wide?26:30} color={C.green}/></div>
      <div role="heading" aria-level={2} style={{fontSize:wide?28:26,fontWeight:800,letterSpacing:-0.4,color:C.text}}>You’re all set</div>
      <div style={{fontSize:14,color:C.textSub,lineHeight:1.55,marginTop:7}}>{required?"This is how other climbers will see you.":"Your setup is saved on this device."}</div>
      <div style={{display:"flex",alignItems:"center",gap:14,textAlign:"left",background:C.card,border:"1px solid "+C.border,borderRadius:16,padding:"14px 16px",margin:wide?"14px 0 16px":"18px 0 22px"}}>
        <Av src={ava||""} size={56}/>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text,overflowWrap:"anywhere"}}>{(initial&&initial.name)||"Climber"}</div>
          <div style={{fontSize:13,color:C.textSub,marginTop:2,overflowWrap:"anywhere"}}>{[shownName?"@"+shownName:"",where,level].filter(Boolean).join(" · ")}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>{disc.map(k=>DISC[k]?<span key={k} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:DISC[k].color,background:DISC[k].bg,borderRadius:14,padding:"3px 9px"}}><DiscIcon d={k} size={12}/>{DISC[k].label}</span>:null)}</div>
        </div>
      </div>
      <div style={{...label,textAlign:"left"}}>Next steps</div>
      <div style={{display:"flex",flexDirection:"column",gap:wide?7:9}}>{rows.map(r=><button key={r[3]} onClick={()=>finishDone(r[3])} style={{display:"flex",alignItems:"center",gap:13,width:"100%",textAlign:"left",background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"12px 14px",minHeight:60,cursor:"pointer",boxSizing:"border-box"}}><span aria-hidden="true" style={{width:38,height:38,borderRadius:11,background:C.blueBg,border:"1px solid "+C.blueDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ActionIcon name={r[0]} size={18} color={C.blue}/></span><span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:14.5,fontWeight:700,color:C.text}}>{r[1]}</span><span style={{display:"block",fontSize:12.5,color:C.textSub,marginTop:2,lineHeight:1.4}}>{r[2]}</span></span><span aria-hidden="true" style={{color:C.textMuted,fontSize:18,flexShrink:0}}>›</span></button>)}</div>
    </div>;
    foot=<Foot primary={<button onClick={()=>finishDone("home")} style={primaryStyle(true)}>Go to Home</button>} extra={onHelp?<button onClick={()=>{finishDone("help");}} style={{...linkBtn,display:"block",width:wide?"auto":"100%",color:C.blue,fontSize:13,textAlign:wide?"left":"center",paddingLeft:wide?0:8}}>See how ClimbMatch works →</button>:null}/>;
  }else if(step==="intro"){
    body=<div>
      {wide?null:<div style={{background:HERO_BG,boxShadow:HERO_SHEEN,padding:"calc(40px + env(safe-area-inset-top)) 22px 26px",textAlign:"center",margin:"-8px -20px 0"}}>
        <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>{LOGO(72)}</div>
        <div role="heading" aria-level={2} style={{fontSize:27,fontWeight:800,letterSpacing:-0.5,color:C.text}}>Welcome to Climb<span style={{color:C.blue}}>Match</span></div>
        <div style={{fontSize:14,color:C.textSub,lineHeight:1.5,marginTop:8}}>A few quick questions so we can match you with the right partners and climbs.</div>
      </div>}
      {wide?<div style={{marginBottom:22}}><div role="heading" aria-level={2} style={{fontSize:30,fontWeight:800,letterSpacing:-0.5,color:C.text}}>Welcome to Climb<span style={{color:C.blue}}>Match</span></div><div style={{fontSize:15,color:C.textSub,lineHeight:1.55,marginTop:8}}>A few quick questions so we can match you with the right partners and climbs.</div></div>:null}
      <div style={{padding:wide?0:"22px 2px 8px",display:"grid",gridTemplateColumns:wide?"1fr 1fr":"1fr",gap:wide?16:0}}>{[["shield","Trusted conditions","Beta, live conditions, and trip reports from climbers who were just there."],["partners","Partners & crews","Find climbers near you, check their vouches, and form a crew."],["calendar","Plan every climb","Day-by-day itineraries, a what-to-bring gear list, float plans, and live forecasts."],["award","Log, list & rank","Track ascents, build and share tick-lists, and see where you land on the leaderboard."]].map(f=><div key={f[1]} style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:wide?0:16,background:wide?C.card:"transparent",border:wide?"1px solid "+C.border:"none",borderRadius:14,padding:wide?"14px 15px":0}}><div style={{width:38,height:38,borderRadius:11,background:C.blueBg,border:"1px solid "+C.blueDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ActionIcon name={f[0]} size={18} color={C.blue}/></div><div><div style={{fontSize:14.5,fontWeight:700,color:C.text}}>{f[1]}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.45,marginTop:2}}>{f[2]}</div></div></div>)}</div>
    </div>;
    foot=<Foot primary={<button onClick={next} style={primaryStyle(true)}>Set up my profile</button>} skip={canLeave?onSkip:null} extra={<div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:"0 14px",marginTop:4}}>
      <span style={{fontSize:12.5,color:C.textMuted,alignSelf:"center"}}>Takes about a minute.</span>
      {onHelp?<button onClick={onHelp} style={{...linkBtn,color:C.blue,fontSize:13,padding:"10px 4px"}}>How ClimbMatch works →</button>:null}
      {!canLeave&&onSignOut&&!wide?<button onClick={onSignOut} style={{...linkBtn,fontSize:13,padding:"10px 4px"}}>Not you? Sign out</button>:null}
    </div>}/>;
  }else if(step==="username"){
    const u=cleanUsername(un);
    const line=unErr?[C.red,unErr,"alert"]:unState==="checking"?[C.textMuted,"Checking…",null]:unState==="free"?[C.green,"@"+u+" is available",null]:unState==="taken"?[C.red,"@"+u+" is taken — try another, or tap a suggestion.",null]:[C.textMuted,"3–20 lowercase letters, numbers or underscores.",null];
    const okToGo=!!u&&!usernameProblem(u)&&unState!=="taken"&&unState!=="checking"&&!unBusy;
    body=<div>
      {H("user","Choose your username","This is how other climbers find, mention and vouch for you.")}
      <label htmlFor="cm-onb-username" style={label}>Username</label>
      <div style={{display:"flex",alignItems:"center",borderRadius:12,border:"1.5px solid "+(unErr||unState==="taken"?C.red:unState==="free"?C.green:C.blue),background:C.card,overflow:"hidden",minHeight:50}}><span aria-hidden="true" style={{padding:"0 0 0 14px",color:C.textMuted,fontSize:16,fontWeight:700}}>@</span><input id="cm-onb-username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={un} onChange={e=>{setUn(cleanUsername(e.target.value));setUnErr("");}} onKeyDown={e=>{if(e.key==="Enter"&&okToGo)saveUsername();}} placeholder="yourname" aria-invalid={!!unErr||unState==="taken"} aria-describedby="cm-onb-username-help" style={{flex:1,minWidth:0,padding:"12px 14px 12px 2px",border:"none",background:"transparent",color:C.text,fontSize:16,outline:"none"}}/>{unState==="free"?<span aria-hidden="true" style={{paddingRight:13,display:"flex"}}><ActionIcon name="check" size={18} color={C.green}/></span>:null}</div>
      <div id="cm-onb-username-help" role={line[2]||undefined} aria-live="polite" style={{fontSize:13,color:line[0],lineHeight:1.45,marginTop:7,fontWeight:unState==="free"||unState==="taken"||unErr?700:400}}>{line[1]}</div>
      {ideas.filter(x=>x!==u).length?<div style={{marginTop:16}}><div style={label}>Suggestions</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{ideas.filter(x=>x!==u).map(x=><button key={x} onClick={()=>{setUn(x);setUnErr("");}} style={{...chip(false),padding:"8px 13px",fontSize:13.5}}>@{x}</button>)}</div></div>:null}
      <div style={{display:"flex",gap:11,alignItems:"flex-start",background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginTop:20,fontSize:13,color:C.textSub,lineHeight:1.5}}><span style={{flexShrink:0,marginTop:1}}><ActionIcon name="lock" size={16} color={C.amber}/></span><span><b style={{color:C.text}}>Choose carefully.</b> You can change it once in the first {USERNAME_GRACE_DAYS} days; after that it’s locked, so climbers always know who they vouched for.</span></div>
    </div>;
    foot=<Foot primary={<button onClick={saveUsername} disabled={!okToGo} style={primaryStyle(okToGo)}>{unBusy?"Saving…":"Continue"}</button>}/>;
  }else if(step==="photo"){
    const shown=ava||(googlePhoto?bigGooglePhoto(googlePhoto):"");
    const pick=(e)=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(f)keepPhoto(f,null);};
    body=<div>
      {H("camera","Add a profile photo","Not needed to find partners — it just helps them recognise you at the crag. A clear photo of your face works best.",true)}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,margin:"6px 0 4px"}}>
        <label aria-label={ava?"Choose a different photo":"Choose a photo"} style={{position:"relative",cursor:avaBusy?"default":"pointer",borderRadius:"50%"}}><Av src={shown} size={132}/><span aria-hidden="true" style={{position:"absolute",right:4,bottom:4,width:38,height:38,borderRadius:19,background:C.blueSolid,border:"3px solid "+C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="camera" size={17} color={C.onSolid}/></span><input type="file" accept="image/*" disabled={avaBusy} onChange={pick} style={{display:"none"}}/></label>
        {!ava&&googlePhoto?<div style={{fontSize:13,color:C.textSub,textAlign:"center"}}>Your Google photo — use it, or tap to choose another.</div>:null}
        {ava?<div style={{fontSize:13,color:C.green,fontWeight:700,display:"flex",alignItems:"center",gap:6}}><ActionIcon name="check" size={15} color={C.green}/>Photo saved — tap it to change.</div>:null}
        {avaErr?<div role="alert" style={{fontSize:13,color:C.red,lineHeight:1.45,textAlign:"center"}}>{avaErr}</div>:null}
        <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45,textAlign:"center",maxWidth:340}}>Before it’s uploaded, the location your camera saved inside the photo is removed.</div>
      </div>
    </div>;
    const prim=ava?<button onClick={next} style={primaryStyle(true)}>Continue</button>:googlePhoto?<button onClick={function(){takeGooglePhoto(next);}} disabled={avaBusy} style={primaryStyle(!avaBusy)}>{avaBusy?"Saving…":"Use my Google photo"}</button>:<label style={{...primaryStyle(!avaBusy),cursor:avaBusy?"default":"pointer"}}><ActionIcon name="camera" size={18} color={avaBusy?C.textMuted:C.onSolid}/>{avaBusy?"Saving…":"Choose a photo"}<input type="file" accept="image/*" disabled={avaBusy} onChange={pick} style={{display:"none"}}/></label>;
    foot=<Foot primary={prim} skip={ava?null:next}/>;
  }else if(step==="home"){
    body=<div>
      {H("pin","Where do you mainly climb?","Your home area shows on your profile and helps us find partners and climbs near you. A town or city is enough.")}
      <button onClick={detect} disabled={locBusy} style={{width:"100%",minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px 14px",borderRadius:12,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:14.5,fontWeight:700,cursor:locBusy?"default":"pointer",marginBottom:16}}><ActionIcon name="pin" size={17} color={C.blue}/>{locBusy?"Finding you…":"Use my current location"}</button>
      {locErr?<div role="alert" style={{fontSize:13,color:C.amber,lineHeight:1.45,marginTop:-8,marginBottom:14}}>{locErr}</div>:null}
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"0 0 12px",color:C.textMuted,fontSize:12,fontWeight:700}}><span style={{flex:1,height:1,background:C.border}}/>or type it<span style={{flex:1,height:1,background:C.border}}/></div>
      <div style={{position:"relative",marginBottom:10}}>
        <div style={{display:"flex",gap:8}}>
          <input aria-label="Search a range, canyon, or peak" value={homeQ} onChange={e=>{setHomeQ(e.target.value);setHome("");setZip("");setHomeOkd(false);setTowns(null);setTownErr("");}} onKeyDown={e=>{if(e.key==="Enter")lookUp();}} placeholder={USE_DB?"Town or city — e.g. Leavenworth":"Search a range, canyon, or peak..."} style={{...field,flex:1,minWidth:0,border:"1.5px solid "+(homeOkd||home?C.green:homeQ?C.blue:C.border)}}/>
          {USE_DB?<button onClick={lookUp} disabled={townBusy||(homeQ||"").trim().length<2} aria-label="Look up this town" style={{flexShrink:0,width:48,minHeight:48,borderRadius:12,border:"1px solid "+C.border,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",cursor:townBusy?"default":"pointer"}}><ActionIcon name="search" size={18} color={(homeQ||"").trim().length<2?C.textMuted:C.blue}/></button>:null}
        </div>
        {!USE_DB&&homeQ&&!home?(()=>{const ms=areas.filter(a=>fuzzyMatch(homeQ,a.name)).slice(0,7);return <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:"1px solid "+C.border,borderRadius:10,marginTop:4,maxHeight:210,overflowY:"auto",overscrollBehavior:"contain",zIndex:5,boxShadow:"0 12px 30px rgba(0,0,0,0.5)"}}>{ms.length?ms.map(a=><div key={a.id} {...clickable(()=>{setHome(a.id);setHomeQ(a.name);})} style={{padding:"9px 11px",fontSize:13.5,fontWeight:700,cursor:"pointer",borderBottom:"1px solid "+C.borderLight,color:C.text}}>{a.name}</div>):<div style={{padding:"9px 11px",fontSize:12.5,color:C.textMuted}}>No match — keep typing</div>}</div>;})():null}
      </div>
      {townBusy?<div role="status" style={{fontSize:13,color:C.textMuted,marginBottom:10}}>Looking up “{(homeQ||"").trim()}”…</div>:null}
      {townErr?<div role="alert" style={{fontSize:13,color:C.amber,lineHeight:1.45,marginBottom:10}}>{townErr}</div>:null}
      {towns&&!homeOkd?(towns.length?<div role="group" aria-label="Matching towns" style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12}}>{towns.map(t=><button key={t.location} onClick={()=>{setHomeQ(t.location);setHome("");setHomeOkd(true);setTowns(null);}} style={{display:"flex",alignItems:"center",gap:11,textAlign:"left",width:"100%",minHeight:52,padding:"10px 13px",borderRadius:12,border:"1px solid "+C.border,background:C.card,cursor:"pointer",boxSizing:"border-box"}}><ActionIcon name="pin" size={16} color={C.textSub}/><span style={{minWidth:0}}><span style={{display:"block",fontSize:14.5,fontWeight:700,color:C.text}}>{t.location}</span>{t.detail?<span style={{display:"block",fontSize:12,color:C.textMuted,marginTop:1}}>{t.detail}</span>:null}</span></button>)}</div>:<div style={{fontSize:13,color:C.textSub,lineHeight:1.45,marginBottom:12}}>No town by that name — check the spelling, or keep what you typed.</div>):null}
      {(homeOkd||home)&&(homeQ||"").trim()?<div style={{display:"flex",alignItems:"center",gap:7,fontSize:13.5,color:C.green,fontWeight:700,marginBottom:12}}><ActionIcon name="check" size={16} color={C.green}/>{homeQ}</div>:USE_DB&&(homeQ||"").trim().length>=2&&!towns&&!townBusy?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:12}}>Press Enter or the search button to check the spelling.</div>:null}
      {zip&&uid&&USE_DB?<label style={{display:"flex",alignItems:"flex-start",gap:10,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",fontSize:13,color:C.textSub,lineHeight:1.45,cursor:"pointer"}}><input type="checkbox" checked={useZip} onChange={e=>setUseZip(e.target.checked)} style={{marginTop:2,width:18,height:18,accentColor:C.blue,flexShrink:0}}/><span><b style={{color:C.text}}>Also save zip {zip} for partner search.</b> Only you can see it; other climbers see a rounded distance.</span></label>:null}
    </div>;
    foot=<Foot primary={<button onClick={next} disabled={!homeOk} style={primaryStyle(homeOk)}>Continue</button>} skip={required?null:next}/>;
  }else if(step==="climb"){
    body=<div>
      {H("mountain",editing?"Edit your climbing":"What do you climb?","Pick everything you do. This is what partners are matched on.")}
      <div role="group" aria-label="Disciplines" style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>{Object.keys(DISC).map(k=>{const on=disc.includes(k),cat=DISC[k];return <button key={k} onClick={()=>tog(k)} aria-pressed={on} style={{display:"flex",alignItems:"center",gap:7,minHeight:44,boxSizing:"border-box",padding:"9px 15px",borderRadius:22,border:`1.5px solid ${on?cat.color:C.border}`,background:on?cat.bg:C.surface,color:on?cat.color:C.textSub,fontSize:14,fontWeight:700,cursor:"pointer"}}><DiscIcon d={k} size={16}/>{cat.label}{on?<ActionIcon name="check" size={14} color={cat.color}/>:null}</button>;})}</div>
      {gradeRows.length?<div>
        <div style={{...label,marginBottom:3}}>Your grades</div>
        <div style={{fontSize:13,color:C.textSub,lineHeight:1.45,marginBottom:11}}>The grade you climb comfortably — at least one.</div>
        <div style={{display:"grid",gridTemplateColumns:wide?"1fr 1fr 1fr":"1fr 1fr",gap:10}}>{gradeRows.map(x=><div key={x[0]}><div style={{fontSize:13,color:C.textSub,fontWeight:700,marginBottom:5}}>{x[0]}</div><select aria-label={x[0]+" grade"} value={x[1]} onChange={e=>x[2](e.target.value)} style={{width:"100%",minHeight:48,padding:"11px 10px",borderRadius:12,border:"1.5px solid "+(x[1]&&x[1]!=="N/A"?C.blueDim:C.border),background:C.card,color:x[1]&&x[1]!=="N/A"?C.text:C.textMuted,fontSize:15,boxSizing:"border-box"}}><option value="N/A">Select grade</option>{x[1]!=="N/A"&&!x[3].includes(x[1])?<option>{x[1]}</option>:null}{x[3].map(g=><option key={g}>{g}</option>)}</select></div>)}</div>
        {!gradeOk?<div role="status" style={{fontSize:13,color:C.amber,lineHeight:1.45,marginTop:12}}>Add a grade for at least one of these, so partners at your level can find you.</div>:null}
      </div>:disc.length?<div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>No grade needed for these — you’re ready to continue.</div>:<div style={{fontSize:13,color:C.textMuted,lineHeight:1.5}}>Pick at least one to continue.</div>}
    </div>;
    foot=<Foot primary={<button onClick={editing?finish:next} disabled={!climbOk} style={primaryStyle(climbOk)}>{editing?"Save changes":"Continue"}</button>}/>;
  }else if(step==="about"){
    body=<div>
      {H("partners","About you","Both help partners know what to expect. You can change them any time in Edit profile.",true)}
      <div style={label}>Experience</div>
      <div role="group" aria-label="Experience level" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{Object.keys(LVL).map(l=>{const on=level===l;return <button key={l} onClick={()=>setLevel(on?"":l)} aria-pressed={on} style={{...chip(on),textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",color:on?LVL[l].color:C.textSub,borderColor:on?LVL[l].color:C.border,background:on?LVL[l].bg:C.surface}}>{l}{on?<ActionIcon name="check" size={16} color={LVL[l].color}/>:null}</button>;})}</div>
      <div style={{fontSize:13,color:C.textSub,lineHeight:1.5,marginTop:9,minHeight:20}}>{level?LEVEL_DESC[level]:"Partners can filter by experience."}</div>
      <div style={{...label,marginTop:22}}>How do you identify?</div>
      <div role="group" aria-label="Gender" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{GENDERS.concat([["","Prefer not to say"]]).map(g=>{const on=gender===g[0];return <button key={g[0]||"none"} onClick={()=>setGender(g[0])} aria-pressed={on} style={Object.assign({},chip(on),{textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"})}>{g[1]}{on?<ActionIcon name="check" size={16} color={C.blue}/>:null}</button>;})}</div>
      <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5,marginTop:9}}>Shown on your profile beside your home area. “Prefer not to say” shows nothing.</div>
    </div>;
    foot=<Foot primary={<button onClick={next} style={primaryStyle(true)}>Continue</button>}/>;
  }else if(step==="alerts"){
    body=<div>
      {H("bell","Stay in the loop","Choose what shows up in your notifications. You can change these any time in Settings → Notifications.",true)}
      {NOTIF_FLAGS.map(function(k){var t=NOTIF_COPY[k]||[k,""];var on=notifPrefs?notifPrefs[k]!==false:true;return <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,background:C.card,borderRadius:14,padding:"13px 15px",border:"1px solid "+C.border,marginBottom:9}}><div style={{minWidth:0}}><div style={{fontSize:14.5,fontWeight:700,color:C.text}}>{t[0]}</div><div style={{fontSize:12.5,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{t[1]}</div></div><button onClick={function(){if(onNotifChange)onNotifChange(k,!on);}} aria-label={t[0]} role="switch" aria-checked={on} style={{flexShrink:0,position:"relative",width:48,height:28,borderRadius:14,border:"none",background:on?C.green:C.border,cursor:"pointer"}}><span style={{position:"absolute",top:3,left:on?23:3,width:22,height:22,borderRadius:"50%",background:C.onSolid,transition:"left .15s"}}/></button></div>;})}
    </div>;
    foot=<Foot primary={<button onClick={finish} disabled={!climbOk} style={primaryStyle(climbOk)}>Finish setup</button>}/>;
  }

  /* ── the frame ──
     ONE dialog root for phone and desktop, with its way out (Skip setup / Cancel / Sign out) written
     inline: check:dialog-dismiss and check:clickable read this JSX, and two roots or a button held in
     a variable read as dialogs with no exit. */
  const showOut=!doneShown&&(canLeave||!!onSignOut);
  const outLabel=canLeave?(editing?"Cancel":"Skip setup"):"Sign out";
  const outGo=canLeave?onSkip:onSignOut;
  const inRail=wide&&!editing;
  const rail=inRail?counted.map((s,i)=>{const cur=!doneShown&&s===step,did=doneShown||i<stepNo-1;return <div key={s} aria-current={cur?"step":undefined} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0"}}><span aria-hidden="true" style={{width:26,height:26,borderRadius:13,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,background:did?C.blueSolid:cur?C.blueBg:"transparent",border:"1.5px solid "+(did||cur?C.blue:C.border),color:did?C.onSolid:cur?C.blue:C.textMuted}}>{did?<ActionIcon name="check" size={14} color={C.onSolid}/>:i+1}</span><span style={{fontSize:14,fontWeight:cur?800:600,color:cur?C.text:did?C.textSub:C.textMuted}}>{(STEP_META[s]||[s])[0]}</span></div>;}):null;
  const hasTop=step!=="intro"&&!doneShown;
  return <div onClick={leave} role="dialog" aria-label={editing?"Edit your profile":"Set up your profile"} aria-modal="true" style={wide?{position:"fixed",inset:0,background:C.scrimStrong,zIndex:1300,display:"flex",alignItems:"center",justifyContent:"center",padding:24,boxSizing:"border-box"}:{position:"fixed",inset:0,background:C.scrimStrong,zIndex:1300,display:"flex",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={wide?{display:"flex",width:editing?600:960,maxWidth:"100%",height:"min(760px, 100%)",background:C.bg,border:"1px solid "+C.border,borderRadius:20,overflow:"hidden",boxShadow:"0 30px 80px rgba(0,0,0,0.55)"}:{display:"flex",background:C.bg,width:"100%",maxWidth:520,height:"100%",boxSizing:"border-box",borderLeft:"1px solid "+C.borderLight,borderRight:"1px solid "+C.borderLight}}>
      {/* THE DESKTOP RAIL: the steps, done ones ticked, the current one bold. */}
      {inRail?<div style={{width:280,flexShrink:0,background:HERO_BG,boxShadow:HERO_SHEEN,borderRight:"1px solid "+C.border,padding:"30px 26px",display:"flex",flexDirection:"column",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>{LOGO(36)}<span style={{fontSize:19,fontWeight:800,color:C.text,letterSpacing:-0.3}}>Climb<span style={{color:C.blue}}>Match</span></span></div>
        <div style={{fontSize:13,fontWeight:800,letterSpacing:0.6,textTransform:"uppercase",color:C.textMuted,margin:"34px 0 8px"}}>Set up your profile</div>
        <div style={{flex:1}}>{rail}</div>
        <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5,marginBottom:6}}>{doneShown?"All done.":"Takes about a minute."}</div>
        {showOut?<div style={{marginLeft:-4}}><button onClick={outGo} style={{...linkBtn,padding:"10px 4px"}}>{outLabel}</button></div>:null}
      </div>:null}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        {hasTop?<div style={{padding:wide?"18px 44px 6px":"calc(10px + env(safe-area-inset-top)) 14px 8px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minHeight:44}}>
            {si>0?<button onClick={back} style={POP_BACK}>← Back</button>:null}
            <div style={{flex:1,textAlign:wide?"left":"center",fontSize:13,fontWeight:700,color:C.textSub}}>{editing||!stepNo?"":"Step "+stepNo+" of "+counted.length}</div>
            {showOut&&!inRail?<button onClick={outGo} style={{...linkBtn,flexShrink:0,padding:"10px 4px"}}>{canLeave?(editing?"Cancel":"Skip setup"):"Sign out"}</button>:null}
          </div>
          {editing?null:<div role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={counted.length} aria-valuenow={stepNo} aria-valuetext={"Step "+stepNo+" of "+counted.length} style={{height:5,borderRadius:3,background:C.borderLight,overflow:"hidden",marginTop:8}}><div style={{width:(stepNo/counted.length*100)+"%",height:"100%",background:C.blue,borderRadius:3,transition:"width .25s ease"}}/></div>}
        </div>:null}
        <div style={{flex:1,minHeight:0,overflowY:"auto",overscrollBehavior:"contain",padding:wide?"26px 44px 30px":(step==="intro"&&!doneShown?"8px 20px 20px":"14px 20px 24px")}}><div style={{maxWidth:wide?560:520,margin:"0 auto"}}>{body}</div></div>
        {foot}
      </div>
    </div>
  </div>;
}
