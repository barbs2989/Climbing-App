// Which `profiles` columns a client may select, and under what key (0431). No imports, so
// scripts/check-profile-privacy.mjs can run these exact strings against a replayed database.
//
// `profiles` is read through column grants, so a select("*") or a column the role may not read
// fails the whole request with "permission denied". Three columns are the OWNER's only: `name`,
// `photos` and `photo_alts`. Everyone else reads their privacy-applied twins (public_name is null
// unless show_name; public_photos is empty unless photos_public), selected under the same keys so
// every consumer keeps reading `.name` / `.photos`. Signed-out visitors also cannot read the
// partner-matching and résumé columns in SIGNED_IN_PROFILE_COLS. Your OWN full row comes from
// rpc("my_profile").
//
// A column added to profiles later is readable by no client until a migration grants it; add it
// here only after that grant exists, and to SIGNED_IN_PROFILE_COLS if only signed-in readers get it.
export const PROFILE_ALIASES = { name: "name:public_name", photos: "photos:public_photos", photo_alts: "photo_alts:public_photo_alts" };
export const SIGNED_IN_PROFILE_COLS = new Set(["location", "availability", "avail_week", "free_until", "gender", "climb_grades", "hiking_speed_ft_hr", "discoverable", "certifications", "cert_expiry", "skills", "belay_devices"]);

// A PostgREST select list for someone else's profile: owner-only columns swapped for their public
// twins, and the signed-in-only columns dropped for a signed-out reader.
export function profileCols(cols, signedIn) {
  return cols.split(",").map((c) => c.trim()).filter(Boolean)
    .filter((c) => signedIn || !SIGNED_IN_PROFILE_COLS.has(c))
    .map((c) => PROFILE_ALIASES[c] || c).join(",");
}

// Every column the partner card reads. Kept in one place because the card scores a
// candidate with compat(), and a column missing from the SELECT does not read as missing
// data — it reads as an unknown, which silently downgrades a complete profile.
// `show_name` is on every list that becomes a CLIMBER OBJECT, because pubName() decides between
// the display name and the @handle from it — a select that omits it makes the column arrive
// undefined, which reads as false, which silently ignores the climber's own setting.
// availability / avail_week / hiking_speed_ft_hr (0209) are two of the four signals compat() scores;
// without them every real row counted as "not enough shared info". partners_near returns the same three.
export const PARTNER_COLS = "id,name,username,avatar,bio,location,disciplines,sport_grade,trad_grade,boulder_grade,show_name,resume_public,availability,avail_week,hiking_speed_ft_hr,free_until,gender,climb_grades";

// Every column another climber may read of a profile, for the full profile modal.
export const FULL_PROFILE_COLS = "id,username,name,avatar,bio,sport_grade,trad_grade,boulder_grade,disciplines,level,climbing_since,created_at,show_name,photos_public,photos,photo_alts,resume_public,show_on_ranks,location,availability,avail_week,free_until,gender,climb_grades,hiking_speed_ft_hr,discoverable,certifications,cert_expiry,skills,belay_devices";

// The columns every message reader embeds for its sender, in ONE place. The three Realtime
// handlers in ClimbMatch.jsx used to select only id,name,avatar, so a message that arrived live
// reached pubNameRow() without `username`/`show_name` and was labelled with a slug of the real
// name. `name:public_name`: the real name is owner-only since 0431.
export const PROFILE_NAME_COLS = "id,name:public_name,avatar,username,show_name";
