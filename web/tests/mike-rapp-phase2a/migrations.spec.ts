import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';

const databaseUrl = process.env.POSTGRES_URL ?? '';

test('schema initialization and Mike seed are idempotent in isolated Postgres', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `UPDATE opportunity_clients SET updated_at = $2 WHERE slug = $1`,
      ['mike-rapp', new Date('2026-01-09T00:00:00Z')],
    );
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);

    const clients = await pool.query<{ count: string; updated_at: Date }>(
      `SELECT COUNT(*)::text AS count, MAX(updated_at) AS updated_at
       FROM opportunity_clients WHERE slug = $1`,
      ['mike-rapp'],
    );
    const watches = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunity_watches w
       JOIN opportunity_clients c ON c.id = w.client_id
       WHERE c.slug = $1`,
      ['mike-rapp'],
    );
    const migrations = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM opportunity_schema_migrations WHERE version = $1`,
      ['001_phase2a_secure_core'],
    );

    expect(clients.rows[0].count).toBe('1');
    expect(clients.rows[0].updated_at.toISOString()).toBe('2026-01-09T00:00:00.000Z');
    expect(watches.rows[0].count).toBe('3');
    expect(migrations.rows[0].count).toBe('1');
  } finally {
    await pool.end();
  }
});

test('migration 006 upgrades a database that already recorded the original migration 005', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await applyOpportunityMigrations(pool);
    await pool.query('DROP TABLE IF EXISTS opportunity_source_failures');
    await pool.query('ALTER TABLE opportunity_source_cursors DROP COLUMN IF EXISTS cursor_generation');
    await pool.query(
      `DELETE FROM opportunity_schema_migrations WHERE version = '006_source_cursor_generations_and_failures'`,
    );

    await applyOpportunityMigrations(pool);

    const generationColumn = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'opportunity_source_cursors'
         AND column_name = 'cursor_generation'
         AND is_nullable = 'NO'`,
    );
    const failureTable = await pool.query<{ table_name: string | null }>(
      `SELECT to_regclass('public.opportunity_source_failures')::text AS table_name`,
    );
    const ledger = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM opportunity_schema_migrations
       WHERE version = '006_source_cursor_generations_and_failures'`,
    );

    expect(generationColumn.rows[0].count).toBe('1');
    expect(failureTable.rows[0].table_name).toBe('opportunity_source_failures');
    expect(ledger.rows[0].count).toBe('1');
  } finally {
    await pool.end();
  }
});

test('cold initialization preserves edited watches while restoring missing starter rows', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query(
      `UPDATE opportunity_watches w
       SET status = 'paused', title = 'My edited Land Cruiser watch', query = 'edited query',
           max_price = 32100, updated_at = '2026-01-10T00:00:00Z'
       FROM opportunity_clients c
       WHERE w.client_id = c.id AND c.slug = $1 AND w.slug = $2`,
      ['mike-rapp', 'land-cruiser-2008-2015'],
    );
    await pool.query(
      `DELETE FROM opportunity_watches w
       USING opportunity_clients c
       WHERE w.client_id = c.id AND c.slug = $1 AND w.slug = $2`,
      ['mike-rapp', 'supra-1983-1986'],
    );

    await seedMikeStarterWatches(pool);

    const edited = await pool.query<{
      status: string;
      title: string;
      query: string;
      max_price: string | null;
      updated_at: Date;
    }>(
      `SELECT w.status, w.title, w.query, w.max_price, w.updated_at
       FROM opportunity_watches w
       JOIN opportunity_clients c ON c.id = w.client_id
       WHERE c.slug = $1 AND w.slug = $2`,
      ['mike-rapp', 'land-cruiser-2008-2015'],
    );
    const restored = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM opportunity_watches w
       JOIN opportunity_clients c ON c.id = w.client_id
       WHERE c.slug = $1 AND w.slug = $2`,
      ['mike-rapp', 'supra-1983-1986'],
    );

    expect(edited.rows[0]).toMatchObject({
      status: 'paused',
      title: 'My edited Land Cruiser watch',
      query: 'edited query',
      max_price: '32100.00',
    });
    expect(edited.rows[0].updated_at.toISOString()).toBe('2026-01-10T00:00:00.000Z');
    expect(restored.rows[0].count).toBe('1');
  } finally {
    await pool.query(
      `DELETE FROM opportunity_watches w
       USING opportunity_clients c
       WHERE w.client_id = c.id AND c.slug = $1 AND w.slug = $2`,
      ['mike-rapp', 'land-cruiser-2008-2015'],
    );
    await seedMikeStarterWatches(pool);
    await pool.end();
  }
});
