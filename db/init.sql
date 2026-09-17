-- PostgreSQL schema for AgeLens (production)
-- For local demo without Postgres, backend falls back to JSON file at backend/data/db.json

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_age INTEGER NOT NULL CHECK (estimated_age BETWEEN 0 AND 120),
  range_low INTEGER NOT NULL,
  range_high INTEGER NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  image_path TEXT, -- private S3 key or filesystem path, never public
  brightness INTEGER,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_captures_timestamp ON captures(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_captures_age ON captures(estimated_age);
CREATE INDEX IF NOT EXISTS idx_captures_expires ON captures(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL, -- login_success, login_failed, view_image, delete_image, logout, etc
  username TEXT,
  ip INET,
  target_id UUID REFERENCES captures(id) ON DELETE SET NULL,
  details JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

-- Admin user (store only hash, never plaintext)
-- Initial password admin123 hashed with bcrypt 12:
-- $2a$12$HqZkoXJbSOXT4mkvVDiaiOSV5Rx9576mUDyxsmNLDIx9lyILjDe6a
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2a$12$HqZkoXJbSOXT4mkvVDiaiOSV5Rx9576mUDyxsmNLDIx9lyILjDe6a')
ON CONFLICT (username) DO NOTHING;

-- Retention cleanup function (run via cron or pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_captures() RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM captures WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
