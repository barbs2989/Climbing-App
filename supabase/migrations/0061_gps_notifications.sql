-- GPS Notifications Table (Phase C)
-- Tracks email/admin notifications for GPS submissions

CREATE TABLE IF NOT EXISTS gps_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES gps_submissions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('climber_thank_you', 'climber_needs_improvement', 'admin_auto_approved', 'admin_needs_review')),
  recipient_email text,
  recipient_name text,
  route_name text,
  quality_score integer,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'pending_review', 'action_needed', 'rejected', 'auto_approved', 'needs_improvement')),
  admin_notes text,
  feedback text,
  action_url text,
  climber_name text,
  climber_email text,
  -- Whether an email actually left the building. The row is written first and is
  -- the system of record even when the mail provider is unconfigured or failing,
  -- so `sent_at` alone would overstate what happened — these two say which.
  email_sent boolean NOT NULL DEFAULT false,
  email_error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX idx_gps_notifications_submission ON gps_notifications(submission_id);
CREATE INDEX idx_gps_notifications_type ON gps_notifications(type);
CREATE INDEX idx_gps_notifications_status ON gps_notifications(status);
CREATE INDEX idx_gps_notifications_recipient ON gps_notifications(recipient_email);
CREATE INDEX idx_gps_notifications_sent ON gps_notifications(sent_at DESC);

-- Row-Level Security
ALTER TABLE gps_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Anonymous users can't view notifications
-- Policy: Only service role can insert/update notifications
-- Policy: Authenticated climbers can see their own notifications
CREATE POLICY "Service role can manage notifications" ON gps_notifications
  AS PERMISSIVE FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Climbers can read their own notifications" ON gps_notifications
  AS PERMISSIVE FOR SELECT USING (
    auth.role() = 'authenticated' AND
    climber_email = auth.jwt() ->> 'email'
  );
