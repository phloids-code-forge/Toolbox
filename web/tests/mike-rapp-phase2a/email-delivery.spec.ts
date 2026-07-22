import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import {
  createFastmailEmailTransport,
  deliverOpportunityEmail,
  readOpportunityEmailConfig,
  sendOpportunityEmailsForRun,
  type OpportunityEmailMessage,
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

test('final send boundary rejects a runtime-forged recipient before transport use', async () => {
  let calls = 0;
  const forged = {
    ...readOpportunityEmailConfig(validEnvironment),
    recipient: 'other@example.test',
  } as unknown as ReturnType<typeof readOpportunityEmailConfig>;

  await expect(deliverOpportunityEmail({
    config: forged,
    transport: {
      sendMail: async () => {
        calls += 1;
        return { messageId: '<should-not-send@example.test>' };
      },
    },
    opportunity: {
      title: '1985 Toyota Supra',
      watchTitle: '1983–1986 Toyota Supra',
      sourceUrl: null,
      priceAmount: null,
      mileage: null,
      locationText: null,
    },
  })).rejects.toThrow('Dave-only email boundary rejected');
  expect(calls).toBe(0);
});

test('pending claims recover once and concurrent delivery cannot resend', async () => {
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
      return { messageId: String(message.messageId) };
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

    const orphaned = await repository.claimEmailAlertsForRun(
      'mike-rapp',
      worker.runId,
      new Date('2026-07-22T18:01:00Z'),
    );
    expect(orphaned).toHaveLength(1);
    expect(await repository.beginEmailAlertDelivery(
      'not-mike-rapp',
      orphaned[0].eventId,
      '<forged-cross-client@phloid.com>',
    )).toBe(false);
    const deliveryInput = {
      repository,
      clientSlug: 'mike-rapp',
      runId: worker.runId,
      config: readOpportunityEmailConfig(validEnvironment),
      transport,
      now: new Date('2026-07-22T18:02:00Z'),
    };
    const [first, competing] = await Promise.all([
      sendOpportunityEmailsForRun(deliveryInput),
      sendOpportunityEmailsForRun(deliveryInput),
    ]);
    const repeated = await sendOpportunityEmailsForRun({
      ...deliveryInput,
      now: new Date('2026-07-22T18:03:00Z'),
    });

    expect(first.queued + competing.queued).toBeGreaterThanOrEqual(1);
    expect(first.sent + competing.sent).toBe(1);
    expect(first.failed + competing.failed).toBe(0);
    expect(repeated).toEqual({ queued: 0, sent: 0, failed: 0, unknown: 0 });
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
      provider_message_id: sentMessages[0]?.messageId,
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
          const error = new Error('SMTP rejected dave@phloid.com password=synthetic-app-password') as Error & {
            responseCode: number;
          };
          error.responseCode = 550;
          throw error;
        },
      },
    });

    expect(result).toEqual({ queued: 1, sent: 0, failed: 1, unknown: 0 });
    const audit = await pool.query<{ state: string; reason: string | null; provider_message_id: string | null }>(
      `SELECT event.state, event.reason, event.provider_message_id
       FROM opportunity_alert_events event
       JOIN opportunity_listings listing ON listing.id = event.listing_id
       WHERE listing.canonical_key = $1 AND event.channel = 'email'`,
      [listing.canonicalKey],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({ state: 'failed', reason: 'provider_rejected' });
    expect(audit.rows[0]?.provider_message_id).toMatch(/^<opportunity-[a-f0-9]{40}@phloid\.com>$/);
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
    beginEmailAlertDelivery: async () => true,
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
    transport: {
      sendMail: async (message: OpportunityEmailMessage) => ({
        messageId: String(message.messageId),
      }),
    },
  })).rejects.toThrow('synthetic audit failure');
  expect(transitions).toEqual(['sent']);
});

test('provider acceptance without a safe audit identifier is recorded as unknown instead of failed', async () => {
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
    beginEmailAlertDelivery: async () => true,
    finishEmailAlert: async (
      _clientSlug: string,
      _eventId: string,
      state: 'sent' | 'failed',
    ) => {
      transitions.push(state);
      return true;
    },
    markEmailAlertOutcomeUnknown: async () => {
      transitions.push('unknown');
      return true;
    },
  } as unknown as OpportunityRepository;

  const result = await sendOpportunityEmailsForRun({
    repository,
    clientSlug: 'mike-rapp',
    runId: 'synthetic-run-id',
    config: readOpportunityEmailConfig(validEnvironment),
    transport: { sendMail: async () => ({ messageId: '' }) },
  });
  expect(result).toEqual({ queued: 1, sent: 0, failed: 0, unknown: 1 });
  expect(transitions).toEqual(['unknown']);
});

test('ambiguous SMTP transport errors remain queued unknown and are never labeled rejected', async () => {
  const transitions: string[] = [];
  const repository = {
    claimEmailAlertsForRun: async () => [{
      eventId: 'ambiguous-event-id',
      title: '1985 Toyota Supra',
      watchTitle: '1983–1986 Toyota Supra',
      sourceUrl: null,
      priceAmount: null,
      mileage: null,
      locationText: null,
    }],
    beginEmailAlertDelivery: async () => true,
    finishEmailAlert: async () => {
      transitions.push('terminal');
      return true;
    },
    markEmailAlertOutcomeUnknown: async () => {
      transitions.push('unknown');
      return true;
    },
  } as unknown as OpportunityRepository;

  const result = await sendOpportunityEmailsForRun({
    repository,
    clientSlug: 'mike-rapp',
    runId: 'synthetic-run-id',
    config: readOpportunityEmailConfig(validEnvironment),
    transport: {
      sendMail: async () => {
        throw new Error('socket timeout after DATA');
      },
    },
  });

  expect(result).toEqual({ queued: 1, sent: 0, failed: 0, unknown: 1 });
  expect(transitions).toEqual(['unknown']);
});
