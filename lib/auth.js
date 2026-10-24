// Full-accounts auth — Phase 1. Session + profile helpers over Supabase Auth.
import { useEffect, useState } from "react";
import { supabase, RECOVERY_LINK } from "./supabase";
import { getQueryClient, invalidateKeys } from "./queryClientRef";
import { PERSISTED_QUERY_KEYS } from "./query-persist.js";

// undefined = still loading; null = signed out; object = signed in
export function useSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    let gotEvent = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!gotEvent) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      gotEvent = true;
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}
const NO_DB = Promise.resolve({ data: null, error: { message: "Accounts are not available in this build." } });
// `terms_version` rides along in the signup metadata so handle_new_user() can stamp it onto
// the profile row IN THE SAME TRANSACTION as the account. A client-side follow-up write was
// the obvious alternative and is worse: it races the trigger that creates the row, and its
// failure is unobservable — exactly the swallowed-write shape check:writes exists for.
// What this records is "the app presented version X and the account was created anyway",
// which is what acceptance is; it is not, and cannot be, proof of reading.
// `captchaToken` is Turnstile's one-use token (lib/captcha.jsx). Absent -- no site key set -- it is
// left out entirely, and Supabase only asks for one once CAPTCHA is enabled on the project.
const withCaptcha = (options, captchaToken) => (captchaToken ? Object.assign({}, options, { captchaToken }) : options);
export const signUp  = (email, password, name, termsVersion, captchaToken) =>
  supabase ? supabase.auth.signUp({ email, password, options: withCaptcha({ data: { name, terms_version: termsVersion || null } }, captchaToken) }) : NO_DB;
export const signIn  = (email, password, captchaToken) =>
  supabase ? supabase.auth.signInWithPassword(captchaToken ? { email, password, options: { captchaToken } } : { email, password }) : NO_DB;
// Sign-out also drops every cached query that was answered FOR this climber (friends, logs,
// crews, unread counts, filed reports…), so the next account on this tab is never served the
// last one's data. The public catalog — the keys lib/query-persist.js keeps on disk — stays: it
// is the same for everyone, and refetching it would only cost the next sign-in a cold start.
//
// When the logout REQUEST fails -- offline, or the project not answering -- supabase-js returns
// `{ error }` and KEEPS the session on this device (measured in auth-js 2.109 `_signOut`). The
// menu then toasted "Signed out" over an account that was still signed in and came back on the
// next reload. Sign out must sign THIS device out whatever the network says (a shared phone at a
// trailhead with no signal), so the failure path drops the local session anyway: the tokens
// leave storage, SIGNED_OUT fires, and useSession goes null as after a reachable sign-out. The
// refresh token is then held by nobody and expires server-side on its own.
const dropLocalSession = async () => {
  if (typeof supabase.auth._removeSession === "function") return supabase.auth._removeSession();
  // A supabase-js without that private method: clear its storage keys; the reload drops the rest.
  try { ["", "-code-verifier", "-user"].forEach((k) => window.localStorage.removeItem("climbmatch-auth" + k)); } catch (_e) { /* storage blocked: nothing was persisted */ }
  window.location.reload();
};
// "View as guest" on the sign-in screen (LOGIN_FIRST). Remembered for THIS TAB only, so a reload
// keeps a guest in the app but the next visit opens on the sign-in screen again.
export const markGuest = (on) => { try { if (on) sessionStorage.setItem("cm_guest", "1"); else sessionStorage.removeItem("cm_guest"); } catch (_e) { /* storage blocked: guest lasts until reload */ } };
export const wasGuest = () => { try { return sessionStorage.getItem("cm_guest") === "1"; } catch (_e) { return false; } };
export const signOut = async () => {
  markGuest(false);
  if (!supabase) return NO_DB;
  let res;
  try { res = await supabase.auth.signOut(); } catch (e) { res = { error: e }; }
  if (res && res.error) { await dropLocalSession(); res = { error: null, offlineOnly: true }; }
  const qc = getQueryClient();
  if (qc) qc.removeQueries({ predicate: (q) => !PERSISTED_QUERY_KEYS.has(q.queryKey[0]) });
  return res;
};

// Where Supabase sends the browser back to, for anything that leaves the app and returns:
// password-reset mail and the OAuth round trip both use it.
//
// It must be on the project's Auth redirect allow-list. If it is not, Supabase does NOT error --
// it silently substitutes the project Site URL and returns 200. Measured 2026-08-06: Site URL was
// still the stock `http://localhost:3000`, so every reset link landed on a dead page. The same
// allow-list governs the Google callback, so both are fixed by the same dashboard entry.
export const appRedirect = () =>
  typeof window === "undefined" ? "" : window.location.origin + (import.meta.env.BASE_URL || "/");

// Which external providers this project ACTUALLY has enabled. `/auth/v1/settings` is public
// (anon key), so the sign-in screen can ask instead of assuming -- a hardcoded Google button is
// theatre until someone flips the provider on, and this app has shipped that mistake before.
// Returns null while unknown, then an array of provider names; `email` is always in it.
export function useOAuthProviders() {
  const [providers, setProviders] = useState(null);
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabase || !url || !key) { setProviders([]); return; }
    let live = true;
    fetch(url.replace(/\/$/, "") + "/auth/v1/settings", { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!live) return;
        const ext = (j && j.external) || {};
        setProviders(Object.keys(ext).filter((k) => ext[k]));
      })
      // An unreachable settings endpoint must hide the button, never guess it into existence.
      .catch(() => { if (live) setProviders([]); });
    return () => { live = false; };
  }, []);
  return providers;
}

// On success the browser navigates to Google, so nothing after this resolves in practice; an
// error means the redirect never happened (provider off, or callback URL not allow-listed).
export const signInWithProvider = (provider) =>
  supabase ? supabase.auth.signInWithOAuth({ provider, options: { redirectTo: appRedirect() } }) : NO_DB;
export const signInWithGoogle = () => signInWithProvider("google");
// Apple's web flow (a Services ID + key on the Apple side, the "apple" provider switched on in
// Supabase). Until both exist useOAuthProviders leaves "apple" out and the button says so.
export const signInWithApple = () => signInWithProvider("apple");

// Password recovery. An account is the only way into the app, so without these a climber who
// forgets their password has no way back in at all -- there is no guest mode to fall back to.
export const requestPasswordReset = (email, captchaToken) =>
  supabase ? supabase.auth.resetPasswordForEmail(email, withCaptcha({ redirectTo: appRedirect() }, captchaToken)) : NO_DB;
export const updatePassword = (password) =>
  supabase ? supabase.auth.updateUser({ password }) : NO_DB;

// EMAIL VERIFICATION BY CODE (0306). The ✓ means the climber proved they can read their inbox, which
// sign-up no longer shows: autoconfirm stamps every new account "confirmed" without sending anything.
// So we email a one-time code (the same message also carries a sign-in link), and the session that
// code or link produces carries an `amr` entry the server checks in verify_my_email(). Never creates
// an account: shouldCreateUser is off, so a typo'd address cannot sign somebody new up.
export const sendEmailCode = (email, captchaToken) =>
  supabase ? supabase.auth.signInWithOtp({ email, options: withCaptcha({ shouldCreateUser: false, emailRedirectTo: appRedirect() }, captchaToken) }) : NO_DB;
export const confirmEmailCode = (email, code) =>
  supabase ? supabase.auth.verifyOtp({ email, token: String(code || "").replace(/\s+/g, ""), type: "email" }) : NO_DB;

// When this session last proved the inbox, in ms, or null. Read from the access token's `amr` claim --
// the same claim verify_my_email() reads, so the client never claims a proof the server would refuse.
// Decoding is not trusting: the server re-checks the signed token; this only decides whether to ask.
const INBOX_METHODS = ["otp", "magiclink", "recovery", "email/signup"];
export const INBOX_PROOF_WINDOW_MS = 30 * 60 * 1000;
export function inboxProofAt(session) {
  try {
    const t = session && session.access_token;
    if (!t) return null;
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    let best = 0;
    (Array.isArray(p.amr) ? p.amr : []).forEach((a) => {
      if (a && INBOX_METHODS.indexOf(a.method) >= 0 && +a.timestamp > best) best = +a.timestamp;
    });
    return best ? best * 1000 : null;
  } catch (e) { return null; }
}
export const inboxProofFresh = (session) => {
  const at = inboxProofAt(session);
  return !!at && Date.now() - at < INBOX_PROOF_WINDOW_MS;
};

// True when this page load came from a reset link. Latched at import time (see RECOVERY_LINK) and
// also driven by the PASSWORD_RECOVERY event, because either one alone has a hole: the hash is
// gone by the time React mounts, and the event can fire before any listener subscribes.
let recovering = RECOVERY_LINK;
export const isRecovering = () => recovering;
export const endRecovery = () => { recovering = false; };
export function usePasswordRecovery() {
  const [on, setOn] = useState(recovering);
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "PASSWORD_RECOVERY") { recovering = true; setOn(true); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return [on, () => { endRecovery(); setOn(false); }];
}
/* A FAILED READ MUST NOT LOOK LIKE AN ABSENT ROW, and here that distinction is not cosmetic --
   it decides whether "Edit profile" is an editor or a wipe. This used to return `.data` alone,
   discarding `error`, so a failed read resolved to `null` exactly like a brand-new account with no
   row yet. The caller's `if(!p) return` then left `profile` at the sign-in reset's empty values,
   and saveEdit PATCHes those unconditionally -- measured at seven columns overwritten
   (probe-edit-profile-wipes-after-a-failed-read.mjs).

   PGRST116 is `.single()` reporting ZERO ROWS. That is a real answer about the world, not a
   failure, and throwing on it would break every account whose row has not been created yet -- so
   it alone comes back as `null`. Everything else throws, which is the rule check:read-failures
   already enforces one file over in lib/db.js. */
export const getProfile = async (id) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
};
// Every cached reader of profiles (the same list lib/db.js keeps as profilesReaders — this file
// cannot import db.js without a cycle). Callers read the returned { data, error } as before.
const authProfileReaders = [["my-restricted"], ["people-you-may-know"], ["my-home-area"], ["discoverable-profiles"], ["profile-search"], ["climber-search"], ["full-profile"], ["profiles-by-ids"], ["contribution-standings"], ["open-route-flags"], ["policy-acceptance"], ["my-connections"], ["my-blocked"], ["is-admin"], ["open-appeals"]];
export const saveProfile = async (id, fields) => {
  const res = await supabase.from("profiles").update(fields).eq("id", id);
  if (!res.error) invalidateKeys(authProfileReaders);
  return res;
};

// "Remember me" — keep the session (Supabase persists it in localStorage by default,
// now explicit in supabase.js) AND remember the email so the login form pre-fills it,
// even after sign-out. We never store the password.
export const rememberEmail = (e) => { try { localStorage.setItem("cm_email", e || ""); } catch {} };
export const recallEmail   = () => { try { return localStorage.getItem("cm_email") || ""; } catch { return ""; } };

// Phase 3: Multi-Account Linking Support
// Allows users to link secondary accounts to a primary account

