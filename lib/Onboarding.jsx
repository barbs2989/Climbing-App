// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
//
// FIRST RUN IS A STEPPED SETUP, one question per screen with a progress bar, the shape Strava,
// AllTrails and Gora all use: welcome -> photo -> home area -> climbing -> about you -> alerts.
// Every step but CLIMBING (the account fact "has onboarded" is derived from disciplines) can be
// skipped, and Skip setup leaves from any of them. EDITING (opened over a profile that already has
// disciplines) is the climbing step alone, as it always was.
//
// Each answer is stored where the profile editor stores it, so the two cannot disagree: the photo
// is uploaded and saved the moment it is chosen (saveProfileAvatar says why it cannot wait), the
// alerts are the Settings switches themselves (lib/notif-pref.js), and the rest goes back to App's
// onFinish, which writes the same columns saveEdit writes.
import { USE_DB } from "./supabase";
import { clickable } from "./clickable";
import { useState } from "react";
import { C, DISC, GENDERS, HERO_BG, HERO_SHEEN, MOUNTAINS, PROFILE_GRADES, VL, YDSL, fuzzyMatch } from "../ClimbMatchCore.jsx";
import { saveProfileAvatar, uploadProfilePhoto } from "./db";
import { homeFromDevice } from "./homeFromDevice";
import { NOTIF_FLAGS } from "./notif-pref";
import { POP_BACK } from "./popupChrome.js";
import DiscIcon from "../src/components/DiscIcon.tsx";
import ActionIcon from "../src/components/ActionIcon.tsx";
import Av from "../src/components/Av.tsx";

// The Settings > Notifications switches, in the words that screen uses.
const NOTIF_COPY = { crew: ["Crew updates", "Day proposals, members joining, ready to climb"], conditions: ["Condition reports", "Your condition reports and logged climbs"], requests: ["Requests & vouches", "Friend / crew requests, vouches and belay catches"] };

// A Google account's photo, at a size worth keeping: its URL ends in a size suffix (=s96-c).
const bigGooglePhoto = (u) => String(u || "").replace(/=s\d+(-c)?$/, "=s400-c");

export default function Onboarding({onFinish,onSkip,initial,onHelp,uid,googlePhoto,avatarNow,onAvatarChange,notifPrefs,onNotifChange}){
  const [home,setHome]=useState(initial&&initial.homeArea||"");const [disc,setDisc]=useState(initial&&initial.disciplines||[]);
  const [sg,setSg]=useState(initial&&initial.sportGrade||"N/A");const [tg,setTg]=useState(initial&&initial.tradGrade||"N/A");const [bg,setBg]=useState(initial&&initial.boulderGrade||"N/A");
  /* Ice, mixed and aid have no grade column: their grade lives in `climb_grades` (0237), as the profile
     editor writes it. Tapping Ice or Mixed above used to offer no grade for it, only sport, trad and boulder.
     A row appears for a discipline once it is picked, or when a grade is already on file, so finishing
     onboarding can never drop one; an emptied grade is DELETED from the map, keeping any lead/follow role. */
  const [cg,setCg]=useState(initial&&initial.climbGrades||{});
  const setCgGrade=(k,v)=>setCg(m=>{const o={...m};const x={...(o[k]||{})};if(v&&v!=="N/A")x.grade=v;else delete x.grade;if(Object.keys(x).length)o[k]=x;else delete o[k];return o;});
  const extraGrades=PROFILE_GRADES.filter(g=>!g.col&&(disc.includes(g.k)||(cg[g.k]&&cg[g.k].grade)));
  const editing=!!(initial&&initial.disciplines&&initial.disciplines.length);const tog=v=>setDisc(d=>d.includes(v)?d.filter(x=>x!==v):[...d,v]);
  const areas=MOUNTAINS.filter(m=>m.id!=="world");
  const [homeQ,setHomeQ]=useState(()=>{const a=areas.find(x=>x.id===home);return a?a.name:home;});
  const [gender,setGender]=useState(initial&&initial.gender||"");
  /* Detected location: the zip is offered for partner search only when the lookup found one, and only with a box the climber can untick. */
  const [locBusy,setLocBusy]=useState(false);const [locErr,setLocErr]=useState("");const [zip,setZip]=useState("");const [useZip,setUseZip]=useState(true);
  const [ava,setAva]=useState(avatarNow||"");const [avaBusy,setAvaBusy]=useState(false);const [avaErr,setAvaErr]=useState("");
  /* The photo step needs somewhere to keep the photo: an account. Signed out there is no step rather than one that previews and forgets. */
  const steps=editing?["climb"]:["intro"].concat(uid&&USE_DB?["photo"]:[],["home","climb","about","alerts"]);
  const [si,setSi]=useState(0);const step=steps[si];const last=si===steps.length-1;
  const next=()=>setSi(i=>Math.min(i+1,steps.length-1));const back=()=>setSi(i=>Math.max(i-1,0));
  const finish=()=>disc.length&&onFinish({/* homeArea is saved into profiles.location, which partner rows print as the climber's city. It sent the picked area's ID ("lcc"), so a raw id reached other climbers. Send what the box shows -- the picked name or the city already on file -- and fall back to `home` so an untouched box never blanks it. */homeArea:(homeQ||"").trim()||home,disciplines:disc,sportGrade:sg,tradGrade:tg,boulderGrade:bg,climbGrades:cg,gender:gender,zip:zip&&useZip?zip:""});
  const detect=()=>{setLocErr("");setLocBusy(true);homeFromDevice().then(function(r){setLocBusy(false);setHome("");setHomeQ(r.location);setZip(r.zip);setUseZip(true);}).catch(function(e){setLocBusy(false);setLocErr((e&&e.message)||"Couldn’t find where you are — type your town instead.");});};
  /* Upload a COPY of a picked photo (or the Google one) into our own storage, the way the profile editor does, and save it at once. The Google URL is used as it is only if its image cannot be fetched to copy. */
  const keepPhoto=(file,fallbackUrl,onDone)=>{setAvaErr("");setAvaBusy(true);(file?uploadProfilePhoto(file):Promise.reject(new Error("no file"))).catch(function(e){if(fallbackUrl)return fallbackUrl;throw e;}).then(function(url){return saveProfileAvatar(uid,url).then(function(){return url;});}).then(function(url){setAvaBusy(false);setAva(url);if(onAvatarChange)onAvatarChange(url);if(onDone)onDone();}).catch(function(err){setAvaBusy(false);setAvaErr((err&&err.message)||"Couldn’t save that photo. Check your connection and try again.");});};
  const takeGooglePhoto=(onDone)=>{const u=bigGooglePhoto(googlePhoto);setAvaBusy(true);fetch(u).then(function(r){if(!r.ok)throw new Error(String(r.status));return r.blob();}).then(function(b){keepPhoto(new File([b],"google-photo.jpg",{type:b.type||"image/jpeg"}),u,onDone);}).catch(function(){keepPhoto(null,u,onDone);});};

  const H=(t,sub)=><div style={{marginBottom:18}}><div style={{fontSize:23,fontWeight:800,letterSpacing:-0.3,color:C.text,lineHeight:1.2}}>{t}</div>{sub?<div style={{fontSize:13.5,color:C.textSub,lineHeight:1.5,marginTop:6}}>{sub}</div>:null}</div>;
  const chip=(on)=>({padding:"10px 15px",borderRadius:12,border:"1.5px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:14,fontWeight:700,cursor:"pointer"});
  const primary=(ok)=>({flex:2,padding:13,background:ok?C.blueSolid:C.border,color:ok?"#fff":C.textMuted,border:"none",borderRadius:12,fontSize:15,cursor:ok?"pointer":"default",fontWeight:800});
  const quiet={flex:1,padding:13,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:12,fontSize:14,cursor:"pointer",fontWeight:600};
  const climbOk=disc.length>0;

  return <div onClick={onSkip} role="dialog" aria-label={editing?"Edit your profile":"Set up your profile"} aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1300,display:"flex",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:520,height:"100%",display:"flex",flexDirection:"column",boxSizing:"border-box",borderLeft:"1px solid "+C.borderLight,borderRight:"1px solid "+C.borderLight}}>
      {/* TOP BAR: back, progress, skip. The intro has no back and no bar -- it is the welcome. */}
      {step!=="intro"?<div style={{padding:"calc(12px + env(safe-area-inset-top)) 14px 10px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        {si>0?<button onClick={back} style={POP_BACK}>← Back</button>:null}
        {editing?<div style={{flex:1}}/>:<div role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={si+1} aria-valuetext={"Step "+(si+1)+" of "+steps.length} style={{flex:1,height:6,borderRadius:3,background:C.borderLight,overflow:"hidden"}}><div style={{width:((si+1)/steps.length*100)+"%",height:"100%",background:C.blue,borderRadius:3,transition:"width .25s ease"}}/></div>}
        <button onClick={onSkip} style={{background:"none",border:"none",color:C.textSub,fontSize:13.5,fontWeight:700,cursor:"pointer",padding:"10px 4px",flexShrink:0}}>{editing?"Cancel":"Skip setup"}</button>
      </div>:null}

      <div style={{flex:1,minHeight:0,overflowY:"auto",overscrollBehavior:"contain",padding:step==="intro"?0:"8px 20px 20px"}}>
        {step==="intro"?<div>
          <div style={{background:HERO_BG,boxShadow:HERO_SHEEN,padding:"calc(40px + env(safe-area-inset-top)) 22px 26px",textAlign:"center"}}>
            <svg width="72" height="72" viewBox="0 0 24 24" aria-hidden="true" style={{display:"block",margin:"0 auto 14px"}}><rect width="24" height="24" rx="5.5" fill={C.bg}/><g transform="translate(2.4 2.4) scale(0.8)"><path d="m8 3 4 8 5-5 5 15H2L8 3z" fill="none" stroke={C.blue} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g></svg>
            <div style={{fontSize:27,fontWeight:800,letterSpacing:-0.5,color:C.text}}>Welcome to Climb<span style={{color:C.blue}}>Match</span></div>
            <div style={{fontSize:14,color:C.textSub,lineHeight:1.5,marginTop:8}}>A few quick questions so we can match you with the right partners and climbs.</div>
          </div>
          <div style={{padding:"20px 22px 8px"}}>{[["shield","Trusted conditions","Beta, live conditions, and trip reports from climbers who were just there."],["partners","Partners & crews","Find climbers near you, check their vouches and belay record, and form a crew."],["calendar","Plan every climb","Day-by-day itineraries, a what-to-bring gear list, float plans, and live forecasts."],["award","Log, list & rank","Track ascents, build and share tick-lists, and see where you land on the leaderboard."]].map(f=><div key={f[1]} style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:15}}><div style={{width:38,height:38,borderRadius:11,background:C.blueBg,border:"1px solid "+C.blueDim,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ActionIcon name={f[0]} size={18} color={C.blue}/></div><div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{f[1]}</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.45,marginTop:1}}>{f[2]}</div></div></div>)}</div>
        </div>:null}

        {step==="photo"?<div>
          {H("Add a profile photo","Partners like to know who they are meeting at the crag. You can change it any time.")}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,margin:"8px 0 4px"}}>
            <Av src={ava||(googlePhoto?bigGooglePhoto(googlePhoto):"")} size={120}/>
            {!ava&&googlePhoto?<div style={{fontSize:12.5,color:C.textSub,textAlign:"center",marginTop:-4}}>Your Google photo — use it, or choose another.</div>:null}
            <label style={{width:"100%",boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 14px",borderRadius:12,border:"1px solid "+C.blueDim,background:avaBusy?C.card:C.blueBg,color:avaBusy?C.textMuted:C.blue,fontSize:14,fontWeight:700,cursor:avaBusy?"default":"pointer"}}><ActionIcon name="camera" size={17} color={avaBusy?C.textMuted:C.blue}/>{avaBusy?"Saving…":(ava?"Choose a different photo":"Choose a photo")}<input type="file" accept="image/*" disabled={avaBusy} onChange={e=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(f)keepPhoto(f,null);}} style={{display:"none"}}/></label>
            {avaErr?<div role="alert" style={{fontSize:12.5,color:C.red,lineHeight:1.45,textAlign:"center"}}>{avaErr}</div>:null}
            <div style={{fontSize:12,color:C.textMuted,lineHeight:1.45,textAlign:"center"}}>Before it is uploaded, the location your camera saved inside the photo is removed.</div>
          </div>
        </div>:null}

        {step==="home"?<div>
          {H("Where do you mainly climb?","Your home area is shown on your profile and helps us find partners and climbs near you.")}
          <button onClick={detect} disabled={locBusy} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px 14px",borderRadius:12,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:14,fontWeight:700,cursor:locBusy?"default":"pointer",marginBottom:14}}><ActionIcon name="pin" size={17} color={C.blue}/>{locBusy?"Finding you…":"Use my current location"}</button>
          {locErr?<div role="alert" style={{fontSize:12.5,color:C.amber,lineHeight:1.45,marginTop:-6,marginBottom:12}}>{locErr}</div>:null}
          <div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:6,letterSpacing:0.3}}>OR TYPE IT</div>
          <div style={{position:"relative",marginBottom:12}}><input aria-label="Search a range, canyon, or peak" value={homeQ} onChange={e=>{setHomeQ(e.target.value);setHome("");setZip("");}} placeholder={USE_DB?"Your city or home area — e.g. Seattle, WA":"Search a range, canyon, or peak..."} style={{width:"100%",padding:"12px 13px",borderRadius:12,border:"1px solid "+(home||homeQ?C.blue:C.border),background:C.card,color:C.text,fontSize:15,boxSizing:"border-box"}}/>{!USE_DB&&homeQ&&!home?(()=>{const ms=areas.filter(a=>fuzzyMatch(homeQ,a.name)).slice(0,7);return <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:"1px solid "+C.border,borderRadius:10,marginTop:4,maxHeight:210,overflowY:"auto",overscrollBehavior:"contain",zIndex:5,boxShadow:"0 12px 30px rgba(0,0,0,0.5)"}}>{ms.length?ms.map(a=><div key={a.id} {...clickable(()=>{setHome(a.id);setHomeQ(a.name);})} style={{padding:"9px 11px",fontSize:13.5,fontWeight:700,cursor:"pointer",borderBottom:"1px solid "+C.borderLight,color:C.text}}>{a.name}</div>):<div style={{padding:"9px 11px",fontSize:12.5,color:C.textMuted}}>No match — keep typing</div>}</div>;})():null}{home?<div style={{fontSize:11.5,color:C.green,marginTop:5,fontWeight:600}}>✓ {homeQ}</div>:null}</div>
          {zip&&uid&&USE_DB?<label style={{display:"flex",alignItems:"flex-start",gap:10,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px",fontSize:13,color:C.textSub,lineHeight:1.45,cursor:"pointer"}}><input type="checkbox" checked={useZip} onChange={e=>setUseZip(e.target.checked)} style={{marginTop:2,width:17,height:17,accentColor:C.blue,flexShrink:0}}/><span><b style={{color:C.text}}>Also save zip {zip} for partner search.</b> Only you can see it; other climbers see a rounded distance.</span></label>:null}
        </div>:null}

        {step==="climb"?<div>
          {H(editing?"Edit your climbing":"What do you climb?","Pick everything you do. This is what partners are matched on.")}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{Object.keys(DISC).map(k=>{const on=disc.includes(k),cat=DISC[k];return <button key={k} onClick={()=>tog(k)} aria-pressed={on} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:18,border:`1.5px solid ${on?cat.color:C.border}`,background:on?cat.bg:C.surface,color:on?cat.color:C.textSub,fontSize:13.5,fontWeight:700,cursor:"pointer"}}><DiscIcon d={k} size={15}/> {cat.label}</button>;})}</div>
          <div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:8,letterSpacing:0.3}}>YOUR GRADES <span style={{fontWeight:500,textTransform:"none"}}>(optional)</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["Sport",sg,setSg,YDSL],["Trad",tg,setTg,YDSL],["Boulder",bg,setBg,VL]].concat(extraGrades.map(g=>[g.label,(cg[g.k]&&cg[g.k].grade)||"N/A",v=>setCgGrade(g.k,v),g.ladder])).map(x=><div key={x[0]}><div style={{fontSize:12,color:C.textMuted,marginBottom:3}}>{x[0]}</div><select aria-label={x[0]+" grade"} value={x[1]} onChange={e=>x[2](e.target.value)} style={{width:"100%",padding:"9px 8px",borderRadius:10,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:13,boxSizing:"border-box"}}><option>N/A</option>{x[1]!=="N/A"&&!x[3].includes(x[1])?<option>{x[1]}</option>:null}{x[3].map(g=><option key={g}>{g}</option>)}</select></div>)}</div>
        </div>:null}

        {step==="about"?<div>
          {H("How do you identify?","Optional. If you choose one it is shown on your profile beside your home area; “Prefer not to say” shows nothing.")}
          <div role="group" aria-label="Gender" style={{display:"flex",flexDirection:"column",gap:9}}>{GENDERS.concat([["","Prefer not to say"]]).map(g=>{const on=gender===g[0];return <button key={g[0]||"none"} onClick={()=>setGender(g[0])} aria-pressed={on} style={Object.assign({},chip(on),{textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"})}>{g[1]}{on?<ActionIcon name="check" size={17} color={C.blue}/>:null}</button>;})}</div>
        </div>:null}

        {step==="alerts"?<div>
          {H("Stay in the loop","Choose what shows up in your notifications. These are the switches in Settings → Notifications, so you can change them there any time.")}
          {NOTIF_FLAGS.map(function(k){var t=NOTIF_COPY[k]||[k,""];var on=notifPrefs?notifPrefs[k]!==false:true;return <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,background:C.card,borderRadius:12,padding:"12px 14px",border:"1px solid "+C.border,marginBottom:9}}><div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{t[0]}</div><div style={{fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{t[1]}</div></div><button onClick={function(){if(onNotifChange)onNotifChange(k,!on);}} aria-label={t[0]} role="switch" aria-checked={on} style={{flexShrink:0,position:"relative",width:46,height:26,borderRadius:13,border:"none",background:on?C.green:C.border,cursor:"pointer"}}><span style={{position:"absolute",top:3,left:on?23:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .15s"}}/></button></div>;})}
        </div>:null}
      </div>

      {/* BOTTOM BAR: the one primary action per step. Climbing is the only step that must be answered. */}
      <div style={{flexShrink:0,padding:"12px 16px calc(14px + env(safe-area-inset-bottom))",borderTop:"1px solid "+C.border,background:C.surface}}>
        {step==="intro"?<div><div style={{display:"flex",gap:8}}><button onClick={onSkip} style={quiet}>Skip for now</button><button onClick={next} style={primary(true)}>Set up my profile</button></div><div style={{fontSize:12,color:C.textMuted,marginTop:9,textAlign:"center"}}>Takes about a minute.</div><button onClick={onHelp} style={{display:"block",width:"100%",marginTop:8,padding:"8px",background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"See how ClimbMatch works & read the FAQ →"}</button></div>
        :<div style={{display:"flex",gap:8}}>
          {step!=="climb"&&!last?<button onClick={next} style={quiet}>Not now</button>:null}
          {step==="photo"&&!ava&&googlePhoto?<button onClick={function(){takeGooglePhoto(next);}} disabled={avaBusy} style={primary(!avaBusy)}>{avaBusy?"Saving…":"Use my Google photo"}</button>:<button onClick={step==="climb"&&editing?finish:(last?finish:next)} disabled={(step==="climb"||last)&&!climbOk} style={primary(!((step==="climb"||last)&&!climbOk))}>{step==="climb"&&editing?"Save changes":(last?"Finish setup":"Continue")}</button>}
        </div>}
      </div>
    </div>
  </div>;
}
