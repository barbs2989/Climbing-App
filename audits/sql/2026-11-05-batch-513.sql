-- wa_mount_adams_lava_glacier_headwall: fa stored as "Edward Cooper and Mike Swayne, July 3, 1961",
-- but two independent sources agree on 1960, not 1961: Mike Swayne's own climbing-history list
-- (watrailblazers.org bio page) credits "1960 - Mt Adams Lava Glacier Headwall, 1st Ascent", and a
-- separate climbing-club route list dates the same climb to "July 2-3, 1960" with Cooper and Swayne
-- named. No source found supports 1961 for this route (the 1962 AAJ report by the same two climbers
-- covers a different Mount Adams line, the East Face, and their 1962 Cooper/Swayne climb together is
-- the East Willis Wall on Mount Rainier, not this headwall).
UPDATE routes
SET fa = 'Edward Cooper and Mike Swayne, July 2-3, 1960'
WHERE id = 'wa_mount_adams_lava_glacier_headwall';
