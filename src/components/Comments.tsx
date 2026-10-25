import { useState, type CSSProperties } from "react";
import { C, CLIMBERS, FALLBACK_COVER, ME, REACTIONS, commentWhen, groupMentionMatch, mentionName, mentionToken, onImgErr, reactionCounts, reactionIcons, renderMD } from "../../ClimbMatchCore.jsx";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import { photoThumb } from "../../lib/photoThumb";
import { canAppeal, canReportContent, isDbRowId, openAppeal, openContentReport } from "../../lib/reportBus";
import { clickable } from "../../lib/clickable";
import ActionIcon from "./ActionIcon.tsx";
import CommentMenu, { type CommentMenuItem } from "./CommentMenu.tsx";
import ReactionPicker from "./ReactionPicker.tsx";
import RichEditor from "./RichEditor.tsx";

/** One comment or reply as the thread's caller hands them: a seed row (`userId` 0 is you) or a stored row (uuid), `myReaction`/`likedByMe`/`mine` resolved by the caller. */
export interface ThreadComment {
  id: string | number;
  targetId: string | number;
  parentId?: string | number | null;
  userId?: string | number | null;
  name?: string | null;
  avatar?: string | null;
  text?: string | null;
  ts: string | number;
  edited?: boolean;
  deleted?: boolean;
  mine?: boolean;
  likes?: number | null;
  likedByMe?: boolean;
  /** { "<climber>": "<reaction key>" } */
  reactions?: Record<string, string> | null;
  myReaction?: string | null;
  moderation?: string | null;
}
/** The person behind a comment: ME, a seed climber, or the stored author (id, name, avatar). */
export interface CommentAuthor {
  id?: string | number | null;
  name?: string | null;
  avatar?: string | null;
}
/** A group member offered for an @mention; `mentionName`/`mentionToken` read the naming fields. */
export interface MentionCandidate {
  id: string | number;
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
}
/** What `groupMentionMatch` returns while an @name is being typed. */
interface MentionMatch { matches: MentionCandidate[]; frag: string }
export interface CommentsProps {
  /** Which thread: a route, an area, a trip report, a photo or a group post. */
  targetId: string | number;
  comments: ReadonlyArray<ThreadComment>;
  onAdd: (targetId: string | number, text: string) => void;
  onViewProfile?: (author: CommentAuthor) => void;
  onEdit?: (id: string | number, text: string) => void;
  onDelete?: (id: string | number) => void;
  onLike?: (id: string | number) => void;
  onReact?: (id: string | number, key: string) => void;
  onReply?: (parentId: string | number, targetId: string | number, text: string) => void;
  /** Group members, when the thread is a group post's: enables @mentions. */
  mentionCandidates?: ReadonlyArray<MentionCandidate> | null;
  /** A moderator's remove, when the mount has one (a group). */
  onModRemove?: (id: string | number) => void;
  /** The mount's own report sheet; absent, a stored comment reports through the app-wide one (0263). */
  onReport?: (c: ThreadComment) => void;
  blockedIds?: ReadonlyArray<string | number> | null;
  onBlock?: (author: CommentAuthor) => void;
}

/* ONE THREAD COMPONENT for every discussion in the app -- routes and their tabs, areas, trip reports, photos and group posts --
   drawn the way Facebook draws one: a grey bubble holding the name and the words, a small line under it (time · Like · Reply ·
   React), the reactions as a pill at the bubble's edge, and everything else (edit, delete, report, remove, block) behind ⋯.
   Replies stay one level deep and fold behind "View N more replies" past two. */
export default function Comments({targetId,comments,onAdd,onViewProfile,onEdit,onDelete,onLike,onReact,onReply,mentionCandidates,onModRemove,onReport,blockedIds,onBlock}: CommentsProps){
  const [text,setText]=useState("");const [reactFor,setReactFor]=useState<string | number | null>(null);const [open,setOpen]=useState<Record<string, boolean>>({});const [sort,setSort]=useState("relevant");const [editId,setEditId]=useState<string | number | null>(null);const [editText,setEditText]=useState("");const [replyOpen,setReplyOpen]=useState<string | number | null>(null);const [replyTxt,setReplyTxt]=useState("");const [menuFor,setMenuFor]=useState<{ id: string | number; reply: boolean } | null>(null);const [allReplies,setAllReplies]=useState<Record<string, boolean>>({});const [fullAt,setFullAt]=useState<string | number | null>(null);
  /* BLOCKED AUTHORS leave the thread for the climber who blocked them (Apple 1.2), as their group posts already do, and so do the
     replies under a comment of theirs. The thread says how many of theirs it hid, so a gap is not a mystery. */
  const isBlocked=(c: ThreadComment)=>!!(blockedIds&&blockedIds.length&&c&&c.userId!=null&&blockedIds.some(b=>String(b)===String(c.userId)));
  const all=comments.filter(c=>c.targetId===targetId&&!c.parentId);
  const repliesAll=(pid: string | number)=>comments.filter(c=>c.parentId===pid).slice().sort((a,b)=>new Date(a.ts).getTime()-new Date(b.ts).getTime());
  const repliesFor=(pid: string | number)=>repliesAll(pid).filter(r=>!isBlocked(r));
  const visible=all.filter(c=>!isBlocked(c));
  const hiddenN=(all.length-visible.length)+visible.reduce((s,c)=>s+repliesAll(c.id).filter(isBlocked).length,0);
  const _t=(c: ThreadComment)=>{const t=new Date(c.ts).getTime();return isNaN(t)?0:t;};
  /* MOST RELEVANT, as Facebook orders a thread: what people answered and reacted to first, newest breaking ties. */
  const _score=(c: ThreadComment)=>reactionCounts(c.reactions).reduce((s,x)=>s+x.n,0)+(c.likes||0)+2*repliesFor(c.id).length;
  const list=visible.slice().sort((a,b)=>sort==="relevant"?((_score(b)-_score(a))||(_t(b)-_t(a))):sort==="new"?_t(b)-_t(a):_t(a)-_t(b));
  const submit=()=>{const v=text.trim();if(!v)return;onAdd(targetId,v);setText("");};
  const initial=(n?: string | null)=>(((n||"?").trim()[0])||"?").toUpperCase();
  const author=(c: ThreadComment): CommentAuthor=>c.userId===0?ME:(CLIMBERS.find(x=>x.id===c.userId)||{id:c.userId,name:c.name||"Climber",avatar:c.avatar});
  const saveEdit=()=>{const v=editText.trim();if(v&&onEdit&&editId!=null)onEdit(editId,v);setEditId(null);setEditText("");};
  const CAP=420;
  const avatarEl=(p: CommentAuthor,sz: number,go: () => void)=><div {...clickable(go)} title={"View "+p.name+"'s profile"} style={{flexShrink:0,width:sz,height:sz,borderRadius:"50%",overflow:"hidden",cursor:"pointer",background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz>28?13:10.5,fontWeight:800,color:C.textSub,border:"1px solid "+C.border}}>{p.avatar?<img decoding="async" src={photoThumb(p.avatar,sz)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/>:initial(p.name)}</div>;
  const meAvatar=(sz: number)=><div aria-hidden="true" style={{flexShrink:0,width:sz,height:sz,borderRadius:"50%",overflow:"hidden",background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz>28?13:10.5,fontWeight:800,color:C.textSub,border:"1px solid "+C.border}}>{ME.avatar?<img decoding="async" src={photoThumb(ME.avatar,sz)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/>:initial(ME.name)}</div>;
  const bubble: CSSProperties={display:"inline-block",maxWidth:"100%",boxSizing:"border-box",background:C.surface,borderRadius:16,padding:"7px 12px"};
  const meta: CSSProperties={display:"flex",alignItems:"center",gap:14,rowGap:6,flexWrap:"wrap",marginTop:3,paddingLeft:12};
  const lnk: CSSProperties={background:"none",border:"none",padding:"6px 2px",margin:"-6px -2px",fontSize:11.5,fontWeight:700,cursor:"pointer",color:C.textMuted};
  // `c.reactions` is { "<climber>": "<key>" } and `c.myReaction` is resolved by the caller, which is the only place that knows
  // whether "me" is a uuid (DB) or seed id 0 (demo). The pill shows the top three and the total; it opens the picker.
  const reactPill=(c: ThreadComment)=>{const counts=reactionCounts(c.reactions);const n=counts.reduce((s,x)=>s+x.n,0);if(!n)return null;return <button onClick={()=>setReactFor(c.id)} aria-label={n+(n===1?" reaction":" reactions")+" — choose yours"} style={{flexShrink:0,display:"inline-flex",alignItems:"center",gap:3,padding:"1px 7px",marginBottom:2,borderRadius:10,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1.6}}><span aria-hidden="true" style={{display:"inline-flex",gap:2}}>{reactionIcons(counts,12)}</span><span>{n}</span></button>;};
  /* The reaction picker's entry point stays a real, named button (check:clickable records it was once inert on Enter). It
     shows the reaction you gave, so "React" does not read as less real than Like. */
  const reactBtn=(c: ThreadComment)=>{const mr=c.myReaction?REACTIONS.find(x=>x.k===c.myReaction):null;return <button onClick={()=>setReactFor(c.id)} aria-label={mr?"Change your reaction":"Add a reaction"} style={Object.assign({},lnk,{color:mr?C.blue:C.textMuted})}>{mr?<span style={{display:"inline-flex",alignItems:"center",gap:4}}>{mr.i?<ActionIcon name={mr.i} size={12} color="currentColor"/>:null}{mr.l}</span>:"React"}</button>;};
  const whenBtn=(c: ThreadComment)=>{const f=fullAt===c.id;return <button onClick={()=>setFullAt(f?null:c.id)} aria-label={commentWhen(c.ts,true)+(c.edited?", edited":"")} style={Object.assign({},lnk,{fontWeight:600})}>{commentWhen(c.ts,f)+(c.edited?" · Edited":"")}</button>;};
  /* ⋯ holds what used to be a row of text links. Report goes to the mount's own sheet where it passes one (a group's), and to
     the app-wide one (0263) for any stored comment otherwise, so no comment gets two. Block needs a person with an account. */
  const menuItems=(c: ThreadComment,isReply: boolean)=>{const a=author(c);const mine=c.userId===0||!!c.mine;const w=isReply?"reply":"comment";const it: CommentMenuItem[]=[];
    if(mine)it.push(["Edit "+w,()=>{setEditId(c.id);setEditText(c.text||"");}]);
    if(mine&&onDelete)it.push(["Delete "+w,()=>{askConfirm({title:"Delete this "+w+"?",confirmLabel:"Delete "+w}).then(function(ok){if(ok)onDelete(c.id);});},true]);
    if(!mine&&!c.deleted){
      if(onReport)it.push(["Report "+w,()=>onReport(c)]);else if(isDbRowId(c.id)&&canReportContent())it.push(["Report "+w,()=>openContentReport({kind:"comment",id:c.id,label:"this "+w})]);
      if(onModRemove)it.push(["Remove "+w,()=>{askConfirm({title:"Remove this "+w+"?",body:isReply?"It’s removed for everyone in the group.":"It’s removed for everyone in the group. Replies under it stay.",confirmLabel:"Remove "+w}).then(function(ok){if(ok)onModRemove(c.id);});},true]);
      if(onBlock&&a&&a.id!=null&&a.id!==0){const nm=a.name||"this climber";it.push(["Block "+nm.split(" ")[0],()=>{askConfirm({title:"Block "+nm+"?",body:"You won’t see their comments or posts. This also removes them as a friend and clears any friend requests between you.",confirmLabel:"Block"}).then(function(ok){if(ok)onBlock(a);});},true]);}
    }
    return it;};
  const moreBtn=(c: ThreadComment,isReply: boolean)=>menuItems(c,isReply).length?<button onClick={()=>setMenuFor({id:c.id,reply:!!isReply})} aria-label={isReply?"Reply options":"Comment options"} style={{flexShrink:0,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",borderRadius:15,cursor:"pointer",padding:0}}><ActionIcon name="more" size={16} color={C.textMuted}/></button>:null;
  const modNote=(c: ThreadComment,w: string)=>(c.userId===0||c.mine)&&c.moderation&&c.moderation!=="visible"?<div style={{color:C.amber,fontSize:11.5,fontWeight:700,marginTop:4,paddingLeft:12}}>{c.moderation==="removed"?"Removed by ClimbMatch Safety — only you can see it":"Hidden while ClimbMatch Safety reviews it"}{canAppeal()?<span {...clickable(()=>openAppeal({kind:"comment",id:c.id,label:"this "+w+"’s removal"}))} style={{marginLeft:6,textDecoration:"underline",cursor:"pointer"}}>Appeal</span>:null}</div>:null;
  const mainMention=mentionCandidates?groupMentionMatch(text,mentionCandidates):null;
  const replyMention=mentionCandidates?groupMentionMatch(replyTxt,mentionCandidates):null;
  const editMention=mentionCandidates?groupMentionMatch(editText,mentionCandidates):null;
  const mentionRow=(m: MentionMatch | null,pick: (cand: MentionCandidate, m: MentionMatch) => void)=>m?<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>{m.matches.map(function(cand){return <span key={cand.id} {...clickable(()=>pick(cand,m))} style={{fontSize:12,fontWeight:700,color:C.onSolid,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:14,padding:"4px 10px",cursor:"pointer"}}>{mentionName(cand)}</span>;})}</div>:null;
  const editBox=(label: string)=><div><RichEditor compact value={editText} onChange={setEditText} ariaLabel={label} minHeight={56}/>{mentionRow(editMention,(cand,m)=>setEditText(t=>t.slice(0,t.length-m.frag.length)+"@"+mentionToken(cand)+" "))}<div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><button onClick={()=>{setEditId(null);setEditText("");}} style={{padding:"6px 12px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button><button onClick={saveEdit} style={{padding:"6px 14px",borderRadius:9,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button></div></div>;
  const openReply=(pid: string | number,pre?: string)=>{setReplyOpen(pid);setReplyTxt(pre||"");};
  const gone=(k: string | number,sz: number)=><div key={k} style={{display:"flex",gap:8,marginTop:8}}><div style={{flexShrink:0,width:sz,height:sz,borderRadius:"50%",background:C.surface,border:"1px solid "+C.border}}/><div style={Object.assign({},bubble,{fontSize:12.5,color:C.textMuted,fontStyle:"italic"})}>Comment deleted</div></div>;
  const renderReply=(r: ThreadComment,pid: string | number)=>{if(r.deleted)return gone(r.id,24);const ra=author(r);const view=()=>{if(onViewProfile&&ra)onViewProfile(ra);};if(editId===r.id)return <div key={r.id} style={{display:"flex",gap:8,marginTop:8}}>{avatarEl(ra,24,view)}<div style={{flex:1,minWidth:0}}>{editBox("Edit reply")}</div></div>;return <div key={r.id} style={{display:"flex",gap:8,marginTop:8}}>{avatarEl(ra,24,view)}<div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"flex-end",gap:4}}><div style={bubble}><span {...clickable(view)} style={{display:"block",fontSize:12,fontWeight:700,color:C.text,cursor:"pointer"}}>{ra.name}</span><div style={{fontSize:12.5,color:C.text,lineHeight:1.45,wordBreak:"break-word"}}>{renderMD(r.text)}</div></div>{reactPill(r)}{moreBtn(r,true)}</div><div style={meta}>{whenBtn(r)}{reactBtn(r)}<button onClick={()=>openReply(pid,"@"+mentionToken(ra)+" ")} style={lnk}>Reply</button></div>{modNote(r,"reply")}</div></div>;};
  const menuC=menuFor?comments.find(x=>x.id===menuFor.id):null;const menuList=menuFor&&menuC?menuItems(menuC,menuFor.reply):[];const closeMenu=()=>setMenuFor(null);
  return <div style={{marginTop:10,paddingTop:12,borderTop:"1px solid "+C.border}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.text,letterSpacing:0.5,textTransform:"uppercase",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{"Discussion"+(list.length?" ("+list.length+")":"")}</div>{list.length>1?<select aria-label="Sort comments" value={sort} onChange={e=>setSort(e.target.value)} style={{flexShrink:0,background:C.surface,border:"1px solid "+C.border,color:C.textSub,borderRadius:8,padding:"5px 8px",fontSize:12,fontWeight:700,cursor:"pointer"}}><option value="relevant">Most relevant</option><option value="new">Newest</option><option value="old">Oldest</option></select>:null}</div>
    {hiddenN?<div style={{fontSize:11.5,color:C.textMuted,marginBottom:8}}>{hiddenN===1?"1 comment from a climber you’ve blocked is hidden.":hiddenN+" comments from climbers you’ve blocked are hidden."}</div>:null}
    {list.map(c=>{if(c.deleted)return <div key={c.id} style={{padding:"6px 0"}}>{gone("g"+c.id,32)}<div style={{marginLeft:40}}>{repliesFor(c.id).map(r=>renderReply(r,c.id))}</div></div>;const a=author(c);const view=()=>{if(onViewProfile&&a)onViewProfile(a);};const long=(c.text||"").length>CAP;const isOpen=open[c.id];const body=(long&&!isOpen)?(c.text||"").slice(0,CAP).replace(/\s+\S*$/,"")+"…":c.text;const reps=repliesFor(c.id);const showAll=!!allReplies[c.id]||reps.length<=2;const shown=showAll?reps:reps.slice(-1);return <div key={c.id} style={{display:"flex",gap:8,padding:"6px 0"}}>{avatarEl(a,32,view)}<div style={{flex:1,minWidth:0}}>{editId===c.id?editBox("Edit comment"):<div><div style={{display:"flex",alignItems:"flex-end",gap:4}}><div style={bubble}><span {...clickable(view)} style={{display:"block",fontSize:12.5,fontWeight:700,color:C.text,cursor:"pointer"}}>{a.name}</span>{/* renderMD, not raw text: the format bar puts **markers** in here, so without a reader a climber who used it would see their own asterisks. */}<div style={{fontSize:13,color:C.text,lineHeight:1.45,wordBreak:"break-word"}}>{renderMD(body)}{long?<span {...clickable(()=>setOpen(o=>Object.assign({},o,{[c.id]:!isOpen})))} style={{color:C.blue,fontWeight:700,cursor:"pointer",marginLeft:5,whiteSpace:"nowrap"}}>{isOpen?"Show less":"Read more"}</span>:null}</div></div>{reactPill(c)}{moreBtn(c,false)}</div><div style={meta}>{whenBtn(c)}<button onClick={()=>{if(onLike)onLike(c.id);}} aria-pressed={!!c.likedByMe} style={Object.assign({},lnk,{color:c.likedByMe?C.blue:C.textMuted})}>{(c.likedByMe?"Liked":"Like")+(c.likes?" · "+c.likes:"")}</button><button onClick={()=>{if(replyOpen===c.id)setReplyOpen(null);else openReply(c.id,"");}} aria-expanded={replyOpen===c.id} style={lnk}>Reply</button>{reactBtn(c)}</div>{modNote(c,"comment")}</div>}
      {reps.length>2?<button onClick={()=>setAllReplies(o=>Object.assign({},o,{[c.id]:!o[c.id]}))} aria-expanded={!!allReplies[c.id]} style={Object.assign({},lnk,{display:"block",margin:"6px 0 0",padding:"4px 0",color:C.textSub})}>{allReplies[c.id]?"Hide earlier replies":"View "+(reps.length-1)+" more "+(reps.length-1===1?"reply":"replies")}</button>:null}
      {shown.map(r=>renderReply(r,c.id))}
      {replyOpen===c.id?<div style={{display:"flex",gap:8,marginTop:8,alignItems:"flex-start"}}>{meAvatar(24)}<div style={{flex:1,minWidth:0}}><input aria-label={"Reply to "+a.name} value={replyTxt} onChange={e=>setReplyTxt(e.target.value)} placeholder={"Reply to "+a.name+"…"} style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:16,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:12.5,outline:"none"}}/>{mentionRow(replyMention,(cand,m)=>setReplyTxt(t=>t.slice(0,t.length-m.frag.length)+"@"+mentionToken(cand)+" "))}</div><button disabled={!replyTxt.trim()} onClick={()=>{const v=replyTxt.trim();if(!v)return;if(onReply)onReply(c.id,targetId,v);setReplyTxt("");setReplyOpen(null);}} style={{padding:"8px 14px",borderRadius:16,border:"none",background:replyTxt.trim()?C.blueSolid:C.surface,color:replyTxt.trim()?"#fff":C.textMuted,fontSize:12,fontWeight:700,cursor:replyTxt.trim()?"pointer":"default",flexShrink:0}}>Post</button></div>:null}
    </div></div>;})}
    <div style={{display:"flex",gap:8,alignItems:"flex-start",marginTop:list.length?8:0}}>{meAvatar(32)}<div style={{flex:1,minWidth:0}}><RichEditor compact value={text} onChange={setText} ariaLabel="Add a comment" placeholder="Write a comment…" minHeight={44}/>{mentionRow(mainMention,(cand,m)=>setText(t=>t.slice(0,t.length-m.frag.length)+"@"+mentionToken(cand)+" "))}<div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}><button disabled={!text.trim()} onClick={submit} style={{padding:"9px 18px",borderRadius:16,border:"none",background:text.trim()?C.blueSolid:C.surface,color:text.trim()?"#fff":C.textMuted,fontSize:12.5,fontWeight:700,cursor:text.trim()?"pointer":"default"}}>Post</button></div></div></div>
    {reactFor?<ReactionPicker onClose={()=>setReactFor(null)} onPick={function(k){if(onReact&&reactFor!=null)onReact(reactFor,k);setReactFor(null);}}/>:null}
    {menuFor&&menuList.length?<CommentMenu label={menuFor.reply?"Reply options":"Comment options"} items={menuList} onClose={closeMenu}/>:null}
  </div>;
}
