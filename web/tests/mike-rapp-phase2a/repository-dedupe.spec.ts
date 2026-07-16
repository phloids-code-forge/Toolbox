import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { OpportunityRepository } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';

const databaseUrl = process.env.POSTGRES_URL ?? '';

const listing = {
  canonicalKey: 'fixture:durable-duplicate-test',
  sourceType: 'fixture',
  sourceItemId: 'durable-duplicate-test',
  sourceUrl: null,
  title: '2011 Toyota Land Cruiser',
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

test('canonical listing upsert prevents duplicates and preserves first/last seen', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    const first = await repository.upsertListing('mike-rapp', listing, new Date('2026-01-01T00:00:00Z'));
    const repeated = await repository.upsertListing('mike-rapp', listing, new Date('2026-01-02T00:00:00Z'));

    expect(repeated.id).toBe(first.id);
    expect(repeated.firstSeenAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(repeated.lastSeenAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');

    const count = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunity_listings l
       JOIN opportunity_clients c ON c.id = l.client_id
       WHERE c.slug = $1 AND l.canonical_key = $2`,
      ['mike-rapp', listing.canonicalKey],
    );
    expect(count.rows[0].count).toBe('1');
  } finally {
    await pool.end();
  }
});

test('duplicate identity groups distinct source listings durably', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const firstInput = {
    ...listing,
    canonicalKey: 'fixture:duplicate-group-first',
    sourceItemId: 'duplicate-group-first',
  };
  const secondInput = {
    ...listing,
    canonicalKey: 'fixture:duplicate-group-second',
    sourceType: 'fixture-secondary',
    sourceItemId: 'duplicate-group-second',
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = ANY($2::text[])`,
      ['mike-rapp', [firstInput.canonicalKey, secondInput.canonicalKey]],
    );
    const first = await repository.upsertListing('mike-rapp', firstInput, new Date('2026-01-07T00:00:00Z'));
    const second = await repository.upsertListing('mike-rapp', secondInput, new Date('2026-01-08T00:00:00Z'));

    const firstGroup = await repository.linkDuplicateIdentity(
      'mike-rapp',
      first.id,
      'vin',
      'synthetic-vin-identity',
      new Date('2026-01-07T00:00:00Z'),
    );
    const secondGroup = await repository.linkDuplicateIdentity(
      'mike-rapp',
      second.id,
      'vin',
      'synthetic-vin-identity',
      new Date('2026-01-08T00:00:00Z'),
    );

    expect(secondGroup.id).toBe(firstGroup.id);
    const grouped = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM opportunity_listings WHERE duplicate_group_id = $1',
      [firstGroup.id],
    );
    const identities = await pool.query<{ count: string; first_seen_at: Date; last_seen_at: Date }>(
      `SELECT COUNT(*)::text AS count, MIN(first_seen_at) AS first_seen_at, MAX(last_seen_at) AS last_seen_at
       FROM opportunity_duplicate_identities WHERE duplicate_group_id = $1`,
      [firstGroup.id],
    );
    expect(grouped.rows[0].count).toBe('2');
    expect(identities.rows[0].count).toBe('1');
    expect(identities.rows[0].first_seen_at.toISOString()).toBe('2026-01-07T00:00:00.000Z');
    expect(identities.rows[0].last_seen_at.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  } finally {
    await pool.end();
  }
});

test('identity graph merges reconcile every member and fence direct decision writes', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const inputs = ['graph-a', 'graph-b', 'graph-c'].map((suffix) => ({
    ...listing,
    canonicalKey: `fixture:${suffix}`,
    sourceItemId: suffix,
  }));

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = ANY($2::text[])`,
      ['mike-rapp', inputs.map((input) => input.canonicalKey)],
    );
    const records = await Promise.all(inputs.map((input, index) => (
      repository.upsertListing('mike-rapp', input, new Date(`2026-01-2${index + 1}T00:00:00Z`))
    )));
    const watch = (await repository.listActiveMatchWatches('mike-rapp'))
      .find((candidate) => candidate.slug === 'land-cruiser-2008-2015');
    if (!watch) throw new Error('Expected the Land Cruiser watch fixture.');
    for (const [index, record] of records.entries()) {
      await repository.upsertMatch('mike-rapp', record.id, watch.id, {
        accepted: index > 0,
        score: index > 0 ? 100 : 25,
        matchReasons: ['Synthetic graph merge check.'],
        rejectReasons: index > 0 ? [] : ['Synthetic stale representative decision.'],
        reviewReasons: [],
      });
      await repository.recordSkippedAlert('mike-rapp', record.id, watch.id);
    }
    await pool.query(
      `UPDATE opportunity_alert_events
       SET state = 'preview', reason = 'synthetic_preview'
       WHERE listing_id = $1 AND watch_id = $2`,
      [records[1].id, watch.id],
    );

    const firstGroup = await repository.linkDuplicateIdentity(
      'mike-rapp', records[0].id, 'vin', 'synthetic-graph-vin', new Date('2026-01-21T00:00:00Z'),
    );
    await repository.linkDuplicateIdentity(
      'mike-rapp', records[1].id, 'stock', 'synthetic-graph-stock', new Date('2026-01-22T00:00:00Z'),
    );
    await repository.linkDuplicateIdentity(
      'mike-rapp', records[2].id, 'stock', 'synthetic-graph-stock', new Date('2026-01-23T00:00:00Z'),
    );
    const merged = await repository.linkDuplicateIdentity(
      'mike-rapp', records[1].id, 'vin', 'synthetic-graph-vin', new Date('2026-01-24T00:00:00Z'),
    );
    expect(merged.id).toBe(firstGroup.id);
    const reconciled = await pool.query<{ accepted: boolean; score: number; state: string }>(
      `SELECT m.accepted, m.score, a.state
       FROM opportunity_matches m
       JOIN opportunity_alert_events a
         ON a.client_id = m.client_id
        AND a.listing_id = m.listing_id
        AND a.watch_id = m.watch_id
        AND a.channel = 'none'
       WHERE m.listing_id = $1 AND m.watch_id = $2`,
      [records[0].id, watch.id],
    );
    expect(reconciled.rows[0]).toEqual({ accepted: true, score: 100, state: 'preview' });

    await Promise.all([
      repository.upsertMatch('mike-rapp', records[2].id, watch.id, {
        accepted: true,
        score: 99,
        matchReasons: ['Synthetic fenced write check.'],
        rejectReasons: [],
        reviewReasons: [],
      }),
      repository.recordSkippedAlert('mike-rapp', records[2].id, watch.id),
    ]);

    const result = await pool.query<{
      groups: string;
      listings: string;
      identities: string;
      decisions: string;
      alerts: string;
    }>(
      `SELECT
         (SELECT COUNT(DISTINCT l.duplicate_group_id)::text FROM opportunity_listings l
          WHERE l.canonical_key = ANY($1::text[])) AS groups,
         (SELECT COUNT(*)::text FROM opportunity_listings l
          WHERE l.canonical_key = ANY($1::text[])) AS listings,
         (SELECT COUNT(*)::text FROM opportunity_duplicate_identities identity
          WHERE identity.duplicate_group_id = $2) AS identities,
         (SELECT COUNT(*)::text FROM opportunity_matches m
          JOIN opportunity_listings l ON l.id = m.listing_id
          WHERE l.canonical_key = ANY($1::text[])) AS decisions,
         (SELECT COUNT(*)::text FROM opportunity_alert_events a
          JOIN opportunity_listings l ON l.id = a.listing_id
          WHERE l.canonical_key = ANY($1::text[])) AS alerts`,
      [inputs.map((input) => input.canonicalKey), firstGroup.id],
    );
    expect(result.rows[0]).toEqual({
      groups: '1',
      listings: '3',
      identities: '2',
      decisions: '1',
      alerts: '1',
    });
  } finally {
    await pool.end();
  }
});
