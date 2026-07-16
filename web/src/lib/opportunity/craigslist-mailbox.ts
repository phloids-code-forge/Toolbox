import { ImapFlow } from 'imapflow';

import type {
  CraigslistMailbox,
  CraigslistMailboxBatch,
  CraigslistMailboxMessage,
} from './craigslist-intake';
import type { SourceCursor } from './repository';

export type CraigslistImapConfig = {
  host: string;
  port: 993;
  user: string;
  password: string;
  address: string;
  mailbox: 'INBOX';
  maxMessages: 5;
};

type Environment = Record<string, string | undefined>;
type SearchQuery = { uid: string; from: string; to: string };
type FetchQuery = { source: { maxLength: number } };
type FetchResult = { uid: number; source?: Buffer } | false;

export type ImapClientLike = {
  connect: () => Promise<void>;
  getMailboxLock: (mailbox: string) => Promise<{ uidValidity: string; release: () => void }>;
  search: (query: SearchQuery, options: { uid: true }) => Promise<number[] | false>;
  fetchOne: (uid: number, query: FetchQuery, options: { uid: true }) => Promise<FetchResult>;
  close: () => void;
  logout: () => Promise<void>;
};

type ClientFactory = (config: CraigslistImapConfig) => ImapClientLike;

function required(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error('imap_not_configured');
  return value;
}

export function readCraigslistImapConfig(environment: Environment = process.env): CraigslistImapConfig {
  const host = required(environment, 'OPPORTUNITY_IMAP_HOST').toLowerCase();
  const port = Number(required(environment, 'OPPORTUNITY_IMAP_PORT'));
  const user = required(environment, 'OPPORTUNITY_IMAP_USER');
  const password = required(environment, 'OPPORTUNITY_IMAP_PASSWORD');
  const address = required(environment, 'OPPORTUNITY_INTAKE_ADDRESS').toLowerCase();
  if (host !== 'imap.fastmail.com') throw new Error('imap_invalid_host');
  if (port !== 993) throw new Error('imap_invalid_port');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('imap_invalid_address');
  if (password.length < 8) throw new Error('imap_invalid_password');
  return { host, port: 993, user, password, address, mailbox: 'INBOX', maxMessages: 5 };
}

function defaultClientFactory(config: CraigslistImapConfig): ImapClientLike {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: { rejectUnauthorized: true },
  });
  return {
    connect: () => client.connect(),
    getMailboxLock: async (mailbox) => {
      const lock = await client.getMailboxLock(mailbox);
      const uidValidity = client.mailbox && client.mailbox.uidValidity;
      if (uidValidity === false || uidValidity === undefined) {
        lock.release();
        throw new Error('imap_uidvalidity_unavailable');
      }
      return { uidValidity: String(uidValidity), release: () => lock.release() };
    },
    search: async (query, options) => client.search(query, options),
    fetchOne: async (uid, query, options) => {
      const message = await client.fetchOne(uid, query, options);
      return message ? { uid: message.uid, source: message.source } : false;
    },
    close: () => client.close(),
    logout: () => client.logout(),
  };
}

class ImapDeadlineError extends Error {
  constructor() {
    super('imap_deadline_exceeded');
  }
}

async function withImapDeadline<T>(
  operation: () => Promise<T>,
  deadlineAt: number,
  close: () => void,
): Promise<T> {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) {
    close();
    throw new ImapDeadlineError();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      close();
      reject(new ImapDeadlineError());
    }, remaining);
  });
  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class FastmailCraigslistMailbox implements CraigslistMailbox {
  constructor(
    private readonly config: CraigslistImapConfig,
    private readonly createClient: ClientFactory = defaultClientFactory,
  ) {}

  async fetchAfter(cursor: SourceCursor | null, deadlineAt = Date.now() + 35_000): Promise<CraigslistMailboxBatch> {
    if (cursor && (!Number.isSafeInteger(cursor.value) || cursor.value < 0)) {
      throw new Error('imap_invalid_cursor');
    }
    const client = this.createClient(this.config);
    const bounded = <T>(operation: () => Promise<T>) => withImapDeadline(operation, deadlineAt, () => client.close());
    let lock: { uidValidity: string; release: () => void } | null = null;
    try {
      await bounded(() => client.connect());
      lock = await bounded(() => client.getMailboxLock(this.config.mailbox));
      const effectiveCursor = cursor?.generation === lock.uidValidity ? cursor.value : 0;
      const found = await bounded(() => client.search({
        uid: `${effectiveCursor + 1}:*`,
        from: 'craigslist.org',
        to: this.config.address,
      }, { uid: true }));
      const uids = [...(found || [])]
        .filter((uid) => Number.isSafeInteger(uid) && uid > effectiveCursor)
        .sort((left, right) => left - right)
        .slice(0, this.config.maxMessages);
      const messages: CraigslistMailboxMessage[] = [];
      for (const uid of uids) {
        try {
          const message = await bounded(() => client.fetchOne(
            uid,
            { source: { maxLength: 2_000_000 } },
            { uid: true },
          ));
          if (!message || !message.source) {
            messages.push({ uid, failureCode: 'message_unavailable' });
          } else if (message.source.length >= 2_000_000) {
            messages.push({ uid, failureCode: 'message_too_large' });
          } else {
            messages.push({ uid, rawMime: message.source });
          }
        } catch (error) {
          if (error instanceof ImapDeadlineError) throw error;
          messages.push({ uid, failureCode: 'message_fetch_failed' });
        }
      }
      return { generation: lock.uidValidity, messages };
    } finally {
      lock?.release();
      try {
        await bounded(() => client.logout());
      } catch {
        client.close();
      }
    }
  }
}
