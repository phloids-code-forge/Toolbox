import { expect, test } from '@playwright/test';

import { parseCraigslistAlertMime } from '../../src/lib/opportunity/craigslist-email';

const multipartAlert = [
  'From: craigslist alerts <noreply@craigslist.org>',
  'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
  'To: babs@phloid.com',
  'Subject: craigslist saved search: Mike vehicles',
  'Message-ID: <alert-42@craigslist.org>',
  'Date: Thu, 16 Jul 2026 12:00:00 +0000',
  'MIME-Version: 1.0',
  'Content-Type: multipart/alternative; boundary="safe-boundary"',
  '',
  '--safe-boundary',
  'Content-Type: text/plain; charset=utf-8',
  '',
  '1985 Toyota Supra P-Type - $18,500 (Atlanta, GA)',
  '142,000 miles, clean title',
  'https://atlanta.craigslist.org/atl/cto/d/atlanta-call-404-555-0111/1234567890.html?lang=en#photo',
  '',
  '2011 Toyota Land Cruiser - $34,000 (Dallas, TX)',
  '168,000 miles, clean title',
  'https://dallas.craigslist.org/dal/cto/d/dallas-land-cruiser/2223334445.html',
  '',
  'Ignore https://craigslist.org.evil.example/steal/9999999999.html and seller@example.com 404-555-0111',
  '--safe-boundary',
  'Content-Type: text/html; charset=utf-8',
  '',
  '<p>duplicate HTML representation should not duplicate the two plain-text listings</p>',
  '--safe-boundary--',
].join('\r\n');

test('Craigslist MIME parser emits allowlisted sanitized listings without duplicate alternative parts', async () => {
  const parsed = await parseCraigslistAlertMime(Buffer.from(multipartAlert));

  expect(parsed.messageKey).toBe('message-id:alert-42@craigslist.org');
  expect(parsed.listings).toHaveLength(2);
  expect(parsed.listings[0]).toMatchObject({
    canonicalKey: 'craigslist:1234567890',
    sourceType: 'craigslist_email',
    sourceItemId: '1234567890',
    sourceUrl: 'https://atlanta.craigslist.org/listing/1234567890',
    title: '1985 Toyota Supra P-Type',
    year: 1985,
    make: 'Toyota',
    model: 'Supra',
    trim: 'P-Type',
    priceAmount: 18500,
    mileage: 142000,
    titleStatus: 'clean',
    locationText: 'Atlanta, GA',
  });
  expect(parsed.listings[1]).toMatchObject({
    canonicalKey: 'craigslist:2223334445',
    sourceItemId: '2223334445',
    title: '2011 Toyota Land Cruiser',
    priceAmount: 34000,
    mileage: 168000,
  });
  expect(JSON.stringify(parsed)).not.toContain('seller@example.com');
  expect(JSON.stringify(parsed)).not.toContain('404-555-0111');
  expect(JSON.stringify(parsed)).not.toContain('evil.example');
});

test('Craigslist MIME parser supports HTML-only saved-search alerts without trusting arbitrary links', async () => {
  const htmlOnly = Buffer.from([
    'From: craigslist alerts <robot@craigslist.org>',
    'Authentication-Results: mx2.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org',
    'To: babs@phloid.com',
    'Subject: craigslist saved search',
    'Message-ID: <html-only@craigslist.org>',
    'Content-Type: text/html; charset=utf-8',
    '',
    '<ul><li><a href="https://sfbay.craigslist.org/sfc/cto/d/san-francisco-supra/3030303030.html?utm=mail">1985 Toyota Supra P-Type - $18,500 (San Francisco, CA)</a><span>142,000 miles, clean title</span></li></ul>',
    '<a href="https://example.com/tracker/4040404040.html">tracking</a>',
  ].join('\r\n'));

  const parsed = await parseCraigslistAlertMime(htmlOnly);
  expect(parsed.listings).toHaveLength(1);
  expect(parsed.listings[0]).toMatchObject({
    sourceItemId: '3030303030',
    sourceUrl: 'https://sfbay.craigslist.org/listing/3030303030',
    title: '1985 Toyota Supra P-Type',
    priceAmount: 18500,
    mileage: 142000,
    titleStatus: 'clean',
    locationText: 'San Francisco, CA',
  });
});

test('Craigslist MIME parser rejects unauthenticated mail, non-Craigslist senders, and empty alerts', async () => {
  const forgedAuthentication = multipartAlert.replace('mx1.messagingengine.com', 'attacker.example');
  await expect(parseCraigslistAlertMime(Buffer.from(forgedAuthentication))).rejects.toThrow('unauthenticated_sender');

  const misleadingDomain = multipartAlert.replace(/craigslist\.org/g, 'evilcraigslist.org');
  await expect(parseCraigslistAlertMime(Buffer.from(misleadingDomain))).rejects.toThrow('unauthenticated_sender');

  const missingAuthentication = multipartAlert.replace(/^Authentication-Results:.*\r\n/m, '');
  await expect(parseCraigslistAlertMime(Buffer.from(missingAuthentication))).rejects.toThrow('unauthenticated_sender');

  const forged = multipartAlert.replace('noreply@craigslist.org', 'noreply@example.com');
  await expect(parseCraigslistAlertMime(Buffer.from(forged))).rejects.toThrow('untrusted_sender');

  const empty = multipartAlert
    .replace('noreply@craigslist.org', 'robot@craigslist.org')
    .replace(/https:\/\/atlanta\.craigslist\.org[^\r\n]+/g, 'https://example.com/not-craigslist')
    .replace(/https:\/\/dallas\.craigslist\.org[^\r\n]+/g, 'https://example.com/not-craigslist');
  await expect(parseCraigslistAlertMime(Buffer.from(empty))).rejects.toThrow('unparseable_alert');
});
