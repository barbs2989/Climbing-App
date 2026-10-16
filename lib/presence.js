// Live "who's viewing this route" via Supabase Realtime Presence (opt-in identity).
// Everyone browsing a DB-backed route tracks presence so the headcount is real, but only
// climbers who've opted into "visible while browsing" (see Settings > Privacy) attach a
// name/avatar — everyone else is counted but rendered anonymously.
//
// THE COUNT AND THE AVATARS ARE ONE DECISION, NOT TWO, and splitting them is what this module
// exists to prevent. The hook used to return `count = every tracked entry` — which includes YOU,
// since you call `track()` — beside a `viewers` list that excluded you. So one chip strip carried
// two rules about whether the reader is in it, and a climber alone on a route read a pulsing green
// "1 viewing now" with no avatar beside it: a social-proof claim whose subject was themselves.
//
// `presenceSplit` is exported as a PURE function for the reason `topoEmptyCopy` and `stateCatalogLine`
// are: it can be RUN. Standing up a Realtime channel to ask "does the count include me" is far more
// than the question is worth, and a decision taken inside a hook is unreachable to any static check.
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// entries: every tracked presence, INCLUDING your own. myId: your presence key.
// Returns the two things the UI shows, derived from ONE exclusion so they cannot disagree:
//   others  — how many OTHER people are on this route right now
//   viewers — those others who opted into showing a name and photo
export function presenceSplit(entries, myId) {
  const rows = Array.isArray(entries) ? entries : [];
  const me = String(myId);
  const notMe = rows.filter((e) => e && String(e.id) !== me);
  return { others: notMe.length, viewers: notMe.filter((e) => e.visible) };
}

// me = { id, name, avatar, visible }
export function useRoutePresence(routeId, me) {
  const [state, setState] = useState({ others: 0, viewers: [] });
  const meRef = useRef(me);
  meRef.current = me;

  useEffect(() => {
    if (!supabase || !routeId || !me || me.id == null) { setState({ others: 0, viewers: [] }); return; }
    const channel = supabase.channel("route-presence:" + routeId, { config: { presence: { key: String(me.id) } } });

    const sync = () => setState(presenceSplit(Object.values(channel.presenceState()).flat(), meRef.current.id));
    channel.on("presence", { event: "sync" }, sync);
    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      const m = meRef.current;
      // You are tracked whether or not you are visible, so OTHER people's counts include you —
      // which is what Settings promises ("Off still counts you in 'climbers viewing now', just
      // without your name or photo"). That promise is about what others see and is unaffected by
      // leaving yourself out of your OWN tally.
      await channel.track(m.visible ? { id: m.id, name: m.name, avatar: m.avatar, visible: true } : { id: m.id, visible: false });
    });

    return () => { supabase.removeChannel(channel); };
  }, [routeId, me && me.id, me && me.visible]);

  return state;
}
