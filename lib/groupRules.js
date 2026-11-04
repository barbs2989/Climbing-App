/* TWO LABELS FOR ONE QUESTION, AND THEY COULD CONTRADICT EACH OTHER. The join-policy chip read
   "Open to all" on a group whose own visibility block, three lines below it, read "Private group ·
   Hidden from search · join by invite only". Both are true of different fields -- `policy` is who
   MAY join, `visibility` is who can FIND it -- but a climber reads one screen, and "anyone can
   join instantly" is not what a private group offers.
   VISIBILITY WINS because it is the half the app actually enforces: the browse list filters
   private groups out for non-members, and `groups` RLS is read-public-or-member. `policy` is
   enforced client-side only.
   The resolution was written out twice by hand; one spelling now, so a third reader cannot disagree
   with the other two. */
export function groupVisOf(cl,groupVis){return (groupVis&&groupVis[cl.id])||(cl&&cl.visibility)||"public";}
/* CAN I PUT AN EVENT IN THIS GROUP? Written once because the CALENDAR asked it twice with the
   SEED-ID test — `c.ownerId===0 || (c.moderatorIds||[]).indexOf(0)>=0` — while the group DETAIL
   view's own "+ Create event" button asked it correctly, through `isMod`. A DB group carries
   `ownerId: g.created_by` (a uuid) and a uuid roster, so on a group with eventPolicy "mods" that
   YOU OWN both clauses were false and the Calendar told you "Join a group to create events" —
   about a group you not only joined but created. The #680 shape again, on a capability gate
   rather than a label.
   `_meGid` mirrors the detail view exactly (`cl._db?uid:0`), and moderators are read from
   `groupMods` first for the same reason it does: a mod promoted in this session is a mod here
   too, and the two surfaces disagreeing about that is what this function exists to prevent. */
export function groupCanHostEvent(cl,uid,joinedGroups,groupMods){
  if(!cl)return false;
  if((joinedGroups||[]).indexOf(cl.id)<0)return false;
  if((cl.eventPolicy||"anyone")!=="mods")return true;
  var _meGid=cl._db?uid:0;
  var creator=cl._db?(!!uid&&cl.ownerId===uid):(cl.ownerId===0);
  return creator||(((groupMods&&groupMods[cl.id])||cl.moderatorIds||[]).indexOf(_meGid)>=0);
}
/* WHICH DOOR THIS GROUP TAKES, decided in ONE place because two byte-identical join handlers read
   it and a second copy is how they would drift apart.

   0178 made the join policy real: self-seating as a member is permitted only where the group says
   anyone may walk in, a public gated group takes a REQUEST a manager approves, and a private group
   takes neither -- its own chip reads "Invite only", so an invitation is the only way in.
   A group created with the retired "trust" policy (0090 still allows it) takes a request, like approval. */
export function groupJoinPath(cl,vis){
  if(vis==="private")return "invite";
  if(!cl.policy||cl.policy==="open")return "open";
  return "request";
}
export function groupJoinLabel(cl,vis,long){
  if(vis==="private")return "Invite only";
  if(cl.policy==="approval"||cl.policy==="trust")return long?"✓ Organizer approves":"✓ Approval to join";
  return long?"Open to all":"Open";
}
/* POST TOPICS (0260), the climbing set a group post can carry -- one per post, or none. The keys are
   the CHECK in group_posts_topic_check; a label here without a key there is a post the database refuses. */
export const GROUP_TOPICS=[{k:"partner",l:"Partner wanted"},{k:"conditions",l:"Conditions"},{k:"gear",l:"Gear swap"},{k:"beta",l:"Beta"},{k:"trip",l:"Trip report"},{k:"question",l:"Question"}];
/* LOCATION IS OPTIONAL ON A GROUP — the Create button gates on the name alone — and both surfaces
   built the line as `"📍 Based in "+cl.location+" · N members"`, so a group without one read
   "📍 Based in  · 1 member": a dangling preposition and a double space. It never printed the word
   `undefined`, which is why the guards that scan for that never saw it (`useMyGroups` maps
   `location: g.location || ""`).
   The two writers also disagreed about a blank one. The optimistic local row fell back to
   `ME.location` while `createGroupRow` stored "", so the label said "Based in Bellingham, WA"
   until `myGroupsQ.refetch()` came back and changed it under you. The DB behaviour is the correct
   half: a group is not necessarily based where its creator happens to be, and inventing that is
   the same class of guess as the invented pace next door. Both store what was typed. */
export function groupWhere(cl,n){
  const where=(cl&&cl.location||"").trim();
  /* n is null when the count could not be read (a non-member reads no roster rows since 0318, only
     group_member_counts()): the line then omits the count rather than claiming 0 members. */
  const parts=[];if(where)parts.push("Based in "+where);if(n!=null)parts.push(n+(n===1?" member":" members"));
  return parts.join(" · ");
}
