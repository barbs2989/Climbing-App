-- GPS Submissions table for crowdsource GPS contribution feature
-- Stores climber-submitted GPS tracks for validation and merging into routes

CREATE TABLE IF NOT EXISTS public.gps_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id text NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  climber_email text,
  climber_name text DEFAULT 'Anonymous',
  gpx_data jsonb NOT NULL,  -- [[lat, lng], [lat, lng], ...]
  device_type text,  -- 'Apple Watch', 'Garmin', 'Strava', etc.
  climb_date date,
  notes text,
  quality_score integer DEFAULT 0,  -- 0-100 quality rating
  status text DEFAULT 'pending',  -- pending, approved, rejected
  issues jsonb DEFAULT '[]'::jsonb,  -- validation issues
  submitted_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gps_submissions_route ON public.gps_submissions(route_id);
CREATE INDEX IF NOT EXISTS idx_gps_submissions_status ON public.gps_submissions(status);
CREATE INDEX IF NOT EXISTS idx_gps_submissions_submitted ON public.gps_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_submissions_quality ON public.gps_submissions(quality_score DESC);

-- Row-level security
ALTER TABLE public.gps_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (anonymous submissions OK)
CREATE POLICY "anyone_can_submit_gps" ON public.gps_submissions
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can read approved submissions
CREATE POLICY "anyone_can_read_approved_gps" ON public.gps_submissions
  FOR SELECT USING (status = 'approved');

-- Policy: Authenticated users can read their own submissions
CREATE POLICY "users_can_read_own_gps" ON public.gps_submissions
  FOR SELECT USING (climber_email = auth.jwt() ->> 'email');

-- Policy: Admin can do everything (requires special role)
-- Note: Admin approval handled externally (email links or dashboard)

-- Comment for documentation
COMMENT ON TABLE public.gps_submissions IS
  'GPS track submissions from climbers for routes lacking public GPS data. Validated for quality and merged into routes table after admin approval.';
COMMENT ON COLUMN public.gps_submissions.quality_score IS
  'Calculated score 0-100: 5+ points required, auto-approve at 90+, manual review 70-89, reject <70';
COMMENT ON COLUMN public.gps_submissions.status IS
  'pending = awaiting review, approved = merged into route, rejected = quality too poor';
