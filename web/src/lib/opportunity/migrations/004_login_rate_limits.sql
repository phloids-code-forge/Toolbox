CREATE TABLE IF NOT EXISTS opportunity_login_rate_limits (
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  key_hash text NOT NULL CHECK (key_hash ~ '^[a-f0-9]{64}$'),
  failure_count integer NOT NULL CHECK (failure_count BETWEEN 1 AND 5),
  window_started_at timestamptz NOT NULL,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, key_hash)
);

CREATE INDEX IF NOT EXISTS opportunity_login_rate_limits_expiry_idx
  ON opportunity_login_rate_limits (blocked_until, window_started_at);
