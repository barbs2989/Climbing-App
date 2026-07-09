// Live "who's viewing this route" via Supabase Realtime Presence (opt-in identity).
// Everyone browsing a DB-backed route tracks presence so the headcount is real, but only
// climbers who've opted into "visible while browsing" (see Settings > Privacy) attach a
// name/avatar — everyone else is counted but rendered anonymously.
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// me = { id, name, avatar, visible }
export function useRoutePresence(routeId, me) {
  const [state, setState] = useState({ count: 0, viewers: [] });
  const meRef = useRef(me);
  meRef.current = me;

  useEffect(() => {
    if (!supabase || !routeId || !me || me.id == null) { setState({ count: 0, viewers: [] }); return; }
    const channel = supabase.channel("route-presence:" + routeId, { config: { presence: { key: String(me.id) } } });

    const sync = () => {
      const entries = Object.values(channel.presenceState()).flat();
      const myId = String(meRef.current.id);
      const viewers = entries.filter((e) => e.visible && String(e.id) !== myId);
      setState({ count: entries.length, viewers });
    };
    channel.on("presence", { event: "sync" }, sync);
    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      const m = meRef.current;
      await channel.track(m.visible ? { id: m.id, name: m.name, avatar: m.avatar, visible: true } : { id: m.id, visible: false });
    });

    return () => { supabase.removeChannel(channel); };
  }, [routeId, me && me.id, me && me.visible]);

  return state;
}
