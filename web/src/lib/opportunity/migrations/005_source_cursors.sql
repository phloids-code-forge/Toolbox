CREATE TABLE IF NOT EXISTS opportunity_source_cursors (
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (char_length(source_type) BETWEEN 1 AND 80),
  cursor_value bigint NOT NULL DEFAULT 0 CHECK (cursor_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, source_type)
);
