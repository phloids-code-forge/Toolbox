import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Pool } from 'pg';

const MIGRATIONS = [
  '001_phase2a_secure_core',
  '002_watch_criteria',
  '003_duplicate_identities',
  '004_login_rate_limits',
  '005_source_cursors',
] as const;

export async function applyOpportunityMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('opportunity_phase2a_migrations'))`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS opportunity_schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    for (const version of MIGRATIONS) {
      const applied = await client.query<{ version: string }>(
        'SELECT version FROM opportunity_schema_migrations WHERE version = $1',
        [version],
      );
      if (applied.rowCount === 0) {
        const migrationPath = path.join(
          process.cwd(),
          `src/lib/opportunity/migrations/${version}.sql`,
        );
        const migrationSql = await readFile(migrationPath, 'utf8');
        await client.query(migrationSql);
        await client.query(
          'INSERT INTO opportunity_schema_migrations (version) VALUES ($1)',
          [version],
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
