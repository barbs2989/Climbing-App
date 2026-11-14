// The screens App (ClimbMatch.jsx) loads on demand, moved here from the top of ClimbMatch.jsx (PR61
// of the component extraction) so the tab bodies lifted out of App's render into src/components/
// share ONE lazy() object per screen with App, rather than each declaring its own.
import { lazy, Suspense, createElement } from "react";

export const RouteDetail = lazy(() => import("../RouteDetail.jsx"));
// Three screens moved out of the first-paint bundle (see lib/<Name>.jsx). None is on the
// Home tab, so a climber pays for them only when they open Partners, Ranks or Join a crew.
export const PartnerSearch = lazy(() => import("./PartnerSearch.jsx"));
export const Leaderboards = lazy(() => import("./Leaderboards.jsx"));
export const CrewFinder = lazy(() => import("./CrewFinder.jsx"));
// Six more, same reasoning: none renders on Home. The overlays fall back to a portalled scrim
// rather than an inline skeleton, since they draw over the screen rather than in it.
export const CrewCard = lazy(() => import("./CrewCard.jsx"));
export const MyPartnerAreas = lazy(() => import("./MyPartnerAreas.jsx"));
export const StartCrewSheet = lazy(() => import("./StartCrewSheet.jsx"));
export const ListsManager = lazy(() => import("./ListsManager.jsx"));
export const EditProfileScreen = lazy(() => import("./EditProfileScreen.jsx"));
// Eleven more, none on Home: the full-screen views (legal, calendar, inbox), the Logbook's
// climbs list and the crew safety plan fall back to a skeleton; the pop-ups to a portalled scrim.
export const LegalView = lazy(() => import("./LegalView.jsx"));
export const Calendar = lazy(() => import("./Calendar.jsx"));
export const Inbox = lazy(() => import("./Inbox.jsx"));
export const MyAscents = lazy(() => import("./MyAscents.jsx"));
export const SafetyTab = lazy(() => import("./SafetyTab.jsx"));
export const FloatPlans = lazy(() => import("./FloatPlans.jsx"));
export const Help = lazy(() => import("./Help.jsx"));
export const FriendsList = lazy(() => import("./FriendsList.jsx"));
export const GiveVouch = lazy(() => import("./GiveVouch.jsx"));
export const Onboarding = lazy(() => import("./Onboarding.jsx"));
export const ShareCard = lazy(() => import("./ShareCard.jsx"));
export const NotifPanel = lazy(() => import("./NotifPanel.jsx"));
export const AddRoute = lazy(() => import("./AddRoute.jsx"));
export const AreaSuggestFix = lazy(() => import("./AreaSuggestFix.jsx"));
export const AddArea = lazy(() => import("./AddArea.jsx"));
export const LogAscent = lazy(() => import("./LogAscent.jsx"));
export const TripReport = lazy(() => import("./TripReport.jsx"));
// The Fire map (lib/FireMap.jsx) is its own full-screen view over live federal
// wildfire + fire-weather data. Lazy because it pulls in nothing the rest of the
// app needs, and because most sessions never open it.
export const FireMap = lazy(() => import("./FireMap.jsx"));

// Seven tab bodies and sheets that are not on Today (the tab the app opens on), moved out of the
// first-paint bundle 2026-11-14 (owner: "anything else we can speed up in the app for users?"). Each
// carries its own Suspense, so the render sites in ClimbMatch.jsx are unchanged. The chunks are
// fetched while the browser is idle after the first screen paints (preloadTabScreens), so a tab
// switch normally finds them loaded and the empty fallback is never seen.
const tabLoaders = {
  LogbookTab: () => import("../src/components/LogbookTab.tsx"),
  MeTab: () => import("../src/components/MeTab.tsx"),
  GroupsTab: () => import("../src/components/GroupsTab.tsx"),
  CrewListView: () => import("../src/components/CrewListView.tsx"),
  CrewRequestsView: () => import("../src/components/CrewRequestsView.tsx"),
  Resume: () => import("../src/components/Resume.tsx"),
  SettingsPrivacySheet: () => import("../src/components/SettingsPrivacySheet.tsx"),
};
// A lazy component that brings its own Suspense (empty fallback), for render sites that cannot
// easily be wrapped. preloadWhenIdle starts the chunk download once the browser is idle.
export function suspended(load) {
  const L = lazy(load);
  return function LazyScreen(props) { return createElement(Suspense, { fallback: null }, createElement(L, props)); };
}
export function preloadWhenIdle(load) {
  if (typeof window === "undefined") return;
  const go = () => { load().catch(() => {}); };
  if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
}
export const LogbookTab = suspended(tabLoaders.LogbookTab);
export const MeTab = suspended(tabLoaders.MeTab);
export const GroupsTab = suspended(tabLoaders.GroupsTab);
export const CrewListView = suspended(tabLoaders.CrewListView);
export const CrewRequestsView = suspended(tabLoaders.CrewRequestsView);
export const Resume = suspended(tabLoaders.Resume);
export const SettingsPrivacySheet = suspended(tabLoaders.SettingsPrivacySheet);
// The route page's Suggest-a-fix form (88 KB, the largest piece of the RouteDetail chunk) renders
// only once a climber taps it. RouteDetail calls preloadSuggestFix when its chunk loads, so the
// form downloads while the browser is idle and the tap normally finds it ready.
const loadSuggestFix = () => import("../src/components/SuggestFix.tsx");
export const SuggestFix = suspended(loadSuggestFix);
export function preloadSuggestFix() { preloadWhenIdle(loadSuggestFix); }
let preloaded = false;
export function preloadTabScreens() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  // A failed preload is harmless: the tab's own lazy() retries on open, and main.jsx's
  // vite:preloadError handler reloads onto the new build if a deploy replaced the chunk.
  for (const load of Object.values(tabLoaders)) preloadWhenIdle(load);
}
