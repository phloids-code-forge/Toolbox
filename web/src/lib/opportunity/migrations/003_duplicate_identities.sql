ALTER TABLE opportunity_duplicate_groups
  ADD COLUMN IF NOT EXISTS representative_listing_id uuid
  REFERENCES opportunity_listings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS opportunity_duplicate_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  duplicate_group_id uuid NOT NULL REFERENCES opportunity_duplicate_groups(id) ON DELETE CASCADE,
  identity_type text NOT NULL CHECK (char_length(identity_type) BETWEEN 1 AND 64),
  identity_hash text NOT NULL CHECK (char_length(identity_hash) = 64),
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  UNIQUE (client_id, identity_type, identity_hash)
);

CREATE INDEX IF NOT EXISTS opportunity_duplicate_identities_group_idx
  ON opportunity_duplicate_identities (duplicate_group_id);
