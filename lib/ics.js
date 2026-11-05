// ADD TO CALENDAR (competitor review batch A, item 6, owner 2026-11-04): an agreed crew day as a
// one-day calendar event the phone or desktop calendar opens — Meetup and Strava clubs hand out
// the same .ics file. An ALL-DAY event (DTSTART;VALUE=DATE): a crew agrees a DAY, and the meeting
// time, when set, goes into the description rather than pinning a timed event the climbers may
// change. Nothing here reaches a server: the file is built in the browser and handed to the
// download, the way gpxDownload hands out a track.
const esc = s => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => "\\" + m);
const ymd = d => String(d).slice(0, 10).replace(/-/g, "");
const nextDay = d => { const t = new Date(String(d).slice(0, 10) + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10).replace(/-/g, ""); };
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** The .ics text for one all-day event. `date` is YYYY-MM-DD. */
export function buildIcs({ title, date, location, description, uid }) {
  if (!date || !/^\d{4}-\d{2}-\d{2}/.test(String(date))) return "";
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ClimbMatch//Crew day//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + (uid || (ymd(date) + "-" + Math.random().toString(36).slice(2, 10))) + "@climbmatch",
    "DTSTAMP:" + stamp(),
    "DTSTART;VALUE=DATE:" + ymd(date),
    "DTEND;VALUE=DATE:" + nextDay(date),
    "SUMMARY:" + esc(title || "Climbing day"),
  ];
  if (location) lines.push("LOCATION:" + esc(location));
  if (description) lines.push("DESCRIPTION:" + esc(description));
  lines.push("END:VEVENT", "END:VCALENDAR");
  // RFC 5545 folds lines past 75 octets; every line here is folded at 70 characters to stay inside it.
  return lines.map(l => l.length <= 70 ? l : l.match(/.{1,70}/g).join("\r\n ")).join("\r\n") + "\r\n";
}

/** Hand the event to the browser as a download. Returns false when there was nothing to build. */
export function downloadIcs(ev) {
  const text = buildIcs(ev);
  if (!text) return false;
  try {
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = String(ev.title || "climb").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") + ".ics";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch { return false; }
}
