// Full-accounts auth — Phase 1. Session + profile helpers over Supabase Auth.
import { useEffect, useState } from "react";
import { supabase, RECOVERY_LINK } from "./supabase";

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
export const signUp  = (email, password, name) =>
  supabase ? supabase.auth.signUp({ email, password, options: { data: { name } } }) : NO_DB;
export const signIn  = (email, password) =>
  supabase ? supabase.auth.signInWithPassword({ email, password }) : NO_DB;
export const signOut = () => supabase ? supabase.auth.signOut() : NO_DB;

// Password recovery. An account is the only way into the app, so without these a climber who
// forgets their password has no way back in at all -- there is no guest mode to fall back to.
//
// `redirectTo` must be on Supabase's Auth redirect allow-list or the mail is sent with the
// project's Site URL instead and the link lands somewhere that cannot complete the reset.
export const resetPasswordRedirect = () =>
  typeof window === "undefined" ? "" : window.location.origin + (import.meta.env.BASE_URL || "/");
export const requestPasswordReset = (email) =>
  supabase ? supabase.auth.resetPasswordForEmail(email, { redirectTo: resetPasswordRedirect() }) : NO_DB;
export const updatePassword = (password) =>
  supabase ? supabase.auth.updateUser({ password }) : NO_DB;

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
export const getProfile  = async (id) =>
  (await supabase.from("profiles").select("*").eq("id", id).single()).data;
export const saveProfile = (id, fields) =>
  supabase.from("profiles").update(fields).eq("id", id);

// "Remember me" — keep the session (Supabase persists it in localStorage by default,
// now explicit in supabase.js) AND remember the email so the login form pre-fills it,
// even after sign-out. We never store the password.
export const rememberEmail = (e) => { try { localStorage.setItem("cm_email", e || ""); } catch {} };
export const recallEmail   = () => { try { return localStorage.getItem("cm_email") || ""; } catch { return ""; } };

// Phase 3: Multi-Account Linking Support
// Allows users to link secondary accounts to a primary account

// Get all linked profiles for the current user (Phase 3)
export const getLinkedProfiles = async (userId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .rpc('get_linked_profiles', { user_id: userId });
  if (error) console.error('Error fetching linked profiles:', error);
  return data;
};

// Link a secondary account to the primary account (Phase 3)
export const linkSecondaryAccount = async (primaryId, secondaryId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('account_links')
    .insert({ primary_id: primaryId, secondary_id: secondaryId, status: 'pending' });
  if (error) console.error('Error linking accounts:', error);
  return { data, error };
};

// Confirm account link and merge data (Phase 3)
export const confirmAccountLink = async (primaryId, secondaryId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .rpc('merge_accounts', { primary_id: primaryId, secondary_id: secondaryId });
  if (error) console.error('Error merging accounts:', error);
  return { data, error };
};

// Revoke an account link (Phase 3)
export const revokeAccountLink = async (primaryId, secondaryId) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('account_links')
    .update({ status: 'revoked' })
    .eq('primary_id', primaryId)
    .eq('secondary_id', secondaryId);
  if (error) console.error('Error revoking account link:', error);
  return { data, error };
};

// Phase 4: Simultaneous Login Support
// Track and manage multiple active sessions

// Get current active sessions (Phase 4)
export const getActiveSessions = async () => {
  if (!supabase) return [];
  const session = await supabase.auth.getSession();
  if (!session.data.session) return [];

  // Return primary session + linked secondary session if available
  const linked = localStorage.getItem('cm_linked_session');
  return [session.data.session, linked ? JSON.parse(linked) : null].filter(Boolean);
};

// Store linked session in localStorage (Phase 4)
export const storeLinkedSession = (session) => {
  try {
    localStorage.setItem('cm_linked_session', JSON.stringify(session));
  } catch (e) {
    console.error('Error storing linked session:', e);
  }
};

// Clear linked session (Phase 4)
export const clearLinkedSession = () => {
  try {
    localStorage.removeItem('cm_linked_session');
  } catch (e) {
    console.error('Error clearing linked session:', e);
  }
};

// Utility: Check if account is primary or secondary
export const isPrimaryAccount = async (userId) => {
  const profile = await getProfile(userId);
  return !profile || profile.account_type !== 'secondary';
};
