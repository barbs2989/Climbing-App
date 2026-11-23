import { useEffect, useState } from "react";

/* Is the device CERTAIN it has no connection? `navigator.onLine === false` is the one reliable half of
   that flag: false means no network at all, while true only means a network exists (one bar in a
   valley still reads true). So this answers "definitely offline" and nothing more, and a screen must
   keep its own failed-read lines for the weak-signal case this cannot see. Follows the browser's
   online/offline events, so a page already open changes when the phone loses or finds service. */
function offlineNow() { return typeof navigator !== "undefined" && navigator.onLine === false; }

export function useOffline() {
  const [off, setOff] = useState(offlineNow);
  useEffect(function () {
    const sync = function () { setOff(offlineNow()); };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return function () { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  return off;
}
