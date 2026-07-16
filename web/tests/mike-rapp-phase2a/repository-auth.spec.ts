import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { OpportunityRepository } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';

const databaseUrl = process.env.POSTGRES_URL ?? '';

test('repository blocks cross-client object reads and mutations', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    const otherClient = await pool.query<{ id: string }>(
      `INSERT INTO opportunity_clients (slug, display_name)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      ['synthetic-other-client', 'Synthetic Other Client'],
    );
    const otherWatch = await pool.query<{ id: string }>(
      `INSERT INTO opportunity_watches (
        client_id, slug, status, category, title, query, year_min, year_max,
        max_price, max_mileage, nationwide, clean_title_only
      ) VALUES ($1, 'other-watch', 'active', 'vehicle', 'Other client watch',
        'Other vehicle', 2000, 2010, 10000, 100000, true, true)
      ON CONFLICT (client_id, slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id`,
      [otherClient.rows[0].id],
    );

    await expect(repository.getWatch('mike-rapp', otherWatch.rows[0].id)).resolves.toBeNull();
    await expect(
      repository.updateWatch('mike-rapp', otherWatch.rows[0].id, {
        title: 'Tampered title',
        query: 'Tampered query',
        status: 'paused',
        yearMin: 2001,
        yearMax: 2005,
        maxPrice: 1,
        maxMileage: 1,
        nationwide: true,
        cleanTitleOnly: true,
      }),
    ).resolves.toBeNull();

    const unchanged = await pool.query<{ title: string }>(
      'SELECT title FROM opportunity_watches WHERE id = $1',
      [otherWatch.rows[0].id],
    );
    expect(unchanged.rows[0].title).toBe('Other client watch');
  } finally {
    await pool.end();
  }
});
