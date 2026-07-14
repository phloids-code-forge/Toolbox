import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { fixtureSourceAdapter } from '../../src/lib/opportunity/fixtures';
import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { OpportunityRepository } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';
import { runOpportunityWorker } from '../../src/lib/opportunity/worker';

const databaseUrl = process.env.POSTGRES_URL ?? '';

test('checked-in fixture worker persists matches for every starter watch and duplicate history', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND source_type LIKE 'fixture%'`,
      ['mike-rapp'],
    );
    await pool.query(
      `DELETE FROM opportunity_source_records
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND source_type LIKE 'fixture%'`,
      ['mike-rapp'],
    );
    await pool.query(
      `DELETE FROM opportunity_worker_runs
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND run_key = $2`,
      ['mike-rapp', 'checked-in-fixture-contract-v1'],
    );

    const result = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'checked-in-fixture-contract-v1',
      adapters: [fixtureSourceAdapter],
      now: new Date('2026-01-10T00:00:00Z'),
    });

    expect(result.status).toBe('ok');
    expect(result.counts.fetched).toBe(7);
    expect(result.counts.listings).toBe(7);
    const acceptedWatches = await pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT m.watch_id)::text AS count
       FROM opportunity_matches m
       JOIN opportunity_clients c ON c.id = m.client_id
       WHERE c.slug = $1 AND m.accepted = true`,
      ['mike-rapp'],
    );
    expect(acceptedWatches.rows[0].count).toBe('3');

    const duplicateGroup = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunity_listings l
       JOIN opportunity_duplicate_groups g ON g.id = l.duplicate_group_id
       JOIN opportunity_clients c ON c.id = l.client_id
       WHERE c.slug = $1
       GROUP BY g.id
       HAVING COUNT(*) = 2`,
      ['mike-rapp'],
    );
    expect(duplicateGroup.rows).toHaveLength(1);

    const deliveryClaims = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunity_alert_events a
       JOIN opportunity_clients c ON c.id = a.client_id
       WHERE c.slug = $1 AND a.state IN ('queued', 'sent', 'delivered')`,
      ['mike-rapp'],
    );
    expect(deliveryClaims.rows[0].count).toBe('0');
  } finally {
    await pool.end();
  }
});
