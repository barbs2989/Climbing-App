-- Hire-a-Guide Phase 1 (2/5) — guide listings, the cert-track->discipline taxonomy,
-- and per-credential verification. No payment/featured-tier columns here on purpose —
-- monetization is a separate later phase; every guide here is listed free.

create table guide_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','submitted','active','rejected','delisted')),
  title text, base_location text, specialty text, bio text, cancellation_policy text,
  lat double precision, lng double precision,
  day_rate int, group_max int, response_hrs int,
  regions text[] not null default '{}',
  languages text[] not null default '{}',
  -- Denormalized cache, maintained only by sync_active_disciplines() below — never
  -- client-writable. This is what a guide is actually allowed to be listed/found under.
  active_disciplines text[] not null default '{}',
  insurance_carrier_name text,
  insurance_attested boolean not null default false,
  permit_attested boolean not null default false,
  waiver_process_attested boolean not null default false,
  independent_contractor_attested boolean not null default false,
  insurance_attested_at timestamptz,
  permit_attested_at timestamptz,
  waiver_process_attested_at timestamptz,
  independent_contractor_attested_at timestamptz,
  agreement_signed_name text,
  agreement_signed_at timestamptz,
  submitted_at timestamptz,
  listed_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- No attestation -> not listed. Bakes the mandatory-attestation requirement into the
  -- schema itself, not just the application form.
  constraint guide_profiles_active_requires_attestations check (
    status <> 'active' or (
      insurance_attested and permit_attested
      and waiver_process_attested and independent_contractor_attested
    )
  )
);

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;
create trigger guide_profiles_touch before update on guide_profiles
  for each row execute function touch_updated_at();

alter table guide_profiles enable row level security;
-- Public browsing only sees active listings; a guide always sees their own row
-- (draft/submitted/rejected included, so they can see their own application status),
-- and the admin sees everything for review.
create policy "guide_profiles public read active" on guide_profiles for select
  using (status = 'active' or id = auth.uid() or is_admin(auth.uid()));
create policy "guide_profiles self insert" on guide_profiles for insert
  with check (id = auth.uid());
create policy "guide_profiles self or admin update" on guide_profiles for update
  using (id = auth.uid() or is_admin(auth.uid()))
  with check (id = auth.uid() or is_admin(auth.uid()));

-- Static lookup: single source of truth for which disciplines a cert track actually
-- covers. Used both by the client (to build the cert-track picker/legend) and by the
-- sync_active_disciplines trigger below — never hardcoded twice.
create table cert_track_disciplines (
  cert_track text not null,
  discipline text not null,
  primary key (cert_track, discipline)
);
alter table cert_track_disciplines enable row level security;
create policy "cert_track_disciplines public read" on cert_track_disciplines for select using (true);

insert into cert_track_disciplines (cert_track, discipline) values
  ('SPI', 'single_pitch'),
  ('MPI', 'single_pitch'), ('MPI', 'multi_pitch_instructing'),
  ('RockGuide', 'single_pitch'), ('RockGuide', 'multi_pitch_instructing'), ('RockGuide', 'multi_pitch_guiding'),
  ('AlpineGuide', 'single_pitch'), ('AlpineGuide', 'multi_pitch_instructing'), ('AlpineGuide', 'multi_pitch_guiding'),
    ('AlpineGuide', 'alpine'), ('AlpineGuide', 'glacier'), ('AlpineGuide', 'mountaineering'),
  ('SkiGuide', 'ski_touring'), ('SkiGuide', 'ski_mountaineering'),
  ('IFMGA', 'single_pitch'), ('IFMGA', 'multi_pitch_instructing'), ('IFMGA', 'multi_pitch_guiding'),
    ('IFMGA', 'alpine'), ('IFMGA', 'glacier'), ('IFMGA', 'mountaineering'),
    ('IFMGA', 'ski_touring'), ('IFMGA', 'ski_mountaineering');

-- One row per credential a guide claims. `kind` separates the single discipline-granting
-- track (primary_track) from cross-cutting certs that never grant discipline scope
-- themselves (AIARE avalanche training, WFR medical).
create table guide_credentials (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guide_profiles(id) on delete cascade,
  kind text not null check (kind in ('primary_track','cross_cutting')),
  cert_track text check (cert_track in ('SPI','MPI','RockGuide','AlpineGuide','SkiGuide','IFMGA')),
  cross_cutting_type text check (cross_cutting_type in ('AIARE','WFR','other')),
  label text, cert_number text, issuing_org text,
  status text not null default 'pending' check (status in ('pending','verified','rejected','lapsed')),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_expires_at timestamptz,
  reviewed_by uuid references profiles(id),
  rejected_reason text,
  created_at timestamptz not null default now(),
  constraint guide_credentials_track_pairing check (
    (kind = 'primary_track' and cert_track is not null and cross_cutting_type is null)
    or (kind = 'cross_cutting' and cross_cutting_type is not null and cert_track is null)
  )
);
create index guide_credentials_guide_idx on guide_credentials(guide_id);

alter table guide_credentials enable row level security;
create policy "guide_credentials read own or admin" on guide_credentials for select
  using (
    guide_id = auth.uid() or is_admin(auth.uid())
    or exists (select 1 from guide_profiles gp where gp.id = guide_credentials.guide_id and gp.status = 'active')
  );
create policy "guide_credentials self insert" on guide_credentials for insert
  with check (guide_id = auth.uid());
-- Only an admin can move status (verify/reject) or fill in review fields; a guide may only
-- resubmit their own rejected/lapsed rows back to pending (handled client-side by re-insert,
-- so this policy stays admin-only for actual status transitions).
create policy "guide_credentials admin update" on guide_credentials for update
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Expiry is a server fact, never client-supplied: the instant a credential becomes
-- verified, stamp a 12-month expiry from that moment.
create or replace function stamp_credential_verification() returns trigger
language plpgsql as $$
begin
  if new.status = 'verified' and (old.status is distinct from 'verified') then
    new.verified_at = now();
    new.verified_expires_at = now() + interval '12 months';
  end if;
  return new;
end; $$;
create trigger guide_credentials_stamp_verification before update on guide_credentials
  for each row execute function stamp_credential_verification();

-- Derive guide_profiles.active_disciplines from currently-verified-and-unexpired
-- primary_track credentials. This is the actual enforcement of "a guide can only be
-- listed under what their verified cert track covers" -- disciplines are never a
-- separately-writable field, only ever computed from this.
create or replace function sync_active_disciplines() returns trigger
language plpgsql security definer as $$
declare
  target_guide uuid;
  discs text[];
begin
  target_guide := coalesce(new.guide_id, old.guide_id);
  select coalesce(array_agg(distinct ctd.discipline), '{}')
    into discs
    from guide_credentials gc
    join cert_track_disciplines ctd on ctd.cert_track = gc.cert_track
    where gc.guide_id = target_guide
      and gc.kind = 'primary_track'
      and gc.status = 'verified'
      and (gc.verified_expires_at is null or gc.verified_expires_at > now());
  update guide_profiles set active_disciplines = discs where id = target_guide;
  return null;
end; $$;
create trigger guide_credentials_sync_disciplines
  after insert or update or delete on guide_credentials
  for each row execute function sync_active_disciplines();

-- Reconciliation RPC: flips any credential that has quietly crossed verified_expires_at
-- from 'verified' to 'lapsed' and recomputes active_disciplines. No cron exists (static
-- hosting), so this is called opportunistically whenever a guide profile is fetched --
-- the cache is never more than one page-load stale.
create or replace function reconcile_guide_verification(p_guide_id uuid) returns void
language plpgsql security definer as $$
begin
  update guide_credentials
    set status = 'lapsed'
    where guide_id = p_guide_id
      and status = 'verified'
      and verified_expires_at is not null
      and verified_expires_at <= now();
end; $$;
