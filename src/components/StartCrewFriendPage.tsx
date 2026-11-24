import { useState } from "react";
import { createPortal } from "react-dom";
import { C, fuzzyMatch, pubName } from "../../ClimbMatchCore.jsx";
import { POP_BACK, POP_REMOVE } from "../../lib/popupChrome.js";
import Av from "./Av.tsx";
import EmptyState from "./EmptyState.tsx";

/** A friend as App's `connections` holds them: an example climber (integer id) or a real profile (uuid). */
export interface StartCrewFriend {
  id: string | number;
  name: string;
  username?: string | null;
  showName?: boolean | null;
  avatar?: string | null;
  objectiveIds?: ReadonlyArray<string>;
}

export interface StartCrewFriendPageProps<F extends StartCrewFriend> {
  friends: ReadonlyArray<F>;
  /** The friends read failed: say so rather than "no friends yet". */
  unavailable: boolean;
  /** The names of the climbs this friend and the climber both saved. */
  sharedNames: (f: F) => ReadonlyArray<string>;
  onPick: (f: F) => void;
  onFindPartners: () => void;
  onClose: () => void;
}

type FriendSort = "shared" | "name";
const FRIEND_SORTS: ReadonlyArray<[FriendSort, string]> = [["shared", "Shared objectives first"], ["name", "Name (A to Z)"]];

/* START A CREW WITH A FRIEND, AS A PAGE (owner 2026-11-19: "make it a button that directs you to a new page where you can
   see your list of friends to start a crew with"). The Crew tab drew up to four friends inline, each beside a climb the app
   had picked, and a friend with no such climb was never listed. This lists EVERY friend, searchable and sortable; Start crew
   hands the friend back and the caller opens the climb picker, so the climber chooses the climb. */
export default function StartCrewFriendPage<F extends StartCrewFriend>({ friends, unavailable, sharedNames, onPick, onFindPartners, onClose }: StartCrewFriendPageProps<F>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<FriendSort>("shared");
  const ql = q.trim().toLowerCase();
  /* Search and A to Z go by the name ON SCREEN (pubName) and the @handle, as the Friends list does: never a name a climber chose to hide. */
  const shown = (f: F): string => pubName(f) + " " + (f.username ? "@" + f.username : "");
  const az = (f: F): string => String(pubName(f)).replace(/^@/, "");
  const rows = friends.map(f => ({ f, shared: sharedNames(f) })).filter(x => !ql || fuzzyMatch(ql, shown(x.f)));
  rows.sort((a, b) => (sort === "shared" ? b.shared.length - a.shared.length : 0) || az(a.f).localeCompare(az(b.f), undefined, { sensitivity: "base" }));
  const field = { minWidth: 0, height: 44, boxSizing: "border-box" as const, borderRadius: 10, border: "1px solid " + C.field, background: C.surface, color: C.text, fontFamily: "inherit" };
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Start a crew with a friend" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 9500, display: "flex", flexDirection: "column", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
      <button onClick={onClose} style={POP_BACK}>{"← Back"}</button>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, flex: 1, minWidth: 0 }}>Start a crew with a friend</div>
    </div>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: "14px 16px 40px" }}>
      {friends.length ? <>
        <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.45, margin: "0 2px 10px" }}>{"Pick a friend, then choose the climb or the crag. They get an invite to accept or decline."}</div>
        <div style={{ position: "relative", marginBottom: 9 }}>
          <input type="search" aria-label="Search friends" value={q} onChange={e => setQ(e.target.value)} placeholder="Search friends by name or @handle" style={{ ...field, width: "100%", padding: "0 44px 0 12px", fontSize: 14, outline: "none" }} />
          {q ? <button onClick={() => setQ("")} aria-label="Clear search" style={{ ...POP_REMOVE, position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)" }}>✕</button> : null}
        </div>
        {friends.length > 1 ? <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12.5, fontWeight: 700, color: C.textSub }}>Sort
          <select aria-label="Sort friends" value={sort} onChange={e => setSort(e.target.value as FriendSort)} style={{ ...field, flex: 1, padding: "0 10px", fontSize: 13, cursor: "pointer" }}>{FRIEND_SORTS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
        </label> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map(x => <div key={x.f.id} style={{ display: "flex", alignItems: "center", gap: 11, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px" }}>
            <Av src={x.f.avatar} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{pubName(x.f)}</div>
              <div style={{ fontSize: 11.5, color: x.shared.length ? C.textSub : C.textMuted, marginTop: 1, overflowWrap: "anywhere" }}>{x.shared.length ? "You both want " + x.shared.slice(0, 2).join(", ") + (x.shared.length > 2 ? " and " + (x.shared.length - 2) + " more" : "") : "No shared objectives yet"}</div>
            </div>
            <button aria-haspopup="dialog" aria-label={"Start a crew with " + pubName(x.f)} onClick={() => onPick(x.f)} style={{ flexShrink: 0, minHeight: 44, padding: "0 14px", borderRadius: 9, border: "none", background: C.blueSolid, color: C.onSolid, fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>Start crew</button>
          </div>)}
        </div>
        {!rows.length ? <EmptyState C={C} icon="search" style={{ padding: "28px 14px" }}>{"No friends match “" + q.trim() + "”."}</EmptyState> : null}
      </> : unavailable ? <EmptyState C={C} icon="alert" style={{ padding: "28px 14px" }}>Couldn’t load your friends. This list is unread, not empty. Try again in a moment.</EmptyState>
        : <EmptyState C={C} icon="partners" style={{ padding: "28px 14px" }} action={<button onClick={onFindPartners} style={{ marginTop: 3, minHeight: 44, padding: "0 16px", borderRadius: 10, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.onSolid, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Find partners</button>}>No friends yet. Start a crew with someone once you are connected.</EmptyState>}
    </div>
  </div>, document.body);
}
