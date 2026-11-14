import { onImgErr, FALLBACK_COVER, photoAlt, C } from "../../ClimbMatchCore.jsx";

/* _gpt==="media"? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
/** A post in the group feed, as the photo grid reads one. */
interface GroupMediaTabPost { id: string | number; photos: string[]; photoAlts?: Record<string, string> | null }
interface GroupMediaTabPhoto { u: string; po: GroupMediaTabPost; i: number }
interface GroupMediaTabGroup { _db?: boolean }

export interface GroupMediaTabProps {
  /** The posts the Discussion shows (moderation-filtered, sorted). */
  _shown: GroupMediaTabPost[];
  cl: GroupMediaTabGroup;
  groupFeedQ: { isError?: boolean };
  joined: boolean;
}

export default function GroupMediaTab({_shown,cl,groupFeedQ,joined}: GroupMediaTabProps){
  return (function(){/* MEDIA: every photo posted in this group, newest post first, as a grid. Read from the same posts the Discussion shows, so it is members-only on a real group for the same reason. */const _ph: GroupMediaTabPhoto[]=[];_shown.forEach(function(po){(po.photos||[]).forEach(function(u,i){_ph.push({u:u,po:po,i:i});});});return _ph.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>{_ph.map(function(x){return <img key={x.po.id+"-"+x.i} loading="lazy" decoding="async" src={x.u} onError={onImgErr(FALLBACK_COVER)} alt={photoAlt(x.po.photoAlts&&x.po.photoAlts[x.u],"Photo "+(x.i+1)+" of "+x.po.photos.length+" attached to a post in this group")} style={{width:"100%",aspectRatio:"1 / 1",objectFit:"cover",borderRadius:6,display:"block",background:C.surface}}/>;})}</div>:<div style={{fontSize:12.5,color:C.textMuted,textAlign:"center",padding:"18px 12px",background:C.card,border:"1px solid "+C.border,borderRadius:12,lineHeight:1.5}}>{(cl._db&&!joined)?"Only members can see the group’s photos — join to see them.":(cl._db&&groupFeedQ.isError)?"Couldn’t load the group’s photos just now.":"Photos posted in the discussion show up here."}</div>;})();
}
