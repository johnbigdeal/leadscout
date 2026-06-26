-- Migration 0013: Add trial columns to subscriptions
-- trial_ends_at: when the 7-day trial expires
-- data_deleted_at: when data will be hard-deleted (30 days after trial expiry)

ALTER TABLE subscriptions ADD COLUMN trial_ends_at timestamp with time zone;
ALTER TABLE subscriptions ADD COLUMN data_deleted_at timestamp with time zone;

-- Set trial_ends_at for existing subscriptions (backdated: already expired)
-- Use org creation date as reference; fallback to now-7days
UPDATE subscriptions s
SET trial_ends_at = o.created_at + INTERVAL '7 days'
FROM organizations o
WHERE s.org_id = o.id AND s.trial_ends_at IS NULL;

UPDATE subscriptions SET data_deleted_at = trial_ends_at + INTERVAL '30 days' WHERE data_deleted_at IS NULL AND trial_ends_at < NOW();
