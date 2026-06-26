-- Migration 0012: Add global domains support
-- Makes org_id nullable, zone_id nullable, adds is_global column
-- Seeds leadscout.lat and pyme.live as global domains

ALTER TABLE available_domains ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE available_domains ALTER COLUMN zone_id DROP NOT NULL;
ALTER TABLE available_domains ADD COLUMN is_global boolean NOT NULL DEFAULT false;

-- Global domain names must be unique
CREATE UNIQUE INDEX idx_available_domains_global_domain ON available_domains(domain) WHERE is_global = true;

-- Seed global domains
INSERT INTO available_domains (domain, zone_id, is_global, is_default, is_active)
VALUES
  ('leadscout.lat', '198a10805c5e769f35d61374bf69665a', true, true, true),
  ('pyme.live', 'b609138c0a3131668a080f0f67e66670', true, false, true);
