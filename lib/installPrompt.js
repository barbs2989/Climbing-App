// "INSTALL CLIMBMATCH" (competitor review, batch A item 10, owner 2026-11-04). Chrome and Edge fire
// `beforeinstallprompt` once a page qualifies as an installable web app (the manifest, the service
// worker main.jsx registers in a build, HTTPS); the event is kept and its prompt() opened from a
// link. Safari and Firefox never fire it, and neither does a page already installed, so the link
// shows only when the browser has offered — it never promises an install it cannot make. A fired
// event is one-shot: after prompt() it is dropped, and the link goes with it.
import { useEffect, useState } from "react";

let deferred = null;
const listeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; listeners.forEach(fn => fn(true)); });
  window.addEventListener("appinstalled", () => { deferred = null; listeners.forEach(fn => fn(false)); });
}

/** @returns {{ canInstall: boolean, install: () => void }} */
export function useInstallPrompt() {
  const [can, setCan] = useState(!!deferred);
  useEffect(() => { listeners.add(setCan); setCan(!!deferred); return () => { listeners.delete(setCan); }; }, []);
  const install = () => {
    const e = deferred; if (!e) return;
    deferred = null; listeners.forEach(fn => fn(false));
    try { e.prompt(); } catch { /* the browser withdrew the offer */ }
  };
  return { canInstall: can, install };
}
