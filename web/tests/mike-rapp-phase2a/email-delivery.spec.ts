import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import {
  createFastmailEmailTransport,
  deliverOpportunityEmail,
  readOpportunityEmailConfig,
  sendOpportunityEmailsForRun,
  type OpportunityEmailTransport,
} from '../../src/lib/opportunity/email-delivery';
import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { OpportunityRepository } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';
import { runOpportunityWorker } from '../../src/lib/opportunity/worker';

const databaseUrl = process.env.POSTGRES_URL ?? '';

const validEnvironment = {
  OPPORTUNITY_SMTP_HOST: 'smtp.fastmail.com',
  OPPORTUNITY_SMTP_PORT: '465',
  OPPORTUNITY_SMTP_USER: 'operator@example.test',
  OPPORTUNITY_SMTP_PASSWORD: 'synthetic-app-password',
  OPPORTUNITY_EMAIL_FROM: 'babs@phloid.com',
  OPPORTUNITY_EMAIL_RECIPIENT: 'dave@phloid.com',
};

test('email delivery config fails closed unless Fastmail sends only from Babs to Dave', () => {
  expect(readOpportunityEmailConfig(validEnvironment)).toMatchObject({
    host: 'smtp.fastmail.com',
    port: 465,
    secure: true,
    from: 'babs@phloid.com',
    recipient: 'dave@phloid.com',
  });

  for (const override of [
    { OPPORTUNITY_SMTP_HOST: 'smtp.example.test' },
    { OPPORTUNITY_SMTP_PORT: '587' },
    { OPPORTUNITY_EMAIL_FROM: 'other@phloid.com' },
    { OPPORTUNITY_EMAIL_RECIPIENT: 'mike@example.test' },
    { OPPORTUNITY_SMTP_PASSWORD: '' },
  ]) {
    expect(() => readOpportunityEmailConfig({ ...validEnvironment, ...override })).toThrow('Email delivery is not configured.');
  }
});

test('Fastmail transport uses implicit TLS and bounded SMTP timeouts', () => {
  const options: Array<Record<string, unknown>> = [];
  const transport = createFastmailEmailTransport(
    readOpportunityEmailConfig(validEnvironment),
    (candidate) => {
      options.push(candidate);
      return { sendMail: async () => ({ messageId: '<unused@example.test>' }) };
    },
  );

  expect(typeof transport.sendMail).toBe('function');
  expect(options).toEqual([expect.objectContaining({
    host: 'smtp.fastmail.com',
    port: 465,
    secure: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })]);
  expect(options[0]?.auth).toEqual({
    user: validEnvironment.OPPORTUNITY_SMTP_USER,
    pass: validEnvironment.OPPORTUNITY_SMTP_PASSWORD,
  });
});

test('email delivery uses the fixed Dave-only envelope and returns only the provider identifier', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const transport: OpportunityEmailTransport = {
    sendMail: async (message) => {
      calls.push(message);
      return { messageId: '<provider-message-id@example.test>' };
    },
  };

  const result = await deliverOpportunityEmail({
    config: readOpportunityEmailConfig(validEnvironment),
    transport,
    opportunity: {
      title: '1985 Toyota Supra',
      watchTitle: '1983–1986 Toyota Supra',
      sourceUrl: 'https://atlanta.craigslist.org/atl/cto/d/1234567890.html',
      priceAmount: 18_500,
      mileage: 88_000,
      locationText: 'Atlanta, GA',
    },
  });

  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    from: 'babs@phloid.com',
    to: 'dave@phloid.com',
    subject: 'Mike Rapp opportunity: 1985 Toyota Supra',
  });
  expect(String(calls[0]?.text)).toContain('https://atlanta.craigslist.org/atl/cto/d/1234567890.html');
  expect(result).toEqual({ providerMessageId: '<provider-message-id@example.test>' });
  expect(JSON.stringify(result)).not.toContain('dave@phloid.com');
});

test('accepted scheduled matches persist one sent email event and cannot resend', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const listing = {
    canonicalKey: 'craigslist:phase2c-email-sent',
    sourceType: 'craigslist_email',
    sourceItemId: 'phase2c-email-sent',
    sourceUrl: 'https://atlanta.craigslist.org/atl/cto/d/phase2c-email-sent.html',
    title: '1985 Toyota Supra',
    year: 1985,
    make: 'Toyota',
    model: 'Supra',
    trim: null,
    priceAmount: 18_500,
    mileage: 88_000,
    titleStatus: 'clean' as const,
    locationText: 'Atlanta, GA',
    distanceMiles: 12,
  };
  const sentMessages: Array<Record<string, unknown>> = [];
  const transport: OpportunityEmailTransport = {
    sendMail: async (message) => {
      sentMessages.push(message);
      return { messageId: '<phase2c-provider-id@example.test>' };
    },
  };

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
      ['mike-rapp', 'phase2c-email-sent-run'],
    );
    const worker = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'phase2c-email-sent-run',
      runType: 'scheduled',
      adapters: [{ sourceType: 'craigslist_email', poll: async () => [listing] }],
      now: new Date('2026-07-22T18:00:00Z'),
    });

    const first = await sendOpportunityEmailsForRun({
      repository,
      clientSlug: 'mike-rapp',
      runId: worker.runId,
      config: readOpportunityEmailConfig(validEnvironment),
      transport,
      now: new Date('2026-07-22T18:01:00Z'),
    });
    const repeated = await sendOpportunityEmailsForRun({
      repository,
      clientSlug: 'mike-rapp',
      runId: worker.runId,
      config: readOpportunityEmailConfig(validEnvironment),
      transport,
      now: new Date('2026-07-22T18:02:00Z'),
    });

    expect(first).toEqual({ queued: 1, sent: 1, failed: 0 });
    expect(repeated).toEqual({ queued: 0, sent: 0, failed: 0 });
    expect(sentMessages).toHaveLength(1);
    const audit = await pool.query<{
      channel: string;
      state: string;
      reason: string | null;
      provider_message_id: string | null;
      idempotency_key: string;
    }>(
      `SELECT channel, state, reason, provider_message_id, idempotency_key
       FROM opportunity_alert_events event
       JOIN opportunity_listings listing ON listing.id = event.listing_id
       WHERE listing.canonical_key = $1 AND event.channel = 'email'`,
      [listing.canonicalKey],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      channel: 'email',
      state: 'sent',
      reason: 'provider_accepted',
      provider_message_id: '<phase2c-provider-id@example.test>',
    });
    expect(JSON.stringify(audit.rows[0])).not.toContain('dave@phloid.com');
    expect(JSON.stringify(audit.rows[0])).not.toContain('synthetic-app-password');
  } finally {
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', listing.canonicalKey],
    );
    await pool.end();
  }
});

test('provider rejection persists a failed event without exception or recipient leakage', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const listing = {
    canonicalKey: 'craigslist:phase2c-email-failed',
    sourceType: 'craigslist_email',
    sourceItemId: 'phase2c-email-failed',
    sourceUrl: 'https://atlanta.craigslist.org/atl/cto/d/phase2c-email-failed.html',
    title: '1985 Toyota Supra',
    year: 1985,
    make: 'Toyota',
    model: 'Supra',
    trim: null,
    priceAmount: 18_500,
    mileage: 88_000,
    titleStatus: 'clean' as const,
    locationText: 'Atlanta, GA',
    distanceMiles: 12,
  };

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
      ['mike-rapp', 'phase2c-email-failed-run'],
    );
    const worker = await runOpportunityWorker({
      repository,
      clientSlug: 'mike-rapp',
      runKey: 'phase2c-email-failed-run',
      runType: 'scheduled',
      adapters: [{ sourceType: 'craigslist_email', poll: async () => [listing] }],
    });
    const result = await sendOpportunityEmailsForRun({
      repository,
      clientSlug: 'mike-rapp',
      runId: worker.runId,
      config: readOpportunityEmailConfig(validEnvironment),
      transport: {
        sendMail: async () => {
          throw new Error('SMTP rejected dave@phloid.com password=synthetic-app-password');
        },
      },
    });

    expect(result).toEqual({ queued: 1, sent: 0, failed: 1 });
    const audit = await pool.query<{ state: string; reason: string | null; provider_message_id: string | null }>(
      `SELECT event.state, event.reason, event.provider_message_id
       FROM opportunity_alert_events event
       JOIN opportunity_listings listing ON listing.id = event.listing_id
       WHERE listing.canonical_key = $1 AND event.channel = 'email'`,
      [listing.canonicalKey],
    );
    expect(audit.rows).toEqual([{ state: 'failed', reason: 'provider_send_failed', provider_message_id: null }]);
    expect(JSON.stringify(audit.rows)).not.toContain('dave@phloid.com');
    expect(JSON.stringify(audit.rows)).not.toContain('synthetic-app-password');
  } finally {
    await pool.query(
      `DELETE FROM opportunity_listings
       WHERE client_id = (SELECT id FROM opportunity_clients WHERE slug = $1)
         AND canonical_key = $2`,
      ['mike-rapp', listing.canonicalKey],
    );
    await pool.end();
  }
});

test('provider acceptance is never relabeled failed when the sent audit update errors', async () => {
  const transitions: string[] = [];
  const repository = {
    claimEmailAlertsForRun: async () => [{
      eventId: 'synthetic-event-id',
      title: '1985 Toyota Supra',
      watchTitle: '1983–1986 Toyota Supra',
      sourceUrl: 'https://atlanta.craigslist.org/atl/cto/d/1234567890.html',
      priceAmount: 18_500,
      mileage: 88_000,
      locationText: 'Atlanta, GA',
    }],
    finishEmailAlert: async (
      _clientSlug: string,
      _eventId: string,
      state: 'sent' | 'failed',
    ) => {
      transitions.push(state);
      throw new Error('synthetic audit failure');
    },
  } as unknown as OpportunityRepository;

  await expect(sendOpportunityEmailsForRun({
    repository,
    clientSlug: 'mike-rapp',
    runId: 'synthetic-run-id',
    config: readOpportunityEmailConfig(validEnvironment),
    transport: { sendMail: async () => ({ messageId: '<accepted@example.test>' }) },
  })).rejects.toThrow('synthetic audit failure');
  expect(transitions).toEqual(['sent']);
});

test('provider acceptance without a safe audit identifier remains queued instead of failed', async () => {
  const transitions: string[] = [];
  const repository = {
    claimEmailAlertsForRun: async () => [{
      eventId: 'synthetic-event-id',
      title: '1985 Toyota Supra',
      watchTitle: '1983–1986 Toyota Supra',
      sourceUrl: null,
      priceAmount: null,
      mileage: null,
      locationText: null,
    }],
    finishEmailAlert: async (
      _clientSlug: string,
      _eventId: string,
      state: 'sent' | 'failed',
    ) => {
      transitions.push(state);
      return true;
    },
  } as unknown as OpportunityRepository;

  await expect(sendOpportunityEmailsForRun({
    repository,
    clientSlug: 'mike-rapp',
    runId: 'synthetic-run-id',
    config: readOpportunityEmailConfig(validEnvironment),
    transport: { sendMail: async () => ({ messageId: '' }) },
  })).rejects.toThrow('valid message identifier');
  expect(transitions).toEqual([]);
});
