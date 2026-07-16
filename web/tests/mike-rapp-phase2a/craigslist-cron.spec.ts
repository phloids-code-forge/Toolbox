import { expect, test } from '@playwright/test';

import { authorizeOpportunityCron } from '../../src/lib/opportunity/cron-auth';

test('opportunity cron auth requires one exact bounded bearer secret', () => {
  const environment = { CRON_SECRET: '0123456789abcdef0123456789abcdef' };
  expect(authorizeOpportunityCron('Bearer 0123456789abcdef0123456789abcdef', environment)).toBe(true);
  expect(authorizeOpportunityCron('bearer 0123456789abcdef0123456789abcdef', environment)).toBe(false);
  expect(authorizeOpportunityCron('Bearer 0123456789abcdef0123456789abcdef extra', environment)).toBe(false);
  expect(authorizeOpportunityCron(null, environment)).toBe(false);
  expect(authorizeOpportunityCron('Bearer short', { CRON_SECRET: 'short' })).toBe(false);
  expect(authorizeOpportunityCron('Bearer anything', {})).toBe(false);
});
