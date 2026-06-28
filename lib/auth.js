// Full-accounts auth — Phase 1. Session + profile helpers over Supabase Auth.
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// undefined = still loading; null = signed out; object = signed in
export function useSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}
const NO_DB = Promise.resolve({ data: null, error: { message: "Accounts are not available in this build." } });
export const signUp  = (email, password, name) =>
  supabase ? supabase.auth.signUp({ email, password, options: { data: { name } } }) : NO_DB;
export const signIn  = (email, password) =>
  supabase ? supabase.auth.signInWithPassword({ email, password }) : NO_DB;
export const signOut = () => supabase ? supabase.auth.signOut() : NO_DB;
export const getProfile  = async (id) =>
  (await supabase.from("profiles").select("*").eq("id", id).single()).data;
export const saveProfile = (id, fields) =>
  supabase.from("profiles").update(fields).eq("id", id);

// "Remember me" — keep the session (Supabase persists it in localStorage by default,
// now explicit in supabase.js) AND remember the email so the login form pre-fills it,
// even after sign-out. We never store the password.
export const rememberEmail = (e) => { try { localStorage.setItem("cm_email", e || ""); } catch {} };
export const recallEmail   = () => { try { return localStorage.getItem("cm_email") || ""; } catch { return ""; } };
