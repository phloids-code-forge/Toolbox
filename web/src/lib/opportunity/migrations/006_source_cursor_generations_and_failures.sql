ALTER TABLE opportunity_source_cursors
  ADD COLUMN IF NOT EXISTS cursor_generation text;

UPDATE opportunity_source_cursors
SET cursor_generation = 'legacy'
WHERE cursor_generation IS NULL;

ALTER TABLE opportunity_source_cursors
  ALTER COLUMN cursor_generation SET NOT NULL;

CREATE TABLE IF NOT EXISTS opportunity_source_failures (
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  cursor_generation text NOT NULL,
  cursor_value bigint NOT NULL CHECK (cursor_value >= 0),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  error_code text NOT NULL CHECK (char_length(error_code) BETWEEN 1 AND 80),
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  quarantined_at timestamptz,
  PRIMARY KEY (client_id, source_type, cursor_generation, cursor_value)
);

CREATE INDEX IF NOT EXISTS opportunity_source_failures_quarantine_idx
  ON opportunity_source_failures (client_id, source_type, quarantined_at, last_failed_at DESC);
