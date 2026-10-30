import { Suspense } from "react";
import OverlaySkeleton from "./OverlaySkeleton.tsx";
import { C, pubFirst } from "../../ClimbMatchCore.jsx";
import { FriendsList } from "../../lib/lazyScreens.js";
import { removeConnection } from "../../lib/db";

/* friendsOpen&& — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function FriendsSheet({_connRow,_isUid,connections,connectionsUnavailable,giveKudos,givenVouches,kudosGiven,kudosGivenLogs,mutuals,myConnQ,openDm,realFriendFeed,routeById,setConnections,setFriendsOpen,setGiveVouchWith,setInvitePrompt,setProfileModal,setSharedRoute,showToast,uid,unvouch}){
  return <Suspense fallback={<OverlaySkeleton C={C} label="Loading…"/>}><FriendsList routeById={routeById} unavailable={connectionsUnavailable} friends={connections} onKudos={(name,route,t)=>giveKudos(name,route,t)} kudosGiven={kudosGiven} realFeed={realFriendFeed} kudosGivenLogs={kudosGivenLogs} onVouch={c=>setGiveVouchWith(c)} onUnvouch={unvouch} hasVouched={id=>givenVouches.some(v=>v._targetId===id)} mutuals={mutuals} onFormCrew={(c,r)=>{setFriendsOpen(false);setInvitePrompt({climber:c,route:r});}} onClose={()=>setFriendsOpen(false)} onOpenProfile={c=>{setFriendsOpen(false);setSharedRoute(null);setProfileModal(c);}} onMessage={c=>openDm(c)} onRemove={c=>{
    /* "Remove friend" DID NOT REMOVE ANYTHING. This handler filtered local state and toasted
       success, while `removeConnection` sat imported and called from nowhere -- so a climber tapped
       Remove, was told it worked, the row vanished, and the connection was still there on reload.
       Worse than the usual swallowed write (#548/#551/#563), because there IS no write to swallow:
       check:writes forbids a success message in front of an unobservable FAILURE, and check:claims
       a success toast for a write that only runs signed-in -- neither can see a toast in front of
       NO WRITE AT ALL. This is a relationship control: the whole point is that it takes effect.
       Mirrors acceptReq/declineReq exactly -- optimistic, persist, revert on rejection, and say
       plainly when the change is local only. */
    var _row=_connRow(c.id);var _first=pubFirst(c);
    setConnections(p=>p.filter(x=>x.id!==c.id));
    /* No row for a real friend: they already ended it. Saying "removed from friends" would claim a write. */
    if(uid&&_isUid(c.id)&&!(_row&&_row._dbId)){myConnQ.refetch&&myConnQ.refetch();showToast(_first+" is no longer on your friends list");return;}
    if(uid&&_row&&_row._dbId){removeConnection(_row._dbId).then(function(){myConnQ.refetch&&myConnQ.refetch();showToast(_first+" removed from friends");}).catch(function(){setConnections(p=>p.find(x=>x.id===c.id)?p:[...p,c]);showToast("Couldn’t remove that connection — try again.");});}
    else showToast(_first+" removed from friends"+(uid?"":" on this device — sign in to keep it"));}}/></Suspense>;
}
