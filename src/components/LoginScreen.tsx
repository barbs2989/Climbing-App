import { useState, type CSSProperties, type ReactNode } from "react";
import { C, hasVulgarity } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { POP_BACK } from "../../lib/popupChrome.js";

/** What this screen hands App on sign-in: the guest button, or the demo email form's fields. */
export interface DemoAuth {
  via: string;
  email?: string;
  name?: string;
  username?: string;
}
export interface LoginScreenProps {
  onAuth: (auth: DemoAuth) => void;
  /** Opens a legal document ("terms" / "privacy"). */
  onLegal?: (doc: string) => void;
}

/** The DEMO sign-in screen: renders only when realAuthGate is false (no Supabase env, or VITE_DEMO_AUTOLOGIN on). The real one is lib/AuthModal.jsx, whose function is also named LoginScreen — the guards that key a graph by function name know that. */
export default function LoginScreen({onAuth,onLegal}: LoginScreenProps){
  const [mode,setMode]=useState("signin");
  const [email,setEmail]=useState("");const [pw,setPw]=useState("");const [nm,setNm]=useState("");const [un,setUn]=useState("");
  const [showPw,setShowPw]=useState(false);const [sent,setSent]=useState(false);const [err,setErr]=useState("");
  const inp: CSSProperties={width:"100%",padding:"12px 13px",borderRadius:11,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"};
  const lbl: CSSProperties={fontSize:12,fontWeight:700,color:C.textMuted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:5,display:"block"};
  const wrap=(inner: ReactNode)=><div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",color:C.text,maxWidth:520,margin:"0 auto",padding:"30px 22px 40px",boxSizing:"border-box"}}><div style={{textAlign:"center",marginBottom:24,marginTop:14}}><div style={{fontSize:29,fontWeight:800,letterSpacing:-0.5}}>Climb<span style={{color:C.blue}}>Match</span></div><div style={{fontSize:13.5,color:C.textSub,marginTop:6,lineHeight:1.4}}>Find partners, trusted beta, and a climbing community built on trust.</div></div>{inner}</div>;
  if(mode==="forgot"){return wrap(<div><div style={{fontSize:18,fontWeight:700,marginBottom:6}}>Reset your password</div>{sent?<div style={{background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:11,padding:14,fontSize:13.5,color:C.green,lineHeight:1.5}}>This preview build has no accounts and no mail, so no reset link was sent. Password reset works on the real sign-in screen.</div>:<div><div style={{fontSize:13.5,color:C.textSub,lineHeight:1.5,marginBottom:14}}>This is the preview build, which runs without a backend — it cannot send mail. On the real sign-in screen this emails you a reset link.</div><label htmlFor="cm-demo-reset-email" style={lbl}>Email</label><input id="cm-demo-reset-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{...inp,marginBottom:14}}/><button onClick={()=>setSent(true)} style={{width:"100%",padding:13,borderRadius:11,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",background:C.blueSolid,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>Send reset link</button></div>}<div style={{textAlign:"center"}}><button onClick={()=>{setMode("signin");setSent(false);}} style={Object.assign({},POP_BACK,{marginTop:16})}>← Back to sign in</button></div></div>);}
  const signup=mode==="signup";
  return wrap(<div>
    <div style={{display:"flex",background:C.surface,borderRadius:11,padding:4,marginBottom:20}}>{[["signin","Sign in"],["signup","Create account"]].map(t=><button key={t[0]} onClick={()=>setMode(t[0])} aria-current={mode===t[0]?"true":undefined} style={{flex:1,padding:"9px",borderRadius:8,border:"none",background:mode===t[0]?C.blueSolid:"transparent",color:mode===t[0]?"#fff":C.textSub,fontSize:13.5,fontWeight:700,cursor:"pointer"}}>{t[1]}</button>)}</div>
    {/* This screen is the DEMO fallback -- it renders only when realAuthGate is false
        (no Supabase env, or VITE_DEMO_AUTOLOGIN on). It used to offer "Continue with
        Apple", "Continue with Google", "Continue with Facebook" and "Sign in with a
        passkey". None of them existed: all four called onAuth({via:...}), which just
        flips the app to signed-in. The shipped production bundle contained zero
        signInWithOAuth calls, so no third party was ever contacted and no credential
        was ever checked -- four buttons promising an identity provider, each of which
        simply let you in. Reachable in production via Settings -> Delete my account,
        which signs you out into this screen.
        The real modal (lib/AuthModal.jsx) does this correctly: it ASKS Supabase which
        providers are enabled (useOAuthProviders) and renders Google only if one really
        is. One honest button here, named for what it actually does -- and since 2026-10-24
        named as the real screen names it, View as guest, not "Continue as a demo climber":
        a sign-in screen does not offer a sample ACCOUNT, and this one is reached only by a
        build with no backend now (every Supabase build signs out onto AuthModal). */}
    <button onClick={()=>onAuth({via:"guest"})} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:13,borderRadius:11,border:"1px solid "+C.border,boxSizing:"border-box",background:C.surface,color:C.text,fontSize:15,fontWeight:600,cursor:"pointer",marginBottom:7}}>View as guest</button>
    <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:9}}>Look around with sample content — nothing is saved to an account.</div>
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0"}}><div style={{flex:1,height:1,background:C.border}}/><span style={{fontSize:12,color:C.textMuted}}>or use email</span><div style={{flex:1,height:1,background:C.border}}/></div>
    {signup?<div style={{marginBottom:12}}><label htmlFor="cm-demo-name" style={lbl}>Full name</label><input id="cm-demo-name" value={nm} onChange={e=>setNm(e.target.value)} placeholder="Nathan Barber" style={inp}/></div>:null}
    {signup?<div style={{marginBottom:12}}><label htmlFor="cm-demo-username" style={lbl}>Username</label><input id="cm-demo-username" value={un} onChange={e=>setUn(e.target.value.replace(/[^a-zA-Z0-9_]/g,"").toLowerCase())} placeholder="climbnathan" style={inp}/><div style={{fontSize:12,color:C.textMuted,marginTop:4}}>Shown publicly. You can hide your real name in Settings.</div>{un&&hasVulgarity(un)?<div style={{fontSize:12,color:C.red,marginTop:4,fontWeight:600}}>That username contains language that is not allowed.</div>:null}</div>:null}
    <div style={{marginBottom:12}}><label htmlFor="cm-demo-email" style={lbl}>Email</label><input id="cm-demo-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/></div>
    <div style={{marginBottom:signup?12:6}}><label htmlFor="cm-demo-password" style={lbl}>Password</label><div style={{position:"relative"}}><input aria-label="Password" id="cm-demo-password" type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder={signup?"At least 8 characters":"Your password"} style={{...inp,paddingRight:62}}/><button onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{showPw?"Hide":"Show"}</button></div></div>
    {signup?null:<div style={{textAlign:"right",marginBottom:14}}><button onClick={()=>{setMode("forgot");setSent(false);}} style={{background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Forgot password?</button></div>}
    <button onClick={()=>{if(signup){const u=(un||"").trim();if(u.length<3){setErr("Pick a username with at least 3 characters.");return;}if(hasVulgarity(u)){setErr("Please choose a username without offensive language.");return;}}setErr("");onAuth({via:"email",email:email,name:nm,username:un});}} style={{width:"100%",padding:13,borderRadius:11,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",background:C.blueSolid,color:"#fff",fontSize:15.5,fontWeight:700,cursor:"pointer",marginTop:signup?4:0}}>{signup?"Create account":"Sign in"}</button>{err?<div style={{fontSize:12,color:C.red,textAlign:"center",marginTop:10,fontWeight:600}}>{err}</div>:null}
    <div style={{fontSize:12,color:C.textMuted,textAlign:"center",lineHeight:1.5,margin:"14px 4px 0"}}>By continuing you agree to ClimbMatch's <span {...clickable(()=>onLegal&&onLegal("terms"))} style={{color:C.blue,cursor:"pointer",textDecoration:"underline"}}>Terms</span> and acknowledge the <span {...clickable(()=>onLegal&&onLegal("privacy"))} style={{color:C.blue,cursor:"pointer",textDecoration:"underline"}}>Privacy Policy</span>. Belay verification and guide vetting rely on accurate info.</div>
    <div style={{textAlign:"center"}}><button onClick={()=>onAuth({via:"guest"})} style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,fontSize:14.5,fontWeight:700,cursor:"pointer",marginTop:18,padding:"11px 22px",borderRadius:11}}>Explore as guest →</button></div><div style={{marginTop:24,paddingTop:18,borderTop:"1px solid "+C.border}}><div style={{display:"flex",gap:8,textAlign:"center"}}>{[["Verified","climbers & guides"],["Confirmed","belay records"],["Recent","conditions & beta"]].map((x,i)=><div key={i} style={{flex:1}}><div style={{fontSize:13,fontWeight:800,color:C.blue}}>{x[0]}</div><div style={{fontSize:11,color:C.textMuted,marginTop:3,lineHeight:1.35}}>{x[1]}</div></div>)}</div><div style={{height:3,width:46,margin:"16px auto 0",borderRadius:2,background:"linear-gradient(90deg,#a371f7,#2f81f7)"}}></div><div style={{textAlign:"center",marginTop:11,fontSize:12,color:C.textSub,fontStyle:"italic"}}>The safety layer for climbing partnerships.</div></div>
  </div>);
}
