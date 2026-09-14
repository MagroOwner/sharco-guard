-- Sharco Guard Threat Intelligence Database
-- Run this once in the Neon SQL Editor connected to sharco-guard-threat-db.

CREATE TABLE IF NOT EXISTS threat_indicators (
  id BIGSERIAL PRIMARY KEY,
  sha256 CHAR(64) NOT NULL UNIQUE CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  detection_name TEXT NOT NULL,
  malware_family TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('allow', 'warn', 'quarantine', 'block')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('candidate', 'confirmed', 'revoked')),
  source TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS threat_indicators_lookup_idx
  ON threat_indicators (sha256)
  WHERE status = 'confirmed';

CREATE TABLE IF NOT EXISTS signature_releases (
  id BIGSERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  manifest_sha256 CHAR(64) NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'revoked')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- This starter entry is intentionally harmless. EICAR is the standard test
-- string used to verify antivirus products; it is not malware.
INSERT INTO threat_indicators
  (sha256, detection_name, malware_family, severity, recommended_action, status, source, notes)
VALUES
  ('275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
   'EICAR-Test-File', 'EICAR', 'low', 'warn', 'confirmed', 'Sharco Guard',
   'Harmless industry-standard antivirus test signature.')
ON CONFLICT (sha256) DO NOTHING;
