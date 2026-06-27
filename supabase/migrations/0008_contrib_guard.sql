-- Defense-in-depth for the contributions endpoint while it's still anon-writable.
-- The REAL fix is auth (bind contributor to auth.uid(), drop client-supplied name) — see audit.
-- Until then: cap row size so the open insert policy can't be abused for junk/DoS.
alter table contributions
  add constraint contributions_value_len_ck
  check (value is null or length(value::text) <= 4000);
