import { C } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";
import { deleteMyAccount } from "../../lib/db";
import { signOut } from "../../lib/auth";

/* confirmDelete&& — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function DeleteAccountConfirm({closeSettings,session,setAuthed,setConfirmDelete,showToast,uid}){
  return <div onClick={()=>setConfirmDelete(false)} role="dialog" data-sheet="alert" aria-label={session?"Confirm delete account":"Confirm leaving the demo"} aria-modal="true" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:1300,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}><div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:380,border:"1px solid "+C.border,padding:"20px 18px"}}><div aria-hidden="true" style={{display:"flex",justifyContent:"center",marginBottom:10}}><ActionIcon name="alert" size={30} color={C.red}/></div><div style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:8}}>{session?"Delete your account?":"Leave the demo?"}</div><div style={{fontSize:13,color:C.textSub,textAlign:"center",lineHeight:1.6,marginBottom:18}}>{session?"This permanently deletes your account and everything you posted — your profile, photos, trip reports, messages, comments, crews you organised and groups you created. It can’t be undone. Reports other climbers filed stay with ClimbMatch Safety.":"You're browsing as a guest, so there is no account and nothing stored to delete. This only returns you to the sign-in screen."}</div><div style={{display:"flex",flexDirection:"column-reverse",gap:14}}><button onClick={()=>setConfirmDelete(false)} style={{minHeight:48,padding:11,background:C.card,color:C.text,border:"1px solid "+C.border,borderRadius:12,fontSize:13.5,fontWeight:700,cursor:"pointer"}}>Cancel</button><button onClick={async()=>{/* Record the request BEFORE signing out — after signOut() there is no
      session, so the insert would be rejected by RLS and the user would be told their deletion
      was requested when nothing was written. The toast reports what actually happened rather
      than a fixed string: "recorded" only when the row landed. */
      /* IT DELETES NOW (0266 + delete-account). A failure leaves the climber signed in and says why, so
         they are never signed out under the impression their data is gone when it is not. */
      if(session&&uid){var _delErr=null;try{await deleteMyAccount();}catch(e){_delErr=(e&&e.message)||"Your account could not be deleted right now — try again in a moment.";}
        if(_delErr){setConfirmDelete(false);showToast(_delErr,5200);return;}
        setConfirmDelete(false);closeSettings();setAuthed(false);try{await signOut();}catch(_e){}
        showToast("Your account and everything you posted have been deleted.",4200);return;}
      setConfirmDelete(false);closeSettings();setAuthed(false);try{await signOut();}catch(_e){}
      showToast("Signed out. Nothing was deleted.",4200);}} style={{minHeight:48,padding:11,background:C.redSolid,color:C.onSolid,border:"none",borderRadius:11,fontSize:13.5,fontWeight:700,cursor:"pointer"}}>{session?"Delete":"Leave"}</button></div></div></div>;
}
