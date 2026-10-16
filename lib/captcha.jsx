// Cloudflare Turnstile on the real sign-in / sign-up / reset form (AuthModal).
//
// INERT UNTIL A SITE KEY IS SET. With no VITE_TURNSTILE_SITE_KEY the widget renders nothing, loads
// nothing from Cloudflare and AuthModal asks for no token -- the form behaves exactly as before.
// Turning it on is two settings, in this order:
//   1. Supabase Auth: enable CAPTCHA protection, provider Turnstile, paste the SECRET key
//      (`security_captcha_enabled` / `security_captcha_provider` / `security_captcha_secret`).
//   2. deploy.yml: VITE_TURNSTILE_SITE_KEY = the SITE key.
// Doing only 1 locks every email sign-in out (the server demands a token the form never sends);
// doing only 2 shows a widget whose token the server ignores. So ship 2 in the same hour as 1.
// Also on that day: the Privacy Policy names the providers a browser reaches, and Cloudflare's
// challenge is a new one -- amend it and move POLICY_VERSION with the key, not before.
// And BEFORE step 1, run one fixture sign-in: the guards sign test accounts in by password
// through /auth/v1/token (scripts/lib/durable-fixture.mjs, ui-fixture.mjs and ~15 probes). If the
// project's CAPTCHA setting refuses those too, CI's signed-in walks go red the moment it is on.
//
// A token is SINGLE-USE and expires after ~5 minutes, so the caller resets the widget after every
// attempt, success or failure; a second submit with the old token fails server-side.
import { useEffect, useRef } from "react";

export const CAPTCHA_SITE_KEY = (import.meta.env && import.meta.env.VITE_TURNSTILE_SITE_KEY) || "";
export const CAPTCHA_ON = !!CAPTCHA_SITE_KEY;

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading = null;
function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT; s.async = true; s.defer = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not initialise")));
      s.onerror = () => { loading = null; reject(new Error("Couldn’t load the security check")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// `onToken(token|"")` fires with a fresh token when the check passes and with "" when it expires
// or errors. `resetKey` -- bump it to get a fresh widget after an attempt spent the token.
export function Turnstile({ onToken, onError, resetKey }) {
  const box = useRef(null);
  const cb = useRef({ onToken, onError });
  cb.current = { onToken, onError };
  useEffect(() => {
    if (!CAPTCHA_ON) return undefined;
    let id = null, gone = false;
    loadTurnstile().then((ts) => {
      if (gone || !box.current) return;
      id = ts.render(box.current, {
        sitekey: CAPTCHA_SITE_KEY,
        theme: "dark",
        callback: (t) => cb.current.onToken && cb.current.onToken(t),
        "expired-callback": () => cb.current.onToken && cb.current.onToken(""),
        "error-callback": () => { cb.current.onToken && cb.current.onToken(""); cb.current.onError && cb.current.onError("The security check failed — try it again."); },
      });
    }).catch((e) => cb.current.onError && cb.current.onError(e.message));
    return () => { gone = true; if (id != null && window.turnstile) { try { window.turnstile.remove(id); } catch (e) { /* already gone */ } } };
  }, [resetKey]);
  if (!CAPTCHA_ON) return null;
  return <div ref={box} style={{ minHeight: 65, marginBottom: 10, display: "flex", justifyContent: "center" }} />;
}
