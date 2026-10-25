// The app's one Supabase auth listener. AuthProvider wraps the whole app (main.jsx), and any screen
// reads who is signed in through useAuth() instead of starting its own subscription.
//
// `user` is the signed-in account or null; `loading` is true only until the stored session has been
// read, so a screen can tell "not signed in" from "not known yet". login and logout are the existing
// lib/auth.js calls: they change nothing here directly. The listener is what updates `user`, which
// keeps a sign-in or sign-out from any tab, or a token refresh, on one code path.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { signIn, signOut } from "../lib/auth";

export interface AuthState {
  user: User | null;
  loading: boolean;
  login: typeof signIn;
  logout: typeof signOut;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = not read yet; null = signed out; object = signed in
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    let gotEvent = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!gotEvent) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      gotEvent = true;
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? null,
    loading: session === undefined,
    login: signIn,
    logout: signOut,
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}
