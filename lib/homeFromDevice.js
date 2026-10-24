// "Use my current location" for the HOME AREA a climber types during onboarding.
//
// The home area is a typed "City, ST" (profiles.location), not a coordinate, and the Privacy Policy
// promises exactly that -- so the device position is only ever a way to FILL that text in. It is
// rounded to two decimals (about a kilometre, the rounding "Near me now" uses) before it leaves the
// device, sent to the same place-name lookup the map search already calls (lib/mapKit.jsx), and
// never stored. What comes back is shown to the climber, editable, before anything is saved.
//
// Resolves { city, region, location, zip } -- `location` already in the editor's "City, ST" shape,
// `zip` a five-digit US zip or "" -- and rejects with a sentence the screen can print as it is.
import { US_ST, CA_PROV } from "../ClimbMatchCore.jsx";

const ask = () => new Promise(function (resolve, reject) {
  if (typeof navigator === "undefined" || !navigator.geolocation) { reject(new Error("This browser can’t share its location — type your town instead.")); return; }
  navigator.geolocation.getCurrentPosition(resolve, function (e) {
    reject(new Error(e && e.code === 1 ? "Location is turned off for ClimbMatch — type your town instead, or allow location in your browser settings." : "Couldn’t find where you are just now — type your town instead."));
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 });
});

// The two-letter code for a state or province NAME, from the same lists the profile editor offers.
const abbrOf = (name, iso) => {
  const m = /^(US|CA)-([A-Z]{2})$/.exec(iso || "");
  if (m) return m[2];
  const hit = US_ST.concat(CA_PROV).find(function (r) { return r[0].toLowerCase() === String(name || "").toLowerCase(); });
  return hit ? hit[1] : (name || "");
};

export async function homeFromDevice() {
  const pos = await ask();
  const lat = Math.round(pos.coords.latitude * 100) / 100, lng = Math.round(pos.coords.longitude * 100) / 100;
  let j;
  try {
    const r = await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=" + lat + "&lon=" + lng, { headers: { "Accept-Language": "en" } });
    if (!r.ok) throw new Error(String(r.status));
    j = await r.json();
  } catch (e) {
    throw new Error("Found you, but couldn’t look up the town name — check your connection, or type it instead.");
  }
  const a = (j && j.address) || {};
  const city = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || "";
  const region = abbrOf(a.state || a.province, a["ISO3166-2-lvl4"]);
  if (!city && !region) throw new Error("Couldn’t name the town you are in — type it instead.");
  // zoom=10 answers at city level, so a postcode is not always present; when it is, it is the
  // city's, which is what partner search measures between anyway (zip-code centres).
  const zip = a.country_code === "us" && /^[0-9]{5}/.test(a.postcode || "") ? String(a.postcode).slice(0, 5) : "";
  return { city, region, location: [city, region].filter(Boolean).join(", "), zip };
}
