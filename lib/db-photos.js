// lib/db-photos.js — topos and photos: uploads, alt text, captions, device-saved media.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateKeys, patchQueries } from "./queryClientRef";
import { supabase } from "./supabase";
import { mediaObjectUrl, offlineSavedTopos, removeMediaOffline, saveMediaOffline, savedMediaList } from "./offline";
import { photoUploadOptions, preparePhotoForUpload } from "./photoUpload";
import { warmThumbs } from "./photoThumb";
import { orOfflineExact } from "./db-shared.js";
import { submitContribution } from "./db-contributions.js";
import { profilesReaders } from "./db-partners.js";
import { photoStorageKey } from "./db-moderation.js";

// ── Topos (route-overlay photos) — see docs/BACKEND.md §9 and migrations 0026, 0364. ──
// A topo belongs to the ROUTE page it was posted from (topos.route_id, 0364): an alpine route's
// area is the whole peak, so reading by area showed a north-face photo on every south-side route.
// area_id is still written — contribution points (0333) credit a topo to its area.
// Applies to every discipline, not just pitched rock.

// This route's topo photos, each with its topo_lines rows. The caller picks the most-recent line
// as canonical and older ones as alternates.
// No signal: the topos this climber SAVED for the route (lib/offline.js), stamped `_savedFrom: "media"`
// so the section can say these are the saved ones, not all of them. structuralSharing off so the
// stamp survives. Nothing saved = the network error stands.
export function useRouteTopos(routeId, areaId) {
  return useQuery({
    queryKey: ["route-topos", routeId],
    enabled: !!supabase && !!routeId,
    structuralSharing: false,
    queryFn: () => orOfflineExact(async () => {
      const { data, error } = await supabase
        .from("topos").select("*, topo_lines(*)").eq("route_id", routeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }, () => offlineSavedTopos(areaId, routeId)),
  });
}

// ── photos and topos saved to this device, one at a time ────────────────────
// Device-only, so these run with or without a backend.
export function useSavedMedia() {
  return useQuery({ queryKey: ["saved-media"], queryFn: savedMediaList, staleTime: 0 });
}
// The on-device copy of an image when there is one, else the URL itself. A saved image is read from
// the device even with a signal: it is the same picture, and it costs no data.
export function useMediaSrc(url) {
  const q = useQuery({ queryKey: ["media-src", url], enabled: !!url && /^https?:/.test(url || ""), queryFn: () => mediaObjectUrl(url), staleTime: Infinity });
  return (q.data) || url;
}
export function useToggleSavedMedia() {
  const qc = useQueryClient();
  const done = (url) => { qc.invalidateQueries({ queryKey: ["saved-media"] }); qc.invalidateQueries({ queryKey: ["media-src", url] }); };
  return {
    save: async (entry) => { await saveMediaOffline(entry); done(entry.url); },
    remove: async (url) => { await removeMediaOffline(url); done(url); },
  };
}

// Public URL for a topo-photos storage path (the bucket is public — no signed URL needed).
export function topoPhotoUrl(storagePath) {
  if (!supabase || !storagePath) return null;
  return supabase.storage.from("topo-photos").getPublicUrl(storagePath).data.publicUrl;
}

// Uploads a new wall photo and records it. Path is {uid}/{uuid}-{filename} so
// storage RLS (migration 0026) can gate writes by the first path segment.
// A photo description (WCAG 1.1.1): trimmed, capped at the column's 300, and `null` when blank,
// so an undescribed photo stores nothing rather than an empty string that reads like an answer.
function cleanAlt(alt) {
  const d = String(alt == null ? "" : alt).trim();
  return d ? d.slice(0, 300) : null;
}

// The object's path in the bucket: {uid}/{uuid}-{name}. The name is the photo's own, REDUCED to
// letters, digits, - and _ : Storage refuses a key holding anything outside a short ASCII set
// ("Invalid key"), and a phone or a desktop names a photo however it likes -- an accent, a space that
// is not a plain space (a Mac screenshot's), a #. The uuid already makes the path unique, so the
// name is only there to be read by a person.
export function photoObjectPath(uid, file) {
  const raw = String((file && file.name) || "photo");
  const dot = raw.lastIndexOf(".");
  const ext = dot > 0 ? raw.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : "";
  const base = (dot > 0 ? raw.slice(0, dot) : raw).normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "photo";
  return `${uid}/${crypto.randomUUID()}-${base}${ext ? "." + ext : ""}`;
}

// Every cached reader of topos, refreshed after each write to it (check:write-readers). A topo and a
// line drawn on one score contribution points (0333), so the RPC readers of that score are listed too.
export const toposReaders = [["route-topos"], ["area-photo-feed"], ["area-contributors"], ["user-top-contrib-areas"], ["leaderboard"]];

// AREA PHOTO STRIP (0411, scoped by 0541): photos show only on a SPECIFIC place (a crag, wall, boulder or
// peak, or a small area grouping them), never on a general area like North Cascades or a state (owner note,
// 2026-11-25). `area_photos` answers { place, photos }; `place` false means the page draws no strip. The
// photos are the area's own plus every topo AND every Photos-tab route photo (a contributions row of kind
// 'photo') posted on a climb under it, newest first, each with its public URL.
export function useAreaPhotoFeed(areaId) {
  return useQuery({
    queryKey: ["area-photo-feed", areaId],
    enabled: !!supabase && !!areaId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_photos", { p_area_id: areaId, p_limit: 40 });
      if (error) throw error;
      const d = data || {};
      const photos = (Array.isArray(d.photos) ? d.photos : []).map(p => ({ ...p, url: p.storage_path ? topoPhotoUrl(p.storage_path) : (typeof p.url === "string" && p.url ? p.url : null) }));
      return { place: !!d.place, photos };
    },
  });
}
// A photo posted to an AREA page (0411): a topos row with no route and area_photo set. Same bucket,
// path rule, preparation and description as uploadTopoPhoto.
export async function uploadAreaPhoto(areaId, file, alt) {
  if (!supabase) return null;
  if (!areaId) throw new Error("An area photo is added from an area page.");
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a photo.");
  file = await preparePhotoForUpload(file);
  const path = photoObjectPath(uid, file);
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file, photoUploadOptions(file));
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("topos").insert({ area_id: areaId, route_id: null, area_photo: true, storage_path: path, alt: cleanAlt(alt) }).select().single();
  if (error) throw error;
  invalidateKeys(toposReaders);
  return data;
}
export async function uploadTopoPhoto(areaId, routeId, file, alt) {
  if (!supabase) return null;
  if (!routeId) throw new Error("A topo photo is added from a route page.");
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a topo photo.");
  // The location the camera saved inside the photo is removed first (this bucket is public), and the photo is scaled down to screen size.
  file = await preparePhotoForUpload(file);
  const path = photoObjectPath(uid, file);
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file, photoUploadOptions(file));
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("topos").insert({ area_id: areaId, route_id: routeId, storage_path: path, alt: cleanAlt(alt) }).select().single();
  // The file is already in the (public) bucket: a refused row would leave it there, shown nowhere and
  // removable by nobody. Take it back down; the refusal is what the climber is told either way.
  if (error) { await supabase.storage.from("topo-photos").remove([path]).catch(() => {}); throw error; }
  invalidateKeys(toposReaders);
  return data;
}

// Uploads a trip-report photo, reusing the topo-photos bucket/RLS (same
// {uid}/{uuid}-{filename} path convention as uploadTopoPhoto) rather than
// standing up a separate bucket + migration for climb_logs.photos.
// A climber's own profile photo — their avatar, or one of the shots on their profile strip.
//
// Both used to be `URL.createObjectURL(file)`, and the avatar's PERSISTED: measured on the live
// project, `profiles.avatar` held `blob:https://…/b1ac7240-…`, an in-memory handle that
// resolves to nothing for the owner after a reload and to nothing for anybody else, ever. The
// photo strip had it worse — no `photos` column existed, so the value went to React state and
// the screen toasted "Photo added ✓" over nothing at all (0173 adds the column).
//
// Same bucket, path convention and limits as every other photo in the app: `topo-photos`,
// `{uid}/{uuid}-{name}` so 0026's storage RLS gates writes by the first path segment, and
// 0150's 15 MiB / five-image-type cap. A separate avatars bucket would need all three of those
// decided again for no gain.
export async function uploadProfilePhoto(file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a profile photo other climbers can see.");
  // The location the camera saved inside the photo is removed first (this bucket is public), and the photo is scaled down to screen size.
  file = await preparePhotoForUpload(file);
  const path = photoObjectPath(uid, file);
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file, photoUploadOptions(file));
  if (upErr) throw upErr;
  const url = topoPhotoUrl(path);
  if (!url) throw new Error("The photo uploaded but its address could not be resolved.");
  // The Profile tab draws it the moment it lands; resize it now, not on that first look.
  warmThumbs(url);
  return url;
}

// Persist the profile photo strip, and ONLY that column.
//
// Deliberately not routed through `saveProfile`, which PATCHes whatever object it is handed:
// the strip holds no draft of the rest of the profile, and handing that write a partial object
// is precisely the shape check:profile-edit-gate exists for — seven columns emptied because a
// caller sent fields it had never loaded. One column in, one column out.
//
// Throws on failure rather than resolving, so the caller can keep its success message behind a
// write that actually landed.
export async function saveProfilePhotos(userId, photos) {
  if (!supabase) return null;
  if (!userId) throw new Error("Sign in to save your profile photos.");
  const { data, error } = await supabase
    .from("profiles").update({ photos: photos || [] }).eq("id", userId).select("id").single();
  if (error) throw error;
  invalidateKeys(profilesReaders);
  return data;
}

// A GROUP's avatar or cover photo (0454). Uploaded the way a profile photo is -- same bucket, the
// uploader's {uid}/ prefix, the camera's location stripped -- and only its address is returned: the
// group row takes it when the form is saved, and 0454's check refuses any address outside this bucket.
export async function uploadGroupPhoto(file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a group photo other climbers can see.");
  file = await preparePhotoForUpload(file);
  const path = photoObjectPath(uid, file);
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file, photoUploadOptions(file));
  if (upErr) throw upErr;
  const url = topoPhotoUrl(path);
  if (!url) throw new Error("The photo uploaded but its address could not be resolved.");
  warmThumbs(url);
  return url;
}

// Persist the AVATAR the moment its upload lands, and ONLY that column.
//
// The avatar used to wait for the editor's Save, and two ordinary moves lost it after the file had
// already uploaded: Cancel (the editor's top-left button) threw the draft away, and Save sat
// DISABLED for every climber without a username — which is every new account, because signup
// collects none and handle_new_user stores none (measured live 2026-10-15). The photo previewed,
// the climber left, and it "went away". Removing the photo already acts immediately for the same
// reason, so adding one now does too. One column in, one column out, as saveProfilePhotos.
export async function saveProfileAvatar(userId, url) {
  if (!supabase) return null;
  if (!userId) throw new Error("Sign in to save your profile photo.");
  const { data, error } = await supabase
    .from("profiles").update({ avatar: url || null }).eq("id", userId).select("id").single();
  if (error) throw error;
  invalidateKeys(profilesReaders);
  return data;
}

// Take one photo back OFF the strip.
//
// The counterpart to uploadProfilePhoto + saveProfilePhotos, and the thing a climber had no
// way to do at all: PhotoStrip has offered `onAdd` and nothing to undo it, so the only thing
// you could do about a photo you regretted was HIDE it -- and 0174 is explicit that
// `photos_public` is surfacing only, not access control, so hiding never stopped the row being
// served to anyone holding the anon key.
//
// ORDER MATTERS, and it is deleteRoutePhoto's order for deleteRoutePhoto's reason: drop the
// REFERENCE first, then the storage object. Delete the object first and a surviving array
// entry points at a file that is gone, which is a broken image on the profile. This order can
// only ever leave an orphan object in a bucket nobody browses, which is invisible.
//
// Throws rather than resolving on a failed write, so a caller's "Photo removed" stays behind a
// write that landed. Returns the new array, so the caller renders what the database now holds
// rather than what it assumed it would hold.
// Describe a topo photo after it was uploaded. `topos own update` (0026) scopes this to the
// uploader, and an RLS refusal matches zero rows, which .single() surfaces as an error — so a
// caller's "Description saved" can only follow a write that landed.
// OPTIMISTIC: a caption or a description reaches the cached topo the moment it is saved, so the
// photo shows the new words before the round trip; the undo puts the old ones back on failure.
const patchTopo = (topoId, fields) => patchQueries(["route-topos"], (d) => Array.isArray(d) && d.some((t) => t && t.id === topoId) ? d.map((t) => t && t.id === topoId ? { ...t, ...fields } : t) : d);
export async function updateTopoAlt(topoId, alt) {
  if (!supabase) return null;
  if (!topoId) throw new Error("Nothing to describe.");
  const undo = patchTopo(topoId, { alt: cleanAlt(alt) });
  const { data, error } = await supabase
    .from("topos").update({ alt: cleanAlt(alt) }).eq("id", topoId).select("id, alt").single();
  if (error) { undo(); throw error; }
  invalidateKeys(toposReaders);
  return data;
}

// The topo photo's CAPTION (0362): context from the climber who posted it, read by everyone, no
// length cap — not the alt text above, which describes the picture for a screen reader. Blank
// stores null. Same uploader-only policy and the same .single() refusal as updateTopoAlt, so
// "Caption saved" follows only a write that landed.
export async function updateTopoCaption(topoId, caption) {
  if (!supabase) return null;
  if (!topoId) throw new Error("Nothing to caption.");
  const c = String(caption == null ? "" : caption).trim();
  const undo = patchTopo(topoId, { caption: c || null });
  const { data, error } = await supabase
    .from("topos").update({ caption: c || null }).eq("id", topoId).select("id, caption").single();
  if (error) { undo(); throw error; }
  invalidateKeys(toposReaders);
  return data;
}

// Persist the descriptions of a climber's profile photos, and ONLY that column — the same
// one-column-in rule as saveProfilePhotos, for the same reason (check:profile-edit-gate).
// Entries for photos no longer on the strip are pruned here, so the map cannot grow stale.
export async function saveProfilePhotoAlts(userId, alts, photos) {
  if (!supabase) return null;
  if (!userId) throw new Error("Sign in to describe your profile photos.");
  const keep = new Set(Array.isArray(photos) ? photos : []);
  const next = {};
  Object.keys(alts || {}).forEach((u) => { const a = cleanAlt(alts[u]); if (a && keep.has(u)) next[u] = a; });
  const { data, error } = await supabase
    .from("profiles").update({ photo_alts: Object.keys(next).length ? next : null }).eq("id", userId).select("id").single();
  if (error) throw error;
  invalidateKeys(profilesReaders);
  // photo_alts is owner-only (0434), so it is not RETURNED; the row now holds exactly what was sent.
  return /** @type {any} */ ({ ...data, photo_alts: Object.keys(next).length ? next : null });
}

export async function removeProfilePhoto(userId, url, photos) {
  if (!supabase) return null;
  if (!userId) throw new Error("Sign in to change your profile photos.");
  const before = Array.isArray(photos) ? photos : [];
  const next = before.filter((p) => p !== url);
  // A no-op must not report success -- the swallowed-write-failure shape this repo keeps
  // finding. If the strip and this argument disagree about what is on the profile, say so,
  // rather than writing the array back unchanged under a "Photo removed" message.
  if (next.length === before.length) throw new Error("That photo is not on your profile any more — reload and try again.");
  await saveProfilePhotos(userId, next);
  const key = photoStorageKey(url);
  // Removal is by VALUE, so if a URL somehow appeared twice both entries have just gone and
  // nothing on the profile still points at the object. A "is anything still referencing it?"
  // test here could never be false, and a condition that cannot fail reads as a safety check
  // while being none -- so the reason is written down instead.
  //
  // `key` is null for a `blob:` preview or a seed https:// photo, neither of which is an object
  // of ours to delete. Reading null as a key would ask storage to remove the whole URL.
  if (key) {
    await supabase.storage.from("topo-photos").remove([key]).catch(() => {});
  }
  return next;
}

// Take the AVATAR back off, and the reason this exists is the same one removeProfilePhoto
// records: the editor offered "Change photo" and nothing to undo it, so a climber who regretted
// their profile picture could replace it and never clear it. The in-app privacy sheet meanwhile
// says you can "edit or clear anything from your profile and settings at any time" — and
// check:policy-claims exists precisely because a legal surface must not claim a control the app
// lacks. This is the control that sentence was describing.
//
// IT TAKES A userId RATHER THAN READING THE SESSION, and that choice was made FOR TESTABILITY.
// uploadProfilePhoto asks `auth.getSession()` itself, and mirroring that read cleanly — this is
// its counterpart, after all. It also makes the function unexecutable by check:photo-removal,
// whose whole method is running the real removal against a stubbed transport: with no session in
// node it would throw "Sign in" before touching anything, so every property below could only be
// asserted as SOURCE. Its sibling removeProfilePhoto(userId, …) is executable precisely because
// it is handed the id. One prop on EditProfileScreen buys the same, and a prop is cheap next to a
// guard that can only read the code it is guarding.
//
// ONE COLUMN IN, ONE COLUMN OUT — deliberately NOT routed through `saveProfile`, which PATCHes
// whatever object it is handed. That is saveProfilePhotos' stated reasoning and it applies here
// unchanged: handing that write a partial object is the shape check:profile-edit-gate exists for.
//
// ORDER MATTERS and it is removeProfilePhoto's order: drop the REFERENCE first, then the storage
// object. Deleting the object first leaves `profiles.avatar` pointing at a file that is gone,
// which is a broken image everywhere a climber's face appears. This order can only ever leave an
// orphan object in a bucket nobody browses.
//
// Throws rather than resolving on a failed write, so a caller's "Photo removed" stays behind a
// write that landed. `.single()` errors on zero rows, so an RLS refusal — which rejects by
// matching nothing rather than by erroring — surfaces here instead of reading as success.
// The climber's pinned states (0187). ACCOUNT-level, unlike the offline catalog for each state,
// which lives in the device's IndexedDB — so a pin made on one browser shows up on the next one
// with a Download button beside it instead of not at all.
//
// ONE COLUMN IN, ONE COLUMN OUT, never through saveProfile, which PATCHes whatever it is handed
// (the check:profile-edit-gate shape). Throws on a refusal — `.single()` errors on zero rows, so
// an RLS rejection cannot read as a saved pin.
export async function savePinnedStates(userId, names) {
  if (!supabase) return null;
  if (!userId) throw new Error("Sign in to pin a state to your account.");
  const clean = [...new Set((names || []).filter((n) => typeof n === "string" && n))];
  const { error } = await supabase
    .from("profiles").update({ pinned_states: clean }).eq("id", userId).select("id").single();
  if (error) throw error;
  invalidateKeys(profilesReaders);
  return clean;
}

export async function removeProfileAvatar(userId, url) {
  if (!supabase) return null;
  if (!userId) throw new Error("Sign in to change your profile photo.");
  const { error } = await supabase
    .from("profiles").update({ avatar: null }).eq("id", userId).select("id").single();
  if (error) throw error;
  // null for a `blob:` preview or a seed https:// avatar — neither is an object of ours, and
  // reading null as a key would ask storage to remove the whole URL. Avatars go into the same
  // `topo-photos` bucket as the strip, so the same helper resolves them.
  const key = photoStorageKey(url);
  if (key) {
    // NOT rethrown: the column is already null, so the photo has left every screen, and telling
    // the climber their removal failed would be false. removeProfilePhoto's reasoning verbatim.
    await supabase.storage.from("topo-photos").remove([key]).catch(() => {});
  }
  invalidateKeys(profilesReaders);
  return true;
}

export async function uploadLogPhoto(file) {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to attach a photo.");
  // The location the camera saved inside the photo is removed first (this bucket is public), and the photo is scaled down to screen size.
  file = await preparePhotoForUpload(file);
  const path = photoObjectPath(uid, file);
  const { error: upErr } = await supabase.storage.from("topo-photos").upload(path, file, photoUploadOptions(file));
  if (upErr) throw upErr;
  return topoPhotoUrl(path);
}

// A photo attached to a ROUTE rather than to a climb log — the "Add a photo" sheet on the
// Photos tab, which exists so you can contribute one without logging an ascent.
//
// Before this, that sheet produced `blob:` URLs held in React state: they uploaded nowhere,
// were invisible to everyone else, and vanished on refresh (the browser revokes them on
// unload). The button worked and the feature did not, which is the shape this repo keeps
// finding — see the `descent_text` note in CLAUDE.md.
//
// Filed as a `contributions` row of kind 'photo', which 0002 has documented as a kind since
// the ledger was created, so nothing new is needed to store or read it: useRouteContributions
// already selects *. It also means a route photo now counts on the area leaderboard, at one
// point per photo, which 0148 is explicit is the right weighting for a distinct artifact.
//
// UPLOAD FIRST, THEN INSERT, and the order is deliberate. Inserting first would publish a row
// pointing at a file that may never arrive — a broken image on someone else's screen. This way
// a failure leaves an orphaned object in a bucket nobody browses, and the caller sees the
// throw. Storage RLS (0026) gates writes on the first path segment, so the {uid}/ prefix is
// load-bearing, not cosmetic.
//
// Refuses without a session rather than falling back to a local-only photo: `contributor`
// would be 'anon', the row would be unattributable, and the climber would have been told
// their photo was shared when only they can see it.
// `pitch` (optional) tags the photo with a pitch's label, so the pitch it shows beside reads it back (value.pitch).
// An untagged photo is a route photo, as before.
export async function submitRoutePhoto(routeId, file, alt, pitch) {
  if (!supabase) return null;
  if (!routeId || !file) throw new Error("Nothing to add.");
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData && sessionData.session && sessionData.session.user && sessionData.session.user.id;
  if (!uid) throw new Error("Sign in to add a photo other climbers can see.");
  // The location the camera saved inside the photo is removed first (this bucket is public), and the photo is scaled down to screen size.
  file = await preparePhotoForUpload(file);
  const path = photoObjectPath(uid, file);
  const { error: upErr } = await supabase.storage
    .from("topo-photos").upload(path, file, photoUploadOptions(file));
  if (upErr) throw upErr;
  const url = topoPhotoUrl(path);
  if (!url) throw new Error("The photo uploaded but its address could not be resolved.");
  const a = cleanAlt(alt);
  const pn = pitch == null ? "" : String(pitch).trim().slice(0, 40);
  const value = { url };
  if (a) value.alt = a;
  if (pn) value.pitch = pn;
  return submitContribution({ route_id: routeId, kind: "photo", value });
}
