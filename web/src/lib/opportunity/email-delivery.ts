import { createHash } from 'node:crypto';

import type { OpportunityRepository } from './repository';
import nodemailer from 'nodemailer';

type EmailEnvironment = Record<string, string | undefined>;

export type OpportunityEmailConfig = {
  host: 'smtp.fastmail.com';
  port: 465;
  secure: true;
  user: string;
  password: string;
  from: 'babs@phloid.com';
  recipient: 'dave@phloid.com';
};

export type OpportunityEmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  messageId?: string;
};

export type OpportunityEmailTransport = {
  sendMail: (message: OpportunityEmailMessage) => Promise<{ messageId: string }>;
};

type FastmailTransportOptions = {
  host: 'smtp.fastmail.com';
  port: 465;
  secure: true;
  auth: { user: string; pass: string };
  connectionTimeout: 10_000;
  greetingTimeout: 10_000;
  socketTimeout: 20_000;
};

type OpportunityEmailTransportFactory = (
  options: FastmailTransportOptions,
) => OpportunityEmailTransport;

function assertDaveOnlyEmailConfig(config: OpportunityEmailConfig): void {
  if (
    config.host !== 'smtp.fastmail.com'
    || config.port !== 465
    || config.secure !== true
    || !config.user
    || !config.password
    || config.from !== 'babs@phloid.com'
    || config.recipient !== 'dave@phloid.com'
  ) {
    throw new Error('Dave-only email boundary rejected the configuration.');
  }
}

export type OpportunityEmailContent = {
  title: string;
  watchTitle: string;
  sourceUrl: string | null;
  priceAmount: number | null;
  mileage: number | null;
  locationText: string | null;
};

export function readOpportunityEmailConfig(
  environment: EmailEnvironment = process.env,
): OpportunityEmailConfig {
  const host = environment.OPPORTUNITY_SMTP_HOST?.trim().toLowerCase();
  const port = Number(environment.OPPORTUNITY_SMTP_PORT);
  const user = environment.OPPORTUNITY_SMTP_USER?.trim();
  const password = environment.OPPORTUNITY_SMTP_PASSWORD;
  const from = environment.OPPORTUNITY_EMAIL_FROM?.trim().toLowerCase();
  const recipient = environment.OPPORTUNITY_EMAIL_RECIPIENT?.trim().toLowerCase();

  if (
    host !== 'smtp.fastmail.com'
    || port !== 465
    || !user
    || !password
    || from !== 'babs@phloid.com'
    || recipient !== 'dave@phloid.com'
  ) {
    throw new Error('Email delivery is not configured.');
  }

  return {
    host,
    port,
    secure: true,
    user,
    password,
    from,
    recipient,
  };
}

export function createFastmailEmailTransport(
  config: OpportunityEmailConfig,
  factory?: OpportunityEmailTransportFactory,
): OpportunityEmailTransport {
  assertDaveOnlyEmailConfig(config);
  const options: FastmailTransportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
  if (factory) return factory(options);

  const transport = nodemailer.createTransport(options);
  return {
    sendMail: async (message) => {
      const result = await transport.sendMail(message);
      return { messageId: result.messageId };
    },
  };
}

function formatAmount(value: number | null, suffix = ''): string {
  return value === null ? 'Not provided' : `${value.toLocaleString('en-US')}${suffix}`;
}

class ProviderAcceptedWithoutAuditIdError extends Error {}

export async function deliverOpportunityEmail({
  config,
  transport,
  opportunity,
  providerMessageId,
}: {
  config: OpportunityEmailConfig;
  transport: OpportunityEmailTransport;
  opportunity: OpportunityEmailContent;
  providerMessageId?: string;
}): Promise<{ providerMessageId: string }> {
  assertDaveOnlyEmailConfig(config);
  const result = await transport.sendMail({
    from: config.from,
    to: config.recipient,
    subject: `Mike Rapp opportunity: ${opportunity.title}`,
    text: [
      opportunity.title,
      `Watch: ${opportunity.watchTitle}`,
      `Price: $${formatAmount(opportunity.priceAmount)}`,
      `Mileage: ${formatAmount(opportunity.mileage, ' miles')}`,
      `Location: ${opportunity.locationText ?? 'Not provided'}`,
      `Listing: ${opportunity.sourceUrl ?? 'No source link available'}`,
    ].join('\n'),
    ...(providerMessageId ? { messageId: providerMessageId } : {}),
  });

  if (
    !result.messageId
    || result.messageId.length > 500
    || /[\r\n]/.test(result.messageId)
    || (providerMessageId && result.messageId !== providerMessageId)
  ) {
    throw new ProviderAcceptedWithoutAuditIdError('Email provider did not return a valid message identifier.');
  }
  return { providerMessageId: result.messageId };
}

function providerMessageIdForEvent(eventId: string): string {
  const digest = createHash('sha256').update(eventId).digest('hex').slice(0, 40);
  return `<opportunity-${digest}@phloid.com>`;
}

function isDefinitiveProviderRejection(error: unknown): boolean {
  const responseCode = typeof error === 'object' && error !== null
    ? (error as { responseCode?: unknown }).responseCode
    : undefined;
  return typeof responseCode === 'number' && responseCode >= 500 && responseCode < 600;
}

export async function sendOpportunityEmailsForRun({
  repository,
  clientSlug,
  runId,
  config,
  transport,
  now = new Date(),
}: {
  repository: OpportunityRepository;
  clientSlug: string;
  runId: string;
  config: OpportunityEmailConfig;
  transport: OpportunityEmailTransport;
  now?: Date;
}): Promise<{ queued: number; sent: number; failed: number; unknown: number }> {
  const claims = await repository.claimEmailAlertsForRun(clientSlug, runId, now);
  let queued = 0;
  let sent = 0;
  let failed = 0;
  let unknown = 0;
  for (const claim of claims) {
    const providerMessageId = providerMessageIdForEvent(claim.eventId);
    const began = await repository.beginEmailAlertDelivery(clientSlug, claim.eventId, providerMessageId);
    if (!began) continue;
    queued += 1;
    try {
      await deliverOpportunityEmail({
        config,
        transport,
        opportunity: claim,
        providerMessageId,
      });
    } catch (error) {
      if (isDefinitiveProviderRejection(error)) {
        const recorded = await repository.finishEmailAlert(
          clientSlug,
          claim.eventId,
          'failed',
          providerMessageId,
          now,
        );
        if (!recorded) throw new Error('Email audit state changed before rejection was recorded.');
        failed += 1;
      } else {
        const recorded = await repository.markEmailAlertOutcomeUnknown(
          clientSlug,
          claim.eventId,
          providerMessageId,
        );
        if (!recorded) throw new Error('Email audit state changed before unknown outcome was recorded.');
        unknown += 1;
      }
      continue;
    }

    const recorded = await repository.finishEmailAlert(
      clientSlug,
      claim.eventId,
      'sent',
      providerMessageId,
      now,
    );
    if (!recorded) throw new Error('Email audit state changed before completion.');
    sent += 1;
  }
  return { queued, sent, failed, unknown };
}
