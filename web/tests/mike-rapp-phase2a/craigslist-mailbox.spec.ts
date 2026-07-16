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
    maxMessages: 25,
  });
});

test('Fastmail mailbox searches only newer Craigslist mail and fetches bounded MIME without marking seen', async () => {
  const calls: unknown[] = [];
  const client: ImapClientLike = {
    connect: async () => { calls.push('connect'); },
    getMailboxLock: async (mailbox) => {
      calls.push(['lock', mailbox]);
      return { release: () => { calls.push('release'); } };
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

  await expect(mailbox.fetchAfter(10)).resolves.toEqual([
    { uid: 11, rawMime: Buffer.from('mime-11') },
    { uid: 12, rawMime: Buffer.from('mime-12') },
  ]);
  expect(calls).toContainEqual([
    'search',
    { uid: '11:*', from: 'craigslist.org', to: 'babs@phloid.com' },
    { uid: true },
  ]);
  expect(calls).toContainEqual(['fetch', 11, { source: { maxLength: 2_000_000 } }, { uid: true }]);
  expect(calls.at(-2)).toBe('release');
  expect(calls.at(-1)).toBe('logout');
});
