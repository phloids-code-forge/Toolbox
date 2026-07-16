import { createHash } from 'node:crypto';

import { parseCraigslistAlertMime } from './craigslist-email';
import type { OpportunityRepository, SourceCursor } from './repository';
import { runOpportunityWorker } from './worker';

export type CraigslistMailboxMessage = {
  uid: number;
  rawMime?: Buffer;
  failureCode?: 'message_too_large' | 'message_unavailable' | 'message_fetch_failed';
};

export type CraigslistMailboxBatch = {
  generation: string;
  messages: CraigslistMailboxMessage[];
};

export type CraigslistMailbox = {
  fetchAfter: (cursor: SourceCursor | null, deadlineAt?: number) => Promise<CraigslistMailboxBatch>;
};

type RunCraigslistEmailIntakeInput = {
  repository: OpportunityRepository;
  mailbox: CraigslistMailbox;
  clientSlug: string;
  now?: Date;
  deadlineAt?: number;
};

export type CraigslistIntakeResult = {
  status: 'ok' | 'partial' | 'failed' | 'busy';
  processedMessages: number;
  failedMessages: number;
  quarantinedMessages: number;
  deferredMessages: number;
  listings: number;
  cursor: number;
};

function failureCode(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown_intake_error';
  const known = new Set([
    'unauthenticated_sender',
    'untrusted_sender',
    'unparseable_alert',
    'worker_not_ok',
    'message_too_large',
    'message_unavailable',
    'message_fetch_failed',
  ]);
  return known.has(error.message) ? error.message : 'unknown_intake_error';
}

export async function runCraigslistEmailIntake({
  repository,
  mailbox,
  clientSlug,
  now = new Date(),
  deadlineAt = Date.now() + 35_000,
}: RunCraigslistEmailIntakeInput): Promise<CraigslistIntakeResult> {
  const emptyResult = {
    processedMessages: 0,
    failedMessages: 0,
    quarantinedMessages: 0,
    deferredMessages: 0,
    listings: 0,
    cursor: 0,
  };
  const releaseLease = await repository.tryAcquireSourceLease(clientSlug, 'craigslist_email');
  if (!releaseLease) return { status: 'busy', ...emptyResult };

  try {
    let cursor = await repository.getSourceCursor(clientSlug, 'craigslist_email');
    let processedMessages = 0;
    let failedMessages = 0;
    let quarantinedMessages = 0;
    let deferredMessages = 0;
    let listings = 0;
    let batch: CraigslistMailboxBatch;
    try {
      batch = await mailbox.fetchAfter(cursor, deadlineAt);
    } catch {
      return {
        status: 'failed', processedMessages, failedMessages: 1, quarantinedMessages,
        deferredMessages, listings, cursor: cursor?.value ?? 0,
      };
    }

    if (!batch.generation.trim()) {
      return {
        status: 'failed', processedMessages, failedMessages: 1, quarantinedMessages,
        deferredMessages, listings, cursor: cursor?.value ?? 0,
      };
    }
    if (cursor?.generation !== batch.generation) {
      cursor = await repository.advanceSourceCursor(
        clientSlug,
        'craigslist_email',
        { generation: batch.generation, value: 0 },
        now,
      );
    }

    const ordered = [...batch.messages]
      .filter((message) => Number.isSafeInteger(message.uid) && message.uid > (cursor?.value ?? 0))
      .sort((left, right) => left.uid - right.uid)
      .filter((message, index, all) => index === 0 || message.uid !== all[index - 1].uid);

    const leaseBucket = now.toISOString().slice(0, 13).replace(/[-T:]/g, '');
    for (let index = 0; index < ordered.length; index += 1) {
      if (Date.now() >= deadlineAt) {
        deferredMessages = ordered.length - index;
        break;
      }
      const message = ordered[index];
      const messageCursor = { generation: batch.generation, value: message.uid };
      try {
        if (message.failureCode) throw new Error(message.failureCode);
        if (!message.rawMime) throw new Error('message_unavailable');
        const parsed = await parseCraigslistAlertMime(message.rawMime);
        const messageDigest = createHash('sha256').update(parsed.messageKey).digest('hex').slice(0, 20);
        const worker = await runOpportunityWorker({
          repository,
          clientSlug,
          runKey: `craigslist-email:${message.uid}:${messageDigest}:${leaseBucket}`,
          runType: 'scheduled',
          adapters: [{
            sourceType: 'craigslist_email',
            poll: async () => parsed.listings,
          }],
          now,
        });
        if (worker.status !== 'ok') throw new Error('worker_not_ok');
        cursor = await repository.advanceSourceCursor(clientSlug, 'craigslist_email', messageCursor, now);
        await repository.clearSourceFailure(clientSlug, 'craigslist_email', messageCursor);
        processedMessages += 1;
        listings += parsed.listings.length;
      } catch (error) {
        failedMessages += 1;
        const failure = await repository.recordSourceFailure(
          clientSlug,
          'craigslist_email',
          messageCursor,
          failureCode(error),
          now,
        );
        if (!failure.quarantined) break;
        quarantinedMessages += 1;
        cursor = await repository.advanceSourceCursor(clientSlug, 'craigslist_email', messageCursor, now);
      }
    }

    const status = failedMessages > 0
      ? processedMessages > 0 || quarantinedMessages > 0 ? 'partial' : 'failed'
      : deferredMessages > 0 ? 'partial' : 'ok';
    return {
      status,
      processedMessages,
      failedMessages,
      quarantinedMessages,
      deferredMessages,
      listings,
      cursor: cursor?.value ?? 0,
    };
  } finally {
    await releaseLease();
  }
}
