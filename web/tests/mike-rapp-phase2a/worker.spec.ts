import { createHash } from 'node:crypto';

import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { OpportunityRepository } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';
import { runOpportunityWorker, type SourceAdapter } from '../../src/lib/opportunity/worker';

const databaseUrl = process.env.POSTGRES_URL ?? '';

const matchingListing = {
  canonicalKey: 'fixture:worker-land-cruiser',
  sourceType: 'fixture',
  sourceItemId: 'worker-land-cruiser',
  sourceUrl: null,
  title: '2011 Toyota Land Cruiser · clean Georgia title',
  year: 2011,
  make: 'Toyota',
  model: 'Land Cruiser',
  trim: null,
  priceAmount: 33_900,
  mileage: 139_200,
  titleStatus: 'clean' as const,
  locationText: 'Alpharetta, GA',
  distanceMiles: 27,
};

test('one adapter failure produces a truthful partial run while successful fixtures persist', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const adapters: SourceAdapter[] = [
    { sourceType: 'fixture-good', poll: async () => [matchingListing] },
    { sourceType: 'fixture-failed', poll: async () => { throw new Error('Synthetic source unavailable'); } },
  ];

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', matchingListing.canonicalKey],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', 'partial-source-run-v1'],
    );
    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'partial-source-run-v1',
      adapters,
      now: new Date('2026-01-03T00:00:00Z'),
    });

    expect(result.status).toBe('partial');
    expect(result.sourceResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceType: 'fixture-good', status: 'ok' }),
      expect.objectContaining({ sourceType: 'fixture-failed', status: 'failed' }),
    ]));
    expect(JSON.stringify(result)).not.toContain('stack');
    await expect(repository.findListingByCanonicalKey('mike-rapp', matchingListing.canonicalKey)).resolves.not.toBeNull();
  } finally {
    await pool.end();
  }
});

test('source failure summaries redact credentialed URLs and secret-like values', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', 'redacted-source-error-v1'],
    );
    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'redacted-source-error-v1',
      adapters: [{
        sourceType: 'fixture-redaction',
        poll: async () => {
          throw new Error(
            'request failed at postgresql://fixture-user:synthetic-sensitive@example.test/db token=synthetic-sensitive',
          );
        },
      }],
      now: new Date('2026-01-04T00:00:00Z'),
    });

    const summary = result.sourceResults[0]?.errorSummary ?? '';
    expect(summary).toBe('source_processing_failed');
    expect(summary).not.toContain('synthetic-sensitive');
    expect(summary).not.toContain('fixture-user');
  } finally {
    await pool.end();
  }
});

test('invalid normalized listing values fail the source without persisting the listing', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const invalidListing = {
    ...matchingListing,
    canonicalKey: 'fixture:invalid-negative-mileage',
    sourceItemId: 'invalid-negative-mileage',
    mileage: -1,
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', invalidListing.canonicalKey],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', 'invalid-listing-v1'],
    );
    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'invalid-listing-v1',
      adapters: [{ sourceType: 'fixture-invalid', poll: async () => [invalidListing] }],
      now: new Date('2026-01-04T00:00:00Z'),
    });

    expect(result.status).toBe('failed');
    expect(result.counts).toMatchObject({ fetched: 1, normalized: 0, listings: 0 });
    expect(result.sourceResults[0]).toMatchObject({
      status: 'failed',
      counts: { fetched: 1, normalized: 0, failed: 1 },
    });
    await expect(
      repository.findListingByCanonicalKey('mike-rapp', invalidListing.canonicalKey),
    ).resolves.toBeNull();
  } finally {
    await pool.end();
  }
});

test('fixture matching records a skipped preview event and never a delivery claim', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', matchingListing.canonicalKey],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', 'truthful-skipped-alert-v1'],
    );
    await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'truthful-skipped-alert-v1',
      adapters: [{ sourceType: 'fixture', poll: async () => [matchingListing] }],
      now: new Date('2026-01-04T00:00:00Z'),
    });

    const events = await repository.listAlertEvents('mike-rapp');
    const event = events.find((candidate) => candidate.canonicalKey === matchingListing.canonicalKey);
    expect(event).toMatchObject({
      channel: 'none',
      state: 'skipped',
      reason: 'provider_disabled',
    });
    expect(['queued', 'sent', 'delivered']).not.toContain(event?.state);
  } finally {
    await pool.end();
  }
});

test('repeated worker runs do not create or claim repeated alerts', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const repeatedListing = {
    ...matchingListing,
    canonicalKey: 'fixture:worker-repeat-idempotency',
    sourceItemId: 'worker-repeat-idempotency',
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', repeatedListing.canonicalKey],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = ANY($2::text[])`,
      ['mike-rapp', ['repeat-idempotency-first-v1', 'repeat-idempotency-second-v1']],
    );
    const first = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'repeat-idempotency-first-v1',
      adapters: [{ sourceType: 'fixture', poll: async () => [repeatedListing] }],
      now: new Date('2026-01-05T00:00:00Z'),
    });
    const second = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'repeat-idempotency-second-v1',
      adapters: [{ sourceType: 'fixture', poll: async () => [repeatedListing] }],
      now: new Date('2026-01-06T00:00:00Z'),
    });

    expect(first.counts.alertsSkipped).toBe(1);
    expect(second.counts.alertsSkipped).toBe(0);
    const events = (await repository.listAlertEvents('mike-rapp')).filter(
      (event) => event.canonicalKey === repeatedListing.canonicalKey,
    );
    expect(events).toHaveLength(1);
  } finally {
    await pool.end();
  }
});

test('listing persistence rolls back when matching fails inside the worker transaction', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const failingListing = {
    ...matchingListing,
    canonicalKey: 'fixture:transaction-rollback',
    sourceItemId: 'transaction-rollback',
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', failingListing.canonicalKey],
    );
    await pool.query(
      `DELETE FROM opportunity_source_records
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND source_item_id = $2`,
      ['mike-rapp', failingListing.sourceItemId],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', 'transaction-rollback-v1'],
    );
    await pool.query('DROP TRIGGER IF EXISTS opportunity_test_fail_match ON opportunity_matches');
    await pool.query('DROP FUNCTION IF EXISTS opportunity_test_fail_match()');
    await pool.query(`
      CREATE FUNCTION opportunity_test_fail_match() RETURNS trigger AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM opportunity_listings
          WHERE id = NEW.listing_id AND canonical_key = 'fixture:transaction-rollback'
        ) THEN
          RAISE EXCEPTION 'synthetic transactional match failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await pool.query(`
      CREATE TRIGGER opportunity_test_fail_match
      BEFORE INSERT OR UPDATE ON opportunity_matches
      FOR EACH ROW EXECUTE FUNCTION opportunity_test_fail_match()
    `);

    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'transaction-rollback-v1',
      adapters: [{ sourceType: 'fixture', poll: async () => [failingListing] }],
      now: new Date('2026-01-09T00:00:00Z'),
    });

    expect(result.status).toBe('failed');
    await expect(
      repository.findListingByCanonicalKey('mike-rapp', failingListing.canonicalKey),
    ).resolves.toBeNull();
    const rawRecords = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunity_source_records r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.source_item_id = $2`,
      ['mike-rapp', failingListing.sourceItemId],
    );
    expect(rawRecords.rows[0].count).toBe('0');
  } finally {
    await pool.query('DROP TRIGGER IF EXISTS opportunity_test_fail_match ON opportunity_matches');
    await pool.query('DROP FUNCTION IF EXISTS opportunity_test_fail_match()');
    await pool.end();
  }
});

test('mid-source failure preserves prior items and reports truthful source counts', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const priorListing = {
    ...matchingListing,
    canonicalKey: 'fixture:transaction-prior-success',
    sourceItemId: 'transaction-prior-success',
  };
  const failingListing = {
    ...matchingListing,
    canonicalKey: 'fixture:transaction-mid-source-failure',
    sourceItemId: 'transaction-mid-source-failure',
  };
  const laterListing = {
    ...matchingListing,
    canonicalKey: 'fixture:transaction-later-success',
    sourceItemId: 'transaction-later-success',
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = ANY($2::text[])`,
      ['mike-rapp', [priorListing.canonicalKey, failingListing.canonicalKey, laterListing.canonicalKey]],
    );
    await pool.query(
      `DELETE FROM opportunity_source_records
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND source_item_id = ANY($2::text[])`,
      ['mike-rapp', [priorListing.sourceItemId, failingListing.sourceItemId, laterListing.sourceItemId]],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', 'transaction-mid-source-failure-v1'],
    );
    await pool.query('DROP TRIGGER IF EXISTS opportunity_test_fail_match ON opportunity_matches');
    await pool.query('DROP FUNCTION IF EXISTS opportunity_test_fail_match()');
    await pool.query(`
      CREATE FUNCTION opportunity_test_fail_match() RETURNS trigger AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM opportunity_listings
          WHERE id = NEW.listing_id AND canonical_key = 'fixture:transaction-mid-source-failure'
        ) THEN
          RAISE EXCEPTION 'synthetic mid-source match failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await pool.query(`
      CREATE TRIGGER opportunity_test_fail_match
      BEFORE INSERT OR UPDATE ON opportunity_matches
      FOR EACH ROW EXECUTE FUNCTION opportunity_test_fail_match()
    `);

    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'transaction-mid-source-failure-v1',
      adapters: [{
        sourceType: 'fixture-mid-source',
        poll: async () => [priorListing, failingListing, laterListing],
      }],
      now: new Date('2026-01-09T00:00:00Z'),
    });

    expect(result.status).toBe('partial');
    expect(result.counts).toMatchObject({ fetched: 3, normalized: 3, listings: 2, failedSources: 1 });
    expect(result.sourceResults[0]).toMatchObject({
      sourceType: 'fixture-mid-source',
      status: 'failed',
      counts: { fetched: 3, normalized: 3, failed: 1 },
    });
    await expect(repository.findListingByCanonicalKey('mike-rapp', priorListing.canonicalKey)).resolves.not.toBeNull();
    await expect(repository.findListingByCanonicalKey('mike-rapp', failingListing.canonicalKey)).resolves.toBeNull();
    await expect(repository.findListingByCanonicalKey('mike-rapp', laterListing.canonicalKey)).resolves.not.toBeNull();
  } finally {
    await pool.query('DROP TRIGGER IF EXISTS opportunity_test_fail_match ON opportunity_matches');
    await pool.query('DROP FUNCTION IF EXISTS opportunity_test_fail_match()');
    await pool.end();
  }
});

test('cross-source duplicates retain provenance but create one decision and alert per watch', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const first = {
    ...matchingListing,
    canonicalKey: 'fixture:cross-source-primary',
    sourceItemId: 'cross-source-primary',
    priceAmount: 99_000,
    duplicateIdentity: { type: 'vin', value: 'synthetic-cross-source-opportunity' },
  };
  const second = {
    ...matchingListing,
    canonicalKey: 'fixture-secondary:cross-source-secondary',
    sourceType: 'fixture-secondary',
    sourceItemId: 'cross-source-secondary',
    duplicateIdentity: { type: 'vin', value: 'synthetic-cross-source-opportunity' },
  };
  const runKeys = ['cross-source-identity-first-v1', 'cross-source-identity-repeat-v1'];

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = ANY($2::text[])`,
      ['mike-rapp', [first.canonicalKey, second.canonicalKey]],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = ANY($2::text[])`,
      ['mike-rapp', runKeys],
    );

    const adapters: SourceAdapter[] = [
      { sourceType: 'fixture-primary', poll: async () => [first] },
      { sourceType: 'fixture-secondary', poll: async () => [second] },
    ];
    const initial = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: runKeys[0],
      adapters,
      now: new Date('2026-01-11T00:00:00Z'),
    });
    const repeated = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: runKeys[1],
      adapters,
      now: new Date('2026-01-12T00:00:00Z'),
    });

    const persisted = await pool.query<{
      listings: string;
      groups: string;
      decisions: string;
      decision_watches: string;
      accepted_decisions: string;
      alerts: string;
    }>(
      `SELECT
         COUNT(DISTINCT l.id)::text AS listings,
         COUNT(DISTINCT l.duplicate_group_id)::text AS groups,
         COUNT(DISTINCT m.id)::text AS decisions,
         COUNT(DISTINCT m.watch_id)::text AS decision_watches,
         COUNT(DISTINCT m.id) FILTER (WHERE m.accepted)::text AS accepted_decisions,
         COUNT(DISTINCT a.id)::text AS alerts
       FROM opportunity_listings l
       LEFT JOIN opportunity_matches m ON m.listing_id = l.id
       LEFT JOIN opportunity_alert_events a ON a.listing_id = l.id
       WHERE l.client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND l.canonical_key = ANY($2::text[])`,
      ['mike-rapp', [first.canonicalKey, second.canonicalKey]],
    );

    expect(initial.counts).toMatchObject({ listings: 2, matches: 1, alertsSkipped: 1 });
    expect(repeated.counts).toMatchObject({ listings: 2, matches: 1, alertsSkipped: 0 });
    expect(persisted.rows[0]).toEqual({
      listings: '2',
      groups: '1',
      decisions: '3',
      decision_watches: '3',
      accepted_decisions: '1',
      alerts: '1',
    });
  } finally {
    await pool.end();
  }
});

test('pre-adapter failures finalize the run and redact sensitive error material', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const runKey = 'pre-adapter-terminal-failure-v1';

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', runKey],
    );
    repository.listActiveMatchWatches = async () => {
      throw new Error(
        'preflight failed at postgresql://fixture-user:synthetic-password@example.test/db token=synthetic-sensitive',
      );
    };

    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey,
      adapters: [],
      now: new Date('2026-01-13T00:00:00Z'),
    });
    const persisted = await pool.query<{
      status: string;
      finished_at: Date | null;
      error_summary: string | null;
      counts: Record<string, number>;
    }>(
      `SELECT r.status, r.finished_at, r.error_summary, r.counts
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key = $2`,
      ['mike-rapp', runKey],
    );

    expect(result).toMatchObject({ status: 'failed', counts: { listings: 0, failedSources: 0 } });
    expect(persisted.rows[0].status).toBe('failed');
    expect(persisted.rows[0].finished_at?.toISOString()).toBe('2026-01-13T00:00:00.000Z');
    expect(persisted.rows[0].error_summary).toBe('source_processing_failed');
    expect(persisted.rows[0].error_summary).not.toContain('synthetic-sensitive');
    expect(persisted.rows[0].error_summary).not.toContain('fixture-user');
  } finally {
    await pool.end();
  }
});

test('a new run recovers stale started leases before doing work', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const staleRunKey = 'stale-started-recovery-v1';
  const currentRunKey = 'stale-started-recovery-current-v1';
  const recoveredAt = new Date('2026-01-14T00:00:00Z');

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = ANY($2::text[])`,
      ['mike-rapp', [staleRunKey, currentRunKey]],
    );
    await pool.query(
      `INSERT INTO opportunity_worker_runs (client_id, run_key, run_type, status, started_at)
       SELECT c.id, $2, 'fixture', 'started', $3
       FROM opportunity_clients c WHERE c.slug = $1`,
      ['mike-rapp', staleRunKey, new Date('2026-01-13T23:30:00Z')],
    );

    const current = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: currentRunKey,
      adapters: [{ sourceType: 'fixture-empty', poll: async () => [] }],
      now: recoveredAt,
    });
    const stale = await pool.query<{
      status: string;
      finished_at: Date | null;
      error_summary: string | null;
    }>(
      `SELECT r.status, r.finished_at, r.error_summary
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key = $2`,
      ['mike-rapp', staleRunKey],
    );

    expect(current.status).toBe('ok');
    expect(stale.rows[0]).toMatchObject({
      status: 'failed',
      error_summary: 'worker_lease_expired',
    });
    expect(stale.rows[0].finished_at?.toISOString()).toBe(recoveredAt.toISOString());
  } finally {
    await pool.end();
  }
});

test('late duplicate identity reconciles existing decisions and alerts onto one representative', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const first = {
    ...matchingListing,
    canonicalKey: 'fixture:late-identity-primary',
    sourceItemId: 'late-identity-primary',
  };
  const second = {
    ...matchingListing,
    canonicalKey: 'fixture-secondary:late-identity-secondary',
    sourceType: 'fixture-secondary',
    sourceItemId: 'late-identity-secondary',
  };
  const identity = { type: 'vin', value: 'synthetic-late-identity' };
  const runKeys = [
    'late-identity-primary-v1',
    'late-identity-secondary-v1',
    'late-identity-reconcile-v1',
  ];

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = ANY($2::text[])`,
      ['mike-rapp', [first.canonicalKey, second.canonicalKey]],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = ANY($2::text[])`,
      ['mike-rapp', runKeys],
    );

    await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: runKeys[0],
      adapters: [{ sourceType: 'fixture-primary', poll: async () => [first] }],
      now: new Date('2026-01-15T00:00:00Z'),
    });
    await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: runKeys[1],
      adapters: [{ sourceType: 'fixture-secondary', poll: async () => [second] }],
      now: new Date('2026-01-15T00:01:00Z'),
    });

    const before = await pool.query<{ decisions: string; alerts: string }>(
      `SELECT
         (SELECT COUNT(*)::text FROM opportunity_matches m
          JOIN opportunity_listings l ON l.id = m.listing_id
          WHERE l.canonical_key = ANY($1::text[])) AS decisions,
         (SELECT COUNT(*)::text FROM opportunity_alert_events a
          JOIN opportunity_listings l ON l.id = a.listing_id
          WHERE l.canonical_key = ANY($1::text[])) AS alerts`,
      [[first.canonicalKey, second.canonicalKey]],
    );
    expect(before.rows[0]).toEqual({ decisions: '6', alerts: '2' });

    await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: runKeys[2],
      adapters: [
        { sourceType: 'fixture-primary', poll: async () => [{ ...first, duplicateIdentity: identity }] },
        { sourceType: 'fixture-secondary', poll: async () => [{ ...second, duplicateIdentity: identity }] },
      ],
      now: new Date('2026-01-15T00:02:00Z'),
    });

    const secondary = await repository.findListingByCanonicalKey('mike-rapp', second.canonicalKey);
    const watch = (await repository.listActiveMatchWatches('mike-rapp'))
      .find((candidate) => candidate.slug === 'land-cruiser-2008-2015');
    expect(secondary).not.toBeNull();
    expect(watch).toBeDefined();
    if (!watch) throw new Error('Expected the Land Cruiser watch fixture.');
    await repository.upsertMatch('mike-rapp', secondary!.id, watch.id, {
      accepted: true,
      score: 99,
      matchReasons: ['Synthetic canonicalization check.'],
      rejectReasons: [],
      reviewReasons: [],
    });
    await repository.recordSkippedAlert('mike-rapp', secondary!.id, watch.id);

    const after = await pool.query<{
      listings: string;
      groups: string;
      decisions: string;
      decision_watches: string;
      alerts: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM opportunity_listings l
          WHERE l.canonical_key = ANY($1::text[])) AS listings,
         (SELECT COUNT(DISTINCT l.duplicate_group_id)::text FROM opportunity_listings l
          WHERE l.canonical_key = ANY($1::text[])) AS groups,
         (SELECT COUNT(*)::text FROM opportunity_matches m
          JOIN opportunity_listings l ON l.id = m.listing_id
          WHERE l.canonical_key = ANY($1::text[])) AS decisions,
         (SELECT COUNT(DISTINCT m.watch_id)::text FROM opportunity_matches m
          JOIN opportunity_listings l ON l.id = m.listing_id
          WHERE l.canonical_key = ANY($1::text[])) AS decision_watches,
         (SELECT COUNT(*)::text FROM opportunity_alert_events a
          JOIN opportunity_listings l ON l.id = a.listing_id
          WHERE l.canonical_key = ANY($1::text[])) AS alerts`,
      [[first.canonicalKey, second.canonicalKey]],
    );
    expect(after.rows[0]).toEqual({
      listings: '2',
      groups: '1',
      decisions: '3',
      decision_watches: '3',
      alerts: '1',
    });
  } finally {
    await pool.end();
  }
});

test('stale recovery preserves counts checkpointed with committed listing work', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const listing = {
    ...matchingListing,
    canonicalKey: 'fixture:stale-checkpoint-listing',
    sourceItemId: 'stale-checkpoint-listing',
  };
  const staleRunKey = 'stale-checkpoint-run-v1';
  const recoveryRunKey = 'stale-checkpoint-recovery-v1';

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', listing.canonicalKey],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = ANY($2::text[])`,
      ['mike-rapp', [staleRunKey, recoveryRunKey]],
    );
    repository.recordSourceResult = async () => {
      throw new Error('Synthetic crash after item commit');
    };

    await expect(runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: staleRunKey,
      adapters: [{ sourceType: 'fixture-checkpoint', poll: async () => [listing] }],
      now: new Date('2026-01-18T00:00:00Z'),
    })).rejects.toThrow('Synthetic crash after item commit');

    const beforeRecovery = await pool.query<{ id: string; status: string; counts: Record<string, number> }>(
      `SELECT r.id, r.status, r.counts
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key = $2`,
      ['mike-rapp', staleRunKey],
    );
    expect(beforeRecovery.rows[0]).toMatchObject({
      status: 'started',
      counts: { fetched: 1, normalized: 1, listings: 1, matches: 1, alertsSkipped: 1 },
    });

    const recoveryRepository = new OpportunityRepository(pool);
    await runOpportunityWorker({
      repository: recoveryRepository,
      clientSlug: 'mike-rapp',
      runKey: recoveryRunKey,
      adapters: [{ sourceType: 'fixture-empty', poll: async () => [] }],
      now: new Date('2026-01-18T00:16:00Z'),
    });
    const afterRecovery = await pool.query<{ status: string; counts: Record<string, number> }>(
      `SELECT r.status, r.counts
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key = $2`,
      ['mike-rapp', staleRunKey],
    );
    expect(afterRecovery.rows[0]).toMatchObject({
      status: 'failed',
      counts: { fetched: 1, normalized: 1, listings: 1, matches: 1, alertsSkipped: 1 },
    });
    await expect(recoveryRepository.finishWorkerRun(
      'mike-rapp',
      beforeRecovery.rows[0].id,
      'ok',
      { fetched: 999 },
      null,
      new Date('2026-01-18T00:17:00Z'),
    )).rejects.toThrow('Started worker run was not found.');
    const fenced = await pool.query<{ status: string; counts: Record<string, number> }>(
      `SELECT r.status, r.counts
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key = $2`,
      ['mike-rapp', staleRunKey],
    );
    expect(fenced.rows[0]).toMatchObject({
      status: 'failed',
      counts: { fetched: 1, normalized: 1, listings: 1, matches: 1, alertsSkipped: 1 },
    });
  } finally {
    await pool.end();
  }
});

test('adapter persistence strips query data, contact text, raw identities, and unknown fields', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const syntheticEmail = ['seller', 'ab--cd.com'].join('@');
  const syntheticUnicodeEmail = ['उपयोगकर्ता', 'उदाहरण.भारत'].join('@');
  const syntheticDecomposedEmail = [`e\u0301`, 'example.com'].join('@');
  const syntheticSymbolEmail = ['🚗', '[IPv6:2001:db8::1]'].join('@');
  const syntheticCfwsEmails = [
    '"foldedprivate\r\n \tlocalword"@e.co,',
    '(lead)x@e.co;',
    'x@[a\\]priv](trail)!',
    '"p n" (s) @ (i) localhost:',
    'rep@e.co..',
    '<ang@e.co>',
    'one@e.co,two@e.net',
    'dsh@e.co--buyers',
  ];
  const syntheticPhone = ['404', '555', '0199'].join('-');
  const syntheticInternationalPhone = ['+44', '20', '7946', '0958'].join(' ');
  const listing = {
    ...matchingListing,
    canonicalKey: 'fixture:sanitized-persistence',
    sourceItemId: 'sanitized-persistence',
    sourceUrl: 'https://example.test/item/42?token=synthetic-sensitive#contact',
    title: `2011 Toyota Land Cruiser contact <${syntheticEmail}> ${syntheticUnicodeEmail}, ${syntheticDecomposedEmail}; ${syntheticSymbolEmail}! ${syntheticCfwsEmails.join(' ')}`,
    locationText: `Atlanta Meet@noon cars@home 2@3 Meet @ noon x @ y foo @ bar @ baz ${syntheticPhone} ${syntheticInternationalPhone}`,
    duplicateIdentity: { type: 'vin', value: 'synthetic-private-identity' },
    privateContact: 'synthetic-extra-secret',
  };
  const runKey = 'sanitized-persistence-v1';

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', listing.canonicalKey],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', runKey],
    );

    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey,
      adapters: [{ sourceType: 'fixture-sanitized', poll: async () => [listing] }],
      now: new Date('2026-01-20T00:00:00Z'),
    });
    expect(result.status).toBe('ok');

    const persisted = await pool.query<{
      sanitized_payload: Record<string, unknown>;
      payload_hash: string;
      source_record_url: string | null;
      listing_url: string | null;
      title: string;
      location_text: string | null;
    }>(
      `SELECT sr.sanitized_payload,
              sr.payload_hash,
              sr.source_url AS source_record_url,
              l.source_url AS listing_url,
              l.title,
              l.location_text
       FROM opportunity_source_records sr
       JOIN opportunity_clients c ON c.id = sr.client_id
       JOIN opportunity_listings l ON l.source_record_id = sr.id AND l.client_id = c.id
       WHERE c.slug = $1 AND sr.source_item_id = $2`,
      ['mike-rapp', listing.sourceItemId],
    );
    const serialized = JSON.stringify(persisted.rows[0]);
    expect(persisted.rows[0].source_record_url).toBe('https://example.test/item/42');
    expect(persisted.rows[0].listing_url).toBe('https://example.test/item/42');
    expect(serialized).not.toContain('synthetic-sensitive');
    expect(serialized).not.toContain('synthetic-extra-secret');
    expect(serialized).not.toContain('synthetic-private-identity');
    expect(serialized).not.toContain(syntheticEmail);
    expect(serialized).not.toContain(syntheticUnicodeEmail);
    expect(serialized).not.toContain(syntheticDecomposedEmail);
    expect(serialized).not.toContain(syntheticDecomposedEmail.normalize('NFC'));
    expect(serialized).not.toContain(syntheticSymbolEmail);
    for (const syntheticCfwsEmail of syntheticCfwsEmails) {
      expect(serialized).not.toContain(syntheticCfwsEmail);
    }
    expect(serialized).not.toMatch(/jane|jim|jill|jack|folded/);
    expect(serialized).not.toContain('foldedprivate');
    expect(serialized).not.toContain('localword');
    expect(serialized).not.toContain('(lead)');
    expect(serialized).not.toContain('priv](trail)');
    expect(serialized).not.toContain('"p n"');
    expect(serialized).not.toMatch(/rep@|ang@|one@|two@|dsh@/);
    expect(serialized).toContain('[contact redacted]..');
    expect(serialized).toContain('<[contact redacted]>');
    expect(serialized).toContain('[contact redacted],[contact redacted]');
    expect(serialized).toContain('[contact redacted]--buyers');
    expect(serialized).toContain('Meet@noon cars@home 2@3 Meet @ noon x @ y foo @ bar @ baz');
    expect(serialized).not.toContain(syntheticPhone);
    expect(serialized).not.toContain(syntheticInternationalPhone);
    expect(persisted.rows[0].payload_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.rows[0].payload_hash).not.toBe(
      createHash('sha256').update(JSON.stringify(listing)).digest('hex'),
    );
    expect(persisted.rows[0].sanitized_payload).toMatchObject({
      duplicateIdentity: { type: 'vin' },
    });
    expect(
      (persisted.rows[0].sanitized_payload.duplicateIdentity as { identityHash?: string }).identityHash,
    ).toMatch(/^[a-f0-9]{64}$/);
  } finally {
    await pool.end();
  }
});
