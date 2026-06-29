-- 0013: rappels becomes text.
-- The alpine pull describes rappels in prose ("One or more rappels off the summit block")
-- rather than as a count. The app only uses route.rappels as a presence flag (rappel-descent
-- filter), never arithmetic, so text holds the richer description with no behavior change.
alter table routes alter column rappels type text using rappels::text;
