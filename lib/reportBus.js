// One way to open the content-report sheet from anywhere.
//
// The sheet lives in App (it needs the session, the toast and the block action), but the things a
// climber reports are drawn by shared components — Comments is mounted in eleven places across
// ClimbMatch.jsx, RouteDetail.jsx and lib/TripReport.jsx, MessageRow in two — and threading an
// `onReport` prop through every one of those is how a mount gets missed. App registers the opener
// once; a component asks `canReportContent()` before drawing a Report control, so a signed-out or
// seed session (where report_content() would refuse) shows no control rather than one that fails.
//
// A target is { kind, id, label? }: `kind` is one report_content() accepts (0263), `id` the row id.
let opener = null;

export function setContentReportOpener(fn) { opener = typeof fn === "function" ? fn : null; }
export function canReportContent() { return !!opener; }
export function openContentReport(target) { if (opener && target && target.kind && target.id) opener(target); }

// The other direction (0264): the AUTHOR of taken-down content asks ClimbMatch Safety to look again.
// Same shape and same reason -- the "Removed by ClimbMatch Safety" note is drawn inside shared
// components (MessageRow, Comments) that should not need an onAppeal prop at every mount.
let appealOpener = null;
export function setAppealOpener(fn) { appealOpener = typeof fn === "function" ? fn : null; }
export function canAppeal() { return !!appealOpener; }
export function openAppeal(target) { if (appealOpener && target && target.kind) appealOpener(target); }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Only a row the database holds can be reported; seed content has integer or string ids.
export function isDbRowId(id) { return typeof id === "string" && UUID.test(id); }
