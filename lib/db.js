// React Query hooks over the Phase-0 schema (areas + routes).
// These are the fetch-on-demand equivalents of reading MOUNTAINS/ROUTES from the bundle.
//
// THIS FILE IS THE ONE IMPORT PATH. Since the maintainability audit (2026-11-25) the code lives in
// lib/db-<domain>.js, one file per area of the app; this file re-exports every public name, so every
// `import { … } from "./lib/db.js"` in the app is unchanged. To find a function: `grep -n "function NAME" lib/db-*.js`.
// Guards that read the data layer as TEXT read it through readDbSource() (scripts/lib/guard-sources.mjs),
// which joins this file and every lib/db-*.js, so a guard never reads only the re-export list.
//
export {
  preferNetworkReads,
} from "./db-shared.js";
export {
  useAreaChildren, useAreaRoutes, CATALOG_STALE_MS, fetchRouteRow, useArea, useAreaPeakElevationsByIds,
  useAreaNamesByIds, stateIdOf, trailIdsOf, useAreaTrailsByIds, useAreaCardsByIds, useAreaEditRowsByIds,
} from "./db-catalog.js";
export {
  homeStatePath, regionOfPlace, regionAbbr, PLACE_REGION_LIST, knownRegion, groupRegionOf, splitTypedPlace,
  zipState, timeZoneStatePaths, useMyHomeStatePaths, findPlaces, usePlaceSearch, searchHomeTowns, useHomeTowns,
  ROUTE_PICK_LIM, searchRoutesFor, useRouteSearch,
} from "./db-search.js";
export {
  useAreaPath, useCragParkingAbove, useAreaPaths, useRoutesWithLists, useStateClassics, useCountries, useStates,
  fetchArea, fetchAreaBreadcrumb, fetchRouteArea, useSubtreeRoutes, useSubtreeRouteCount, useAreaSearch,
  useDeviceSearch, useDeviceSearchScope, searchCatalogAreas, useCatalogAreaSearch, useAreaPoint, areaSearchTotal,
  useNearbyPeaks, useNearbyAreas, useAreaFootprint, useScopedWishlistRoutes, useRoutesByIds,
} from "./db-catalog-more.js";
export {
  useRouteContributions, useAreaContributions, useAreaClassics, useAreaClimbStats, useCragRegular,
  useAreaLoggedMonths, useAreaLatestReports, useAreaLatestReportRows, useAreaChildrenDiscCounts,
  useAreaChildrenGradeCounts, REMOVAL_NOTE, submitContribution, withdrawMySunVotes, useRoutePairings,
  useRouteLoggedWith, useRouteLinkUps, submitRoutePairing, deleteRoutePairing, submitReport,
  useAreaTopContributors, useUserTopContribAreas, useLeaderboard, useRankBreakdown, useTopClimbs,
  useLogTagsForMe, respondToLogTag,
} from "./db-contributions.js";
export {
  useMyObjectives, useMyObjectiveSavedAt, useMyCrewSafetyAnswers, useCrewAlignment, useCrewReadyIds,
  saveCrewSafetyAnswers, markCrewSafetyReady, useVerifiedUsers, usePartnerSignals, usePartnerCounts,
  useReliabilityOf, useCrewRecap, useTripReportsAboutMe, useMyTripRecaps, submitTripReport, replyToTripReport,
  usePartnerGenders, usePartnerClimbGrades, usePartnerFreeUntil, useObjectiveCounts, saveObjective,
  removeObjective, useMySavedAreas, saveAreaRow, removeAreaRow, useCrewListings, useMyCrews, useCrewSharePreview,
  createCrew, updateCrewRow, proposeCrewDay, resolveMapLink, rankCrewDay, unproposeCrewDay, handOverCrew,
  setPastCrewState, useCrewRides, setMyFloatFiling, setMyCrewRide, shareCrewItinerary, addCrewMember,
  inviteToCrewByEmail, useCrewEmailInvites, deleteCrewEmailInvite, claimMyCrewEmailInvites,
  updateCrewMemberStatus, addCrewGearItem, assignCrewGear, setCrewGearCount, setCrewGearWanted,
  removeCrewGearItem, useCrewGearSync, pingCrewGear, removeCrewMember, withdrawCrewJoinRequest,
  withdrawCrewInvite, ackCrewDay, unackCrewDay, deleteCrewRow,
} from "./db-crews.js";
export {
  useDiscoverableProfiles, useMyZip, useZipCentroid, isUsernameFree, saveMyZip, useMyCondPrefs, saveMyCondPrefs,
  useMyTrackedLists, saveMyTrackedLists, useMyNotificationState, saveMyNotificationState, useClimberResume,
  saveClimberResume,
} from "./db-profile.js";
export {
  usePartnersNear, usePartnersByObjective, UNLISTABLE_AREA_TYPES, useMyPartnerAreas, savePartnerArea,
  addPartnerArea, removePartnerArea, useMyRouteListings, saveRouteListing, addRouteListing, removeRouteListing,
  usePartnersInAreas, usePartnersInArea, usePartnersForMyAreas, usePartnerAreaCounts, usePartnerAreaCount,
  usePartnerAreasOfUsers, useMatchObjectivesOfUsers, setDiscoverable, setPhotosPublic, useProfileSearch,
  useAreaAccessPoint, useMyCrewRequests, useMyCrewInvites, useCrewHasMessages, useMyContributions,
  useFullProfile, useProfilesByIds, fetchProfilesByIds,
} from "./db-partners.js";
export {
  dbRouteToCamel,
} from "./db-route-row.js";
export {
  useRouteTopos, useSavedMedia, useMediaSrc, useToggleSavedMedia, topoPhotoUrl, photoObjectPath,
  useAreaPhotoFeed, uploadAreaPhoto, uploadTopoPhoto, uploadProfilePhoto, saveProfilePhotos, uploadGroupPhoto,
  saveProfileAvatar, updateTopoAlt, updateTopoCaption, saveProfilePhotoAlts, removeProfilePhoto,
  savePinnedStates, removeProfileAvatar, uploadLogPhoto, submitRoutePhoto,
} from "./db-photos.js";
export {
  useMyFiledReports, useAdminQueueCounts, useMyPolicyAcceptance, acceptCurrentPolicy, reportContent,
  useMyStanding, fileAppeal, useRouteFieldConfidence, useContributionFields, useRouteRowsByIds,
  setRouteFieldConfidence, useFieldContributions, approveFieldContribution, rejectFieldContribution,
  useMyContributionStanding, useContributionStandings, setContributionStanding, fileRouteFlag, useOpenRouteFlags,
  resolveRouteFlag, useMyNotices, markNoticeRead, markNoticeUnread, deleteNotice, reportPhoto, photoStorageKey,
  deleteRoutePhoto, submitTopoLine, updateTopoLine, deleteTopoLine, deleteTopoPhoto,
  isAccountId, useSafetyReports, reviewUserReport, moderateContent, setAccountStanding, usePhotoReports,
  dismissPhotoReport, takeDownReportedPhoto, useSafetyAppeals,
} from "./db-moderation.js";
export {
  useMyLogPartnerNames, saveLogPartnerNames, useMyLogs, useClimberReports, useUserLogs, fetchTripReportById,
  useFriendsActivity, useKudosGiven, useKudosReceived, giveKudosRow, takeBackKudosRow, useRecentReportsOnRoutes,
  useRouteReportCounts, ROUTE_REPORTS_CAP, useRouteTripReports, useRoutePrivateConditions,
  useObjectivePrivateLogs, PACK_REPORT_LIMIT, packRouteWithSnapshot, PACK_PHOTO_LIMIT, usePackMeta,
  usePackMetaStrict, useLogTrack, ROUTE_TRACKS_CAP, useRouteTracks, createClimbLog, updateClimbLog,
  setAllMyTripReportVisibility, deleteClimbLog, useRouteHazardVotes, castHazardVote, useRouteDifficultyRatings,
  setDifficultyRating, useMyRouteRating, useRouteStarSummary, useRouteStats, recordRouteView, setRouteRating,
} from "./db-logs.js";
export {
  useMyConnections, sendConnectionRequest, respondToConnection, withdrawConnectionRequest, removeConnection,
  checkInAtRouteBase, withdrawBaseCheckin, useRouteBaseCheckins, useHeldBasePins, resolveBasePinHold, usePeopleYouMayKnow, useMutualConnections,
  useMyBlocked, blockUser, unblockUser, useMyRestricted, restrictUser, unrestrictUser, useUserVouches,
  useClimberVouches, giveVouch, updateVouch, revokeVouch, verifyMyEmail, useVerificationRecords,
} from "./db-social.js";
export {
  CHAT_VIDEO_MAX_BYTES, CHAT_VIDEO_TYPES, chatVideoProblem, uploadChatVideo, useChatVideoUrl, sendCrewMessage,
  sendDirectMessage, fetchOlderCrewMessages, fetchMyDirectMessages, fetchOlderDirectMessages, markDmThreadRead,
  fetchCrewLastReads, countCrewUnread, markCrewRead, useMyConversationState, setConversationState,
} from "./db-messaging.js";
export {
  publicNameOf, fetchComments, useComments, addComment, editComment, deleteComment, setCommentLike,
  setCommentReaction,
} from "./db-comments.js";
export {
  useMyGroups, useGroupById, DISCOVER_GROUPS_PAGE, useDiscoverGroups, useDiscoverGroupFacets,
  refreshGroupDiscovery, createGroupRow, updateGroupSettings, deleteGroupRow, joinGroupRow, useGroupJoinRequests,
  useMyGroupInvites, requestToJoinGroup, joinGroupViaRpc, inviteToGroup, acceptGroupInvite, approveGroupMember,
  withdrawGroupJoinRequest, leaveGroupRow, removeGroupComment, setGroupVisibility, setGroupMemberRole,
  withdrawGroupInvite, removeGroupMember, approveAllGroupRequests, declineGroupRequest, useMyGroupDeclines,
  useGroupBans, banGroupMember, unbanGroupMember, transferGroupOwnership, useMyGroupPrefs, setGroupPrefs,
  useMyGroupPostSaves, setGroupPostSaved, fileGroupReport, useGroupReports, closeGroupReport, useGroupFeed,
  createGroupPost, updateGroupPost, deleteGroupPost, setGroupPostReaction, useGroupEventsFor, createGroupEvents,
  deleteGroupEvent, deleteGroupEvents, updateGroupEvents, rsvpGroupEvent, declineGroupEventInvite,
  inviteToGroupEvent, useMyEventInvites,
} from "./db-groups.js";
export {
  useMyLists, createListRow, updateListRow, usePublicLists, useSharedList, useMyItineraries, saveItineraryRow,
} from "./db-lists.js";
export {
  useIsAdmin, useRouteProposals, approveNewRoute, submitNewArea, useAreaProposals, submitAreaPlacementClaim,
  useAreaPlacementClaims, resolveAreaPlacement, submitWallOrderSuggestion, useWallOrderSuggestions,
  useWallRoutesByAreaIds, resolveWallOrder, approveNewArea, rejectNewRoute, useProposalDuplicates,
  deleteMyAccount, raiseDataRequest, fileAccessibilityReport, useAccessibilityReportQueue,
  setAccessibilityReportStatus, fileAppFeedback, useAppFeedbackQueue, useAppRatingSummary, setAppFeedbackStatus,
  useGpsSubmissionQueue, reviewGpsSubmission, useCanReview, useModerationHistory, useFieldHistory,
  useDeskClimbers, useDeskClimber, setReviewer, withdrawApproval, useContributingAppeals, decideAppeal,
  useFieldLocks, useReviewWorklist, resolveWorklistItem, useDeskHealth,
} from "./db-admin.js";
export { profileCols, PROFILE_NAME_COLS } from "./profileCols";
