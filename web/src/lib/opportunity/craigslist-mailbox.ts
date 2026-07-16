import { ImapFlow } from 'imapflow';

import type { CraigslistMailbox, CraigslistMailboxMessage } from './craigslist-intake';

export type CraigslistImapConfig = {
  host: string;
  port: 993;
  user: string;
  password: string;
  address: string;
  mailbox: 'INBOX';
  maxMessages: 25;
};

type Environment = Record<string, string | undefined>;
type SearchQuery = { uid: string; from: string; to: string };
type FetchQuery = { source: { maxLength: number } };
type FetchResult = { uid: number; source?: Buffer } | false;

export type ImapClientLike = {
  connect: () => Promise<void>;
  getMailboxLock: (mailbox: string) => Promise<{ release: () => void }>;
  search: (query: SearchQuery, options: { uid: true }) => Promise<number[] | false>;
  fetchOne: (uid: number, query: FetchQuery, options: { uid: true }) => Promise<FetchResult>;
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
  return { host, port: 993, user, password, address, mailbox: 'INBOX', maxMessages: 25 };
}

function defaultClientFactory(config: CraigslistImapConfig): ImapClientLike {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: true,
    auth: { user: config.user, pass: config.password },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    tls: { rejectUnauthorized: true },
  });
  return {
    connect: () => client.connect(),
    getMailboxLock: async (mailbox) => {
      const lock = await client.getMailboxLock(mailbox);
      return { release: () => lock.release() };
    },
    search: async (query, options) => client.search(query, options),
    fetchOne: async (uid, query, options) => {
      const message = await client.fetchOne(uid, query, options);
      return message ? { uid: message.uid, source: message.source } : false;
    },
    logout: () => client.logout(),
  };
}

export class FastmailCraigslistMailbox implements CraigslistMailbox {
  constructor(
    private readonly config: CraigslistImapConfig,
    private readonly createClient: ClientFactory = defaultClientFactory,
  ) {}

  async fetchAfter(cursor: number): Promise<CraigslistMailboxMessage[]> {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error('imap_invalid_cursor');
    const client = this.createClient(this.config);
    let lock: { release: () => void } | null = null;
    try {
      await client.connect();
      lock = await client.getMailboxLock(this.config.mailbox);
      const found = await client.search({
        uid: `${cursor + 1}:*`,
        from: 'craigslist.org',
        to: this.config.address,
      }, { uid: true });
      const uids = [...(found || [])]
        .filter((uid) => Number.isSafeInteger(uid) && uid > cursor)
        .sort((left, right) => left - right)
        .slice(0, this.config.maxMessages);
      const messages: CraigslistMailboxMessage[] = [];
      for (const uid of uids) {
        const message = await client.fetchOne(uid, { source: { maxLength: 2_000_000 } }, { uid: true });
        if (!message || !message.source || message.source.length >= 2_000_000) {
          throw new Error('imap_message_unavailable');
        }
        messages.push({ uid: message.uid, rawMime: message.source });
      }
      return messages;
    } finally {
      lock?.release();
      try {
        await client.logout();
      } catch {
        // The connection may already be closed; no credential or provider detail is surfaced.
      }
    }
  }
}
