-- SUPABASE_SCHEMA.sql
--
-- The live `public` schema of the ClimbMatch Supabase project: every table's CREATE TABLE,
-- its foreign keys, data types, row-level security and RLS policies.
--
-- GENERATED from the live database by scripts/gen-supabase-schema.mjs. Do not hand-edit.
-- After ANY change to the database structure (a migration, a dashboard edit, a DDL run):
--     npm run gen:schema
-- and commit the result in the same PR. `npm run gen:schema -- --check` exits 1 when this
-- file has drifted from the live database.
--
-- Counts: 84 tables, 828 columns, 425 keyed/checked constraints (151 foreign keys), 257 RLS policies.
-- Not covered here: views, functions, triggers, standalone indexes (see supabase/migrations/).

-- ── Foreign keys ───────────────────────────────────────────────────────────────
-- accessibility_reports (accessibility_reports_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- account_standing (account_standing_set_by_fkey): FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- account_standing (account_standing_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- app_feedback (app_feedback_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- areas (areas_parent_id_fkey): FOREIGN KEY (parent_id) REFERENCES areas(id)
-- belay_catches (belay_catches_belayer_id_fkey): FOREIGN KEY (belayer_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- belay_catches (belay_catches_climb_log_id_fkey): FOREIGN KEY (climb_log_id) REFERENCES climb_logs(id) ON DELETE SET NULL
-- belay_catches (belay_catches_climber_id_fkey): FOREIGN KEY (climber_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- belay_catches (belay_catches_filed_by_fkey): FOREIGN KEY (filed_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- blocked_users (blocked_users_blocked_fkey): FOREIGN KEY (blocked) REFERENCES auth.users(id) ON DELETE CASCADE
-- blocked_users (blocked_users_blocker_fkey): FOREIGN KEY (blocker) REFERENCES auth.users(id) ON DELETE CASCADE
-- climb_log_confirmations (climb_log_confirmations_log_id_fkey): FOREIGN KEY (log_id) REFERENCES climb_logs(id) ON DELETE CASCADE
-- climb_log_confirmations (climb_log_confirmations_partner_id_fkey): FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- climb_log_partner_names (climb_log_partner_names_log_id_fkey): FOREIGN KEY (log_id) REFERENCES climb_logs(id) ON DELETE CASCADE
-- climb_log_partner_names (climb_log_partner_names_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- climb_logs (climb_logs_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE SET NULL
-- climb_logs (climb_logs_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- climber_resumes (climber_resumes_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- comment_reactions (comment_reactions_comment_id_fkey): FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
-- comment_reactions (comment_reactions_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- comments (comments_parent_id_fkey): FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
-- comments (comments_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- connection_events (connection_events_addressee_fkey): FOREIGN KEY (addressee) REFERENCES auth.users(id) ON DELETE CASCADE
-- connection_events (connection_events_requester_fkey): FOREIGN KEY (requester) REFERENCES auth.users(id) ON DELETE CASCADE
-- connections (connections_addressee_fkey): FOREIGN KEY (addressee) REFERENCES auth.users(id) ON DELETE CASCADE
-- connections (connections_requester_fkey): FOREIGN KEY (requester) REFERENCES auth.users(id) ON DELETE CASCADE
-- content_reports (content_reports_contribution_id_fkey): FOREIGN KEY (contribution_id) REFERENCES contributions(id) ON DELETE CASCADE
-- content_reports (content_reports_reporter_fkey): FOREIGN KEY (reporter) REFERENCES profiles(id) ON DELETE SET NULL
-- content_reports (content_reports_reviewed_by_fkey): FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
-- content_reports (content_reports_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
-- contribution_standing (contribution_standing_set_by_fkey): FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- contribution_standing (contribution_standing_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- contributions (contributions_area_id_fkey): FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
-- contributions (contributions_reviewed_by_fkey): FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
-- contributions (contributions_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- crew_day_acks (crew_day_acks_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
-- crew_day_acks (crew_day_acks_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- crew_email_invites (crew_email_invites_claimed_by_fkey): FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- crew_email_invites (crew_email_invites_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
-- crew_email_invites (crew_email_invites_invited_by_fkey): FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE
-- crew_members (crew_members_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
-- crew_members (crew_members_invited_by_fkey): FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL
-- crew_members (crew_members_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- crew_past_state (crew_past_state_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
-- crew_past_state (crew_past_state_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- crew_reads (crew_reads_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
-- crew_reads (crew_reads_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- crew_safety_answers (crew_safety_answers_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
-- crew_safety_answers (crew_safety_answers_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- crews (crews_area_id_fkey): FOREIGN KEY (area_id) REFERENCES areas(id)
-- crews (crews_created_by_fkey): FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
-- crews (crews_itinerary_by_fkey): FOREIGN KEY (itinerary_by) REFERENCES profiles(id) ON DELETE SET NULL
-- crews_messages (crews_messages_crew_id_fkey): FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE
-- crews_messages (crews_messages_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- data_requests (data_requests_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- gps_notifications (gps_notifications_submission_id_fkey): FOREIGN KEY (submission_id) REFERENCES gps_submissions(id) ON DELETE CASCADE
-- gps_submissions (gps_submissions_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- group_bans (group_bans_banned_by_fkey): FOREIGN KEY (banned_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- group_bans (group_bans_group_id_fkey): FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
-- group_bans (group_bans_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_event_invites (group_event_invites_event_id_fkey): FOREIGN KEY (event_id) REFERENCES group_events(id) ON DELETE CASCADE
-- group_event_invites (group_event_invites_invited_by_fkey): FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_event_invites (group_event_invites_invitee_fkey): FOREIGN KEY (invitee) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_event_rsvps (group_event_rsvps_event_id_fkey): FOREIGN KEY (event_id) REFERENCES group_events(id) ON DELETE CASCADE
-- group_event_rsvps (group_event_rsvps_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_events (group_events_group_id_fkey): FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
-- group_events (group_events_host_fkey): FOREIGN KEY (host) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_join_answers (group_join_answers_group_id_user_id_fkey): FOREIGN KEY (group_id, user_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE
-- group_join_declines (group_join_declines_declined_by_fkey): FOREIGN KEY (declined_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- group_join_declines (group_join_declines_group_id_fkey): FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
-- group_join_declines (group_join_declines_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_member_prefs (group_member_prefs_group_id_user_id_fkey): FOREIGN KEY (group_id, user_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE
-- group_members (group_members_group_id_fkey): FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
-- group_members (group_members_invited_by_fkey): FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- group_members (group_members_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_post_reactions (group_post_reactions_post_id_fkey): FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE
-- group_post_reactions (group_post_reactions_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_post_saves (group_post_saves_post_id_fkey): FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE
-- group_post_saves (group_post_saves_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_posts (group_posts_author_fkey): FOREIGN KEY (author) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_posts (group_posts_group_id_fkey): FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
-- group_reports (group_reports_group_id_fkey): FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
-- group_reports (group_reports_reported_user_fkey): FOREIGN KEY (reported_user) REFERENCES auth.users(id) ON DELETE SET NULL
-- group_reports (group_reports_reporter_fkey): FOREIGN KEY (reporter) REFERENCES auth.users(id) ON DELETE CASCADE
-- group_reports (group_reports_resolved_by_fkey): FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- groups (groups_created_by_fkey): FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
-- guide_credentials (guide_credentials_guide_id_fkey): FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE
-- guide_credentials (guide_credentials_reviewed_by_fkey): FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
-- guide_documents (guide_documents_credential_id_fkey): FOREIGN KEY (credential_id) REFERENCES guide_credentials(id) ON DELETE SET NULL
-- guide_documents (guide_documents_guide_id_fkey): FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE
-- guide_profiles (guide_profiles_id_fkey): FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE
-- hazard_votes (hazard_votes_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- inquiries (inquiries_climber_id_fkey): FOREIGN KEY (climber_id) REFERENCES profiles(id) ON DELETE CASCADE
-- inquiries (inquiries_guide_id_fkey): FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE
-- kudos (kudos_climb_log_id_fkey): FOREIGN KEY (climb_log_id) REFERENCES climb_logs(id) ON DELETE CASCADE
-- kudos (kudos_giver_fkey): FOREIGN KEY (giver) REFERENCES auth.users(id) ON DELETE CASCADE
-- kudos (kudos_receiver_fkey): FOREIGN KEY (receiver) REFERENCES auth.users(id) ON DELETE CASCADE
-- messages (messages_recipient_id_fkey): FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE
-- messages (messages_sender_id_fkey): FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE
-- moderation_actions (moderation_actions_actor_fkey): FOREIGN KEY (actor) REFERENCES auth.users(id) ON DELETE SET NULL
-- moderation_actions (moderation_actions_report_id_fkey): FOREIGN KEY (report_id) REFERENCES user_reports(id) ON DELETE SET NULL
-- moderation_appeals (moderation_appeals_appellant_fkey): FOREIGN KEY (appellant) REFERENCES auth.users(id) ON DELETE CASCADE
-- moderation_appeals (moderation_appeals_decided_by_fkey): FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- notification_state (notification_state_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- objectives (objectives_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- partner_areas (partner_areas_area_id_fkey): FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
-- partner_areas (partner_areas_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- profile_condition_prefs (profile_condition_prefs_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- profile_emergency_contacts (profile_emergency_contacts_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- profile_tracked_lists (profile_tracked_lists_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- profile_zips (profile_zips_user_id_fkey): FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
-- profile_zips (profile_zips_zip_fkey): FOREIGN KEY (zip) REFERENCES zip_centroids(zip)
-- profiles (profiles_id_fkey): FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
-- profiles (profiles_primary_account_id_fkey): FOREIGN KEY (primary_account_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- restricted_users (restricted_users_restricted_fkey): FOREIGN KEY (restricted) REFERENCES auth.users(id) ON DELETE CASCADE
-- restricted_users (restricted_users_restrictor_fkey): FOREIGN KEY (restrictor) REFERENCES auth.users(id) ON DELETE CASCADE
-- reviews (reviews_climber_id_fkey): FOREIGN KEY (climber_id) REFERENCES profiles(id) ON DELETE CASCADE
-- reviews (reviews_guide_id_fkey): FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE
-- reviews (reviews_inquiry_id_fkey): FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
-- route_base_checkins (route_base_checkins_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- route_base_checkins (route_base_checkins_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- route_base_pin_changes (route_base_pin_changes_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- route_difficulty_ratings (route_difficulty_ratings_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- route_field_confidence (route_field_confidence_field_fkey): FOREIGN KEY (field) REFERENCES contribution_fields(form_key)
-- route_field_confidence (route_field_confidence_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- route_field_confidence (route_field_confidence_set_by_fkey): FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- route_flags (route_flags_field_fkey): FOREIGN KEY (field) REFERENCES contribution_fields(form_key)
-- route_flags (route_flags_reporter_fkey): FOREIGN KEY (reporter) REFERENCES auth.users(id) ON DELETE CASCADE
-- route_flags (route_flags_resolved_by_fkey): FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL
-- route_flags (route_flags_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- route_ratings (route_ratings_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- route_ratings (route_ratings_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- route_views (route_views_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- routes (routes_area_id_fkey): FOREIGN KEY (area_id) REFERENCES areas(id)
-- saved_areas (saved_areas_area_id_fkey): FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
-- saved_areas (saved_areas_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- saved_searches (saved_searches_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- topo_lines (topo_lines_created_by_fkey): FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
-- topo_lines (topo_lines_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
-- topo_lines (topo_lines_topo_id_fkey): FOREIGN KEY (topo_id) REFERENCES topos(id) ON DELETE CASCADE
-- topos (topos_area_id_fkey): FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
-- topos (topos_created_by_fkey): FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
-- topos (topos_route_id_fkey): FOREIGN KEY (route_id) REFERENCES routes(id) ON UPDATE CASCADE ON DELETE SET NULL
-- user_itineraries (user_itineraries_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- user_lists (user_lists_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- user_notices (user_notices_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- user_reports (user_reports_reporter_fkey): FOREIGN KEY (reporter) REFERENCES auth.users(id) ON DELETE SET NULL
-- user_reports (user_reports_reviewed_by_fkey): FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
-- verification_records (verification_records_user_id_fkey): FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- vouches (vouches_from_id_fkey): FOREIGN KEY (from_id) REFERENCES auth.users(id) ON DELETE CASCADE
-- vouches (vouches_to_id_fkey): FOREIGN KEY (to_id) REFERENCES profiles(id) ON DELETE CASCADE

-- ── Tables, RLS and policies ───────────────────────────────────────────────────

CREATE TABLE public.accessibility_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  screen text,
  problem text NOT NULL,
  assistive text,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  contact_email text,
  CONSTRAINT accessibility_reports_pkey PRIMARY KEY (id),
  CONSTRAINT accessibility_reports_assistive_check CHECK (((assistive IS NULL) OR (char_length(assistive) <= 200))),
  CONSTRAINT accessibility_reports_contact_email_ck CHECK (((contact_email IS NULL) OR ((char_length(contact_email) <= 320) AND (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)))),
  CONSTRAINT accessibility_reports_problem_check CHECK (((char_length(btrim(problem)) >= 1) AND (char_length(btrim(problem)) <= 4000))),
  CONSTRAINT accessibility_reports_reachable_ck CHECK (((user_id IS NOT NULL) OR (contact_email IS NOT NULL))),
  CONSTRAINT accessibility_reports_screen_check CHECK (((screen IS NULL) OR (char_length(screen) <= 200))),
  CONSTRAINT accessibility_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text]))),
  CONSTRAINT accessibility_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.accessibility_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages accessibility reports" ON public.accessibility_reports AS PERMISSIVE FOR UPDATE TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "read own accessibility reports" ON public.accessibility_reports AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.account_standing (
  user_id uuid NOT NULL,
  status text NOT NULL,
  until timestamp with time zone,
  reason text NOT NULL,
  set_by uuid,
  set_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_standing_pkey PRIMARY KEY (user_id),
  CONSTRAINT account_standing_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text]))),
  CONSTRAINT account_standing_until_only_for_suspension CHECK (((status = 'suspended'::text) OR (until IS NULL))),
  CONSTRAINT account_standing_set_by_fkey FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT account_standing_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.account_standing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "standing read own or admin" ON public.account_standing AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.app_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL,
  stars smallint,
  message text,
  contact_email text,
  platform text,
  app_version text,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT app_feedback_app_version_check CHECK (((app_version IS NULL) OR (char_length(app_version) <= 40))),
  CONSTRAINT app_feedback_contact_email_check CHECK (((contact_email IS NULL) OR ((char_length(contact_email) <= 320) AND (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)))),
  CONSTRAINT app_feedback_kind_check CHECK ((kind = ANY (ARRAY['bug'::text, 'idea'::text, 'other'::text, 'rating'::text]))),
  CONSTRAINT app_feedback_message_check CHECK (((message IS NULL) OR ((char_length(btrim(message)) >= 1) AND (char_length(btrim(message)) <= 4000)))),
  CONSTRAINT app_feedback_platform_check CHECK (((platform IS NULL) OR (char_length(platform) <= 40))),
  CONSTRAINT app_feedback_shape_ck CHECK (
CASE
    WHEN (kind = 'rating'::text) THEN (stars IS NOT NULL)
    ELSE ((message IS NOT NULL) AND (stars IS NULL))
END),
  CONSTRAINT app_feedback_stars_check CHECK (((stars IS NULL) OR ((stars >= 1) AND (stars <= 5)))),
  CONSTRAINT app_feedback_status_check CHECK ((status = ANY (ARRAY['open'::text, 'done'::text]))),
  CONSTRAINT app_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages feedback" ON public.app_feedback AS PERMISSIVE FOR UPDATE TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "read own feedback" ON public.app_feedback AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.app_settings (
  key text NOT NULL,
  value text NOT NULL,
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read app settings" ON public.app_settings AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));

CREATE TABLE public.areas (
  id text NOT NULL,
  name text NOT NULL,
  parent_id text,
  path ltree,
  area_type text,
  region text,
  lat double precision,
  lng double precision,
  elevation integer,
  avy_zone text,
  blurb text,
  route_count integer NOT NULL DEFAULT 0,
  elevation_ft integer,
  prominence_ft integer,
  parent_peak text,
  dominant_discipline text,
  coords_approx boolean NOT NULL DEFAULT false,
  name_search text,
  disciplines text[] NOT NULL DEFAULT '{}'::text[],
  approach text,
  approach_min integer,
  rock text,
  rock_basis text,
  aspect text,
  parking_lat double precision,
  parking_lng double precision,
  parking_name text,
  parking_note text,
  season_months smallint[],
  CONSTRAINT areas_pkey PRIMARY KEY (id),
  CONSTRAINT areas_approach_len CHECK (((approach IS NULL) OR ((char_length(approach) >= 1) AND (char_length(approach) <= 600)))),
  CONSTRAINT areas_approach_min_range CHECK (((approach_min IS NULL) OR ((approach_min >= 0) AND (approach_min <= 600)))),
  CONSTRAINT areas_aspect_check CHECK (((aspect IS NULL) OR (aspect = ANY (ARRAY['N'::text, 'NE'::text, 'E'::text, 'SE'::text, 'S'::text, 'SW'::text, 'W'::text, 'NW'::text, 'varies'::text])))),
  CONSTRAINT areas_parking_check CHECK ((((parking_lat IS NULL) AND (parking_lng IS NULL) AND (parking_name IS NULL)) OR (((parking_lat >= ('-90'::integer)::double precision) AND (parking_lat <= (90)::double precision)) AND ((parking_lng >= ('-180'::integer)::double precision) AND (parking_lng <= (180)::double precision)) AND (parking_lat <> (0)::double precision) AND (parking_lng <> (0)::double precision)))),
  CONSTRAINT areas_parking_note_check CHECK (((parking_note IS NULL) OR ((length(parking_note) >= 5) AND (length(parking_note) <= 400)))),
  CONSTRAINT areas_rock_basis_check CHECK ((((rock IS NULL) AND (rock_basis IS NULL)) OR ((rock IS NOT NULL) AND (rock_basis = ANY (ARRAY['stated'::text, 'mapped'::text, 'researched'::text]))))),
  CONSTRAINT areas_rock_len CHECK (((rock IS NULL) OR ((char_length(rock) >= 1) AND (char_length(rock) <= 40)))),
  CONSTRAINT areas_root_must_be_country CHECK (((parent_id IS NOT NULL) OR (area_type = 'country'::text))),
  CONSTRAINT areas_season_months_check CHECK (months_ok(season_months)),
  CONSTRAINT areas_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES areas(id)
);
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "areas public read" ON public.areas AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.belay_catches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  belayer_id uuid NOT NULL,
  climber_id uuid NOT NULL,
  climb_log_id uuid,
  date_occurred date NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  filed_by uuid,
  CONSTRAINT belay_catches_pkey PRIMARY KEY (id),
  CONSTRAINT belay_catches_not_self CHECK ((belayer_id <> climber_id)),
  CONSTRAINT belay_catches_belayer_id_fkey FOREIGN KEY (belayer_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT belay_catches_climb_log_id_fkey FOREIGN KEY (climb_log_id) REFERENCES climb_logs(id) ON DELETE SET NULL,
  CONSTRAINT belay_catches_climber_id_fkey FOREIGN KEY (climber_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT belay_catches_filed_by_fkey FOREIGN KEY (filed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.belay_catches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log belay catches" ON public.belay_catches AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = belayer_id) OR (auth.uid() = climber_id)));
CREATE POLICY "view own belay catches" ON public.belay_catches AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = belayer_id) OR (auth.uid() = climber_id)));

CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker uuid NOT NULL,
  blocked uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_pkey PRIMARY KEY (id),
  CONSTRAINT blocked_users_no_self CHECK ((blocker <> blocked)),
  CONSTRAINT blocked_users_blocked_fkey FOREIGN KEY (blocked) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT blocked_users_blocker_fkey FOREIGN KEY (blocker) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked delete own" ON public.blocked_users AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = blocker));
CREATE POLICY "blocked insert own" ON public.blocked_users AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = blocker));
CREATE POLICY "blocked read own" ON public.blocked_users AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = blocker));

CREATE TABLE public.cert_track_disciplines (
  cert_track text NOT NULL,
  discipline text NOT NULL,
  CONSTRAINT cert_track_disciplines_pkey PRIMARY KEY (cert_track, discipline)
);
ALTER TABLE public.cert_track_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_track_disciplines public read" ON public.cert_track_disciplines AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.climb_log_confirmations (
  log_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  verdict text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT climb_log_confirmations_pkey PRIMARY KEY (log_id, partner_id),
  CONSTRAINT climb_log_confirmations_verdict_check CHECK ((verdict = ANY (ARRAY['confirmed'::text, 'denied'::text]))),
  CONSTRAINT climb_log_confirmations_log_id_fkey FOREIGN KEY (log_id) REFERENCES climb_logs(id) ON DELETE CASCADE,
  CONSTRAINT climb_log_confirmations_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.climb_log_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confirmations read by either party" ON public.climb_log_confirmations AS PERMISSIVE FOR SELECT TO public USING (((partner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM climb_logs l
  WHERE ((l.id = climb_log_confirmations.log_id) AND (l.user_id = auth.uid()))))));

CREATE TABLE public.climb_log_partner_names (
  log_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  names text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT climb_log_partner_names_pkey PRIMARY KEY (log_id),
  CONSTRAINT climb_log_partner_names_len CHECK ((length(array_to_string(names, ''::text)) <= 2000)),
  CONSTRAINT climb_log_partner_names_size CHECK ((cardinality(names) <= 20)),
  CONSTRAINT climb_log_partner_names_log_id_fkey FOREIGN KEY (log_id) REFERENCES climb_logs(id) ON DELETE CASCADE,
  CONSTRAINT climb_log_partner_names_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.climb_log_partner_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner names read by the climber" ON public.climb_log_partner_names AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "partner names removed by the climber" ON public.climb_log_partner_names AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "partner names updated by the climber" ON public.climb_log_partner_names AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM climb_logs l
  WHERE ((l.id = climb_log_partner_names.log_id) AND (l.user_id = auth.uid()))))));
CREATE POLICY "partner names written by the climber" ON public.climb_log_partner_names AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM climb_logs l
  WHERE ((l.id = climb_log_partner_names.log_id) AND (l.user_id = auth.uid()))))));

CREATE TABLE public.climb_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  route_id text NOT NULL,
  crew_id uuid,
  discipline text NOT NULL,
  date_climbed date NOT NULL,
  stars integer,
  cond_tags text[] DEFAULT '{}'::text[],
  notes text,
  partners uuid[] DEFAULT '{}'::uuid[],
  party_size integer,
  car_to_car_minutes integer,
  approach_minutes integer,
  climb_minutes integer,
  descent_minutes integer,
  snow_condition text,
  freezing_level_ft integer,
  water_level text,
  bug_pressure text,
  trail_condition text,
  protection_quality text,
  anchor_quality text,
  crowd_level text,
  belayed_by uuid,
  caught_fall boolean DEFAULT false,
  photos jsonb DEFAULT '[]'::jsonb,
  trip_report_visibility text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  fa_ascent boolean DEFAULT false,
  developed boolean DEFAULT false,
  beta text,
  gear_beta text,
  sun_vote text,
  sun_note text,
  outcome_reasons text[] DEFAULT '{}'::text[],
  outcome_note text,
  gpx_track jsonb,
  itinerary jsonb,
  tick_type text,
  temp_f integer,
  snow_depth text,
  seepage text,
  mud text,
  photo_taken_on date,
  photo_near_route boolean,
  road_note text,
  photo_hash text,
  rappel_count integer,
  rappel_longest_m integer,
  rappel_rope text,
  moderation text NOT NULL DEFAULT 'visible'::text,
  nights_out integer,
  camp_names text[],
  CONSTRAINT climb_logs_pkey PRIMARY KEY (id),
  CONSTRAINT climb_logs_camp_names_sane CHECK (((camp_names IS NULL) OR (((cardinality(camp_names) >= 1) AND (cardinality(camp_names) <= 10)) AND (char_length(array_to_string(camp_names, ''::text)) <= 1200)))),
  CONSTRAINT climb_logs_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT climb_logs_nights_out_sane CHECK (((nights_out IS NULL) OR ((nights_out >= 0) AND (nights_out <= 60)))),
  CONSTRAINT climb_logs_rappel_count_sane CHECK (((rappel_count IS NULL) OR ((rappel_count >= 0) AND (rappel_count <= 200)))),
  CONSTRAINT climb_logs_rappel_longest_sane CHECK (((rappel_longest_m IS NULL) OR ((rappel_longest_m >= 1) AND (rappel_longest_m <= 200)))),
  CONSTRAINT climb_logs_stars_check CHECK (((stars >= 1) AND (stars <= 5))),
  CONSTRAINT climb_logs_trip_report_visibility_check CHECK ((trip_report_visibility = ANY (ARRAY['private'::text, 'crew'::text, 'friends'::text, 'public'::text]))),
  CONSTRAINT climb_logs_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE SET NULL,
  CONSTRAINT climb_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.climb_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own logs" ON public.climb_logs AS PERMISSIVE FOR ALL TO public USING ((user_id = auth.uid()));
CREATE POLICY "moderation hides taken-down content" ON public.climb_logs AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (user_id = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.climb_logs AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));
CREATE POLICY "view crew logs" ON public.climb_logs AS PERMISSIVE FOR SELECT TO public USING (((trip_report_visibility = 'public'::text) OR ((trip_report_visibility = 'crew'::text) AND (crew_id IN ( SELECT crew_members.crew_id
   FROM crew_members
  WHERE ((crew_members.user_id = auth.uid()) AND (crew_members.status = 'confirmed'::text))))) OR ((trip_report_visibility = 'friends'::text) AND is_my_friend(user_id))));
CREATE POLICY "view own logs" ON public.climb_logs AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));

CREATE TABLE public.climber_resumes (
  user_id uuid NOT NULL,
  headline text NOT NULL DEFAULT ''::text,
  courses jsonb NOT NULL DEFAULT '[]'::jsonb,
  climbs jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT climber_resumes_pkey PRIMARY KEY (user_id),
  CONSTRAINT climber_resumes_climbs_check CHECK (((jsonb_typeof(climbs) = 'array'::text) AND (jsonb_array_length(climbs) <= 400))),
  CONSTRAINT climber_resumes_courses_check CHECK (((jsonb_typeof(courses) = 'array'::text) AND (jsonb_array_length(courses) <= 60))),
  CONSTRAINT climber_resumes_headline_check CHECK ((char_length(headline) <= 200)),
  CONSTRAINT climber_resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.climber_resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resume owner delete" ON public.climber_resumes AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "resume owner insert" ON public.climber_resumes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "resume owner or public read" ON public.climber_resumes AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = climber_resumes.user_id) AND p.resume_public)))));
CREATE POLICY "resume owner update" ON public.climber_resumes AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.comment_reactions (
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comment_reactions_pkey PRIMARY KEY (comment_id, user_id),
  CONSTRAINT comment_reactions_reaction_check CHECK ((reaction ~ '^[a-z0-9]{1,24}$'::text)),
  CONSTRAINT comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comment reactions delete own" ON public.comment_reactions AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "comment reactions insert own" ON public.comment_reactions AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (reaction ~ '^[a-z0-9]{1,24}$'::text) AND (EXISTS ( SELECT 1
   FROM comments c
  WHERE (c.id = comment_reactions.comment_id)))));
CREATE POLICY "comment reactions read where the comment is" ON public.comment_reactions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM comments c
  WHERE (c.id = comment_reactions.comment_id))));
CREATE POLICY "comment reactions update own" ON public.comment_reactions AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (reaction ~ '^[a-z0-9]{1,24}$'::text)));

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  target_id text NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid,
  text text NOT NULL,
  edited boolean NOT NULL DEFAULT false,
  deleted boolean NOT NULL DEFAULT false,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  moderation text NOT NULL DEFAULT 'visible'::text,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_likes_check CHECK ((likes >= 0)),
  CONSTRAINT comments_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed can comment" ON public.comments AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND comment_target_readable(target_id)));
CREATE POLICY "comments read where the target is readable" ON public.comments AS PERMISSIVE FOR SELECT TO public USING (comment_target_readable(target_id));
CREATE POLICY "delete own comment" ON public.comments AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "edit own comment" ON public.comments AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "moderation hides taken-down content" ON public.comments AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (user_id = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.comments AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.connection_events (
  id bigint NOT NULL DEFAULT nextval('connection_events_id_seq'::regclass),
  requester uuid NOT NULL,
  addressee uuid NOT NULL,
  kind text NOT NULL,
  at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT connection_events_pkey PRIMARY KEY (id),
  CONSTRAINT connection_events_kind_check CHECK ((kind = ANY (ARRAY['requested'::text, 'withdrawn'::text, 'declined'::text]))),
  CONSTRAINT connection_events_addressee_fkey FOREIGN KEY (addressee) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT connection_events_requester_fkey FOREIGN KEY (requester) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.connection_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester uuid NOT NULL,
  addressee uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  note text,
  CONSTRAINT connections_pkey PRIMARY KEY (id),
  CONSTRAINT connections_no_self CHECK ((requester <> addressee)),
  CONSTRAINT connections_note_len CHECK (((note IS NULL) OR (char_length(note) <= 300))),
  CONSTRAINT connections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]))),
  CONSTRAINT connections_addressee_fkey FOREIGN KEY (addressee) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT connections_requester_fkey FOREIGN KEY (requester) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connections read own" ON public.connections AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = requester) OR (auth.uid() = addressee)));
CREATE POLICY "connections remove either side" ON public.connections AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = requester) OR (auth.uid() = addressee)));
CREATE POLICY "connections request own" ON public.connections AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = requester) AND (status = 'pending'::text)));
CREATE POLICY "connections respond as addressee" ON public.connections AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = addressee) AND (status = 'pending'::text))) WITH CHECK ((status = ANY (ARRAY['accepted'::text, 'declined'::text])));
CREATE POLICY "restricted accounts cannot post" ON public.connections AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.content_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL,
  route_id text,
  reporter uuid,
  reason text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT content_reports_pkey PRIMARY KEY (id),
  CONSTRAINT content_reports_reason_chk CHECK ((reason = ANY (ARRAY['not_this_route'::text, 'inappropriate'::text, 'not_their_photo'::text, 'other'::text]))),
  CONSTRAINT content_reports_status_chk CHECK ((status = ANY (ARRAY['open'::text, 'dismissed'::text]))),
  CONSTRAINT content_reports_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES contributions(id) ON DELETE CASCADE,
  CONSTRAINT content_reports_reporter_fkey FOREIGN KEY (reporter) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT content_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT content_reports_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
);
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "file your own report" ON public.content_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK (((reporter = auth.uid()) AND (status = 'open'::text)));
CREATE POLICY "only an admin reviews" ON public.content_reports AS PERMISSIVE FOR UPDATE TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "your own reports, or an admin reads all" ON public.content_reports AS PERMISSIVE FOR SELECT TO public USING (((reporter = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.contribution_fields (
  form_key text NOT NULL,
  column_name text,
  is_prose boolean NOT NULL DEFAULT false,
  is_gear boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  CONSTRAINT contribution_fields_pkey PRIMARY KEY (form_key)
);
ALTER TABLE public.contribution_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contribution fields public read" ON public.contribution_fields AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.contribution_standing (
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ok'::text,
  strikes integer NOT NULL DEFAULT 0,
  until timestamp with time zone,
  reason text,
  last_strike_at timestamp with time zone,
  set_by uuid,
  set_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contribution_standing_pkey PRIMARY KEY (user_id),
  CONSTRAINT contribution_standing_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'warned'::text, 'restricted'::text, 'banned'::text]))),
  CONSTRAINT contribution_standing_strikes_check CHECK ((strikes >= 0)),
  CONSTRAINT contribution_standing_until_only_when_restricted CHECK (((status = 'restricted'::text) OR (until IS NULL))),
  CONSTRAINT contribution_standing_set_by_fkey FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT contribution_standing_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.contribution_standing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contribution standing read own or admin" ON public.contribution_standing AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id text,
  area_id text,
  kind text NOT NULL,
  field text,
  value jsonb,
  contributor text DEFAULT (auth.uid())::text,
  created_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_note text,
  applied_value jsonb,
  reason text,
  result_id text,
  CONSTRAINT contributions_pkey PRIMARY KEY (id),
  CONSTRAINT contributions_applied_value_len_ck CHECK (((applied_value IS NULL) OR (length((applied_value)::text) <= 20000))),
  CONSTRAINT contributions_area_field_ck CHECK (((NOT ((area_id IS NOT NULL) AND (route_id IS NULL) AND (kind = 'field'::text))) OR (field = ANY (ARRAY['blurb'::text, 'approach'::text, 'approach_min'::text, 'parking_note'::text, 'rock'::text, 'aspect'::text, 'season_months'::text])))),
  CONSTRAINT contributions_pair_shape_ck CHECK (((kind IS DISTINCT FROM 'pair'::text) OR ((route_id IS NOT NULL) AND (jsonb_typeof(value) = 'object'::text) AND (COALESCE((value ->> 'with'::text), ''::text) <> ''::text) AND ((value ->> 'with'::text) <> route_id) AND (length(COALESCE((value ->> 'note'::text), ''::text)) <= 280)))),
  CONSTRAINT contributions_reason_len_ck CHECK (((reason IS NULL) OR (char_length(reason) <= 1000))),
  CONSTRAINT contributions_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
  CONSTRAINT contributions_value_len_ck CHECK (((value IS NULL) OR (length((value)::text) <= 20000))),
  CONSTRAINT contributions_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
  CONSTRAINT contributions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT contributions_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed can contribute" ON public.contributions AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() IS NOT NULL) AND (contributor = (auth.uid())::text)));
CREATE POLICY "contribution standing allows field edits" ON public.contributions AS RESTRICTIVE FOR INSERT TO public WITH CHECK (((kind <> 'field'::text) OR can_contribute_fields(auth.uid())));
CREATE POLICY "contributions public read" ON public.contributions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "own photo or pairing, or an admin" ON public.contributions AS PERMISSIVE FOR DELETE TO public USING ((((kind = ANY (ARRAY['photo'::text, 'pair'::text])) AND (contributor IS NOT NULL) AND (contributor = (auth.uid())::text)) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.contributions AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.crew_day_acks (
  crew_id uuid NOT NULL,
  user_id uuid NOT NULL,
  date date NOT NULL,
  CONSTRAINT crew_day_acks_pkey PRIMARY KEY (crew_id, user_id, date),
  CONSTRAINT crew_day_acks_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT crew_day_acks_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.crew_day_acks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew members can read acks" ON public.crew_day_acks AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crew_day_acks.crew_id) AND (m.user_id = auth.uid()) AND (m.status = 'confirmed'::text)))) OR (EXISTS ( SELECT 1
   FROM crews c
  WHERE ((c.id = crew_day_acks.crew_id) AND (c.created_by = auth.uid()))))));
CREATE POLICY "members ack their own day" ON public.crew_day_acks AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crew_day_acks.crew_id) AND (m.user_id = auth.uid()) AND (m.status = 'confirmed'::text))))));
CREATE POLICY "members un-ack their own day" ON public.crew_day_acks AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));

CREATE TABLE public.crew_email_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  claimed_by uuid,
  claimed_at timestamp with time zone,
  CONSTRAINT crew_email_invites_pkey PRIMARY KEY (id),
  CONSTRAINT crew_email_invites_crew_id_email_key UNIQUE (crew_id, email),
  CONSTRAINT crew_email_invites_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT crew_email_invites_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT crew_email_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.crew_email_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew or invitee can read email invites" ON public.crew_email_invites AS PERMISSIVE FOR SELECT TO public USING (((invited_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crew_email_invites.crew_id) AND (m.user_id = auth.uid())))) OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))));
CREATE POLICY "inviter or organizer can withdraw" ON public.crew_email_invites AS PERMISSIVE FOR DELETE TO public USING (((invited_by = auth.uid()) OR (auth.uid() = ( SELECT crews.created_by
   FROM crews
  WHERE (crews.id = crew_email_invites.crew_id)))));
CREATE POLICY "organizer can invite by email" ON public.crew_email_invites AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = ( SELECT crews.created_by
   FROM crews
  WHERE (crews.id = crew_email_invites.crew_id))));

CREATE TABLE public.crew_members (
  crew_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'invited'::text,
  note text,
  joined_at timestamp with time zone DEFAULT now(),
  invited_by uuid DEFAULT auth.uid(),
  gear_claims text[] NOT NULL DEFAULT '{}'::text[],
  gear_extras text[] NOT NULL DEFAULT '{}'::text[],
  gear_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  gear_wanted jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT crew_members_pkey PRIMARY KEY (crew_id, user_id),
  CONSTRAINT crew_members_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT crew_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT crew_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew membership is public read" ON public.crew_members AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "join or invite" ON public.crew_members AS PERMISSIVE FOR INSERT TO public WITH CHECK (((invited_by = auth.uid()) AND ((auth.uid() = ( SELECT crews.created_by
   FROM crews
  WHERE (crews.id = crew_members.crew_id))) OR ((auth.uid() = user_id) AND (status = 'pending'::text)))));
CREATE POLICY "member updates own membership" ON public.crew_members AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND ((status <> 'confirmed'::text) OR (invited_by = ( SELECT crews.created_by
   FROM crews
  WHERE (crews.id = crew_members.crew_id))))));
CREATE POLICY "organizer updates membership" ON public.crew_members AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = ( SELECT crews.created_by
   FROM crews
  WHERE (crews.id = crew_members.crew_id)))) WITH CHECK ((auth.uid() = ( SELECT crews.created_by
   FROM crews
  WHERE (crews.id = crew_members.crew_id))));
CREATE POLICY "restricted accounts cannot post" ON public.crew_members AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));
CREATE POLICY "self or organizer can remove membership" ON public.crew_members AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = user_id) OR (auth.uid() = ( SELECT crews.created_by
   FROM crews
  WHERE (crews.id = crew_members.crew_id)))));

CREATE TABLE public.crew_past_state (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  crew_id uuid NOT NULL,
  state text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT crew_past_state_pkey PRIMARY KEY (user_id, crew_id),
  CONSTRAINT crew_past_state_state_check CHECK ((state = ANY (ARRAY['archived'::text, 'cleared'::text]))),
  CONSTRAINT crew_past_state_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT crew_past_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.crew_past_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own past crew state delete" ON public.crew_past_state AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "own past crew state insert" ON public.crew_past_state AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own past crew state read" ON public.crew_past_state AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "own past crew state update" ON public.crew_past_state AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.crew_reads (
  crew_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT crew_reads_pkey PRIMARY KEY (crew_id, user_id),
  CONSTRAINT crew_reads_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT crew_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.crew_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own crew read marks" ON public.crew_reads AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.crew_safety_answers (
  crew_id uuid NOT NULL,
  user_id uuid NOT NULL,
  risk_tolerance text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ready_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT crew_safety_answers_pkey PRIMARY KEY (crew_id, user_id),
  CONSTRAINT crew_safety_answers_risk_tolerance_check CHECK ((risk_tolerance = ANY (ARRAY['conservative'::text, 'moderate'::text, 'aggressive'::text]))),
  CONSTRAINT crew_safety_answers_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT crew_safety_answers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.crew_safety_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own safety answers delete" ON public.crew_safety_answers AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY "own safety answers insert" ON public.crew_safety_answers AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crew_safety_answers.crew_id) AND (m.user_id = auth.uid()) AND (m.status = 'confirmed'::text))))));
CREATE POLICY "own safety answers read" ON public.crew_safety_answers AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY "own safety answers update" ON public.crew_safety_answers AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crew_safety_answers.crew_id) AND (m.user_id = auth.uid()) AND (m.status = 'confirmed'::text))))));

CREATE TABLE public.crews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id text,
  created_by uuid,
  dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  meet_time text,
  meet_place text,
  float_plan jsonb,
  cap integer NOT NULL DEFAULT 4,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  agreed_date text,
  date_forced boolean NOT NULL DEFAULT false,
  itinerary jsonb,
  itinerary_by uuid,
  area_id text,
  discipline text,
  CONSTRAINT crews_pkey PRIMARY KEY (id),
  CONSTRAINT crews_area_needs_discipline CHECK (((area_id IS NULL) OR (discipline IS NOT NULL))),
  CONSTRAINT crews_discipline_values CHECK (((discipline IS NULL) OR (discipline = ANY (ARRAY['sport'::text, 'trad'::text, 'toprope'::text, 'aid'::text, 'bouldering'::text, 'scrambling'::text, 'hiking'::text, 'alpine'::text, 'mountaineering'::text, 'ice'::text, 'mixed'::text])))),
  CONSTRAINT crews_itinerary_size CHECK (((itinerary IS NULL) OR (pg_column_size(itinerary) < 65536))),
  CONSTRAINT crews_one_place CHECK (((((route_id IS NOT NULL))::integer + ((area_id IS NOT NULL))::integer) = 1)),
  CONSTRAINT crews_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id),
  CONSTRAINT crews_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT crews_itinerary_by_fkey FOREIGN KEY (itinerary_by) REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can create crews" ON public.crews AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "crew members can read" ON public.crews AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crews.id) AND (m.user_id = auth.uid()) AND (m.status <> 'pending'::text))))));
CREATE POLICY "organizer can delete own crew" ON public.crews AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = created_by));
CREATE POLICY "organizer can update own crew" ON public.crews AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = created_by));
CREATE POLICY "restricted accounts cannot post" ON public.crews AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.crews_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  moderation text NOT NULL DEFAULT 'visible'::text,
  CONSTRAINT crews_messages_pkey PRIMARY KEY (id),
  CONSTRAINT crews_messages_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT crews_messages_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES crews(id) ON DELETE CASCADE,
  CONSTRAINT crews_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.crews_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew members can read messages" ON public.crews_messages AS PERMISSIVE FOR SELECT TO public USING (((EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crews_messages.crew_id) AND (m.user_id = auth.uid()) AND (m.status = 'confirmed'::text)))) OR (EXISTS ( SELECT 1
   FROM crews c
  WHERE ((c.id = crews_messages.crew_id) AND (c.created_by = auth.uid()))))));
CREATE POLICY "crew members can send messages" ON public.crews_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND ((EXISTS ( SELECT 1
   FROM crew_members m
  WHERE ((m.crew_id = crews_messages.crew_id) AND (m.user_id = auth.uid()) AND (m.status = 'confirmed'::text)))) OR (EXISTS ( SELECT 1
   FROM crews c
  WHERE ((c.id = crews_messages.crew_id) AND (c.created_by = auth.uid())))))));
CREATE POLICY "moderation hides taken-down content" ON public.crews_messages AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (user_id = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.crews_messages AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.data_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT data_requests_pkey PRIMARY KEY (id),
  CONSTRAINT data_requests_kind_check CHECK ((kind = ANY (ARRAY['export'::text, 'delete'::text, 'access'::text, 'correction'::text, 'optout'::text, 'other'::text]))),
  CONSTRAINT data_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'done'::text, 'rejected'::text]))),
  CONSTRAINT data_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages data requests" ON public.data_requests AS PERMISSIVE FOR UPDATE TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "raise own data request" ON public.data_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_id = auth.uid()) AND (status = 'open'::text)));
CREATE POLICY "read own data requests" ON public.data_requests AS PERMISSIVE FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.edge_rate_events (
  id bigint NOT NULL DEFAULT nextval('edge_rate_events_id_seq'::regclass),
  bucket text NOT NULL,
  key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT edge_rate_events_pkey PRIMARY KEY (id)
);
ALTER TABLE public.edge_rate_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.gps_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  type text NOT NULL,
  recipient_email text,
  recipient_name text,
  route_name text,
  quality_score integer,
  status text DEFAULT 'sent'::text,
  admin_notes text,
  feedback text,
  action_url text,
  climber_name text,
  climber_email text,
  email_sent boolean NOT NULL DEFAULT false,
  email_error text,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gps_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT gps_notifications_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'pending_review'::text, 'action_needed'::text, 'rejected'::text, 'auto_approved'::text, 'needs_improvement'::text]))),
  CONSTRAINT gps_notifications_type_check CHECK ((type = ANY (ARRAY['climber_thank_you'::text, 'climber_needs_improvement'::text, 'admin_auto_approved'::text, 'admin_needs_review'::text]))),
  CONSTRAINT gps_notifications_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES gps_submissions(id) ON DELETE CASCADE
);
ALTER TABLE public.gps_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Climbers can read their own notifications" ON public.gps_notifications AS PERMISSIVE FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND (climber_email = (auth.jwt() ->> 'email'::text))));
CREATE POLICY "Service role can manage notifications" ON public.gps_notifications AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text));

CREATE TABLE public.gps_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id text NOT NULL,
  climber_email text,
  climber_name text DEFAULT 'Anonymous'::text,
  gpx_data jsonb NOT NULL,
  device_type text,
  climb_date date,
  notes text,
  quality_score integer DEFAULT 0,
  status text DEFAULT 'pending'::text,
  issues jsonb DEFAULT '[]'::jsonb,
  submitted_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  admin_notes text,
  CONSTRAINT gps_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT gps_submissions_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);
ALTER TABLE public.gps_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY anyone_can_read_approved_gps ON public.gps_submissions AS PERMISSIVE FOR SELECT TO public USING ((status = 'approved'::text));
CREATE POLICY users_can_read_own_gps ON public.gps_submissions AS PERMISSIVE FOR SELECT TO public USING ((climber_email = (auth.jwt() ->> 'email'::text)));

CREATE TABLE public.group_bans (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  banned_by uuid,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_bans_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_bans_reason_check CHECK (((reason IS NULL) OR (length(reason) <= 300))),
  CONSTRAINT group_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT group_bans_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT group_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bans are read by the group's managers" ON public.group_bans AS PERMISSIVE FOR SELECT TO public USING (is_group_manager(group_id));

CREATE TABLE public.group_event_invites (
  event_id uuid NOT NULL,
  invitee uuid NOT NULL,
  invited_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_event_invites_pkey PRIMARY KEY (event_id, invitee),
  CONSTRAINT group_event_invites_not_self CHECK ((invitee <> invited_by)),
  CONSTRAINT group_event_invites_event_id_fkey FOREIGN KEY (event_id) REFERENCES group_events(id) ON DELETE CASCADE,
  CONSTRAINT group_event_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT group_event_invites_invitee_fkey FOREIGN KEY (invitee) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_event_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event invites read by members or the invitee" ON public.group_event_invites AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = invitee) OR can_read_group_event(event_id)));
CREATE POLICY "event invites sent by members as themselves" ON public.group_event_invites AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = invited_by) AND can_invite_to_group_event(event_id, invitee)));
CREATE POLICY "event invites withdrawn by the sender or declined by the invite" ON public.group_event_invites AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = invited_by) OR (auth.uid() = invitee)));

CREATE TABLE public.group_event_rsvps (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_event_rsvps_pkey PRIMARY KEY (event_id, user_id),
  CONSTRAINT group_event_rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES group_events(id) ON DELETE CASCADE,
  CONSTRAINT group_event_rsvps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsvp as yourself" ON public.group_event_rsvps AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND can_read_group_event(event_id)));
CREATE POLICY "rsvps read by whoever can read the event" ON public.group_event_rsvps AS PERMISSIVE FOR SELECT TO public USING (can_read_group_event(event_id));
CREATE POLICY "withdraw your own rsvp" ON public.group_event_rsvps AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));

CREATE TABLE public.group_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  host uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  event_date date NOT NULL,
  event_time text,
  location text,
  descr text,
  capacity integer NOT NULL DEFAULT 0,
  repeat text,
  series_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  moderation text NOT NULL DEFAULT 'visible'::text,
  CONSTRAINT group_events_pkey PRIMARY KEY (id),
  CONSTRAINT group_events_capacity_check CHECK (((capacity >= 0) AND (capacity <= 500))),
  CONSTRAINT group_events_descr_check CHECK (((descr IS NULL) OR (length(descr) <= 2000))),
  CONSTRAINT group_events_event_time_check CHECK (((event_time IS NULL) OR (length(event_time) <= 40))),
  CONSTRAINT group_events_location_check CHECK (((location IS NULL) OR (length(location) <= 200))),
  CONSTRAINT group_events_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT group_events_repeat_check CHECK (((repeat IS NULL) OR (repeat = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text])))),
  CONSTRAINT group_events_title_check CHECK (((length(btrim(title)) >= 1) AND (length(btrim(title)) <= 120))),
  CONSTRAINT group_events_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT group_events_host_fkey FOREIGN KEY (host) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group events cancelled by host or a manager" ON public.group_events AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = host) OR is_group_manager(group_id)));
CREATE POLICY "group events created per the group's event policy" ON public.group_events AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = host) AND is_group_member(group_id) AND (is_group_manager(group_id) OR (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = group_events.group_id) AND (COALESCE(g.event_policy, 'anyone'::text) = 'anyone'::text)))))));
CREATE POLICY "group events edited by the host" ON public.group_events AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = host)) WITH CHECK ((auth.uid() = host));
CREATE POLICY "group events read by members or invitees" ON public.group_events AS PERMISSIVE FOR SELECT TO public USING ((is_group_member(group_id) OR is_invited_to_group_event(id)));
CREATE POLICY "moderation hides taken-down content" ON public.group_events AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (host = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.group_events AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.group_join_answers (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_join_answers_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_join_answers_answers_check CHECK (((jsonb_typeof(answers) = 'array'::text) AND (jsonb_array_length(answers) <= 5))),
  CONSTRAINT group_join_answers_group_id_user_id_fkey FOREIGN KEY (group_id, user_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE
);
ALTER TABLE public.group_join_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "join answers read by the asker or a group manager" ON public.group_join_answers AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR is_group_manager(group_id)));

CREATE TABLE public.group_join_declines (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL,
  declined_by uuid,
  declined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_join_declines_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_join_declines_message_check CHECK (((length(btrim(message)) >= 1) AND (length(btrim(message)) <= 500))),
  CONSTRAINT group_join_declines_declined_by_fkey FOREIGN KEY (declined_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT group_join_declines_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT group_join_declines_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_join_declines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "a decline is read by the climber and the group's managers" ON public.group_join_declines AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR is_group_manager(group_id)));
CREATE POLICY "the climber dismisses their own decline" ON public.group_join_declines AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));

CREATE TABLE public.group_member_prefs (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  notify text NOT NULL DEFAULT 'highlights'::text,
  last_seen_at timestamp with time zone,
  CONSTRAINT group_member_prefs_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_member_prefs_notify_check CHECK ((notify = ANY (ARRAY['all'::text, 'highlights'::text, 'off'::text]))),
  CONSTRAINT group_member_prefs_group_id_user_id_fkey FOREIGN KEY (group_id, user_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE
);
ALTER TABLE public.group_member_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group prefs are your own" ON public.group_member_prefs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "group prefs changed by the member" ON public.group_member_prefs AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND is_group_member(group_id)));
CREATE POLICY "group prefs cleared by the member" ON public.group_member_prefs AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "group prefs written by the member" ON public.group_member_prefs AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND is_group_member(group_id)));

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active'::text,
  invited_by uuid DEFAULT auth.uid(),
  rules_agreed_at timestamp with time zone,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id),
  CONSTRAINT group_members_role_check CHECK ((role = ANY (ARRAY['member'::text, 'moderator'::text, 'owner'::text]))),
  CONSTRAINT group_members_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'invited'::text, 'active'::text]))),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_members accept own invite" ON public.group_members AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = user_id) AND (status = 'invited'::text))) WITH CHECK (((auth.uid() = user_id) AND (status = 'active'::text) AND (role = 'member'::text) AND ((rules_agreed_at IS NOT NULL) OR (NOT group_has_rules(group_id)))));
CREATE POLICY "group_members approve request" ON public.group_members AS PERMISSIVE FOR UPDATE TO public USING ((is_group_manager(group_id) AND (status = 'pending'::text))) WITH CHECK ((is_group_manager(group_id) AND (status = 'active'::text) AND (role = 'member'::text)));
CREATE POLICY "group_members invite" ON public.group_members AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() <> user_id) AND (status = 'invited'::text) AND (role = 'member'::text) AND (invited_by = auth.uid()) AND (is_group_manager(group_id) OR (is_group_member(group_id) AND (group_invite_policy(group_id) = 'members'::text))) AND (NOT group_user_banned(group_id, user_id)) AND (NOT profile_owner_blocked_me(user_id))));
CREATE POLICY "group_members join self" ON public.group_members AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (role = 'member'::text) AND (NOT group_user_banned(group_id, auth.uid())) AND (((status = 'active'::text) AND (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = group_members.group_id) AND (g.visibility = 'public'::text) AND (g.policy = 'open'::text) AND (jsonb_array_length(g.rules) = 0))))) OR ((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = group_members.group_id) AND (g.visibility = 'public'::text) AND (g.policy = ANY (ARRAY['approval'::text, 'trust'::text])) AND (jsonb_array_length(g.join_questions) = 0) AND (jsonb_array_length(g.rules) = 0))))))));
CREATE POLICY "group_members leave or be removed" ON public.group_members AS PERMISSIVE FOR DELETE TO public USING ((((auth.uid() = user_id) AND (role <> 'owner'::text)) OR (is_group_owner(group_id) AND (role <> 'owner'::text)) OR (is_group_manager(group_id) AND (role = 'member'::text)) OR ((status = 'invited'::text) AND (auth.uid() = invited_by))));
CREATE POLICY "group_members promote by owner" ON public.group_members AS PERMISSIVE FOR UPDATE TO public USING ((is_group_owner(group_id) AND (role <> 'owner'::text) AND (status = 'active'::text))) WITH CHECK ((is_group_owner(group_id) AND (role = ANY (ARRAY['member'::text, 'moderator'::text])) AND (status = 'active'::text)));
CREATE POLICY "group_members read own" ON public.group_members AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (auth.uid() = invited_by)));
CREATE POLICY "group_members read visible" ON public.group_members AS PERMISSIVE FOR SELECT TO public USING ((((status = 'active'::text) AND is_group_member(group_id)) OR is_group_manager(group_id)));
CREATE POLICY "restricted accounts cannot post" ON public.group_members AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.group_post_reactions (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  reaction text NOT NULL,
  CONSTRAINT group_post_reactions_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT group_post_reactions_reaction_check CHECK (((length(reaction) >= 1) AND (length(reaction) <= 32))),
  CONSTRAINT group_post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
  CONSTRAINT group_post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post reactions changed by their owner" ON public.group_post_reactions AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "post reactions cleared by their owner" ON public.group_post_reactions AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "post reactions read by members" ON public.group_post_reactions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM group_posts p
  WHERE ((p.id = group_post_reactions.post_id) AND is_group_member(p.group_id)))));
CREATE POLICY "post reactions set by members as themselves" ON public.group_post_reactions AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM group_posts p
  WHERE ((p.id = group_post_reactions.post_id) AND is_group_member(p.group_id))))));

CREATE TABLE public.group_post_saves (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_post_saves_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT group_post_saves_post_id_fkey FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE,
  CONSTRAINT group_post_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.group_post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "save a post you can read" ON public.group_post_saves AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM group_posts p
  WHERE (p.id = group_post_saves.post_id)))));
CREATE POLICY "saved posts are your own" ON public.group_post_saves AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "unsave your own" ON public.group_post_saves AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));

CREATE TABLE public.group_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  author uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_alts jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  pinned_at timestamp with time zone,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  topic text,
  moderation text NOT NULL DEFAULT 'visible'::text,
  CONSTRAINT group_posts_pkey PRIMARY KEY (id),
  CONSTRAINT group_posts_body_check CHECK (((length(btrim(body)) >= 1) AND (length(btrim(body)) <= 4000))),
  CONSTRAINT group_posts_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT group_posts_photo_alts_check CHECK ((jsonb_typeof(photo_alts) = 'object'::text)),
  CONSTRAINT group_posts_photos_check CHECK (((jsonb_typeof(photos) = 'array'::text) AND (jsonb_array_length(photos) <= 8))),
  CONSTRAINT group_posts_topic_check CHECK (((topic IS NULL) OR (topic = ANY (ARRAY['partner'::text, 'conditions'::text, 'gear'::text, 'beta'::text, 'trip'::text, 'question'::text])))),
  CONSTRAINT group_posts_author_fkey FOREIGN KEY (author) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT group_posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group posts deleted by author or a manager" ON public.group_posts AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = author) OR is_group_manager(group_id)));
CREATE POLICY "group posts edited by author or pinned by a manager" ON public.group_posts AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid() = author) OR is_group_manager(group_id))) WITH CHECK (((auth.uid() = author) OR is_group_manager(group_id)));
CREATE POLICY "group posts read by members" ON public.group_posts AS PERMISSIVE FOR SELECT TO public USING (is_group_member(group_id));
CREATE POLICY "group posts written by members as themselves" ON public.group_posts AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = author) AND is_group_member(group_id)));
CREATE POLICY "moderation hides taken-down content" ON public.group_posts AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (author = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.group_posts AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.group_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  target_kind text NOT NULL,
  target_id uuid,
  reported_user uuid,
  reporter uuid NOT NULL DEFAULT auth.uid(),
  reason text NOT NULL,
  detail text,
  snapshot text,
  status text NOT NULL DEFAULT 'open'::text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_reports_pkey PRIMARY KEY (id),
  CONSTRAINT group_reports_detail_check CHECK (((detail IS NULL) OR (length(detail) <= 1000))),
  CONSTRAINT group_reports_reason_check CHECK (((length(btrim(reason)) >= 1) AND (length(btrim(reason)) <= 80))),
  CONSTRAINT group_reports_snapshot_check CHECK (((snapshot IS NULL) OR (length(snapshot) <= 2000))),
  CONSTRAINT group_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'dismissed'::text]))),
  CONSTRAINT group_reports_target_kind_check CHECK ((target_kind = ANY (ARRAY['post'::text, 'comment'::text, 'member'::text]))),
  CONSTRAINT group_reports_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT group_reports_reported_user_fkey FOREIGN KEY (reported_user) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT group_reports_reporter_fkey FOREIGN KEY (reporter) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT group_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.group_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "a member reports as themselves" ON public.group_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = reporter) AND (status = 'open'::text) AND is_group_member(group_id)));
CREATE POLICY "reports are read by their reporter and the group's managers" ON public.group_reports AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = reporter) OR is_group_manager(group_id)));
CREATE POLICY "the group's managers close a report" ON public.group_reports AS PERMISSIVE FOR UPDATE TO public USING (is_group_manager(group_id)) WITH CHECK (is_group_manager(group_id));

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  blurb text,
  location text,
  disciplines text[] NOT NULL DEFAULT '{}'::text[],
  accent text,
  policy text NOT NULL DEFAULT 'open'::text,
  event_policy text NOT NULL DEFAULT 'anyone'::text,
  visibility text NOT NULL DEFAULT 'public'::text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  join_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  invite_policy text NOT NULL DEFAULT 'members'::text,
  moderation text NOT NULL DEFAULT 'visible'::text,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_event_policy_check CHECK ((event_policy = ANY (ARRAY['anyone'::text, 'mods'::text]))),
  CONSTRAINT groups_invite_policy_check CHECK ((invite_policy = ANY (ARRAY['members'::text, 'mods'::text]))),
  CONSTRAINT groups_join_questions_valid CHECK (group_join_questions_valid(join_questions)),
  CONSTRAINT groups_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT groups_name_check CHECK ((length(btrim(name)) > 0)),
  CONSTRAINT groups_policy_check CHECK ((policy = ANY (ARRAY['open'::text, 'approval'::text, 'trust'::text]))),
  CONSTRAINT groups_rules_valid CHECK (group_rules_valid(rules)),
  CONSTRAINT groups_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text]))),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups delete by owner" ON public.groups AS PERMISSIVE FOR DELETE TO public USING (is_group_owner(id));
CREATE POLICY "groups insert own" ON public.groups AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "groups read public or member" ON public.groups AS PERMISSIVE FOR SELECT TO public USING (((visibility = 'public'::text) OR is_group_member(id) OR is_group_invited(id)));
CREATE POLICY "groups update by manager" ON public.groups AS PERMISSIVE FOR UPDATE TO public USING (is_group_manager(id)) WITH CHECK (is_group_manager(id));
CREATE POLICY "moderation hides taken-down content" ON public.groups AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (created_by = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.groups AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));

CREATE TABLE public.guide_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL,
  kind text NOT NULL,
  cert_track text,
  cross_cutting_type text,
  label text,
  cert_number text,
  issuing_org text,
  status text NOT NULL DEFAULT 'pending'::text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_at timestamp with time zone,
  verified_expires_at timestamp with time zone,
  reviewed_by uuid,
  rejected_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT guide_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT guide_credentials_cert_track_check CHECK ((cert_track = ANY (ARRAY['SPI'::text, 'MPI'::text, 'RockGuide'::text, 'AlpineGuide'::text, 'SkiGuide'::text, 'IFMGA'::text]))),
  CONSTRAINT guide_credentials_cross_cutting_type_check CHECK ((cross_cutting_type = ANY (ARRAY['AIARE'::text, 'WFR'::text, 'other'::text]))),
  CONSTRAINT guide_credentials_kind_check CHECK ((kind = ANY (ARRAY['primary_track'::text, 'cross_cutting'::text]))),
  CONSTRAINT guide_credentials_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'lapsed'::text]))),
  CONSTRAINT guide_credentials_track_pairing CHECK ((((kind = 'primary_track'::text) AND (cert_track IS NOT NULL) AND (cross_cutting_type IS NULL)) OR ((kind = 'cross_cutting'::text) AND (cross_cutting_type IS NOT NULL) AND (cert_track IS NULL)))),
  CONSTRAINT guide_credentials_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE,
  CONSTRAINT guide_credentials_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.guide_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guide_credentials admin update" ON public.guide_credentials AS PERMISSIVE FOR UPDATE TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "guide_credentials read own or admin" ON public.guide_credentials AS PERMISSIVE FOR SELECT TO public USING (((guide_id = auth.uid()) OR is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM guide_profiles gp
  WHERE ((gp.id = guide_credentials.guide_id) AND (gp.status = 'active'::text))))));
CREATE POLICY "guide_credentials self insert pending" ON public.guide_credentials AS PERMISSIVE FOR INSERT TO public WITH CHECK (((guide_id = auth.uid()) AND (status = 'pending'::text) AND (verified_at IS NULL) AND (verified_expires_at IS NULL) AND (reviewed_by IS NULL)));
CREATE POLICY "guide_credentials self resubmit" ON public.guide_credentials AS PERMISSIVE FOR UPDATE TO public USING (((guide_id = auth.uid()) AND (status = ANY (ARRAY['rejected'::text, 'lapsed'::text])))) WITH CHECK (((guide_id = auth.uid()) AND (status = 'pending'::text) AND (verified_at IS NULL) AND (verified_expires_at IS NULL)));

CREATE TABLE public.guide_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL,
  credential_id uuid,
  doc_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT guide_documents_pkey PRIMARY KEY (id),
  CONSTRAINT guide_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['insurance_coi'::text, 'cert_card'::text]))),
  CONSTRAINT guide_documents_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES guide_credentials(id) ON DELETE SET NULL,
  CONSTRAINT guide_documents_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.guide_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guide_documents admin update" ON public.guide_documents AS PERMISSIVE FOR UPDATE TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "guide_documents read own or admin" ON public.guide_documents AS PERMISSIVE FOR SELECT TO public USING (((guide_id = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "guide_documents self insert" ON public.guide_documents AS PERMISSIVE FOR INSERT TO public WITH CHECK ((guide_id = auth.uid()));

CREATE TABLE public.guide_profiles (
  id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  title text,
  base_location text,
  specialty text,
  bio text,
  cancellation_policy text,
  lat double precision,
  lng double precision,
  day_rate integer,
  group_max integer,
  response_hrs integer,
  regions text[] NOT NULL DEFAULT '{}'::text[],
  languages text[] NOT NULL DEFAULT '{}'::text[],
  active_disciplines text[] NOT NULL DEFAULT '{}'::text[],
  insurance_carrier_name text,
  insurance_attested boolean NOT NULL DEFAULT false,
  permit_attested boolean NOT NULL DEFAULT false,
  waiver_process_attested boolean NOT NULL DEFAULT false,
  independent_contractor_attested boolean NOT NULL DEFAULT false,
  insurance_attested_at timestamp with time zone,
  permit_attested_at timestamp with time zone,
  waiver_process_attested_at timestamp with time zone,
  independent_contractor_attested_at timestamp with time zone,
  agreement_signed_name text,
  agreement_signed_at timestamp with time zone,
  submitted_at timestamp with time zone,
  listed_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT guide_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT guide_profiles_active_requires_attestations CHECK (((status <> 'active'::text) OR (insurance_attested AND permit_attested AND waiver_process_attested AND independent_contractor_attested))),
  CONSTRAINT guide_profiles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'active'::text, 'rejected'::text, 'delisted'::text]))),
  CONSTRAINT guide_profiles_id_fkey FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.guide_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guide_profiles public read active" ON public.guide_profiles AS PERMISSIVE FOR SELECT TO public USING (((status = 'active'::text) OR (id = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "guide_profiles self insert unlisted" ON public.guide_profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK (((id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'submitted'::text]))));
CREATE POLICY "guide_profiles self or admin update" ON public.guide_profiles AS PERMISSIVE FOR UPDATE TO public USING (((id = auth.uid()) OR is_admin(auth.uid()))) WITH CHECK (((id = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.hazard_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id text NOT NULL,
  hazard_label text NOT NULL,
  user_id uuid NOT NULL,
  vote text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hazard_votes_pkey PRIMARY KEY (id),
  CONSTRAINT hazard_votes_vote_check CHECK ((vote = ANY (ARRAY['still'::text, 'gone'::text]))),
  CONSTRAINT hazard_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.hazard_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hazard votes delete own" ON public.hazard_votes AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "hazard votes insert own" ON public.hazard_votes AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (vote = ANY (ARRAY['still'::text, 'gone'::text]))));
CREATE POLICY "hazard votes public read" ON public.hazard_votes AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "hazard votes update own" ON public.hazard_votes AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (vote = ANY (ARRAY['still'::text, 'gone'::text]))));

CREATE TABLE public.inquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL,
  climber_id uuid NOT NULL DEFAULT auth.uid(),
  objective text,
  requested_dates text,
  message text,
  party_size integer NOT NULL DEFAULT 1,
  includes_minor boolean NOT NULL DEFAULT false,
  climber_disclaimer_accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new'::text,
  guide_responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inquiries_pkey PRIMARY KEY (id),
  CONSTRAINT inquiries_status_check CHECK ((status = ANY (ARRAY['new'::text, 'accepted'::text, 'declined'::text, 'withdrawn'::text]))),
  CONSTRAINT inquiries_climber_id_fkey FOREIGN KEY (climber_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT inquiries_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiries climber insert new" ON public.inquiries AS PERMISSIVE FOR INSERT TO public WITH CHECK (((climber_id = auth.uid()) AND (status = 'new'::text) AND (guide_responded_at IS NULL)));
CREATE POLICY "inquiries guide update status" ON public.inquiries AS PERMISSIVE FOR UPDATE TO public USING ((guide_id = auth.uid())) WITH CHECK ((guide_id = auth.uid()));
CREATE POLICY "inquiries read own side or admin" ON public.inquiries AS PERMISSIVE FOR SELECT TO public USING (((climber_id = auth.uid()) OR (guide_id = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.kudos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  giver uuid NOT NULL DEFAULT auth.uid(),
  receiver uuid NOT NULL,
  climb_log_id uuid NOT NULL,
  route_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT kudos_pkey PRIMARY KEY (id),
  CONSTRAINT kudos_once_per_log UNIQUE (giver, climb_log_id),
  CONSTRAINT kudos_not_to_self CHECK ((giver <> receiver)),
  CONSTRAINT kudos_route_name_check CHECK (((route_name IS NULL) OR (length(route_name) <= 200))),
  CONSTRAINT kudos_climb_log_id_fkey FOREIGN KEY (climb_log_id) REFERENCES climb_logs(id) ON DELETE CASCADE,
  CONSTRAINT kudos_giver_fkey FOREIGN KEY (giver) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT kudos_receiver_fkey FOREIGN KEY (receiver) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kudos give as yourself" ON public.kudos AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = giver) AND (NOT profile_owner_blocked_me(receiver)) AND (EXISTS ( SELECT 1
   FROM climb_logs l
  WHERE ((l.id = kudos.climb_log_id) AND (l.user_id = kudos.receiver))))));
CREATE POLICY "kudos read by giver or receiver" ON public.kudos AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = giver) OR (auth.uid() = receiver)));
CREATE POLICY "kudos take back your own" ON public.kudos AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = giver));

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  image_url text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  moderation text NOT NULL DEFAULT 'visible'::text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation hides taken-down content" ON public.messages AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (sender_id = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.messages AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));
CREATE POLICY "users can delete their own messages" ON public.messages AS PERMISSIVE FOR DELETE TO public USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));
CREATE POLICY "users can mark own received messages as read" ON public.messages AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = recipient_id));
CREATE POLICY "users can read own messages" ON public.messages AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));
CREATE POLICY "users can send messages" ON public.messages AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = sender_id));

CREATE TABLE public.moderation_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  target_kind text NOT NULL,
  target_id text NOT NULL,
  target_owner uuid,
  report_id uuid,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT moderation_actions_pkey PRIMARY KEY (id),
  CONSTRAINT moderation_actions_action_check CHECK ((action = ANY (ARRAY['remove'::text, 'hold'::text, 'restore'::text, 'auto_hold'::text, 'suspend'::text, 'ban'::text, 'reinstate'::text, 'remove_all'::text, 'approve_contribution'::text, 'reject_contribution'::text, 'contrib_warn'::text, 'contrib_restrict'::text, 'contrib_ban'::text, 'contrib_reinstate'::text, 'lock_field'::text, 'unlock_field'::text, 'flag_fixed'::text, 'flag_dismissed'::text]))),
  CONSTRAINT moderation_actions_actor_fkey FOREIGN KEY (actor) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT moderation_actions_report_id_fkey FOREIGN KEY (report_id) REFERENCES user_reports(id) ON DELETE SET NULL
);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read moderation actions" ON public.moderation_actions AS PERMISSIVE FOR SELECT TO public USING (is_admin(auth.uid()));

CREATE TABLE public.moderation_appeals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appellant uuid NOT NULL,
  target_kind text NOT NULL,
  target_id text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamp with time zone,
  decision_note text,
  CONSTRAINT moderation_appeals_pkey PRIMARY KEY (id),
  CONSTRAINT moderation_appeals_message_check CHECK (((char_length(message) >= 1) AND (char_length(message) <= 2000))),
  CONSTRAINT moderation_appeals_status_check CHECK ((status = ANY (ARRAY['open'::text, 'upheld'::text, 'reversed'::text]))),
  CONSTRAINT moderation_appeals_appellant_fkey FOREIGN KEY (appellant) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT moderation_appeals_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appeals read own or admin" ON public.moderation_appeals AS PERMISSIVE FOR SELECT TO public USING (((appellant = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.notification_state (
  user_id uuid NOT NULL,
  seen_ids text[] NOT NULL DEFAULT '{}'::text[],
  dismissed_ids text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_state_pkey PRIMARY KEY (user_id),
  CONSTRAINT notification_state_dismissed_ids_check CHECK (((cardinality(dismissed_ids) <= 300) AND (pg_column_size(dismissed_ids) < 40000))),
  CONSTRAINT notification_state_seen_ids_check CHECK (((cardinality(seen_ids) <= 300) AND (pg_column_size(seen_ids) < 40000))),
  CONSTRAINT notification_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.notification_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delete own notification state" ON public.notification_state AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "insert own notification state" ON public.notification_state AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "read own notification state" ON public.notification_state AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "update own notification state" ON public.notification_state AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.objectives (
  user_id uuid NOT NULL,
  route_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT objectives_pkey PRIMARY KEY (user_id, route_id),
  CONSTRAINT objectives_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "objectives public read" ON public.objectives AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "users manage own objectives" ON public.objectives AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id));

CREATE TABLE public.partner_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  area_id text NOT NULL,
  disciplines text[] NOT NULL DEFAULT '{}'::text[],
  free_from date,
  free_to date,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT partner_areas_pkey PRIMARY KEY (id),
  CONSTRAINT partner_areas_user_id_area_id_key UNIQUE (user_id, area_id),
  CONSTRAINT partner_areas_disciplines_values CHECK ((disciplines <@ ARRAY['trad'::text, 'sport'::text, 'toprope'::text, 'aid'::text, 'bouldering'::text])),
  CONSTRAINT partner_areas_note_len CHECK (((note IS NULL) OR (length(note) <= 140))),
  CONSTRAINT partner_areas_window CHECK ((((free_from IS NULL) = (free_to IS NULL)) AND ((free_to IS NULL) OR (free_to >= free_from)))),
  CONSTRAINT partner_areas_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
  CONSTRAINT partner_areas_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.partner_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner lists own partner areas" ON public.partner_areas AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "owner reads own partner areas" ON public.partner_areas AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "owner removes own partner areas" ON public.partner_areas AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "owner updates own partner areas" ON public.partner_areas AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.profile_condition_prefs (
  user_id uuid NOT NULL,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_condition_prefs_pkey PRIMARY KEY (user_id),
  CONSTRAINT profile_condition_prefs_prefs_check CHECK (((jsonb_typeof(prefs) = 'object'::text) AND (pg_column_size(prefs) < 2000))),
  CONSTRAINT profile_condition_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.profile_condition_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delete own condition prefs" ON public.profile_condition_prefs AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "insert own condition prefs" ON public.profile_condition_prefs AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "read own condition prefs" ON public.profile_condition_prefs AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "update own condition prefs" ON public.profile_condition_prefs AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.profile_emergency_contacts (
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_emergency_contacts_pkey PRIMARY KEY (user_id),
  CONSTRAINT profile_emergency_contacts_name_check CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 80))),
  CONSTRAINT profile_emergency_contacts_phone_check CHECK (((length(btrim(phone)) >= 3) AND (length(btrim(phone)) <= 32))),
  CONSTRAINT profile_emergency_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.profile_emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delete own emergency contact" ON public.profile_emergency_contacts AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "insert own emergency contact" ON public.profile_emergency_contacts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "read own emergency contact" ON public.profile_emergency_contacts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "update own emergency contact" ON public.profile_emergency_contacts AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.profile_tracked_lists (
  user_id uuid NOT NULL,
  keys text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_tracked_lists_pkey PRIMARY KEY (user_id),
  CONSTRAINT profile_tracked_lists_keys_check CHECK (((cardinality(keys) <= 40) AND (pg_column_size(keys) < 2000))),
  CONSTRAINT profile_tracked_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.profile_tracked_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delete own tracked lists" ON public.profile_tracked_lists AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "insert own tracked lists" ON public.profile_tracked_lists AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "read own tracked lists" ON public.profile_tracked_lists AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "update own tracked lists" ON public.profile_tracked_lists AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.profile_zips (
  user_id uuid NOT NULL,
  zip text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_zips_pkey PRIMARY KEY (user_id),
  CONSTRAINT profile_zips_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT profile_zips_zip_fkey FOREIGN KEY (zip) REFERENCES zip_centroids(zip)
);
ALTER TABLE public.profile_zips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delete own zip" ON public.profile_zips AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "insert own zip" ON public.profile_zips AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "read own zip" ON public.profile_zips AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "update own zip" ON public.profile_zips AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text,
  name text,
  bio text,
  location text,
  avatar text,
  sport_grade text,
  trad_grade text,
  boulder_grade text,
  disciplines jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false,
  account_type text DEFAULT 'primary'::text,
  primary_account_id uuid,
  discoverable boolean NOT NULL DEFAULT true,
  terms_accepted_version text,
  terms_accepted_at timestamp with time zone,
  photos text[] NOT NULL DEFAULT '{}'::text[],
  photos_public boolean NOT NULL DEFAULT true,
  show_name boolean NOT NULL DEFAULT false,
  resume_public boolean NOT NULL DEFAULT true,
  show_on_ranks boolean NOT NULL DEFAULT true,
  certifications text[],
  skills text[],
  mutuals_visible boolean NOT NULL DEFAULT true,
  pinned_states text[],
  photo_alts jsonb,
  availability text[] NOT NULL DEFAULT '{}'::text[],
  avail_week text[] NOT NULL DEFAULT '{}'::text[],
  hiking_speed_ft_hr integer,
  level text,
  climb_grades jsonb,
  belay_devices jsonb,
  cert_expiry jsonb,
  free_until date,
  requests_from text NOT NULL DEFAULT 'everyone'::text,
  trip_reports_default text NOT NULL DEFAULT 'public'::text,
  climbing_since smallint,
  gender text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_account_type_check CHECK ((account_type = ANY (ARRAY['primary'::text, 'secondary'::text]))),
  CONSTRAINT profiles_avail_week_values CHECK ((avail_week <@ ARRAY['mon_am'::text, 'mon_pm'::text, 'tue_am'::text, 'tue_pm'::text, 'wed_am'::text, 'wed_pm'::text, 'thu_am'::text, 'thu_pm'::text, 'fri_am'::text, 'fri_pm'::text, 'sat_am'::text, 'sat_pm'::text, 'sun_am'::text, 'sun_pm'::text])),
  CONSTRAINT profiles_availability_values CHECK ((availability <@ ARRAY['weekends'::text, 'weekday_am'::text, 'weekday_pm'::text, 'flexible'::text])),
  CONSTRAINT profiles_climbing_since_range CHECK (((climbing_since IS NULL) OR ((climbing_since >= 1930) AND (climbing_since <= 2100)))),
  CONSTRAINT profiles_gender_known CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['woman'::text, 'man'::text, 'non_binary'::text])))),
  CONSTRAINT profiles_hiking_speed_range CHECK (((hiking_speed_ft_hr IS NULL) OR ((hiking_speed_ft_hr >= 100) AND (hiking_speed_ft_hr <= 6000)))),
  CONSTRAINT profiles_level_check CHECK (((level IS NULL) OR (level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text, 'Expert'::text])))),
  CONSTRAINT profiles_photo_alts_is_object CHECK (((photo_alts IS NULL) OR (jsonb_typeof(photo_alts) = 'object'::text))),
  CONSTRAINT profiles_requests_from_chk CHECK ((requests_from = ANY (ARRAY['everyone'::text, 'friends_of_friends'::text, 'nobody'::text]))),
  CONSTRAINT profiles_trip_reports_default_check CHECK ((trip_reports_default = ANY (ARRAY['public'::text, 'friends'::text, 'private'::text]))),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_primary_account_id_fkey FOREIGN KEY (primary_account_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "edit own profile" ON public.profiles AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "profiles public read" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() IS NULL) OR (auth.uid() = id) OR (NOT profile_owner_blocked_me(id))));
CREATE POLICY "restricted accounts cannot edit their profile" ON public.profiles AS RESTRICTIVE FOR UPDATE TO public USING (true) WITH CHECK ((is_active_user(auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.restricted_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restrictor uuid NOT NULL,
  restricted uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restricted_users_pkey PRIMARY KEY (id),
  CONSTRAINT restricted_users_no_self CHECK ((restrictor <> restricted)),
  CONSTRAINT restricted_users_restricted_fkey FOREIGN KEY (restricted) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT restricted_users_restrictor_fkey FOREIGN KEY (restrictor) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.restricted_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restricted delete own" ON public.restricted_users AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = restrictor));
CREATE POLICY "restricted insert own" ON public.restricted_users AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = restrictor));
CREATE POLICY "restricted read own" ON public.restricted_users AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = restrictor));

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL,
  guide_id uuid NOT NULL,
  climber_id uuid NOT NULL DEFAULT auth.uid(),
  rating integer NOT NULL,
  text text,
  guide_reply text,
  guide_reply_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_inquiry_id_key UNIQUE (inquiry_id),
  CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT reviews_climber_id_fkey FOREIGN KEY (climber_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT reviews_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES guide_profiles(id) ON DELETE CASCADE,
  CONSTRAINT reviews_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews climber insert with real inquiry" ON public.reviews AS PERMISSIVE FOR INSERT TO public WITH CHECK (((climber_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM inquiries i
  WHERE ((i.id = reviews.inquiry_id) AND (i.climber_id = auth.uid()) AND (i.guide_id = reviews.guide_id) AND (i.status <> 'withdrawn'::text))))));
CREATE POLICY "reviews guide reply" ON public.reviews AS PERMISSIVE FOR UPDATE TO public USING ((guide_id = auth.uid())) WITH CHECK ((guide_id = auth.uid()));
CREATE POLICY "reviews public read" ON public.reviews AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.route_base_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id text NOT NULL,
  user_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m real NOT NULL,
  samples integer NOT NULL DEFAULT 1,
  fixed_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT route_base_checkins_pkey PRIMARY KEY (id),
  CONSTRAINT route_base_checkins_route_id_user_id_key UNIQUE (route_id, user_id),
  CONSTRAINT route_base_checkins_accuracy_m_check CHECK ((accuracy_m > (0)::double precision)),
  CONSTRAINT route_base_checkins_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
  CONSTRAINT route_base_checkins_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
  CONSTRAINT route_base_checkins_samples_check CHECK ((samples >= 1)),
  CONSTRAINT route_base_checkins_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT route_base_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.route_base_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delete own base checkin" ON public.route_base_checkins AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY "read own base checkins" ON public.route_base_checkins AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));

CREATE TABLE public.route_base_pin_changes (
  id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
  route_id text NOT NULL,
  action text NOT NULL,
  climbers integer NOT NULL,
  total integer NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  moved_m double precision,
  previous jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT route_base_pin_changes_pkey PRIMARY KEY (id),
  CONSTRAINT route_base_pin_changes_action_check CHECK ((action = ANY (ARRAY['placed'::text, 'moved'::text, 'held'::text]))),
  CONSTRAINT route_base_pin_changes_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);
ALTER TABLE public.route_base_pin_changes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.route_difficulty_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id text NOT NULL,
  axis text NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT route_difficulty_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT route_difficulty_ratings_axis_check CHECK ((axis = ANY (ARRAY['physical'::text, 'technical'::text, 'exposure'::text, 'commitment'::text, 'routefinding'::text]))),
  CONSTRAINT route_difficulty_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
  CONSTRAINT route_difficulty_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.route_difficulty_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "difficulty ratings delete own" ON public.route_difficulty_ratings AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "difficulty ratings insert own" ON public.route_difficulty_ratings AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND ((rating >= 1) AND (rating <= 5)) AND (axis = ANY (ARRAY['physical'::text, 'technical'::text, 'exposure'::text, 'commitment'::text, 'routefinding'::text]))));
CREATE POLICY "difficulty ratings public read" ON public.route_difficulty_ratings AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "difficulty ratings update own" ON public.route_difficulty_ratings AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND ((rating >= 1) AND (rating <= 5)) AND (axis = ANY (ARRAY['physical'::text, 'technical'::text, 'exposure'::text, 'commitment'::text, 'routefinding'::text]))));

CREATE TABLE public.route_field_confidence (
  route_id text NOT NULL,
  field text NOT NULL,
  level text NOT NULL,
  reason text,
  set_by uuid,
  set_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT route_field_confidence_pkey PRIMARY KEY (route_id, field),
  CONSTRAINT route_field_confidence_level_check CHECK ((level = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
  CONSTRAINT route_field_confidence_field_fkey FOREIGN KEY (field) REFERENCES contribution_fields(form_key),
  CONSTRAINT route_field_confidence_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT route_field_confidence_set_by_fkey FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.route_field_confidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field confidence public read" ON public.route_field_confidence AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.route_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id text NOT NULL,
  field text,
  note text NOT NULL,
  reporter uuid NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  resolution_note text,
  CONSTRAINT route_flags_pkey PRIMARY KEY (id),
  CONSTRAINT route_flags_note_check CHECK (((char_length(note) >= 1) AND (char_length(note) <= 1000))),
  CONSTRAINT route_flags_status_check CHECK ((status = ANY (ARRAY['open'::text, 'fixed'::text, 'dismissed'::text]))),
  CONSTRAINT route_flags_field_fkey FOREIGN KEY (field) REFERENCES contribution_fields(form_key),
  CONSTRAINT route_flags_reporter_fkey FOREIGN KEY (reporter) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT route_flags_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT route_flags_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);
ALTER TABLE public.route_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags read own or admin" ON public.route_flags AS PERMISSIVE FOR SELECT TO public USING (((reporter = auth.uid()) OR is_admin(auth.uid())));

CREATE TABLE public.route_ratings (
  route_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  stars smallint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT route_ratings_pkey PRIMARY KEY (route_id, user_id),
  CONSTRAINT route_ratings_stars_check CHECK (((stars >= 1) AND (stars <= 5))),
  CONSTRAINT route_ratings_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT route_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.route_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "route ratings delete own" ON public.route_ratings AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "route ratings insert own" ON public.route_ratings AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND ((stars >= 1) AND (stars <= 5))));
CREATE POLICY "route ratings read own" ON public.route_ratings AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "route ratings update own" ON public.route_ratings AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND ((stars >= 1) AND (stars <= 5))));

CREATE TABLE public.route_views (
  route_id text NOT NULL,
  visitor text NOT NULL,
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'::text))::date,
  CONSTRAINT route_views_pkey PRIMARY KEY (route_id, visitor, day),
  CONSTRAINT route_views_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);
ALTER TABLE public.route_views ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.routes (
  id text NOT NULL,
  area_id text NOT NULL,
  name text NOT NULL,
  discipline text,
  grade text,
  grade_system text,
  grade_num numeric,
  pitches integer,
  length_m integer,
  sort_order integer,
  stars numeric,
  fa text,
  lat double precision,
  lng double precision,
  aspect text,
  season text,
  description text,
  gear jsonb,
  hazards text[],
  verif jsonb,
  overview text,
  beta text,
  turnaround text,
  auto_generated boolean DEFAULT false,
  alpine_grade text,
  rock_grade text,
  ice_grade text,
  gain_ft integer,
  loss_ft integer,
  dist_km numeric,
  max_angle integer,
  rappels text,
  commitment text,
  face text,
  permit text,
  comms text,
  descent text,
  obj_haz jsonb,
  waypoints jsonb,
  gpx jsonb,
  elev_pts jsonb,
  disciplines jsonb,
  timing jsonb,
  detailed_rack text,
  what_to_bring jsonb,
  pro_tips jsonb,
  watch_out jsonb,
  pro_needs text,
  best_season text,
  high_point_ft integer,
  aid_grade text,
  approach text,
  descent_text text,
  bail text,
  pitch_detail jsonb,
  itinerary jsonb,
  access jsonb,
  road jsonb,
  climate jsonb,
  emergency jsonb,
  lists text[],
  crowds jsonb,
  partner_requirements jsonb,
  seasonal_guidance jsonb,
  seasonal_hazards jsonb,
  data_quality jsonb,
  difficulty jsonb,
  approach_logistics jsonb,
  sling_rack jsonb,
  alpine_draws integer,
  rope_type text,
  rope_length_m integer,
  rope_note text,
  ascender text,
  corrections text,
  gear_confidence text,
  rappel_detail jsonb,
  rappel_count_note text,
  rack text[],
  features text[],
  classic boolean NOT NULL DEFAULT false,
  gear_bucket jsonb,
  assumed_gear jsonb,
  gps_contributor_name text,
  outing_shape text,
  approach_variants jsonb,
  climbing_route jsonb,
  bivy jsonb,
  prot_rating text,
  start_type text,
  landing text,
  pads integer,
  rock text,
  crux text,
  access_checked_at timestamp with time zone,
  name_search text,
  ice_grade_num numeric,
  mixed_grade_num numeric,
  aid_grade_num numeric,
  bolts integer,
  guide_stars integer,
  alt_names text[],
  variations jsonb,
  ffa text,
  fwa text,
  anchor text,
  location text,
  snow_grade_num numeric,
  rack_items jsonb,
  sun text,
  wet text,
  rock_quality text,
  fixed_gear text,
  CONSTRAINT routes_pkey PRIMARY KEY (id),
  CONSTRAINT routes_anchor_len CHECK (((anchor IS NULL) OR ((char_length(anchor) >= 1) AND (char_length(anchor) <= 80)))),
  CONSTRAINT routes_bolts_nonnegative CHECK (((bolts IS NULL) OR ((bolts >= 0) AND (bolts <= 500)))),
  CONSTRAINT routes_fixed_gear_len CHECK (((fixed_gear IS NULL) OR ((char_length(fixed_gear) >= 1) AND (char_length(fixed_gear) <= 160)))),
  CONSTRAINT routes_guide_stars_range CHECK (((guide_stars IS NULL) OR ((guide_stars >= 0) AND (guide_stars <= 4)))),
  CONSTRAINT routes_location_len CHECK (((location IS NULL) OR ((char_length(location) >= 1) AND (char_length(location) <= 160)))),
  CONSTRAINT routes_outing_shape_check CHECK (((outing_shape IS NULL) OR (outing_shape = ANY (ARRAY['outback'::text, 'loop'::text, 'point'::text])))),
  CONSTRAINT routes_rack_items_array CHECK (((rack_items IS NULL) OR (jsonb_typeof(rack_items) = 'array'::text))),
  CONSTRAINT routes_rock_quality_len CHECK (((rock_quality IS NULL) OR ((char_length(rock_quality) >= 1) AND (char_length(rock_quality) <= 160)))),
  CONSTRAINT routes_sun_len CHECK (((sun IS NULL) OR ((char_length(sun) >= 1) AND (char_length(sun) <= 160)))),
  CONSTRAINT routes_variations_is_array CHECK (((variations IS NULL) OR (jsonb_typeof(variations) = 'array'::text))),
  CONSTRAINT routes_wet_len CHECK (((wet IS NULL) OR ((char_length(wet) >= 1) AND (char_length(wet) <= 160)))),
  CONSTRAINT routes_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id)
);
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes public read" ON public.routes AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.saved_areas (
  user_id uuid NOT NULL,
  area_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_areas_pkey PRIMARY KEY (user_id, area_id),
  CONSTRAINT saved_areas_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
  CONSTRAINT saved_areas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.saved_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_areas delete own" ON public.saved_areas AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "saved_areas insert own" ON public.saved_areas AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "saved_areas read own" ON public.saved_areas AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

CREATE TABLE public.saved_searches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_searches_pkey PRIMARY KEY (id),
  CONSTRAINT saved_searches_name_check CHECK ((length(btrim(name)) > 0)),
  CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_searches delete own" ON public.saved_searches AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "saved_searches insert own" ON public.saved_searches AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "saved_searches read own" ON public.saved_searches AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "saved_searches update own" ON public.saved_searches AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.screening_terms (
  term text NOT NULL,
  category text NOT NULL,
  CONSTRAINT screening_terms_pkey PRIMARY KEY (term),
  CONSTRAINT screening_terms_category_check CHECK ((category = ANY (ARRAY['hate'::text, 'sexual'::text, 'threat'::text, 'self_harm'::text, 'spam'::text]))),
  CONSTRAINT screening_terms_term_check CHECK (((term = lower(term)) AND ((length(term) >= 2) AND (length(term) <= 60))))
);
ALTER TABLE public.screening_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage screening terms" ON public.screening_terms AS PERMISSIVE FOR ALL TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.topo_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  topo_id uuid NOT NULL,
  route_id text NOT NULL,
  points jsonb NOT NULL,
  pins jsonb NOT NULL DEFAULT '[]'::jsonb,
  label text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  variant_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT topo_lines_pkey PRIMARY KEY (id),
  CONSTRAINT topo_lines_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT topo_lines_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT topo_lines_topo_id_fkey FOREIGN KEY (topo_id) REFERENCES topos(id) ON DELETE CASCADE
);
ALTER TABLE public.topo_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topo_lines authed insert" ON public.topo_lines AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = created_by)));
CREATE POLICY "topo_lines own delete" ON public.topo_lines AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = created_by));
CREATE POLICY "topo_lines own update" ON public.topo_lines AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = created_by)) WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "topo_lines public read" ON public.topo_lines AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.topos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  area_id text NOT NULL,
  storage_path text NOT NULL,
  photographer text,
  license text DEFAULT 'contributor-affirmed'::text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  alt text,
  moderation text NOT NULL DEFAULT 'visible'::text,
  caption text,
  route_id text,
  CONSTRAINT topos_pkey PRIMARY KEY (id),
  CONSTRAINT topos_alt_len CHECK (((alt IS NULL) OR (char_length(alt) <= 300))),
  CONSTRAINT topos_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT topos_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
  CONSTRAINT topos_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT topos_route_id_fkey FOREIGN KEY (route_id) REFERENCES routes(id) ON UPDATE CASCADE ON DELETE SET NULL
);
ALTER TABLE public.topos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation hides taken-down content" ON public.topos AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (created_by = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.topos AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));
CREATE POLICY "topos authed insert" ON public.topos AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = created_by) AND (route_id IS NOT NULL)));
CREATE POLICY "topos own delete" ON public.topos AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = created_by));
CREATE POLICY "topos own update" ON public.topos AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = created_by)) WITH CHECK ((auth.uid() = created_by));
CREATE POLICY "topos public read" ON public.topos AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.user_itineraries (
  user_id uuid NOT NULL,
  route_id text NOT NULL,
  itinerary jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_itineraries_pkey PRIMARY KEY (user_id, route_id),
  CONSTRAINT user_itineraries_size CHECK ((pg_column_size(itinerary) < 65536)),
  CONSTRAINT user_itineraries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_itineraries delete own" ON public.user_itineraries AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "user_itineraries insert own" ON public.user_itineraries AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "user_itineraries read own" ON public.user_itineraries AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "user_itineraries update own" ON public.user_itineraries AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.user_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text,
  route_ids text[] NOT NULL DEFAULT '{}'::text[],
  shared boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  moderation text NOT NULL DEFAULT 'visible'::text,
  CONSTRAINT user_lists_pkey PRIMARY KEY (id),
  CONSTRAINT user_lists_description_len CHECK (((description IS NULL) OR (char_length(description) <= 500))),
  CONSTRAINT user_lists_moderation_chk CHECK ((moderation = ANY (ARRAY['visible'::text, 'held'::text, 'removed'::text]))),
  CONSTRAINT user_lists_name_check CHECK ((length(btrim(name)) > 0)),
  CONSTRAINT user_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation hides taken-down content" ON public.user_lists AS RESTRICTIVE FOR SELECT TO public USING (((moderation = 'visible'::text) OR (user_id = auth.uid()) OR is_admin(auth.uid())));
CREATE POLICY "restricted accounts cannot post" ON public.user_lists AS RESTRICTIVE FOR INSERT TO public WITH CHECK (is_active_user(auth.uid()));
CREATE POLICY "user_lists insert own" ON public.user_lists AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "user_lists read own or shared" ON public.user_lists AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (shared = true)));
CREATE POLICY "user_lists update own" ON public.user_lists AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.user_notices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT user_notices_pkey PRIMARY KEY (id),
  CONSTRAINT user_notices_body_check CHECK (((body IS NULL) OR (char_length(body) <= 2000))),
  CONSTRAINT user_notices_kind_check CHECK ((kind = ANY (ARRAY['contribution_approved'::text, 'contribution_rejected'::text, 'contribution_warning'::text, 'contribution_restricted'::text, 'contribution_banned'::text, 'contribution_reinstated'::text, 'flag_resolved'::text]))),
  CONSTRAINT user_notices_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200))),
  CONSTRAINT user_notices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notices delete own" ON public.user_notices AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY "notices mark own read" ON public.user_notices AS PERMISSIVE FOR UPDATE TO public USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "notices read own" ON public.user_notices AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));

CREATE TABLE public.user_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter uuid,
  reporter_label text,
  reported_id text NOT NULL,
  reported_name text,
  reason text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  target_kind text,
  target_id text,
  snapshot text,
  snapshot_media jsonb,
  snapshot_at timestamp with time zone,
  CONSTRAINT user_reports_pkey PRIMARY KEY (id),
  CONSTRAINT user_reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'reviewing'::text, 'actioned'::text, 'dismissed'::text]))),
  CONSTRAINT user_reports_target_kind_chk CHECK (((target_kind IS NULL) OR (target_kind = ANY (ARRAY['message'::text, 'crew_message'::text, 'group_post'::text, 'group_event'::text, 'comment'::text, 'trip_report'::text, 'group'::text, 'topo'::text, 'list'::text, 'profile'::text])))),
  CONSTRAINT user_reports_reporter_fkey FOREIGN KEY (reporter) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT user_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can file a report open" ON public.user_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK (((status = 'open'::text) AND ((reporter IS NULL) OR (reporter = auth.uid())) AND (target_kind IS NULL) AND (target_id IS NULL) AND (snapshot IS NULL) AND (snapshot_media IS NULL)));
CREATE POLICY "only an admin reviews a report" ON public.user_reports AS PERMISSIVE FOR UPDATE TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "your own reports, or an admin reads all" ON public.user_reports AS PERMISSIVE FOR SELECT TO public USING ((((reporter IS NOT NULL) AND (reporter = auth.uid())) OR is_admin(auth.uid())));

CREATE TABLE public.verification_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_type text NOT NULL,
  status text DEFAULT 'pending'::text,
  verified_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_records_pkey PRIMARY KEY (id),
  CONSTRAINT verification_records_user_id_verification_type_key UNIQUE (user_id, verification_type),
  CONSTRAINT verification_records_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'expired'::text]))),
  CONSTRAINT verification_records_verification_type_check CHECK ((verification_type = ANY (ARRAY['email'::text, 'member_club'::text, 'guide_certified'::text]))),
  CONSTRAINT verification_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "add own verification pending" ON public.verification_records AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::text) AND (verified_at IS NULL)));
CREATE POLICY "update own verification unverified" ON public.verification_records AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (status <> 'verified'::text) AND (verified_at IS NULL)));
CREATE POLICY "view own verification" ON public.verification_records AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));

CREATE TABLE public.vouches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL,
  to_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vouches_pkey PRIMARY KEY (id),
  CONSTRAINT vouches_from_id_to_id_key UNIQUE (from_id, to_id),
  CONSTRAINT vouches_not_self CHECK ((from_id <> to_id)),
  CONSTRAINT vouches_from_id_fkey FOREIGN KEY (from_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT vouches_to_id_fkey FOREIGN KEY (to_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delete own vouches" ON public.vouches AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = from_id));
CREATE POLICY "edit own vouches" ON public.vouches AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = from_id)) WITH CHECK ((auth.uid() = from_id));
CREATE POLICY "give vouches" ON public.vouches AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = from_id));
CREATE POLICY "view vouches" ON public.vouches AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE TABLE public.zip_centroids (
  zip text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  CONSTRAINT zip_centroids_pkey PRIMARY KEY (zip),
  CONSTRAINT zip_centroids_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
  CONSTRAINT zip_centroids_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
  CONSTRAINT zip_centroids_zip_check CHECK ((zip ~ '^[0-9]{5}$'::text))
);
ALTER TABLE public.zip_centroids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zip centroids are public" ON public.zip_centroids AS PERMISSIVE FOR SELECT TO public USING (true);
