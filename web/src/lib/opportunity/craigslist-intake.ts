import { createHash } from 'node:crypto';

import { parseCraigslistAlertMime } from './craigslist-email';
import type { OpportunityRepository } from './repository';
import { runOpportunityWorker } from './worker';

export type CraigslistMailboxMessage = {
  uid: number;
  rawMime: Buffer;
};

export type CraigslistMailbox = {
  fetchAfter: (cursor: number) => Promise<CraigslistMailboxMessage[]>;
};

type RunCraigslistEmailIntakeInput = {
  repository: OpportunityRepository;
  mailbox: CraigslistMailbox;
  clientSlug: string;
  now?: Date;
};

export type CraigslistIntakeResult = {
  status: 'ok' | 'partial' | 'failed';
  processedMessages: number;
  failedMessages: number;
  listings: number;
  cursor: number;
};

export async function runCraigslistEmailIntake({
  repository,
  mailbox,
  clientSlug,
  now = new Date(),
}: RunCraigslistEmailIntakeInput): Promise<CraigslistIntakeResult> {
  let cursor = await repository.getSourceCursor(clientSlug, 'craigslist_email');
  let processedMessages = 0;
  let failedMessages = 0;
  let listings = 0;
  let messages: CraigslistMailboxMessage[];
  try {
    messages = await mailbox.fetchAfter(cursor);
  } catch {
    return { status: 'failed', processedMessages, failedMessages: 1, listings, cursor };
  }

  const ordered = [...messages]
    .filter((message) => Number.isSafeInteger(message.uid) && message.uid > cursor)
    .sort((left, right) => left.uid - right.uid)
    .filter((message, index, all) => index === 0 || message.uid !== all[index - 1].uid);

  const leaseBucket = now.toISOString().slice(0, 13).replace(/[-T:]/g, '');
  for (const message of ordered) {
    try {
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
      cursor = await repository.advanceSourceCursor(clientSlug, 'craigslist_email', message.uid, now);
      processedMessages += 1;
      listings += parsed.listings.length;
    } catch {
      failedMessages += 1;
      break;
    }
  }

  const status = failedMessages === 0 ? 'ok' : processedMessages > 0 ? 'partial' : 'failed';
  return { status, processedMessages, failedMessages, listings, cursor };
}
