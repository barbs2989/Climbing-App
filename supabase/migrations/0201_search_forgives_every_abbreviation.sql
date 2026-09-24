-- Search forgives EVERY common abbreviation in a name, not just Mt / St / the compass.
--
-- 0190 taught search that "mt" is "mount" and "ne" is "northeast". A climber reasonably expects
-- the same of every short form a route name uses, and the catalog was measured for which ones it
-- does (whole-word counts over 205k route names, 2026-09-24):
--   written out in names, typed short:  Direct 1,712 (dir)   Variation 724 (var)   Left 2,674 (lt)
--                                       Right 2,515 (rt)     Ridge 802 (rdg)       Glacier 90 (gl)
--                                       Creek 104 (ck)       First 462 (1st)       Upper 175 (upr)
--   written short in names, typed out:  Dr 146   Mr 522   Jr 48   1st 48   2nd 54   Var 106
--                                       Rte 5    Ext 7    Alt 18  Mid 77  Bldr 14  Ck 9
--   misspelled in names:                Gulley 14 (gully)   Coulior 2 (couloir)
--   a direction in two parts:           "South East Ridge", "North-East Gully" (83), "N.E. Face"
-- Numbers one..ten match their digits, and NNE/ESE/... expand into the two directions they sit
-- between, one way only (a North Ridge is not an NNE one).
--
-- Deliberately NOT mapped, each because it means something else in a route name first: single
-- letters L R I V X; "tr" (top rope); "ft" (feet); "no"; "sec" (second/section); "cr" (crack).
--
-- lib/search.js is the JS half and MUST match: `check:search-norm` compares every row below with
-- it. The rows were generated FROM lib/search.js, not typed.
--
-- Only search_clean and search_forms change; search_norm / search_canon / search_patterns call
-- them. Stored `name_search` goes stale on every row these change, so the BACKFILL below must
-- run after this file (the same batched recipe 0190 used).

create or replace function search_clean(t text) returns text
language sql immutable parallel safe as $$
  -- A direction written in two parts is one word. Letters join only as a PAIR followed by a real
  -- word or the end: "N.E.R.F." and "S.W.A.W. Crack" are acronyms and stay apart.
  select regexp_replace(regexp_replace(
    btrim(regexp_replace(regexp_replace(replace(
    translate(lower(coalesce(t, '')),
      'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçýÿ',
      'aaaaaaaeeeeeiiiiiooooooouuuuuncyy'),
    '&', ' and '),
    '[''’‘`´]', '', 'g'),
    '[^a-z0-9]+', ' ', 'g')),
    '(^| )(north|south) (east|west)(?= |$)', '\1\2\3', 'g'),
    '(^| )([ns]) ([ew])(?= [a-z0-9]{2}| *$)', '\1\2\3', 'g')
$$;

-- CANONICAL FORM FIRST. search_canon takes the first word of this; search_norm takes all of it.
create or replace function search_forms(w text) returns text
language sql immutable parallel safe as $$
  select case w
    when 'mount' then 'mount mt'
    when 'mt' then 'mount mt'
    when 'mountain' then 'mountain mtn'
    when 'mtn' then 'mountain mtn'
    when 'mountains' then 'mountains mtns'
    when 'mtns' then 'mountains mtns'
    when 'saint' then 'saint st'
    when 'st' then 'saint st'
    when 'peak' then 'peak pk'
    when 'pk' then 'peak pk'
    when 'northeast' then 'northeast ne'
    when 'ne' then 'northeast ne'
    when 'northwest' then 'northwest nw'
    when 'nw' then 'northwest nw'
    when 'southeast' then 'southeast se'
    when 'se' then 'southeast se'
    when 'southwest' then 'southwest sw'
    when 'sw' then 'southwest sw'
    when 'n' then 'north n'
    when 's' then 'south s'
    when 'e' then 'east e'
    when 'w' then 'west w'
    when 'ridge' then 'ridge rdg'
    when 'rdg' then 'ridge rdg'
    when 'glacier' then 'glacier glac gl'
    when 'glac' then 'glacier glac gl'
    when 'gl' then 'glacier glac gl'
    when 'creek' then 'creek crk ck'
    when 'crk' then 'creek crk ck'
    when 'ck' then 'creek crk ck'
    when 'lake' then 'lake lk'
    when 'lk' then 'lake lk'
    when 'canyon' then 'canyon cyn'
    when 'cyn' then 'canyon cyn'
    when 'fork' then 'fork fk'
    when 'fk' then 'fork fk'
    when 'point' then 'point pt'
    when 'pt' then 'point pt'
    when 'road' then 'road rd'
    when 'rd' then 'road rd'
    when 'highway' then 'highway hwy'
    when 'hwy' then 'highway hwy'
    when 'trail' then 'trail trl'
    when 'trl' then 'trail trl'
    when 'avenue' then 'avenue ave'
    when 'ave' then 'avenue ave'
    when 'boulder' then 'boulder bldr'
    when 'bldr' then 'boulder bldr'
    when 'tower' then 'tower twr'
    when 'twr' then 'tower twr'
    when 'gully' then 'gully gulley'
    when 'gulley' then 'gully gulley'
    when 'couloir' then 'couloir coulior'
    when 'coulior' then 'couloir coulior'
    when 'direct' then 'direct dir'
    when 'dir' then 'direct dir'
    when 'variation' then 'variation var'
    when 'var' then 'variation var'
    when 'route' then 'route rte'
    when 'rte' then 'route rte'
    when 'extension' then 'extension ext'
    when 'ext' then 'extension ext'
    when 'alternate' then 'alternate alt'
    when 'alt' then 'alternate alt'
    when 'original' then 'original orig'
    when 'orig' then 'original orig'
    when 'section' then 'section sect'
    when 'sect' then 'section sect'
    when 'left' then 'left lt'
    when 'lt' then 'left lt'
    when 'right' then 'right rt'
    when 'rt' then 'right rt'
    when 'upper' then 'upper upr'
    when 'upr' then 'upper upr'
    when 'lower' then 'lower lwr'
    when 'lwr' then 'lower lwr'
    when 'middle' then 'middle mid'
    when 'mid' then 'middle mid'
    when 'center' then 'center ctr centre'
    when 'ctr' then 'center ctr centre'
    when 'centre' then 'center ctr centre'
    when 'first' then 'first 1st'
    when '1st' then 'first 1st'
    when 'second' then 'second 2nd'
    when '2nd' then 'second 2nd'
    when 'third' then 'third 3rd'
    when '3rd' then 'third 3rd'
    when 'fourth' then 'fourth 4th'
    when '4th' then 'fourth 4th'
    when 'fifth' then 'fifth 5th'
    when '5th' then 'fifth 5th'
    when 'doctor' then 'doctor dr'
    when 'dr' then 'doctor dr'
    when 'mister' then 'mister mr'
    when 'mr' then 'mister mr'
    when 'junior' then 'junior jr'
    when 'jr' then 'junior jr'
    when 'senior' then 'senior sr'
    when 'sr' then 'senior sr'
    when 'one' then 'one 1'
    when '1' then 'one 1'
    when 'two' then 'two 2'
    when '2' then 'two 2'
    when 'three' then 'three 3'
    when '3' then 'three 3'
    when 'four' then 'four 4'
    when '4' then 'four 4'
    when 'five' then 'five 5'
    when '5' then 'five 5'
    when 'six' then 'six 6'
    when '6' then 'six 6'
    when 'seven' then 'seven 7'
    when '7' then 'seven 7'
    when 'eight' then 'eight 8'
    when '8' then 'eight 8'
    when 'nine' then 'nine 9'
    when '9' then 'nine 9'
    when 'ten' then 'ten 10'
    when '10' then 'ten 10'
    when 'nne' then 'nne north northeast ne'
    when 'nnw' then 'nnw north northwest nw'
    when 'ene' then 'ene east northeast ne'
    when 'ese' then 'ese east southeast se'
    when 'sse' then 'sse south southeast se'
    when 'ssw' then 'ssw south southwest sw'
    when 'wnw' then 'wnw west northwest nw'
    when 'wsw' then 'wsw west southwest sw'
    else w end
$$;

-- ── BACKFILL — run OUTSIDE this file, repeated until each reports 0 rows ─────────────────────
-- Writing '' lets the trg_*_name_search trigger compute the value. Only rows whose stored value
-- differs are touched.
--
--   update areas  set name_search = '' where id in (select id from areas  where name_search is distinct from search_norm(name) limit 20000);
--   update routes set name_search = '' where id in (select id from routes where name_search is distinct from search_norm(name) limit 20000);
--
-- Verify:
--   select routes_in_subtree_count('washington', 'dir');          -- reaches every "Direct"
--   select search_norm('North-East Gully'), search_norm('N.E.R.F.');  -- 'northeast ne gully', 'north n east e r f'
