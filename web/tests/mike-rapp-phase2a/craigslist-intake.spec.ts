import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { runCraigslistEmailIntake, type CraigslistMailbox } from '../../src/lib/opportunity/craigslist-intake';
import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { OpportunityRepository } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';

const databaseUrl = process.env.POSTGRES_URL ?? '';

function alertMime(id: string, title: string, listingId: string): Buffer {
  return Buffer.from([
    'From: craigslist alerts <robot@craigslist.org>',
    'To: babs@phloid.com',
    `Subject: craigslist saved search: ${title}`,
    `Message-ID: <${id}@craigslist.org>`,
    'Date: Thu, 16 Jul 2026 12:00:00 +0000',
    'Content-Type: text/plain; charset=utf-8',
    '',
    `${title} - $18,500 (Atlanta, GA)`,
    '88,000 miles, clean title',
    `https://atlanta.craigslist.org/atl/cto/d/atlanta-vehicle/${listingId}.html`,
  ].join('\r\n'));
}

test('Craigslist intake advances its durable UID cursor only after each message is committed', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const first = { uid: 101, rawMime: alertMime('first', '2004 Chevrolet Tahoe Z71', '1010101010') };
  const bad = { uid: 102, rawMime: alertMime('bad', '1985 Toyota Supra', '2020202020').subarray(0, 40) };
  const fixed = { uid: 102, rawMime: alertMime('second', '1985 Toyota Supra', '2020202020') };
  let messages = [first, bad];
  const mailbox: CraigslistMailbox = {
    fetchAfter: async (uid) => messages.filter((message) => message.uid > uid),
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query("DELETE FROM opportunity_worker_runs WHERE run_key LIKE 'craigslist-email:%'");
    await pool.query("DELETE FROM opportunity_listings WHERE source_type = 'craigslist_email'");
    await pool.query("DELETE FROM opportunity_source_records WHERE source_type = 'craigslist_email'");
    await pool.query("DELETE FROM opportunity_source_cursors WHERE source_type = 'craigslist_email'");

    const partial = await runCraigslistEmailIntake({
      repository,
      mailbox,
      clientSlug: 'mike-rapp',
      now: new Date('2026-07-16T12:05:00Z'),
    });
    expect(partial).toMatchObject({ status: 'partial', processedMessages: 1, failedMessages: 1, cursor: 101 });
    expect(await repository.getSourceCursor('mike-rapp', 'craigslist_email')).toBe(101);
    const runTypes = await pool.query<{ run_type: string }>(
      `SELECT r.run_type
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key LIKE 'craigslist-email:%'`,
      ['mike-rapp'],
    );
    expect(runTypes.rows.map((row) => row.run_type)).toEqual(['scheduled']);

    messages = [first, fixed];
    const completed = await runCraigslistEmailIntake({
      repository,
      mailbox,
      clientSlug: 'mike-rapp',
      now: new Date('2026-07-16T13:05:00Z'),
    });
    expect(completed).toMatchObject({ status: 'ok', processedMessages: 1, failedMessages: 0, cursor: 102 });
    expect(await repository.getSourceCursor('mike-rapp', 'craigslist_email')).toBe(102);

    const listings = await pool.query<{ source_item_id: string }>(
      "SELECT source_item_id FROM opportunity_listings WHERE source_type = 'craigslist_email' ORDER BY source_item_id",
    );
    expect(listings.rows.map((row) => row.source_item_id)).toEqual(['1010101010', '2020202020']);
  } finally {
    await pool.end();
  }
});

test('Craigslist intake retries a durable worker failure in the next hourly lease bucket', async () => {
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const repository = new OpportunityRepository(pool);
  const message = { uid: 201, rawMime: alertMime('retry', '2004 Chevrolet Tahoe Z71', '3030303030') };
  const mailbox: CraigslistMailbox = { fetchAfter: async (uid) => (uid < message.uid ? [message] : []) };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await pool.query("DELETE FROM opportunity_worker_runs WHERE run_key LIKE 'craigslist-email:%'");
    await pool.query("DELETE FROM opportunity_listings WHERE source_type = 'craigslist_email'");
    await pool.query("DELETE FROM opportunity_source_records WHERE source_type = 'craigslist_email'");
    await pool.query("DELETE FROM opportunity_source_cursors WHERE source_type = 'craigslist_email'");

    const originalTransaction = repository.withTransaction.bind(repository);
    let injectFailure = true;
    repository.withTransaction = async <T>(
      operation: (transactionalRepository: OpportunityRepository) => Promise<T>,
    ): Promise<T> => {
      if (injectFailure) {
        injectFailure = false;
        throw new Error('synthetic_database_failure');
      }
      return originalTransaction(operation);
    };

    const failed = await runCraigslistEmailIntake({
      repository,
      mailbox,
      clientSlug: 'mike-rapp',
      now: new Date('2026-07-16T12:05:00Z'),
    });
    expect(failed).toMatchObject({ status: 'failed', processedMessages: 0, cursor: 0 });

    const recovered = await runCraigslistEmailIntake({
      repository,
      mailbox,
      clientSlug: 'mike-rapp',
      now: new Date('2026-07-16T13:05:00Z'),
    });
    expect(recovered).toMatchObject({ status: 'ok', processedMessages: 1, cursor: 201 });

    const runs = await pool.query<{ status: string }>(
      `SELECT r.status
       FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key LIKE 'craigslist-email:%'
       ORDER BY r.started_at`,
      ['mike-rapp'],
    );
    expect(runs.rows.map((row) => row.status)).toEqual(['failed', 'ok']);
  } finally {
    await pool.end();
  }
});
