import { expect, test } from '@playwright/test';

import { GET } from '../../src/app/api/opportunity/cron/craigslist/route';
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

test('authorized cron fails before mailbox or database access when Dave-only delivery is unconfigured', async () => {
  const cronSecret = ['test', 'only', 'cron', 'secret', '0000000000'].join('-');
  const saved = {
    CRON_SECRET: process.env.CRON_SECRET,
    POSTGRES_URL: process.env.POSTGRES_URL,
    OPPORTUNITY_SMTP_USER: process.env.OPPORTUNITY_SMTP_USER,
    OPPORTUNITY_SMTP_PASSWORD: process.env.OPPORTUNITY_SMTP_PASSWORD,
    OPPORTUNITY_EMAIL_FROM: process.env.OPPORTUNITY_EMAIL_FROM,
    OPPORTUNITY_EMAIL_RECIPIENT: process.env.OPPORTUNITY_EMAIL_RECIPIENT,
  };
  process.env.CRON_SECRET = cronSecret;
  delete process.env.POSTGRES_URL;
  delete process.env.OPPORTUNITY_SMTP_USER;
  delete process.env.OPPORTUNITY_SMTP_PASSWORD;
  delete process.env.OPPORTUNITY_EMAIL_FROM;
  delete process.env.OPPORTUNITY_EMAIL_RECIPIENT;

  try {
    const response = await GET(new Request('http://localhost/api/opportunity/cron/craigslist', {
      headers: { authorization: `Bearer ${cronSecret}` },
    }) as never);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'delivery_unavailable' });
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
