import { Suspense } from "react";
import type { Dispatch, SetStateAction } from "react";
import OverlaySkeleton from "./OverlaySkeleton.tsx";
import { C, FALLBACK_AV } from "../../ClimbMatchCore.jsx";
import { Onboarding } from "../../lib/lazyScreens.js";
import { saveNotifPrefs } from "../../lib/notif-pref";
import { saveMyZip } from "../../lib/db";
import { saveProfile } from "../../lib/auth";

/* onboardOpen&& — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
interface OnboardingSheetProfile { avatar?: string | null; [k: string]: unknown }
interface OnboardingSheetSession { user?: { user_metadata?: { avatar_url?: string; picture?: string } | null } | null }
/** What Onboarding hands back on finish. */
interface OnboardingSheetResult { homeArea?: string; disciplines: string[]; sportGrade?: string; tradGrade?: string; boulderGrade?: string; climbGrades?: Record<string, unknown>; gender?: string; zip?: string }
export interface OnboardingSheetProps {
  myZipQ: { refetch: () => unknown };
  notifPrefs: Record<string, unknown>;
  onboarded: boolean;
  profile: OnboardingSheetProfile;
  session: OnboardingSheetSession | null;
  setDiscSel: Dispatch<SetStateAction<string[]>>;
  setHelpOpen: (v: boolean) => void;
  setNotifPrefs: Dispatch<SetStateAction<Record<string, unknown>>>;
  setOnboardOpen: (v: boolean) => void;
  setOnboarded: (v: boolean) => void;
  setProfile: Dispatch<SetStateAction<OnboardingSheetProfile>>;
  showToast: (t: string, d?: number) => void;
  uid: string | null | undefined;
}
export default function OnboardingSheet({myZipQ,notifPrefs,onboarded,profile,session,setDiscSel,setHelpOpen,setNotifPrefs,setOnboardOpen,setOnboarded,setProfile,showToast,uid}: OnboardingSheetProps){
  return <Suspense fallback={<OverlaySkeleton C={C} label="Loading…"/>}><Onboarding initial={profile} uid={uid} googlePhoto={(session&&session.user&&session.user.user_metadata&&(session.user.user_metadata.avatar_url||session.user.user_metadata.picture))||""} avatarNow={profile.avatar&&profile.avatar!==FALLBACK_AV?profile.avatar:""} onAvatarChange={function(url: string | null | undefined){setProfile(function(pp){return Object.assign({},pp,{avatar:url||""});});}} notifPrefs={notifPrefs} onNotifChange={function(k: string,v: unknown){setNotifPrefs(function(p){const n=Object.assign({},p);n[k]=v;saveNotifPrefs(n);return n;});}} onFinish={(pr: OnboardingSheetResult)=>{const wasOn=onboarded;/* Merge, never replace: Onboarding returns only homeArea/disciplines/grades, so assigning it wholesale wiped name, username, bio, location, level, avatar, certifications and skills. An undefined level then blanked the app at LVL[ME.level]. *//* `zip` is not profile state (it lives in the owner-only profile_zips); `location` is what the profile header reads, so the home area just typed shows without a reload. */setProfile(p=>Object.assign({},p,{homeArea:pr.homeArea,disciplines:pr.disciplines,sportGrade:pr.sportGrade,tradGrade:pr.tradGrade,boulderGrade:pr.boulderGrade,climbGrades:pr.climbGrades||p.climbGrades,gender:pr.gender||""},pr.homeArea?{location:pr.homeArea}:{}));setOnboarded(true);setOnboardOpen(false);if(pr.disciplines.length)setDiscSel(pr.disciplines);/* ONBOARDING WROTE NOTHING, AND IT IS THE FIRST THING A NEW CLIMBER DOES. It collects home area,
     disciplines and the three grades -- every one of which HAS a profiles column and IS read back by
     the sign-in hydration -- and then only called setProfile, so "You're all set" was true until the
     next reload. saveEdit has always persisted exactly these fields; this path had forked, the same
     shape as the trip report's connect button and the group-invite accept. The payload and its
     failure copy are the SAME ONES saveEdit uses, so the two cannot drift.
     `homeArea` is the `location` column -- Onboarding seeds that field from ME.location. */
  if(uid&&pr.zip){saveMyZip(uid,pr.zip).then(function(){myZipQ.refetch();}).catch(function(e){showToast((e&&e.message&&/zip/i.test(e.message)?e.message:"Couldn’t save your zip code")+" — add it from Edit profile.");});}
  if(uid){saveProfile(uid,{location:pr.homeArea,/* 0359 */gender:pr.gender||null,disciplines:pr.disciplines,sport_grade:pr.sportGrade||null,trad_grade:pr.tradGrade||null,boulder_grade:pr.boulderGrade||null,climb_grades:(pr.climbGrades&&Object.keys(pr.climbGrades).length)?pr.climbGrades:null}).then(function(r){if(r&&r.error)showToast("Saved on this device — cloud sync failed, will retry next edit");}).catch(function(){showToast("Saved on this device — cloud sync failed, will retry next edit");});}
  /* SAY WHICH ONE HAPPENED. Signed out there is no write, and a bare "Profile updated" is exactly the claim check:claims exists to stop; the wording is saveEdit's own. The first-run greeting is not a persistence claim and keeps its words. */showToast(wasOn?("Profile updated"+(uid?"":" on this device — sign in to keep it")):"You’re all set — let’s find your people!");if(!wasOn)setHelpOpen(true);}} onSkip={()=>setOnboardOpen(false)} onHelp={()=>{setOnboardOpen(false);setHelpOpen(true);}}/></Suspense>;
}
