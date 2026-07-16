CREATE TABLE IF NOT EXISTS opportunity_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  slug text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  category text NOT NULL DEFAULT 'vehicle',
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  query text NOT NULL CHECK (char_length(query) BETWEEN 2 AND 200),
  year_min integer NOT NULL CHECK (year_min BETWEEN 1900 AND 2200),
  year_max integer NOT NULL CHECK (year_max BETWEEN 1900 AND 2200 AND year_max >= year_min),
  max_price numeric(12,2) CHECK (max_price IS NULL OR max_price BETWEEN 0 AND 10000000),
  max_mileage integer NOT NULL CHECK (max_mileage BETWEEN 0 AND 2000000),
  nationwide boolean NOT NULL DEFAULT true,
  clean_title_only boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, slug)
);

CREATE TABLE IF NOT EXISTS opportunity_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_item_id text NOT NULL,
  source_url text,
  sanitized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, source_type, source_item_id)
);

CREATE INDEX IF NOT EXISTS opportunity_source_records_payload_hash_idx
  ON opportunity_source_records (client_id, payload_hash);

CREATE TABLE IF NOT EXISTS opportunity_duplicate_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  group_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, group_key)
);

CREATE TABLE IF NOT EXISTS opportunity_worker_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  run_key text NOT NULL,
  run_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'ok', 'partial', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_summary text,
  UNIQUE (client_id, run_key)
);

CREATE TABLE IF NOT EXISTS opportunity_source_run_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_run_id uuid NOT NULL REFERENCES opportunity_worker_runs(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'failed', 'skipped')),
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_run_id, source_type)
);

CREATE TABLE IF NOT EXISTS opportunity_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  source_record_id uuid REFERENCES opportunity_source_records(id) ON DELETE SET NULL,
  duplicate_group_id uuid REFERENCES opportunity_duplicate_groups(id) ON DELETE SET NULL,
  canonical_key text NOT NULL,
  source_type text NOT NULL,
  source_item_id text NOT NULL,
  source_url text,
  category text NOT NULL DEFAULT 'vehicle',
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  year integer,
  make text,
  model text,
  trim text,
  price_amount numeric(12,2),
  mileage integer,
  title_status text NOT NULL CHECK (title_status IN ('clean', 'salvage', 'rebuilt', 'unknown')),
  location_text text,
  distance_miles integer,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, canonical_key)
);

CREATE INDEX IF NOT EXISTS opportunity_listings_client_seen_idx
  ON opportunity_listings (client_id, first_seen_at DESC);

CREATE TABLE IF NOT EXISTS opportunity_listing_sightings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES opportunity_listings(id) ON DELETE CASCADE,
  worker_run_id uuid NOT NULL REFERENCES opportunity_worker_runs(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, worker_run_id)
);

CREATE TABLE IF NOT EXISTS opportunity_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES opportunity_listings(id) ON DELETE CASCADE,
  watch_id uuid NOT NULL REFERENCES opportunity_watches(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  accepted boolean NOT NULL DEFAULT false,
  match_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  reject_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, listing_id, watch_id)
);

CREATE TABLE IF NOT EXISTS opportunity_alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES opportunity_clients(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES opportunity_listings(id) ON DELETE CASCADE,
  watch_id uuid NOT NULL REFERENCES opportunity_watches(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('none', 'email', 'sms')),
  state text NOT NULL CHECK (state IN ('preview', 'skipped', 'queued', 'sent', 'failed', 'delivered')),
  reason text,
  idempotency_key text NOT NULL,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (client_id, idempotency_key),
  UNIQUE (client_id, listing_id, watch_id, channel)
);
