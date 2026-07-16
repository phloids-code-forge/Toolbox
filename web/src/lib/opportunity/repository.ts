import { createHash, randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';

import type { MatchEvaluation, MatchWatch } from './matching';
import type { ValidatedWatchInput, WatchStatus } from './validation';

export type WatchRecord = {
  id: string;
  clientSlug: string;
  slug: string;
  status: WatchStatus;
  title: string;
  query: string;
  yearMin: number;
  yearMax: number;
  maxPrice: number | null;
  maxMileage: number;
  nationwide: boolean;
  cleanTitleOnly: boolean;
  criteria: {
    makes?: string[];
    model?: string;
    requiredTrim?: string | null;
  };
};

type WatchRow = {
  id: string;
  client_slug: string;
  slug: string;
  status: WatchStatus;
  title: string;
  query: string;
  year_min: number;
  year_max: number;
  max_price: string | null;
  max_mileage: number;
  nationwide: boolean;
  clean_title_only: boolean;
  criteria: WatchRecord['criteria'];
};

function mapWatch(row: WatchRow): WatchRecord {
  return {
    id: row.id,
    clientSlug: row.client_slug,
    slug: row.slug,
    status: row.status,
    title: row.title,
    query: row.query,
    yearMin: row.year_min,
    yearMax: row.year_max,
    maxPrice: row.max_price === null ? null : Number(row.max_price),
    maxMileage: row.max_mileage,
    nationwide: row.nationwide,
    cleanTitleOnly: row.clean_title_only,
    criteria: row.criteria ?? {},
  };
}

export type MatchWatchRecord = MatchWatch & {
  id: string;
  slug: string;
};

export type ListingInput = {
  canonicalKey: string;
  sourceType: string;
  sourceItemId: string;
  sourceUrl: string | null;
  title: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  priceAmount: number | null;
  mileage: number | null;
  titleStatus: 'clean' | 'salvage' | 'rebuilt' | 'unknown';
  locationText: string | null;
  distanceMiles: number | null;
  duplicateIdentity?: {
    type: string;
    value: string;
  };
};

function stripContactText(value: string | null): string | null {
  if (value === null) return null;
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact redacted]')
    .replace(/(?<!\d)(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)/g, '[contact redacted]')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizedSourceUrl(value: string | null): string | null {
  if (value === null) return null;
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeListingInput(input: ListingInput): ListingInput {
  return {
    canonicalKey: input.canonicalKey,
    sourceType: input.sourceType,
    sourceItemId: input.sourceItemId,
    sourceUrl: sanitizedSourceUrl(input.sourceUrl),
    title: stripContactText(input.title) ?? input.title,
    year: input.year,
    make: stripContactText(input.make),
    model: stripContactText(input.model),
    trim: stripContactText(input.trim),
    priceAmount: input.priceAmount,
    mileage: input.mileage,
    titleStatus: input.titleStatus,
    locationText: stripContactText(input.locationText),
    distanceMiles: input.distanceMiles,
    duplicateIdentity: input.duplicateIdentity
      ? { type: input.duplicateIdentity.type, value: input.duplicateIdentity.value }
      : undefined,
  };
}

export type ListingRecord = ListingInput & {
  id: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export type DuplicateGroupRecord = {
  id: string;
  groupKey: string;
  representativeListingId: string;
};

type ListingRow = {
  id: string;
  canonical_key: string;
  source_type: string;
  source_item_id: string;
  source_url: string | null;
  title: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  price_amount: string | null;
  mileage: number | null;
  title_status: ListingInput['titleStatus'];
  location_text: string | null;
  distance_miles: number | null;
  first_seen_at: Date;
  last_seen_at: Date;
};

function mapListing(row: ListingRow): ListingRecord {
  return {
    id: row.id,
    canonicalKey: row.canonical_key,
    sourceType: row.source_type,
    sourceItemId: row.source_item_id,
    sourceUrl: row.source_url,
    title: row.title,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    priceAmount: row.price_amount === null ? null : Number(row.price_amount),
    mileage: row.mileage,
    titleStatus: row.title_status,
    locationText: row.location_text,
    distanceMiles: row.distance_miles,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

export type SourceCursor = {
  generation: string;
  value: number;
};

export type SourceFailureRecord = {
  attempts: number;
  quarantined: boolean;
};

export type WorkerRunType = 'fixture' | 'scheduled';
export type WorkerRunStatus = 'started' | 'ok' | 'partial' | 'failed';
export type SourceRunStatus = 'ok' | 'failed' | 'skipped';
const WORKER_LEASE_MS = 15 * 60 * 1000;

export type WorkerRunRecord = {
  id: string;
  status: WorkerRunStatus;
  counts: Record<string, number>;
  reused: boolean;
};

export type SourceRunRecord = {
  sourceType: string;
  status: SourceRunStatus;
  counts: Record<string, number>;
  errorSummary: string | null;
};

type WorkerRunRow = {
  id: string;
  status: WorkerRunStatus;
  counts: Record<string, number>;
};

type SourceRunRow = {
  source_type: string;
  status: SourceRunStatus;
  counts: Record<string, number>;
  error_summary: string | null;
};

export type AlertEventRecord = {
  canonicalKey: string;
  channel: 'none' | 'email' | 'sms';
  state: 'preview' | 'skipped' | 'queued' | 'sent' | 'failed' | 'delivered';
  reason: string | null;
  createdAt: Date;
};

type AlertEventRow = {
  canonical_key: string;
  channel: AlertEventRecord['channel'];
  state: AlertEventRecord['state'];
  reason: string | null;
  created_at: Date;
};

export type LeadDecisionRecord = {
  title: string;
  sourceType: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  priceAmount: number | null;
  mileage: number | null;
  titleStatus: ListingInput['titleStatus'];
  locationText: string | null;
  distanceMiles: number | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  duplicateCount: number;
  watchTitle: string | null;
  score: number | null;
  accepted: boolean;
  matchReasons: string[];
  rejectReasons: string[];
  alertState: AlertEventRecord['state'] | null;
  alertReason: string | null;
};

type LeadDecisionRow = {
  title: string;
  source_type: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  price_amount: string | null;
  mileage: number | null;
  title_status: ListingInput['titleStatus'];
  location_text: string | null;
  distance_miles: number | null;
  first_seen_at: Date;
  last_seen_at: Date;
  duplicate_count: string;
  watch_title: string | null;
  score: number | null;
  accepted: boolean | null;
  match_reasons: string[] | null;
  reject_reasons: string[] | null;
  alert_state: AlertEventRecord['state'] | null;
  alert_reason: string | null;
};

export type WorkerRunSummary = {
  runType: WorkerRunType;
  status: WorkerRunStatus;
  counts: Record<string, number>;
  startedAt: Date;
  finishedAt: Date | null;
  errorSummary: string | null;
  sourceResults: SourceRunRecord[];
};

type WorkerRunSummaryRow = WorkerRunRow & {
  run_type: WorkerRunType;
  started_at: Date;
  finished_at: Date | null;
  error_summary: string | null;
};

type LoginRateLimitRow = {
  failure_count: number;
  window_started_at: Date;
  blocked_until: Date | null;
};

export class OpportunityRepository {
  constructor(private readonly pool: Pool | PoolClient) {}

  private connectionPool(): Pool {
    if (!(this.pool instanceof Pool)) {
      throw new Error('A nested repository transaction is not supported.');
    }
    return this.pool;
  }

  async getSourceCursor(clientSlug: string, sourceType: string): Promise<SourceCursor | null> {
    const result = await this.pool.query<{ cursor_generation: string; cursor_value: string }>(
      `SELECT cursor_generation, cursor_value::text
       FROM opportunity_source_cursors cursor
       JOIN opportunity_clients client ON client.id = cursor.client_id
       WHERE client.slug = $1 AND cursor.source_type = $2`,
      [clientSlug, sourceType],
    );
    const row = result.rows[0];
    return row ? { generation: row.cursor_generation, value: Number(row.cursor_value) } : null;
  }

  async advanceSourceCursor(
    clientSlug: string,
    sourceType: string,
    cursor: SourceCursor,
    now = new Date(),
  ): Promise<SourceCursor> {
    if (!cursor.generation.trim() || cursor.generation.length > 200) {
      throw new Error('Source cursor generation is invalid.');
    }
    if (!Number.isSafeInteger(cursor.value) || cursor.value < 0) {
      throw new Error('Source cursor must be a non-negative safe integer.');
    }
    const result = await this.pool.query<{ cursor_generation: string; cursor_value: string }>(
      `INSERT INTO opportunity_source_cursors (
         client_id, source_type, cursor_generation, cursor_value, updated_at
       )
       SELECT client.id, $2, $3, $4, $5
       FROM opportunity_clients client
       WHERE client.slug = $1
       ON CONFLICT (client_id, source_type) DO UPDATE SET
         cursor_generation = EXCLUDED.cursor_generation,
         cursor_value = CASE
           WHEN opportunity_source_cursors.cursor_generation = EXCLUDED.cursor_generation
             THEN GREATEST(opportunity_source_cursors.cursor_value, EXCLUDED.cursor_value)
           ELSE EXCLUDED.cursor_value
         END,
         updated_at = CASE
           WHEN opportunity_source_cursors.cursor_generation <> EXCLUDED.cursor_generation
             OR EXCLUDED.cursor_value > opportunity_source_cursors.cursor_value
             THEN EXCLUDED.updated_at
           ELSE opportunity_source_cursors.updated_at
         END
       RETURNING cursor_generation, cursor_value::text`,
      [clientSlug, sourceType, cursor.generation, cursor.value, now],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Client not found.');
    return { generation: row.cursor_generation, value: Number(row.cursor_value) };
  }

  async recordSourceFailure(
    clientSlug: string,
    sourceType: string,
    cursor: SourceCursor,
    errorCode: string,
    now = new Date(),
  ): Promise<SourceFailureRecord> {
    if (!/^[a-z0-9_]{1,80}$/.test(errorCode)) throw new Error('Invalid source failure code.');
    const result = await this.pool.query<{ attempt_count: number; quarantined_at: Date | null }>(
      `INSERT INTO opportunity_source_failures (
         client_id, source_type, cursor_generation, cursor_value,
         attempt_count, error_code, first_failed_at, last_failed_at, quarantined_at
       )
       SELECT client.id, $2, $3, $4, 1, $5, $6, $6, NULL
       FROM opportunity_clients client
       WHERE client.slug = $1
       ON CONFLICT (client_id, source_type, cursor_generation, cursor_value) DO UPDATE SET
         attempt_count = LEAST(3, opportunity_source_failures.attempt_count + 1),
         error_code = EXCLUDED.error_code,
         last_failed_at = EXCLUDED.last_failed_at,
         quarantined_at = CASE
           WHEN opportunity_source_failures.attempt_count + 1 >= 3 THEN EXCLUDED.last_failed_at
           ELSE opportunity_source_failures.quarantined_at
         END
       RETURNING attempt_count, quarantined_at`,
      [clientSlug, sourceType, cursor.generation, cursor.value, errorCode, now],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Client not found.');
    return { attempts: row.attempt_count, quarantined: row.quarantined_at !== null };
  }

  async clearSourceFailure(clientSlug: string, sourceType: string, cursor: SourceCursor): Promise<void> {
    await this.pool.query(
      `DELETE FROM opportunity_source_failures failure
       USING opportunity_clients client
       WHERE failure.client_id = client.id
         AND client.slug = $1
         AND failure.source_type = $2
         AND failure.cursor_generation = $3
         AND failure.cursor_value = $4`,
      [clientSlug, sourceType, cursor.generation, cursor.value],
    );
  }

  async tryAcquireSourceLease(clientSlug: string, sourceType: string): Promise<(() => Promise<void>) | null> {
    const client = await this.connectionPool().connect();
    const key = `opportunity-source:${clientSlug}:${sourceType}`;
    try {
      const result = await client.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired',
        [key],
      );
      if (!result.rows[0]?.acquired) {
        client.release();
        return null;
      }
      return async () => {
        try {
          await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [key]);
        } finally {
          client.release();
        }
      };
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async getWatch(clientSlug: string, watchId: string): Promise<WatchRecord | null> {
    const result = await this.pool.query<WatchRow>(
      `SELECT w.id, c.slug AS client_slug, w.slug, w.status, w.title, w.query,
              w.year_min, w.year_max, w.max_price, w.max_mileage,
              w.nationwide, w.clean_title_only, w.criteria
       FROM opportunity_watches w
       JOIN opportunity_clients c ON c.id = w.client_id
       WHERE c.slug = $1 AND w.id = $2`,
      [clientSlug, watchId],
    );
    return result.rows[0] ? mapWatch(result.rows[0]) : null;
  }

  async checkLoginRateLimit(
    clientSlug: string,
    keyHash: string,
    now = new Date(),
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const result = await this.pool.query<LoginRateLimitRow>(
      `SELECT r.failure_count, r.window_started_at, r.blocked_until
       FROM opportunity_login_rate_limits r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.key_hash = $2`,
      [clientSlug, keyHash],
    );
    const row = result.rows[0];
    if (!row) return { allowed: true, retryAfterSeconds: 0 };

    const windowEnd = row.window_started_at.getTime() + 15 * 60 * 1000;
    const blockedUntil = row.blocked_until?.getTime() ?? windowEnd;
    if (row.failure_count >= 5 && blockedUntil > now.getTime()) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now.getTime()) / 1000)),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async reserveLoginAttempt(
    clientSlug: string,
    keyHash: string,
    now = new Date(),
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const result = await this.pool.query<{
      allowed: boolean;
      failure_count: number;
      window_started_at: Date;
      blocked_until: Date | null;
    }>(
      `WITH authorized_client AS (
         SELECT id FROM opportunity_clients WHERE slug = $1
       ), reservation AS (
         INSERT INTO opportunity_login_rate_limits (
           client_id, key_hash, failure_count, window_started_at, blocked_until, updated_at
         )
         SELECT id, $2, 1, $3, NULL, $3 FROM authorized_client
         ON CONFLICT (client_id, key_hash) DO UPDATE SET
           failure_count = CASE
             WHEN opportunity_login_rate_limits.failure_count >= 5 THEN 1
             WHEN opportunity_login_rate_limits.window_started_at <= $3 - interval '15 minutes' THEN 1
             ELSE opportunity_login_rate_limits.failure_count + 1
           END,
           window_started_at = CASE
             WHEN opportunity_login_rate_limits.failure_count >= 5 THEN $3
             WHEN opportunity_login_rate_limits.window_started_at <= $3 - interval '15 minutes' THEN $3
             ELSE opportunity_login_rate_limits.window_started_at
           END,
           blocked_until = CASE
             WHEN opportunity_login_rate_limits.failure_count >= 5 THEN NULL
             WHEN opportunity_login_rate_limits.window_started_at <= $3 - interval '15 minutes' THEN NULL
             WHEN opportunity_login_rate_limits.failure_count + 1 >= 5 THEN $3 + interval '15 minutes'
             ELSE opportunity_login_rate_limits.blocked_until
           END,
           updated_at = $3
         WHERE
           (
             opportunity_login_rate_limits.failure_count >= 5
             AND COALESCE(
               opportunity_login_rate_limits.blocked_until,
               opportunity_login_rate_limits.window_started_at + interval '15 minutes'
             ) <= $3
           )
           OR (
             opportunity_login_rate_limits.failure_count < 5
             AND opportunity_login_rate_limits.window_started_at <= $3 - interval '15 minutes'
           )
           OR opportunity_login_rate_limits.failure_count < 5
         RETURNING failure_count, window_started_at, blocked_until
       )
       SELECT true AS allowed, failure_count, window_started_at, blocked_until
       FROM reservation
       UNION ALL
       SELECT false AS allowed, r.failure_count, r.window_started_at, r.blocked_until
       FROM opportunity_login_rate_limits r
       JOIN authorized_client c ON c.id = r.client_id
       WHERE r.key_hash = $2 AND NOT EXISTS (SELECT 1 FROM reservation)
       LIMIT 1`,
      [clientSlug, keyHash, now],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Client not found.');
    if (row.allowed) return { allowed: true, retryAfterSeconds: 0 };
    const blockedUntil = row.blocked_until?.getTime()
      ?? row.window_started_at.getTime() + 15 * 60 * 1000;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now.getTime()) / 1000)),
    };
  }

  async recordLoginFailure(clientSlug: string, keyHash: string, now = new Date()): Promise<void> {
    const result = await this.pool.query(
      `INSERT INTO opportunity_login_rate_limits (
         client_id, key_hash, failure_count, window_started_at, blocked_until, updated_at
       )
       SELECT c.id, $2, 1, $3, NULL, $3
       FROM opportunity_clients c
       WHERE c.slug = $1
       ON CONFLICT (client_id, key_hash) DO UPDATE SET
         failure_count = CASE
           WHEN opportunity_login_rate_limits.window_started_at <= $3 - interval '15 minutes' THEN 1
           ELSE LEAST(opportunity_login_rate_limits.failure_count + 1, 5)
         END,
         window_started_at = CASE
           WHEN opportunity_login_rate_limits.window_started_at <= $3 - interval '15 minutes' THEN $3
           ELSE opportunity_login_rate_limits.window_started_at
         END,
         blocked_until = CASE
           WHEN opportunity_login_rate_limits.window_started_at <= $3 - interval '15 minutes' THEN NULL
           WHEN opportunity_login_rate_limits.failure_count + 1 >= 5
             THEN COALESCE(opportunity_login_rate_limits.blocked_until, $3 + interval '15 minutes')
           ELSE opportunity_login_rate_limits.blocked_until
         END,
         updated_at = $3`,
      [clientSlug, keyHash, now],
    );
    if (result.rowCount === 0) throw new Error('Client not found.');
  }

  async releaseLoginAttempt(clientSlug: string, keyHash: string, now = new Date()): Promise<void> {
    await this.pool.query(
      `WITH authorized_client AS (
         SELECT id FROM opportunity_clients WHERE slug = $1
       ), decremented AS (
         UPDATE opportunity_login_rate_limits r
         SET failure_count = r.failure_count - 1,
             blocked_until = NULL,
             updated_at = $3
         FROM authorized_client c
         WHERE r.client_id = c.id AND r.key_hash = $2 AND r.failure_count > 1
         RETURNING r.client_id
       )
       DELETE FROM opportunity_login_rate_limits r
       USING authorized_client c
       WHERE r.client_id = c.id
         AND r.key_hash = $2
         AND r.failure_count = 1
         AND NOT EXISTS (SELECT 1 FROM decremented)`,
      [clientSlug, keyHash, now],
    );
  }

  async clearLoginFailures(clientSlug: string, keyHash: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM opportunity_login_rate_limits r
       USING opportunity_clients c
       WHERE r.client_id = c.id AND c.slug = $1 AND r.key_hash = $2`,
      [clientSlug, keyHash],
    );
  }

  async listWatches(clientSlug: string): Promise<WatchRecord[]> {
    const result = await this.pool.query<WatchRow>(
      `SELECT w.id, c.slug AS client_slug, w.slug, w.status, w.title, w.query,
              w.year_min, w.year_max, w.max_price, w.max_mileage,
              w.nationwide, w.clean_title_only, w.criteria
       FROM opportunity_watches w
       JOIN opportunity_clients c ON c.id = w.client_id
       WHERE c.slug = $1
       ORDER BY w.title`,
      [clientSlug],
    );
    return result.rows.map(mapWatch);
  }

  async listActiveMatchWatches(clientSlug: string): Promise<MatchWatchRecord[]> {
    const watches = await this.listWatches(clientSlug);
    return watches
      .filter((watch) => watch.status === 'active')
      .map((watch) => ({
        id: watch.id,
        slug: watch.slug,
        title: watch.title,
        makes: watch.criteria.makes ?? [],
        model: watch.criteria.model ?? '',
        requiredTrim: watch.criteria.requiredTrim ?? null,
        yearMin: watch.yearMin,
        yearMax: watch.yearMax,
        maxPrice: watch.maxPrice,
        maxMileage: watch.maxMileage,
        cleanTitleOnly: watch.cleanTitleOnly,
      }));
  }

  async createWatch(clientSlug: string, input: ValidatedWatchInput): Promise<WatchRecord> {
    const result = await this.pool.query<WatchRow>(
      `INSERT INTO opportunity_watches (
         client_id, slug, status, title, query, category, year_min, year_max,
         max_price, max_mileage, nationwide, clean_title_only, criteria
       )
       SELECT c.id, $2, $3, $4, $5, 'vehicle', $6, $7, $8, $9, $10, $11, '{}'::jsonb
       FROM opportunity_clients c
       WHERE c.slug = $1
       RETURNING id,
                 (SELECT slug FROM opportunity_clients WHERE id = client_id) AS client_slug,
                 slug, status, title, query, year_min, year_max, max_price,
                 max_mileage, nationwide, clean_title_only, criteria`,
      [
        clientSlug,
        `watch-${randomUUID()}`,
        input.status,
        input.title,
        input.query,
        input.yearMin,
        input.yearMax,
        input.maxPrice,
        input.maxMileage,
        input.nationwide,
        input.cleanTitleOnly,
      ],
    );
    if (!result.rows[0]) throw new Error('Authorized client was not found.');
    return mapWatch(result.rows[0]);
  }

  async updateWatch(
    clientSlug: string,
    watchId: string,
    input: ValidatedWatchInput,
  ): Promise<WatchRecord | null> {
    const result = await this.pool.query<WatchRow>(
      `UPDATE opportunity_watches w SET
         status = $3, title = $4, query = $5, year_min = $6, year_max = $7,
         max_price = $8, max_mileage = $9, nationwide = $10,
         clean_title_only = $11, updated_at = now()
       FROM opportunity_clients c
       WHERE w.client_id = c.id AND c.slug = $1 AND w.id = $2
       RETURNING w.id, c.slug AS client_slug, w.slug, w.status, w.title, w.query,
                 w.year_min, w.year_max, w.max_price, w.max_mileage,
                 w.nationwide, w.clean_title_only, w.criteria`,
      [
        clientSlug,
        watchId,
        input.status,
        input.title,
        input.query,
        input.yearMin,
        input.yearMax,
        input.maxPrice,
        input.maxMileage,
        input.nationwide,
        input.cleanTitleOnly,
      ],
    );
    return result.rows[0] ? mapWatch(result.rows[0]) : null;
  }

  async upsertSourceRecord(
    clientSlug: string,
    input: ListingInput,
    fetchedAt: Date,
  ): Promise<string> {
    const sanitizedInput = sanitizeListingInput(input);
    const { duplicateIdentity, ...sanitizedPayload } = sanitizedInput;
    const storedPayload = duplicateIdentity
      ? {
        ...sanitizedPayload,
        duplicateIdentity: {
          type: duplicateIdentity.type.trim().toLowerCase(),
          identityHash: createHash('sha256')
            .update(duplicateIdentity.value.trim().toLowerCase())
            .digest('hex'),
        },
      }
      : sanitizedPayload;
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(storedPayload))
      .digest('hex');
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO opportunity_source_records (
         client_id, source_type, source_item_id, source_url,
         sanitized_payload, payload_hash, fetched_at
       )
       SELECT c.id, $2, $3, $4, $5::jsonb, $6, $7
       FROM opportunity_clients c WHERE c.slug = $1
       ON CONFLICT (client_id, source_type, source_item_id) DO UPDATE SET
         source_url = EXCLUDED.source_url,
         sanitized_payload = EXCLUDED.sanitized_payload,
         payload_hash = EXCLUDED.payload_hash,
         fetched_at = EXCLUDED.fetched_at
       RETURNING id`,
      [
        clientSlug,
        sanitizedInput.sourceType,
        sanitizedInput.sourceItemId,
        sanitizedInput.sourceUrl,
        JSON.stringify(storedPayload),
        payloadHash,
        fetchedAt,
      ],
    );
    if (!result.rows[0]) throw new Error('Authorized client was not found.');
    return result.rows[0].id;
  }

  async upsertListing(
    clientSlug: string,
    input: ListingInput,
    seenAt: Date,
    sourceRecordId: string | null = null,
  ): Promise<ListingRecord> {
    const sanitizedInput = sanitizeListingInput(input);
    const result = await this.pool.query<ListingRow>(
      `INSERT INTO opportunity_listings (
         client_id, source_record_id, canonical_key, source_type, source_item_id,
         source_url, title, year, make, model, trim, price_amount, mileage,
         title_status, location_text, distance_miles, first_seen_at, last_seen_at
       )
       SELECT c.id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $17
       FROM opportunity_clients c WHERE c.slug = $1
       ON CONFLICT (client_id, canonical_key) DO UPDATE SET
         source_record_id = EXCLUDED.source_record_id,
         source_item_id = EXCLUDED.source_item_id,
         source_url = EXCLUDED.source_url,
         title = EXCLUDED.title,
         year = EXCLUDED.year,
         make = EXCLUDED.make,
         model = EXCLUDED.model,
         trim = EXCLUDED.trim,
         price_amount = EXCLUDED.price_amount,
         mileage = EXCLUDED.mileage,
         title_status = EXCLUDED.title_status,
         location_text = EXCLUDED.location_text,
         distance_miles = EXCLUDED.distance_miles,
         first_seen_at = LEAST(opportunity_listings.first_seen_at, EXCLUDED.first_seen_at),
         last_seen_at = GREATEST(opportunity_listings.last_seen_at, EXCLUDED.last_seen_at)
       RETURNING id, canonical_key, source_type, source_item_id, source_url,
                 title, year, make, model, trim, price_amount, mileage,
                 title_status, location_text, distance_miles,
                 first_seen_at, last_seen_at`,
      [
        clientSlug,
        sourceRecordId,
        sanitizedInput.canonicalKey,
        sanitizedInput.sourceType,
        sanitizedInput.sourceItemId,
        sanitizedInput.sourceUrl,
        sanitizedInput.title,
        sanitizedInput.year,
        sanitizedInput.make,
        sanitizedInput.model,
        sanitizedInput.trim,
        sanitizedInput.priceAmount,
        sanitizedInput.mileage,
        sanitizedInput.titleStatus,
        sanitizedInput.locationText,
        sanitizedInput.distanceMiles,
        seenAt,
      ],
    );
    if (!result.rows[0]) throw new Error('Authorized client was not found.');
    return mapListing(result.rows[0]);
  }

  async findListingByCanonicalKey(
    clientSlug: string,
    canonicalKey: string,
  ): Promise<ListingRecord | null> {
    const result = await this.pool.query<ListingRow>(
      `SELECT l.id, l.canonical_key, l.source_type, l.source_item_id, l.source_url,
              l.title, l.year, l.make, l.model, l.trim, l.price_amount, l.mileage,
              l.title_status, l.location_text, l.distance_miles,
              l.first_seen_at, l.last_seen_at
       FROM opportunity_listings l
       JOIN opportunity_clients c ON c.id = l.client_id
       WHERE c.slug = $1 AND l.canonical_key = $2`,
      [clientSlug, canonicalKey],
    );
    return result.rows[0] ? mapListing(result.rows[0]) : null;
  }

  async linkDuplicateIdentity(
    clientSlug: string,
    listingId: string,
    identityType: string,
    identityValue: string,
    seenAt: Date,
  ): Promise<DuplicateGroupRecord> {
    const normalizedType = identityType.trim().toLowerCase();
    const normalizedValue = identityValue.trim().toLowerCase();
    if (!normalizedType || normalizedType.length > 64 || !normalizedValue || normalizedValue.length > 300) {
      throw new Error('Duplicate identity is invalid.');
    }
    const identityHash = createHash('sha256').update(normalizedValue).digest('hex');
    const groupKey = createHash('sha256')
      .update(`${normalizedType}\u0000${identityHash}`)
      .digest('hex');
    if (this.pool instanceof Pool) {
      return this.withTransaction((repository) =>
        repository.linkDuplicateIdentity(clientSlug, listingId, normalizedType, normalizedValue, seenAt),
      );
    }

    const listing = await this.pool.query<{ id: string; duplicate_group_id: string | null }>(
      `SELECT l.id, l.duplicate_group_id
       FROM opportunity_listings l
       JOIN opportunity_clients c ON c.id = l.client_id
       WHERE c.slug = $1 AND l.id = $2
       FOR UPDATE OF l`,
      [clientSlug, listingId],
    );
    if (!listing.rows[0]) throw new Error('Authorized listing was not found.');
    const currentGroupId = listing.rows[0].duplicate_group_id;
    const existingIdentity = await this.pool.query<{ duplicate_group_id: string }>(
      `SELECT identity.duplicate_group_id
       FROM opportunity_duplicate_identities identity
       JOIN opportunity_clients c ON c.id = identity.client_id
       WHERE c.slug = $1 AND identity.identity_type = $2 AND identity.identity_hash = $3
       FOR UPDATE OF identity`,
      [clientSlug, normalizedType, identityHash],
    );
    let candidateGroupId = existingIdentity.rows[0]?.duplicate_group_id ?? currentGroupId;
    if (!candidateGroupId) {
      const group = await this.pool.query<{ id: string }>(
        `INSERT INTO opportunity_duplicate_groups (client_id, group_key, updated_at)
         SELECT c.id, $2, $3 FROM opportunity_clients c WHERE c.slug = $1
         ON CONFLICT (client_id, group_key) DO UPDATE SET updated_at = EXCLUDED.updated_at
         RETURNING id`,
        [clientSlug, groupKey, seenAt],
      );
      candidateGroupId = group.rows[0]?.id;
    }
    if (!candidateGroupId) throw new Error('Authorized client was not found.');

    const identity = await this.pool.query<{ duplicate_group_id: string }>(
      `INSERT INTO opportunity_duplicate_identities (
         client_id, duplicate_group_id, identity_type, identity_hash, first_seen_at, last_seen_at
       )
       SELECT c.id, $2, $3, $4, $5, $5
       FROM opportunity_clients c WHERE c.slug = $1
       ON CONFLICT (client_id, identity_type, identity_hash) DO UPDATE SET
         first_seen_at = LEAST(opportunity_duplicate_identities.first_seen_at, EXCLUDED.first_seen_at),
         last_seen_at = GREATEST(opportunity_duplicate_identities.last_seen_at, EXCLUDED.last_seen_at)
       RETURNING duplicate_group_id`,
      [clientSlug, candidateGroupId, normalizedType, identityHash, seenAt],
    );
    const groupId = identity.rows[0]?.duplicate_group_id;
    if (!groupId) throw new Error('Duplicate identity group was not found.');

    const groupIds = [...new Set([currentGroupId, groupId].filter((value): value is string => Boolean(value)))].sort();
    const lockedGroups = await this.pool.query<{
      id: string;
      representative_listing_id: string | null;
    }>(
      `SELECT g.id, g.representative_listing_id
       FROM opportunity_duplicate_groups g
       JOIN opportunity_clients c ON c.id = g.client_id
       WHERE c.slug = $1 AND g.id = ANY($2::uuid[])
       ORDER BY g.id
       FOR UPDATE OF g`,
      [clientSlug, groupIds],
    );
    if (lockedGroups.rowCount !== groupIds.length) {
      throw new Error('Duplicate group lock could not be acquired.');
    }
    const groupsById = new Map(
      lockedGroups.rows.map((row) => [row.id, row.representative_listing_id]),
    );
    let representativeListingId = groupsById.get(groupId) ?? null;

    if (currentGroupId && currentGroupId !== groupId) {
      representativeListingId = representativeListingId
        ?? groupsById.get(currentGroupId)
        ?? listingId;
      await this.pool.query(
        `UPDATE opportunity_duplicate_identities identity SET duplicate_group_id = $3
         FROM opportunity_clients c
         WHERE identity.client_id = c.id AND c.slug = $1 AND identity.duplicate_group_id = $2`,
        [clientSlug, currentGroupId, groupId],
      );
      await this.pool.query(
        `UPDATE opportunity_listings l SET duplicate_group_id = $3
         FROM opportunity_clients c
         WHERE l.client_id = c.id AND c.slug = $1 AND l.duplicate_group_id = $2`,
        [clientSlug, currentGroupId, groupId],
      );
      await this.pool.query(
        `UPDATE opportunity_duplicate_groups g
         SET representative_listing_id = $3, updated_at = $4
         FROM opportunity_clients c
         WHERE g.client_id = c.id AND c.slug = $1 AND g.id = $2`,
        [clientSlug, groupId, representativeListingId, seenAt],
      );
      await this.pool.query(
        `DELETE FROM opportunity_duplicate_groups g
         USING opportunity_clients c
         WHERE g.client_id = c.id AND c.slug = $1 AND g.id = $2`,
        [clientSlug, currentGroupId],
      );
    } else {
      await this.pool.query(
        `UPDATE opportunity_listings l SET duplicate_group_id = $3
         FROM opportunity_clients c
         WHERE l.client_id = c.id AND c.slug = $1 AND l.id = $2`,
        [clientSlug, listingId, groupId],
      );
      const representative = await this.pool.query<{ representative_listing_id: string }>(
        `UPDATE opportunity_duplicate_groups g
         SET representative_listing_id = COALESCE(g.representative_listing_id, $3), updated_at = $4
         FROM opportunity_clients c
         WHERE g.client_id = c.id AND c.slug = $1 AND g.id = $2
         RETURNING g.representative_listing_id`,
        [clientSlug, groupId, listingId, seenAt],
      );
      representativeListingId = representative.rows[0]?.representative_listing_id ?? null;
    }
    if (!representativeListingId) throw new Error('Duplicate group representative was not found.');

    await this.pool.query(
      `INSERT INTO opportunity_matches (
         client_id, listing_id, watch_id, score, accepted,
         match_reasons, reject_reasons, created_at, updated_at
       )
       SELECT DISTINCT ON (m.client_id, m.watch_id)
              m.client_id, $3::uuid, m.watch_id, m.score, m.accepted,
              m.match_reasons, m.reject_reasons, m.created_at, m.updated_at
       FROM opportunity_matches m
       JOIN opportunity_listings l ON l.id = m.listing_id AND l.client_id = m.client_id
       JOIN opportunity_clients c ON c.id = m.client_id
       WHERE c.slug = $1 AND l.duplicate_group_id = $2 AND l.id <> $3::uuid
       ORDER BY m.client_id, m.watch_id, m.accepted DESC, m.score DESC, m.updated_at DESC, m.id
       ON CONFLICT (client_id, listing_id, watch_id) DO UPDATE SET
         score = EXCLUDED.score,
         accepted = EXCLUDED.accepted,
         match_reasons = EXCLUDED.match_reasons,
         reject_reasons = EXCLUDED.reject_reasons,
         created_at = LEAST(opportunity_matches.created_at, EXCLUDED.created_at),
         updated_at = EXCLUDED.updated_at
       WHERE
         (EXCLUDED.accepted AND NOT opportunity_matches.accepted)
         OR (
           EXCLUDED.accepted = opportunity_matches.accepted
           AND EXCLUDED.score > opportunity_matches.score
         )
         OR (
           EXCLUDED.accepted = opportunity_matches.accepted
           AND EXCLUDED.score = opportunity_matches.score
           AND EXCLUDED.updated_at > opportunity_matches.updated_at
         )`,
      [clientSlug, groupId, representativeListingId],
    );
    await this.pool.query(
      `INSERT INTO opportunity_alert_events (
         client_id, listing_id, watch_id, channel, state, reason,
         idempotency_key, provider_message_id, created_at, sent_at
       )
       SELECT DISTINCT ON (a.client_id, a.watch_id, a.channel)
              a.client_id, $3::uuid, a.watch_id, a.channel, a.state, a.reason,
              $3::text || ':' || a.watch_id::text || ':' || a.channel,
              a.provider_message_id, a.created_at, a.sent_at
       FROM opportunity_alert_events a
       JOIN opportunity_listings l ON l.id = a.listing_id AND l.client_id = a.client_id
       JOIN opportunity_clients c ON c.id = a.client_id
       WHERE c.slug = $1 AND l.duplicate_group_id = $2 AND l.id <> $3::uuid
       ORDER BY a.client_id, a.watch_id, a.channel,
         CASE a.state
           WHEN 'delivered' THEN 6
           WHEN 'sent' THEN 5
           WHEN 'queued' THEN 4
           WHEN 'failed' THEN 3
           WHEN 'preview' THEN 2
           ELSE 1
         END DESC,
         COALESCE(a.sent_at, a.created_at) DESC,
         a.id
       ON CONFLICT (client_id, listing_id, watch_id, channel) DO UPDATE SET
         state = EXCLUDED.state,
         reason = EXCLUDED.reason,
         provider_message_id = EXCLUDED.provider_message_id,
         created_at = LEAST(opportunity_alert_events.created_at, EXCLUDED.created_at),
         sent_at = EXCLUDED.sent_at
       WHERE
         CASE EXCLUDED.state
           WHEN 'delivered' THEN 6
           WHEN 'sent' THEN 5
           WHEN 'queued' THEN 4
           WHEN 'failed' THEN 3
           WHEN 'preview' THEN 2
           ELSE 1
         END
         >
         CASE opportunity_alert_events.state
           WHEN 'delivered' THEN 6
           WHEN 'sent' THEN 5
           WHEN 'queued' THEN 4
           WHEN 'failed' THEN 3
           WHEN 'preview' THEN 2
           ELSE 1
         END
         OR (
           EXCLUDED.state = opportunity_alert_events.state
           AND COALESCE(EXCLUDED.sent_at, EXCLUDED.created_at)
             > COALESCE(opportunity_alert_events.sent_at, opportunity_alert_events.created_at)
         )`,
      [clientSlug, groupId, representativeListingId],
    );
    await this.pool.query(
      `DELETE FROM opportunity_alert_events a
       USING opportunity_listings l, opportunity_clients c
       WHERE a.listing_id = l.id AND a.client_id = c.id AND l.client_id = c.id
         AND c.slug = $1 AND l.duplicate_group_id = $2 AND l.id <> $3::uuid`,
      [clientSlug, groupId, representativeListingId],
    );
    await this.pool.query(
      `DELETE FROM opportunity_matches m
       USING opportunity_listings l, opportunity_clients c
       WHERE m.listing_id = l.id AND m.client_id = c.id AND l.client_id = c.id
         AND c.slug = $1 AND l.duplicate_group_id = $2 AND l.id <> $3::uuid`,
      [clientSlug, groupId, representativeListingId],
    );
    return { id: groupId, groupKey, representativeListingId };
  }

  async startWorkerRun(
    clientSlug: string,
    runKey: string,
    startedAt = new Date(),
    runType: 'fixture' | 'scheduled' = 'fixture',
  ): Promise<WorkerRunRecord> {
    const staleBefore = new Date(startedAt.getTime() - WORKER_LEASE_MS);
    await this.pool.query(
      `UPDATE opportunity_worker_runs r SET
         status = 'failed', finished_at = $2, error_summary = 'worker_lease_expired'
       FROM opportunity_clients c
       WHERE r.client_id = c.id AND c.slug = $1
         AND r.status = 'started' AND r.started_at <= $3`,
      [clientSlug, startedAt, staleBefore],
    );
    const inserted = await this.pool.query<WorkerRunRow>(
      `INSERT INTO opportunity_worker_runs (client_id, run_key, run_type, status, started_at)
       SELECT c.id, $2, $4, 'started', $3
       FROM opportunity_clients c WHERE c.slug = $1
       ON CONFLICT (client_id, run_key) DO NOTHING
       RETURNING id, status, counts`,
      [clientSlug, runKey, startedAt, runType],
    );
    if (inserted.rows[0]) return { ...inserted.rows[0], reused: false };

    const existing = await this.pool.query<WorkerRunRow>(
      `SELECT r.id, r.status, r.counts
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key = $2`,
      [clientSlug, runKey],
    );
    if (!existing.rows[0]) throw new Error('Authorized client was not found.');
    return { ...existing.rows[0], reused: true };
  }

  async checkpointWorkerRun(
    clientSlug: string,
    runId: string,
    counts: Record<string, number>,
  ): Promise<void> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE opportunity_worker_runs r SET counts = $3::jsonb
       FROM opportunity_clients c
       WHERE r.client_id = c.id AND c.slug = $1 AND r.id = $2 AND r.status = 'started'
       RETURNING r.id`,
      [clientSlug, runId, JSON.stringify(counts)],
    );
    if (result.rowCount !== 1) throw new Error('Started worker run was not found.');
  }

  async finishWorkerRun(
    clientSlug: string,
    runId: string,
    status: WorkerRunStatus,
    counts: Record<string, number>,
    errorSummary: string | null,
    finishedAt: Date,
  ): Promise<void> {
    if (status === 'started') throw new Error('Worker run terminal status is required.');
    const result = await this.pool.query<{ id: string }>(
      `UPDATE opportunity_worker_runs r SET
         status = $3, counts = $4::jsonb, error_summary = $5, finished_at = $6
       FROM opportunity_clients c
       WHERE r.client_id = c.id AND c.slug = $1 AND r.id = $2 AND r.status = 'started'
       RETURNING r.id`,
      [clientSlug, runId, status, JSON.stringify(counts), errorSummary, finishedAt],
    );
    if (result.rowCount !== 1) throw new Error('Started worker run was not found.');
  }

  async recordSourceResult(
    clientSlug: string,
    runId: string,
    result: SourceRunRecord,
  ): Promise<void> {
    const persisted = await this.pool.query<{ id: string }>(
      `INSERT INTO opportunity_source_run_results (
         worker_run_id, source_type, status, counts, error_summary
       )
       SELECT r.id, $3, $4, $5::jsonb, $6
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.id = $2 AND r.status = 'started'
       ON CONFLICT (worker_run_id, source_type) DO UPDATE SET
         status = EXCLUDED.status,
         counts = EXCLUDED.counts,
         error_summary = EXCLUDED.error_summary
       RETURNING id`,
      [
        clientSlug,
        runId,
        result.sourceType,
        result.status,
        JSON.stringify(result.counts),
        result.errorSummary,
      ],
    );
    if (persisted.rowCount !== 1) throw new Error('Started worker run was not found.');
  }

  async getSourceResults(clientSlug: string, runId: string): Promise<SourceRunRecord[]> {
    const result = await this.pool.query<SourceRunRow>(
      `SELECT s.source_type, s.status, s.counts, s.error_summary
       FROM opportunity_source_run_results s
       JOIN opportunity_worker_runs r ON r.id = s.worker_run_id
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.id = $2
       ORDER BY s.source_type`,
      [clientSlug, runId],
    );
    return result.rows.map((row) => ({
      sourceType: row.source_type,
      status: row.status,
      counts: row.counts,
      errorSummary: row.error_summary,
    }));
  }

  async recordSighting(
    clientSlug: string,
    listingId: string,
    runId: string,
    seenAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO opportunity_listing_sightings (listing_id, worker_run_id, seen_at)
       SELECT l.id, r.id, $4
       FROM opportunity_listings l
       JOIN opportunity_clients c ON c.id = l.client_id
       JOIN opportunity_worker_runs r ON r.client_id = c.id
       WHERE c.slug = $1 AND l.id = $2 AND r.id = $3
       ON CONFLICT (listing_id, worker_run_id) DO UPDATE
       SET seen_at = LEAST(opportunity_listing_sightings.seen_at, EXCLUDED.seen_at)`,
      [clientSlug, listingId, runId, seenAt],
    );
  }

  private async lockDecisionListingId(clientSlug: string, listingId: string): Promise<string> {
    const listing = await this.pool.query<{ id: string; duplicate_group_id: string | null }>(
      `SELECT l.id, l.duplicate_group_id
       FROM opportunity_listings l
       JOIN opportunity_clients c ON c.id = l.client_id
       WHERE c.slug = $1 AND l.id = $2
       FOR UPDATE OF l`,
      [clientSlug, listingId],
    );
    const requested = listing.rows[0];
    if (!requested) throw new Error('Authorized listing was not found.');
    if (!requested.duplicate_group_id) return requested.id;

    const group = await this.pool.query<{ representative_listing_id: string | null }>(
      `SELECT g.representative_listing_id
       FROM opportunity_duplicate_groups g
       JOIN opportunity_clients c ON c.id = g.client_id
       WHERE c.slug = $1 AND g.id = $2
       FOR UPDATE OF g`,
      [clientSlug, requested.duplicate_group_id],
    );
    if (!group.rows[0]) throw new Error('Authorized duplicate group was not found.');
    return group.rows[0].representative_listing_id ?? requested.id;
  }

  async upsertMatch(
    clientSlug: string,
    listingId: string,
    watchId: string,
    evaluation: MatchEvaluation,
  ): Promise<string> {
    if (this.pool instanceof Pool) {
      return this.withTransaction((repository) =>
        repository.upsertMatch(clientSlug, listingId, watchId, evaluation),
      );
    }
    const targetListingId = await this.lockDecisionListingId(clientSlug, listingId);
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO opportunity_matches (
         client_id, listing_id, watch_id, score, accepted,
         match_reasons, reject_reasons
       )
       SELECT c.id, target.id, w.id, $4, $5, $6::jsonb, $7::jsonb
       FROM opportunity_clients c
       JOIN opportunity_listings target ON target.client_id = c.id
       JOIN opportunity_watches w ON w.client_id = c.id
       WHERE c.slug = $1 AND target.id = $2 AND w.id = $3
       ON CONFLICT (client_id, listing_id, watch_id) DO UPDATE SET
         score = EXCLUDED.score,
         accepted = EXCLUDED.accepted,
         match_reasons = EXCLUDED.match_reasons,
         reject_reasons = EXCLUDED.reject_reasons,
         updated_at = now()
       RETURNING id`,
      [
        clientSlug,
        targetListingId,
        watchId,
        evaluation.score,
        evaluation.accepted,
        JSON.stringify(evaluation.matchReasons),
        JSON.stringify([...evaluation.rejectReasons, ...evaluation.reviewReasons]),
      ],
    );
    if (!result.rows[0]) throw new Error('Authorized listing or watch was not found.');
    return result.rows[0].id;
  }

  async reconcileMatch(
    clientSlug: string,
    listingId: string,
    watchId: string,
    evaluation: MatchEvaluation,
  ): Promise<string> {
    if (this.pool instanceof Pool) {
      return this.withTransaction((repository) =>
        repository.reconcileMatch(clientSlug, listingId, watchId, evaluation),
      );
    }
    const targetListingId = await this.lockDecisionListingId(clientSlug, listingId);
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO opportunity_matches (
         client_id, listing_id, watch_id, score, accepted,
         match_reasons, reject_reasons
       )
       SELECT c.id, target.id, w.id, $4, $5, $6::jsonb, $7::jsonb
       FROM opportunity_clients c
       JOIN opportunity_listings target ON target.client_id = c.id
       JOIN opportunity_watches w ON w.client_id = c.id
       WHERE c.slug = $1 AND target.id = $2 AND w.id = $3
       ON CONFLICT (client_id, listing_id, watch_id) DO UPDATE SET
         score = EXCLUDED.score,
         accepted = EXCLUDED.accepted,
         match_reasons = EXCLUDED.match_reasons,
         reject_reasons = EXCLUDED.reject_reasons,
         updated_at = now()
       WHERE
         (EXCLUDED.accepted AND NOT opportunity_matches.accepted)
         OR (
           EXCLUDED.accepted = opportunity_matches.accepted
           AND EXCLUDED.score > opportunity_matches.score
         )
         OR (
           EXCLUDED.accepted = opportunity_matches.accepted
           AND EXCLUDED.score = opportunity_matches.score
           AND now() > opportunity_matches.updated_at
         )
       RETURNING id`,
      [
        clientSlug,
        targetListingId,
        watchId,
        evaluation.score,
        evaluation.accepted,
        JSON.stringify(evaluation.matchReasons),
        JSON.stringify([...evaluation.rejectReasons, ...evaluation.reviewReasons]),
      ],
    );
    if (result.rows[0]) return result.rows[0].id;

    const existing = await this.pool.query<{ id: string }>(
      `SELECT m.id
       FROM opportunity_matches m
       JOIN opportunity_clients c ON c.id = m.client_id
       WHERE c.slug = $1 AND m.listing_id = $2 AND m.watch_id = $3`,
      [clientSlug, targetListingId, watchId],
    );
    if (!existing.rows[0]) throw new Error('Authorized listing or watch was not found.');
    return existing.rows[0].id;
  }

  async recordSkippedAlert(
    clientSlug: string,
    listingId: string,
    watchId: string,
  ): Promise<boolean> {
    if (this.pool instanceof Pool) {
      return this.withTransaction((repository) =>
        repository.recordSkippedAlert(clientSlug, listingId, watchId),
      );
    }
    const targetListingId = await this.lockDecisionListingId(clientSlug, listingId);
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO opportunity_alert_events (
         client_id, listing_id, watch_id, channel, state, reason, idempotency_key
       )
       SELECT c.id, target.id, w.id, 'none', 'skipped', 'provider_disabled',
              target.id::text || ':' || w.id::text || ':none'
       FROM opportunity_clients c
       JOIN opportunity_listings target ON target.client_id = c.id
       JOIN opportunity_watches w ON w.client_id = c.id
       WHERE c.slug = $1 AND target.id = $2 AND w.id = $3
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [clientSlug, targetListingId, watchId],
    );
    return result.rowCount === 1;
  }

  async listAlertEvents(clientSlug: string): Promise<AlertEventRecord[]> {
    const result = await this.pool.query<AlertEventRow>(
      `SELECT l.canonical_key, a.channel, a.state, a.reason, a.created_at
       FROM opportunity_alert_events a
       JOIN opportunity_clients c ON c.id = a.client_id
       JOIN opportunity_listings l ON l.id = a.listing_id AND l.client_id = c.id
       WHERE c.slug = $1
       ORDER BY a.created_at DESC, a.id DESC`,
      [clientSlug],
    );
    return result.rows.map((row) => ({
      canonicalKey: row.canonical_key,
      channel: row.channel,
      state: row.state,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  }

  async listLeadDecisions(clientSlug: string, limit = 12): Promise<LeadDecisionRecord[]> {
    const result = await this.pool.query<LeadDecisionRow>(
      `SELECT l.title, l.source_type, l.year, l.make, l.model, l.trim,
              l.price_amount, l.mileage, l.title_status, l.location_text,
              l.distance_miles, l.first_seen_at, l.last_seen_at,
              COALESCE(duplicates.duplicate_count, 1)::text AS duplicate_count,
              best.watch_title, best.score, best.accepted, best.match_reasons,
              best.reject_reasons, alert.state AS alert_state, alert.reason AS alert_reason
       FROM opportunity_listings l
       JOIN opportunity_clients c ON c.id = l.client_id
       LEFT JOIN opportunity_duplicate_groups duplicate_group
         ON duplicate_group.id = l.duplicate_group_id AND duplicate_group.client_id = c.id
       LEFT JOIN LATERAL (
         SELECT w.id AS watch_id, w.title AS watch_title, m.score, m.accepted,
                m.match_reasons, m.reject_reasons
         FROM opportunity_matches m
         JOIN opportunity_watches w ON w.id = m.watch_id AND w.client_id = c.id
         WHERE m.client_id = c.id AND m.listing_id = l.id
         ORDER BY m.accepted DESC, m.score DESC, m.id
         LIMIT 1
       ) best ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS duplicate_count
         FROM opportunity_listings grouped
         WHERE l.duplicate_group_id IS NOT NULL
           AND grouped.duplicate_group_id = l.duplicate_group_id
           AND grouped.client_id = c.id
       ) duplicates ON true
       LEFT JOIN LATERAL (
         SELECT a.state, a.reason
         FROM opportunity_alert_events a
         WHERE a.client_id = c.id AND a.listing_id = l.id AND a.watch_id = best.watch_id
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 1
       ) alert ON true
       WHERE c.slug = $1
         AND (l.duplicate_group_id IS NULL OR duplicate_group.representative_listing_id = l.id)
       ORDER BY best.accepted DESC NULLS LAST, best.score DESC NULLS LAST,
                (l.distance_miles IS NOT NULL AND l.distance_miles <= 50) DESC,
                l.first_seen_at DESC, l.id
       LIMIT $2`,
      [clientSlug, Math.min(Math.max(limit, 1), 50)],
    );
    return result.rows.map((row) => ({
      title: row.title,
      sourceType: row.source_type,
      year: row.year,
      make: row.make,
      model: row.model,
      trim: row.trim,
      priceAmount: row.price_amount === null ? null : Number(row.price_amount),
      mileage: row.mileage,
      titleStatus: row.title_status,
      locationText: row.location_text,
      distanceMiles: row.distance_miles,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      duplicateCount: Number(row.duplicate_count),
      watchTitle: row.watch_title,
      score: row.score,
      accepted: row.accepted ?? false,
      matchReasons: row.match_reasons ?? [],
      rejectReasons: row.reject_reasons ?? [],
      alertState: row.alert_state,
      alertReason: row.alert_reason,
    }));
  }

  async listRecentWorkerRuns(clientSlug: string, limit = 5): Promise<WorkerRunSummary[]> {
    const result = await this.pool.query<WorkerRunSummaryRow>(
      `SELECT r.id, r.run_type, r.status, r.counts, r.started_at, r.finished_at, r.error_summary
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1
       ORDER BY r.started_at DESC, r.id DESC
       LIMIT $2`,
      [clientSlug, Math.min(Math.max(limit, 1), 20)],
    );
    return Promise.all(
      result.rows.map(async (row) => ({
        runType: row.run_type,
        status: row.status,
        counts: row.counts,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        errorSummary: row.error_summary,
        sourceResults: await this.getSourceResults(clientSlug, row.id),
      })),
    );
  }

  async withTransaction<T>(work: (repository: OpportunityRepository) => Promise<T>): Promise<T> {
    const client = await this.connectionPool().connect();
    try {
      await client.query('BEGIN');
      const value = await work(new OpportunityRepository(client));
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
