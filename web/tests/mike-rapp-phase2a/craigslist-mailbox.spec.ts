import { expect, test } from '@playwright/test';

import {
  FastmailCraigslistMailbox,
  readCraigslistImapConfig,
  type ImapClientLike,
} from '../../src/lib/opportunity/craigslist-mailbox';

const completeEnvironment = {
  OPPORTUNITY_IMAP_HOST: 'imap.fastmail.com',
  OPPORTUNITY_IMAP_PORT: '993',
  OPPORTUNITY_IMAP_USER: 'configured-user',
  OPPORTUNITY_IMAP_PASSWORD: 'configured-password',
  OPPORTUNITY_INTAKE_ADDRESS: 'babs@phloid.com',
};

test('IMAP configuration fails closed unless every bounded production setting is valid', () => {
  expect(() => readCraigslistImapConfig({})).toThrow('imap_not_configured');
  expect(() => readCraigslistImapConfig({ ...completeEnvironment, OPPORTUNITY_IMAP_PORT: '143' }))
    .toThrow('imap_invalid_port');
  expect(() => readCraigslistImapConfig({ ...completeEnvironment, OPPORTUNITY_INTAKE_ADDRESS: 'not-an-email' }))
    .toThrow('imap_invalid_address');

  expect(readCraigslistImapConfig(completeEnvironment)).toMatchObject({
    host: 'imap.fastmail.com',
    port: 993,
    user: 'configured-user',
    address: 'babs@phloid.com',
    mailbox: 'INBOX',
    maxMessages: 5,
  });
});

test('Fastmail mailbox searches only the current UID generation and fetches bounded MIME without marking seen', async () => {
  const calls: unknown[] = [];
  const client: ImapClientLike = {
    connect: async () => { calls.push('connect'); },
    getMailboxLock: async (mailbox) => {
      calls.push(['lock', mailbox]);
      return { uidValidity: '9001', release: () => { calls.push('release'); } };
    },
    search: async (query, options) => {
      calls.push(['search', query, options]);
      return [12, 11];
    },
    fetchOne: async (uid, query, options) => {
      calls.push(['fetch', uid, query, options]);
      return { uid: Number(uid), source: Buffer.from(`mime-${uid}`) };
    },
    logout: async () => { calls.push('logout'); },
  };
  const mailbox = new FastmailCraigslistMailbox(
    readCraigslistImapConfig(completeEnvironment),
    () => client,
  );

  await expect(mailbox.fetchAfter({ generation: '9001', value: 10 })).resolves.toEqual({
    generation: '9001',
    messages: [
      { uid: 11, rawMime: Buffer.from('mime-11') },
      { uid: 12, rawMime: Buffer.from('mime-12') },
    ],
  });
  expect(calls).toContainEqual([
    'search',
    { uid: '11:*', from: 'craigslist.org', to: 'babs@phloid.com' },
    { uid: true },
  ]);
  expect(calls).toContainEqual(['fetch', 11, { source: { maxLength: 2_000_000 } }, { uid: true }]);
  expect(calls.at(-2)).toBe('release');
  expect(calls.at(-1)).toBe('logout');
});

test('Fastmail mailbox restarts at UID one when UIDVALIDITY changes', async () => {
  const searches: unknown[] = [];
  const client: ImapClientLike = {
    connect: async () => {},
    getMailboxLock: async () => ({ uidValidity: 'new-mailbox', release: () => {} }),
    search: async (query) => { searches.push(query); return []; },
    fetchOne: async () => false,
    logout: async () => {},
  };
  const mailbox = new FastmailCraigslistMailbox(readCraigslistImapConfig(completeEnvironment), () => client);

  await expect(mailbox.fetchAfter({ generation: 'old-mailbox', value: 500 })).resolves.toEqual({
    generation: 'new-mailbox',
    messages: [],
  });
  expect(searches).toEqual([{ uid: '1:*', from: 'craigslist.org', to: 'babs@phloid.com' }]);
});

test('Fastmail mailbox returns a bounded per-message failure instead of starving later UIDs', async () => {
  const client: ImapClientLike = {
    connect: async () => {},
    getMailboxLock: async () => ({ uidValidity: '9002', release: () => {} }),
    search: async () => [20, 21],
    fetchOne: async (uid) => uid === 20
      ? { uid, source: Buffer.alloc(2_000_000) }
      : { uid, source: Buffer.from('safe') },
    logout: async () => {},
  };
  const mailbox = new FastmailCraigslistMailbox(readCraigslistImapConfig(completeEnvironment), () => client);

  await expect(mailbox.fetchAfter(null)).resolves.toEqual({
    generation: '9002',
    messages: [
      { uid: 20, failureCode: 'message_too_large' },
      { uid: 21, rawMime: Buffer.from('safe') },
    ],
  });
});
