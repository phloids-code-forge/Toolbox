import type { Pool } from 'pg';

const starterWatches = [
  {
    slug: 'land-cruiser-2008-2015',
    title: 'Toyota Land Cruiser · 2008–2015',
    query: 'Toyota Land Cruiser',
    yearMin: 2008,
    yearMax: 2015,
    maxPrice: 40_000,
    maxMileage: 250_000,
    criteria: { makes: ['Toyota'], model: 'Land Cruiser', requiredTrim: null },
  },
  {
    slug: 'tahoe-z71-2001-2006',
    title: 'Chevy Tahoe Z71 · 2001–2006',
    query: 'Chevy Tahoe Z71',
    yearMin: 2001,
    yearMax: 2006,
    maxPrice: 40_000,
    maxMileage: 100_000,
    criteria: { makes: ['Chevrolet', 'Chevy'], model: 'Tahoe', requiredTrim: 'Z71' },
  },
  {
    slug: 'supra-1983-1986',
    title: 'Toyota Supra · 1983–1986',
    query: 'Toyota Supra',
    yearMin: 1983,
    yearMax: 1986,
    maxPrice: null,
    maxMileage: 250_000,
    criteria: { makes: ['Toyota'], model: 'Supra', requiredTrim: null },
  },
] as const;

export async function seedMikeStarterWatches(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const clientResult = await client.query<{ id: string }>(
      `INSERT INTO opportunity_clients (slug, display_name)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE
       SET display_name = EXCLUDED.display_name
       RETURNING id`,
      ['mike-rapp', 'Mike Rapp'],
    );
    const clientId = clientResult.rows[0].id;

    for (const watch of starterWatches) {
      await client.query(
        `INSERT INTO opportunity_watches (
          client_id, slug, status, category, title, query, year_min, year_max,
          max_price, max_mileage, nationwide, clean_title_only, criteria
        ) VALUES ($1, $2, 'active', 'vehicle', $3, $4, $5, $6, $7, $8, true, true, $9::jsonb)
        ON CONFLICT (client_id, slug) DO NOTHING`,
        [
          clientId,
          watch.slug,
          watch.title,
          watch.query,
          watch.yearMin,
          watch.yearMax,
          watch.maxPrice,
          watch.maxMileage,
          JSON.stringify(watch.criteria),
        ],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { starterWatches };
