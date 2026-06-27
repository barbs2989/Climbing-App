-- Multi-discipline tags (Mountain Project model): a route can be several types at once
-- (e.g. Trad + Alpine + Snow). `discipline` stays the PRIMARY bucket (for sort/category);
-- `disciplines` is the full list of every type that applies. Existing rows: null = [discipline].
alter table routes add column if not exists disciplines jsonb;
