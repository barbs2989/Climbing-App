import { Suspense } from "react";
import OverlaySkeleton from "./OverlaySkeleton.tsx";
import { C, pubFirst } from "../../ClimbMatchCore.jsx";
import { FriendsList } from "../../lib/lazyScreens.js";
import { removeConnection } from "../../lib/db";
import type { Dispatch, SetStateAction } from "react";
import type { FeedFriend, FeedRoute, FriendsFeedProps } from "./FriendsFeed.tsx";

type FriendsSheetId = string | number;
/** A friend: an example climber (integer id) or a real profile (uuid). */
interface FriendsSheetPerson extends FeedFriend { online?: boolean; objectiveIds?: ReadonlyArray<string>; disciplines?: ReadonlyArray<string> }
/** The stored connection row for a friend; `_dbId` is what removal deletes. */
interface FriendsSheetConnRow { _dbId?: string; otherId: FriendsSheetId }
/** The log a kudos is given on, and whose it is. */
interface FriendsSheetKudosTarget { userId: string | number; logId: string }

export interface FriendsSheetProps {
  _connRow: (otherId: FriendsSheetId) => FriendsSheetConnRow | null;
  /** True for a real profile id (a uuid), false for an example climber's integer id. */
  _isUid: (v: unknown) => boolean;
  connections: ReadonlyArray<FriendsSheetPerson>;
  /** The friends read failed: say so rather than "no friends". */
  connectionsUnavailable: boolean;
  giveKudos: (name: string, route: string, target: FriendsSheetKudosTarget) => void;
  givenVouches: ReadonlyArray<{ _targetId?: FriendsSheetId }>;
  /** "name|route" keys of the kudos already given on example activity. */
  kudosGiven: ReadonlyArray<string>;
  /** Ids of the logs the climber has already given kudos on. */
  kudosGivenLogs: ReadonlyArray<string>;
  /** Mutual friends by climber id. */
  mutuals: Record<string, ReadonlyArray<FriendsSheetPerson> | undefined>;
  myConnQ: { refetch?: () => unknown };
  openDm: (c: FriendsSheetPerson) => void;
  realFriendFeed: FriendsFeedProps["realFeed"];
  routeById: (id: string | number | null | undefined) => FeedRoute | undefined;
  setConnections: Dispatch<SetStateAction<FriendsSheetPerson[]>>;
  setFriendsOpen: (open: boolean) => void;
  setGiveVouchWith: (c: FriendsSheetPerson) => void;
  setInvitePrompt: (p: { climber: FriendsSheetPerson; route: FeedRoute }) => void;
  setProfileModal: (c: FriendsSheetPerson) => void;
  setSharedRoute: (r: null) => void;
  showToast: (t: string, d?: number) => void;
  uid: string | null;
  unvouch: (c: FriendsSheetPerson) => void;
}

/* friendsOpen&& — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function FriendsSheet({_connRow,_isUid,connections,connectionsUnavailable,giveKudos,givenVouches,kudosGiven,kudosGivenLogs,mutuals,myConnQ,openDm,realFriendFeed,routeById,setConnections,setFriendsOpen,setGiveVouchWith,setInvitePrompt,setProfileModal,setSharedRoute,showToast,uid,unvouch}: FriendsSheetProps){
  return <Suspense fallback={<OverlaySkeleton C={C} label="Loading…"/>}><FriendsList routeById={routeById} unavailable={connectionsUnavailable} friends={connections} onKudos={(name: string,route: string,t: FriendsSheetKudosTarget)=>giveKudos(name,route,t)} kudosGiven={kudosGiven} realFeed={realFriendFeed} kudosGivenLogs={kudosGivenLogs} onVouch={(c: FriendsSheetPerson)=>setGiveVouchWith(c)} onUnvouch={unvouch} hasVouched={(id: FriendsSheetId)=>givenVouches.some(v=>v._targetId===id)} mutuals={mutuals} onFormCrew={(c: FriendsSheetPerson,r: FeedRoute)=>{setFriendsOpen(false);setInvitePrompt({climber:c,route:r});}} onClose={()=>setFriendsOpen(false)} onOpenProfile={(c: FriendsSheetPerson)=>{setFriendsOpen(false);setSharedRoute(null);setProfileModal(c);}} onMessage={(c: FriendsSheetPerson)=>openDm(c)} onRemove={(c: FriendsSheetPerson)=>{
    /* "Remove friend" DID NOT REMOVE ANYTHING. This handler filtered local state and toasted
       success, while `removeConnection` sat imported and called from nowhere -- so a climber tapped
       Remove, was told it worked, the row vanished, and the connection was still there on reload.
       Worse than the usual swallowed write (#548/#551/#563), because there IS no write to swallow:
       check:writes forbids a success message in front of an unobservable FAILURE, and check:claims
       a success toast for a write that only runs signed-in -- neither can see a toast in front of
       NO WRITE AT ALL. This is a relationship control: the whole point is that it takes effect.
       Mirrors acceptReq/declineReq exactly -- optimistic, persist, revert on rejection, and say
       plainly when the change is local only. */
    const _row=_connRow(c.id);const _first=pubFirst(c);
    setConnections(p=>p.filter(x=>x.id!==c.id));
    /* No row for a real friend: they already ended it. Saying "removed from friends" would claim a write. */
    if(uid&&_isUid(c.id)&&!(_row&&_row._dbId)){if(myConnQ.refetch)myConnQ.refetch();showToast(_first+" is no longer on your friends list");return;}
    if(uid&&_row&&_row._dbId){removeConnection(_row._dbId).then(function(){if(myConnQ.refetch)myConnQ.refetch();showToast(_first+" removed from friends");}).catch(function(){setConnections(p=>p.find(x=>x.id===c.id)?p:[...p,c]);showToast("Couldn’t remove that connection — try again.");});}
    else showToast(_first+" removed from friends"+(uid?"":" on this device — sign in to keep it"));}}/></Suspense>;
}
