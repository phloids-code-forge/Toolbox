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
}: {
  config: OpportunityEmailConfig;
  transport: OpportunityEmailTransport;
  opportunity: OpportunityEmailContent;
}): Promise<{ providerMessageId: string }> {
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
  });

  if (!result.messageId || result.messageId.length > 500 || /[\r\n]/.test(result.messageId)) {
    throw new ProviderAcceptedWithoutAuditIdError('Email provider did not return a valid message identifier.');
  }
  return { providerMessageId: result.messageId };
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
}): Promise<{ queued: number; sent: number; failed: number }> {
  const claims = await repository.claimEmailAlertsForRun(clientSlug, runId, now);
  let sent = 0;
  let failed = 0;
  for (const claim of claims) {
    let providerMessageId: string;
    try {
      const result = await deliverOpportunityEmail({
        config,
        transport,
        opportunity: claim,
      });
      providerMessageId = result.providerMessageId;
    } catch (error) {
      if (error instanceof ProviderAcceptedWithoutAuditIdError) throw error;
      const recorded = await repository.finishEmailAlert(clientSlug, claim.eventId, 'failed', null, now);
      if (recorded) failed += 1;
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
  return { queued: claims.length, sent, failed };
}
