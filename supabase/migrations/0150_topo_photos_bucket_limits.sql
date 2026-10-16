-- 0150 — put a size and a type limit on the topo-photos bucket.
--
-- WHY NOW. The bucket was created for the topo-photo flow: a niche surface, reached by a
-- handful of people drawing lines on wall photos. It has `file_size_limit = null` and
-- `allowed_mime_types = null`, i.e. any authenticated user may upload a file of any size and
-- any type, and the bucket is PUBLIC so whatever lands there is world-readable at a stable
-- URL. That was a small exposure while the only door was narrow. The route "Add a photo"
-- sheet now writes here too, and that door is on every route in a 205k-row catalog, so the
-- same gap stops being theoretical.
--
-- The RLS on storage.objects is already correct and is NOT what this fixes: 0026 gates
-- insert/update/delete on the first path segment matching auth.uid(), so nobody can write
-- into anybody else's folder. What RLS cannot express is "and it must be an image, and it
-- must be small" — those are bucket properties, and they were never set.
--
-- 15 MB accommodates a modern phone photo (a 48MP HEIC lands around 5-8 MB, a JPEG well
-- under) without accepting a video file renamed .jpg. The MIME list is the four formats a
-- phone camera or a photo library actually produces; note this is the type the CLIENT
-- declares, so it is a guardrail against accident and clumsiness, not against a determined
-- uploader. Anything stronger than that needs server-side inspection, which is a different
-- change and not one the current threat justifies.
--
-- HEIC/HEIF are included deliberately. iPhones shoot HEIC by default, and Safari hands the
-- raw file through unconverted — excluding it would reject the single most likely photo a
-- climber tries to add, and the failure would surface as an opaque storage error.
--
-- This is a metadata update on one row; it cannot fail partway and needs no backfill.
-- Existing objects are unaffected: these limits are enforced on upload, so nothing already
-- stored is invalidated or removed.

update storage.buckets
   set file_size_limit = 15728640,  -- 15 MiB
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
 where id = 'topo-photos';

-- Confirm — expect 15728640 and the five types:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='topo-photos';
