// The screens App (ClimbMatch.jsx) loads on demand, moved here from the top of ClimbMatch.jsx (PR61
// of the component extraction) so the tab bodies lifted out of App's render into src/components/
// share ONE lazy() object per screen with App, rather than each declaring its own.
import { lazy } from "react";

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
export const BestDayTile = lazy(() => import("./BestDayTile.jsx"));
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
