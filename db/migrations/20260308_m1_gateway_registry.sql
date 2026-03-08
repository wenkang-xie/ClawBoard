-- Agent Board v2 / M1-BE-01 + M1-BE-02
-- Minimal schema baseline for gateway registry and status snapshots.

BEGIN;

DO $$ BEGIN
  CREATE TYPE env_scope AS ENUM ('prod', 'staging', 'dev');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE gateway_health AS ENUM ('healthy', 'degraded', 'down');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS gateway_registry (
  id TEXT PRIMARY KEY,
  env env_scope NOT NULL,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  auth_ref TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(env, name)
);

CREATE INDEX IF NOT EXISTS idx_gateway_registry_env_status
  ON gateway_registry(env, status);

CREATE TABLE IF NOT EXISTS gateway_status_snapshot (
  id BIGSERIAL PRIMARY KEY,
  gateway_id TEXT NOT NULL REFERENCES gateway_registry(id) ON DELETE CASCADE,
  env env_scope NOT NULL,
  health gateway_health NOT NULL,
  latency_ms INTEGER,
  agent_count INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_snapshot_lookup
  ON gateway_status_snapshot(env, gateway_id, collected_at DESC);

COMMIT;
