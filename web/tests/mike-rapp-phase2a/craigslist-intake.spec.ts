import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { runCraigslistEmailIntake, type CraigslistMailbox } from '../../src/lib/opportunity/craigslist-intake';
import {
  readOpportunityEmailConfig,
  type OpportunityEmailTransport,
} from '../../src/lib/opportunity/email-delivery';
import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { OpportunityRepository, type SourceCursor } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';

const databaseUrl = process.env.POSTGRES_URL ?? '';
const generation = '9001';

function alertMime(id: string, title: string, listingId: string): Buffer {
  return Buffer.from([
    'From: craigslist alerts <robot@craigslist.org>',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=robot@craigslist.org',
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

function mailboxFor(messages: Array<{ uid: number; rawMime?: Buffer; failureCode?: 'message_too_large' }>, mailboxGeneration = generation): CraigslistMailbox {
  return {
    fetchAfter: async (cursor: SourceCursor | null) => ({
      generation: mailboxGeneration,
      messages: messages.filter((message) => cursor?.generation !== mailboxGeneration || message.uid > cursor.value),
    }),
  };
}

async function resetCraigslistState(pool: Pool): Promise<void> {
  await pool.query("DELETE FROM opportunity_worker_runs WHERE run_key LIKE 'craigslist-email:%'");
  await pool.query("DELETE FROM opportunity_listings WHERE source_type = 'craigslist_email'");
  await pool.query("DELETE FROM opportunity_source_records WHERE source_type = 'craigslist_email'");
  await pool.query("DELETE FROM opportunity_source_failures WHERE source_type = 'craigslist_email'");
  await pool.query("DELETE FROM opportunity_source_cursors WHERE source_type = 'craigslist_email'");
}

test('Craigslist intake advances its generation-aware cursor only after each message is committed', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const first = { uid: 101, rawMime: alertMime('first', '2004 Chevrolet Tahoe Z71', '1010101010') };
  const bad = { uid: 102, rawMime: alertMime('bad', '1985 Toyota Supra', '2020202020').subarray(0, 40) };
  const fixed = { uid: 102, rawMime: alertMime('second', '1985 Toyota Supra', '2020202020') };
  let messages = [first, bad];
  const mailbox: CraigslistMailbox = {
    fetchAfter: async (cursor) => ({
      generation,
      messages: messages.filter((message) => cursor?.generation !== generation || message.uid > cursor.value),
    }),
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await resetCraigslistState(pool);

    const partial = await runCraigslistEmailIntake({
      repository, mailbox, clientSlug: 'mike-rapp', now: new Date('2026-07-16T12:05:00Z'),
    });
    expect(partial).toMatchObject({ status: 'partial', processedMessages: 1, failedMessages: 1, cursor: 101 });
    expect(await repository.getSourceCursor('mike-rapp', 'craigslist_email'))
      .toEqual({ generation, value: 101 });

    messages = [first, fixed];
    const completed = await runCraigslistEmailIntake({
      repository, mailbox, clientSlug: 'mike-rapp', now: new Date('2026-07-16T13:05:00Z'),
    });
    expect(completed).toMatchObject({ status: 'ok', processedMessages: 1, failedMessages: 0, cursor: 102 });
    expect(await repository.getSourceCursor('mike-rapp', 'craigslist_email'))
      .toEqual({ generation, value: 102 });

    const runTypes = await pool.query<{ run_type: string }>(
      `SELECT r.run_type FROM opportunity_worker_runs r
       JOIN opportunity_clients c ON c.id = r.client_id
       WHERE c.slug = $1 AND r.run_key LIKE 'craigslist-email:%'
       ORDER BY r.started_at`,
      ['mike-rapp'],
    );
    expect(runTypes.rows.map((row) => row.run_type)).toEqual(['scheduled', 'scheduled']);
  } finally {
    await pool.end();
  }
});

test('Craigslist intake retries a durable worker failure in the next hourly lease bucket', async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const message = { uid: 201, rawMime: alertMime('retry', '2004 Chevrolet Tahoe Z71', '3030303030') };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await resetCraigslistState(pool);

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
      repository, mailbox: mailboxFor([message]), clientSlug: 'mike-rapp', now: new Date('2026-07-16T12:05:00Z'),
    });
    expect(failed).toMatchObject({ status: 'failed', processedMessages: 0, cursor: 0 });

    const recovered = await runCraigslistEmailIntake({
      repository, mailbox: mailboxFor([message]), clientSlug: 'mike-rapp', now: new Date('2026-07-16T13:05:00Z'),
    });
    expect(recovered).toMatchObject({ status: 'ok', processedMessages: 1, cursor: 201 });
  } finally {
    await pool.end();
  }
});

test('Craigslist intake quarantines a poison message after three attempts and continues later mail', async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const poison = { uid: 301, failureCode: 'message_too_large' as const };
  const good = { uid: 302, rawMime: alertMime('after-poison', '1985 Toyota Supra', '4040404040') };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await resetCraigslistState(pool);
    for (const hour of [12, 13]) {
      const result = await runCraigslistEmailIntake({
        repository,
        mailbox: mailboxFor([poison, good]),
        clientSlug: 'mike-rapp',
        now: new Date(`2026-07-16T${hour}:05:00Z`),
      });
      expect(result).toMatchObject({ status: 'failed', cursor: 0, quarantinedMessages: 0 });
    }
    const released = await runCraigslistEmailIntake({
      repository,
      mailbox: mailboxFor([poison, good]),
      clientSlug: 'mike-rapp',
      now: new Date('2026-07-16T14:05:00Z'),
    });
    expect(released).toMatchObject({
      status: 'partial', cursor: 302, processedMessages: 1, failedMessages: 1, quarantinedMessages: 1,
    });
    const failure = await pool.query<{ attempt_count: number; quarantined_at: Date | null }>(
      "SELECT attempt_count, quarantined_at FROM opportunity_source_failures WHERE source_type = 'craigslist_email'",
    );
    expect(failure.rows).toHaveLength(1);
    expect(failure.rows[0]).toMatchObject({ attempt_count: 3 });
    expect(failure.rows[0].quarantined_at).not.toBeNull();
  } finally {
    await pool.end();
  }
});

test('Craigslist intake resets safely when mailbox UIDVALIDITY changes', async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await resetCraigslistState(pool);
    await repository.advanceSourceCursor('mike-rapp', 'craigslist_email', { generation: 'old', value: 900 });

    const result = await runCraigslistEmailIntake({
      repository,
      mailbox: mailboxFor([{ uid: 1, rawMime: alertMime('new-generation', '1985 Toyota Supra', '5050505050') }], 'new'),
      clientSlug: 'mike-rapp',
    });
    expect(result).toMatchObject({ status: 'ok', cursor: 1, processedMessages: 1 });
    expect(await repository.getSourceCursor('mike-rapp', 'craigslist_email'))
      .toEqual({ generation: 'new', value: 1 });
  } finally {
    await pool.end();
  }
});

test('Craigslist intake returns busy without polling when another source lease is active', async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    const release = await repository.tryAcquireSourceLease('mike-rapp', 'craigslist_email');
    expect(release).not.toBeNull();
    let polled = false;
    const result = await runCraigslistEmailIntake({
      repository,
      mailbox: { fetchAfter: async () => { polled = true; return { generation, messages: [] }; } },
      clientSlug: 'mike-rapp',
    });
    expect(result.status).toBe('busy');
    expect(polled).toBe(false);
    await release?.();
  } finally {
    await pool.end();
  }
});

test('Craigslist intake sends an accepted listing once and reports truthful delivery counts', async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const message = {
    uid: 401,
    rawMime: alertMime('phase2c-delivery', '1985 Toyota Supra', '6060606060'),
  };
  const deliveries: Array<Record<string, unknown>> = [];
  const transport: OpportunityEmailTransport = {
    sendMail: async (email) => {
      deliveries.push(email);
      return { messageId: '<phase2c-intake-provider@example.test>' };
    },
  };

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await resetCraigslistState(pool);
    const emailDelivery = {
      config: readOpportunityEmailConfig({
        OPPORTUNITY_SMTP_HOST: 'smtp.fastmail.com',
        OPPORTUNITY_SMTP_PORT: '465',
        OPPORTUNITY_SMTP_USER: 'operator@example.test',
        OPPORTUNITY_SMTP_PASSWORD: 'synthetic-app-password',
        OPPORTUNITY_EMAIL_FROM: 'babs@phloid.com',
        OPPORTUNITY_EMAIL_RECIPIENT: 'dave@phloid.com',
      }),
      transport,
    };
    const first = await runCraigslistEmailIntake({
      repository,
      mailbox: mailboxFor([message]),
      clientSlug: 'mike-rapp',
      emailDelivery,
      now: new Date('2026-07-22T18:05:00Z'),
    });
    const repeated = await runCraigslistEmailIntake({
      repository,
      mailbox: mailboxFor([message]),
      clientSlug: 'mike-rapp',
      emailDelivery,
      now: new Date('2026-07-22T19:05:00Z'),
    });

    expect(first).toMatchObject({
      status: 'ok',
      processedMessages: 1,
      alertsQueued: 1,
      alertsSent: 1,
      alertsFailed: 0,
    });
    expect(repeated).toMatchObject({ alertsQueued: 0, alertsSent: 0, alertsFailed: 0 });
    expect(deliveries).toHaveLength(1);
  } finally {
    await resetCraigslistState(pool);
    await pool.end();
  }
});
