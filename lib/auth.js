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
export const signUp  = (email, password, name) =>
  supabase.auth.signUp({ email, password, options: { data: { name } } });
export const signIn  = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export const getProfile  = async (id) =>
  (await supabase.from("profiles").select("*").eq("id", id).single()).data;
export const saveProfile = (id, fields) =>
  supabase.from("profiles").update(fields).eq("id", id);
