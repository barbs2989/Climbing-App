#!/usr/bin/env node
// HOW FAR OFF IS THE CALENDAR'S SUNRISE? Open-Meteo's ephemeris against sunRiseSet() — and against
// the estimate it replaced (solar noon ± half the day length), kept here so the size of the defect
// is reproducible rather than quoted.
//
// Prints one line per point and date and, last, the table scripts/check-sun-times.mjs embeds
// (`[place, lat, lng, date, sunrise unix s, sunset unix s]`), so the guard's reference can be
// refreshed by pasting. ASK FOR UNIX TIME, NOT LOCAL TIME: the API's local-time form stamps the
// whole response with the offset of the day it is asked on, so a December row fetched in October
// came back an hour late. Absolute seconds have no offset to get wrong.
//
// Network (public API, read-only), no database, no browser.
//   node scripts/oneoff/probe-sun-times-vs-open-meteo.mjs
process.env.TZ = "America/Los_Angeles";
import { sunRiseSet } from "../../lib/conditionsScore.js";

const PTS = [["Seattle", 47.61, -122.33], ["Leavenworth", 47.60, -120.66], ["Mount Rainier", 46.85, -121.76], ["Mount Shuksan", 48.83, -121.60]];
const DATES = ["2026-06-21", "2026-09-28", "2025-12-21", "2026-03-08"];

// The estimate the Calendar printed until 2026-10-07, verbatim in substance.
function oldSunTimes(lat, date) { const d = new Date(date + "T12:00:00"); const start = new Date(d.getFullYear(), 0, 0); const doy = Math.floor((d - start) / 86400000); const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (doy - 81) / 365); const latR = lat * Math.PI / 180; const cosH = -Math.tan(latR) * Math.tan(decl); if (cosH > 1 || cosH < -1) return null; const dl = 2 * Math.acos(cosH) * 180 / Math.PI / 15; return { sunrise: 12 - dl / 2, sunset: 12 + dl / 2 }; }
const localHours = (d) => d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
const clock = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const rows = [];
for (const [name, lat, lng] of PTS) for (const date of DATES) {
  const j = await (await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=sunrise,sunset&timezone=America%2FLos_Angeles&timeformat=unixtime&start_date=${date}&end_date=${date}`)).json();
  if (!j.daily) throw new Error(`${name} ${date}: ${JSON.stringify(j).slice(0, 200)}`);
  const riseS = j.daily.sunrise[0], setS = j.daily.sunset[0];
  const ref = { rise: new Date(riseS * 1000), set: new Date(setS * 1000) };
  const now = sunRiseSet(lat, lng, date), old = oldSunTimes(lat, date);
  const offNew = [Math.round((now.sunrise - ref.rise) / 60000), Math.round((now.sunset - ref.set) / 60000)];
  const offOld = old ? [Math.round((old.sunrise - localHours(ref.rise)) * 60), Math.round((old.sunset - localHours(ref.set)) * 60)] : ["–", "–"];
  console.log(`${name.padEnd(14)} ${date}  ephemeris ${clock(ref.rise)}–${clock(ref.set)}   sunRiseSet off ${offNew[0]}/${offNew[1]} min   old estimate off ${offOld[0]}/${offOld[1]} min`);
  rows.push([name, lat, lng, date, riseS, setS]);
}
console.log("\nreference table for scripts/check-sun-times.mjs:");
for (const r of rows) console.log("  " + JSON.stringify(r) + ",");
