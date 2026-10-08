-- wa_classic_route_2 (Classic Route, Unicorn Peak): access._raw.permit_cost stated an $82/person
-- Mount Rainier "Climbing Cost Recovery Fee" as if it applies to this climb. That fee only applies
-- above 10,000 ft or on a glacier (NPS, home.nps.gov/mora/planyourvisit/climbing-fee-faqs.htm);
-- Unicorn Peak is 6,971 ft and non-glaciated. The row's own top-level access.notes field already
-- says correctly that the fee does NOT apply here -- _raw.permit_cost was self-contradicting it.
-- Corrected to drop the inapplicable $82 fee and keep only the overnight wilderness-permit costs
-- that do apply, matching access.notes/access.overnight_permit on the same row.
UPDATE routes
SET access = jsonb_set(
  access,
  '{_raw,permit_cost}',
  '"$12/person/night overnight wilderness permit + $6 non-refundable Recreation.gov application fee -- the $82/person Climbing Cost Recovery Fee does NOT apply here (Unicorn Peak is non-glaciated and below the 10,000 ft threshold that triggers it)"'::jsonb
)
WHERE id = 'wa_classic_route_2';
