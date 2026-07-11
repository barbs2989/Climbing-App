-- Hire-a-Guide Phase 1 (5/5) — reviews tied to a real inquiry (one per inquiry, enforced
-- by the unique constraint + insert policy below), with guide right-of-reply.

create table reviews (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null unique references inquiries(id) on delete cascade,
  guide_id uuid not null references guide_profiles(id) on delete cascade,
  climber_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  text text,
  guide_reply text,
  guide_reply_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_guide_idx on reviews(guide_id, created_at);

alter table reviews enable row level security;
create policy "reviews public read" on reviews for select using (true);
-- The actual integrity mechanism: a review can only be inserted if there's a real
-- inquiries row matching both this climber and this guide.
create policy "reviews climber insert with real inquiry" on reviews for insert
  with check (
    climber_id = auth.uid()
    and exists (
      select 1 from inquiries i
      where i.id = reviews.inquiry_id
        and i.climber_id = auth.uid()
        and i.guide_id = reviews.guide_id
    )
  );
-- Guide gets reply-only write access, never edit rights over the review itself.
create policy "reviews guide reply" on reviews for update
  using (guide_id = auth.uid())
  with check (guide_id = auth.uid());

create or replace function guard_review_reply_only() returns trigger
language plpgsql as $$
begin
  if new.rating is distinct from old.rating
    or new.text is distinct from old.text
    or new.climber_id is distinct from old.climber_id
    or new.inquiry_id is distinct from old.inquiry_id
    or new.guide_id is distinct from old.guide_id
  then
    raise exception 'reviews: guides may only set guide_reply/guide_reply_at';
  end if;
  return new;
end; $$;
create trigger reviews_guard_reply_only before update on reviews
  for each row execute function guard_review_reply_only();
-- No delete policy -- append-only, same convention as contributions/inquiries.
