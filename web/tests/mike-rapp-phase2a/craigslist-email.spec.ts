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

  const quotedAuthentication = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass (p=none) header.from="craigslist.org"; dkim=pass header.d="mail.craigslist.org"',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(quotedAuthentication))).resolves.toMatchObject({
    messageKey: 'message-id:alert-42@craigslist.org',
  });

  const absoluteAndQuotedMailbox = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com.; dmarc=pass header.from=craigslist.org.; dkim=fail header.d=evil.example; spf=pass smtp.mailfrom="\\"noreply alerts\\"@craigslist.org."',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(absoluteAndQuotedMailbox))).resolves.toMatchObject({
    messageKey: 'message-id:alert-42@craigslist.org',
  });

  const unicodeMailboxAuthentication = multipartAlert
    .replace(
      'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
      'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=fail header.d=evil.example; spf=pass smtp.mailfrom=e\u0301@craigslist.org',
    )
    .replace('noreply@craigslist.org', 'उपयोगकर्ता@craigslist.org');
  await expect(parseCraigslistAlertMime(Buffer.from(unicodeMailboxAuthentication))).resolves.toMatchObject({
    messageKey: 'message-id:alert-42@craigslist.org',
  });

  const decomposedEmail = `e\u0301@example.com`;
  const devanagariEmail = 'उपयोगकर्ता@उदाहरण.भारत';
  const symbolEmail = '🚗@[IPv6:2001:db8::1]';
  const quotedEmail = '"john doe"@example.com';
  const contactHeadline = multipartAlert
    .replace(
      '1985 Toyota Supra P-Type - $18,500',
      `1985 Toyota Supra P-Type +44 20 7946 0958 ${devanagariEmail} ${symbolEmail} ${quotedEmail} - $18,500`,
    )
    .replace('(Atlanta, GA)', `(${decomposedEmail})`);
  const contactSafe = await parseCraigslistAlertMime(Buffer.from(contactHeadline));
  expect(JSON.stringify(contactSafe)).not.toContain('+44 20 7946 0958');
  expect(JSON.stringify(contactSafe)).not.toContain(devanagariEmail);
  expect(JSON.stringify(contactSafe)).not.toContain(symbolEmail);
  expect(JSON.stringify(contactSafe)).not.toContain(quotedEmail);
  expect(JSON.stringify(contactSafe)).not.toContain('john');
  expect(JSON.stringify(contactSafe)).not.toContain(decomposedEmail);
  expect(JSON.stringify(contactSafe)).not.toContain(decomposedEmail.normalize('NFC'));
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

  const mixedClauses = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=evil.example; dmarc=fail header.from=craigslist.org; dkim=pass header.d=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(mixedClauses))).rejects.toThrow('unauthenticated_sender');

  const duplicateIdentity = multipartAlert.replace(
    'dmarc=pass header.from=craigslist.org',
    'dmarc=pass header.from=evil.example header.from=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(duplicateIdentity))).rejects.toThrow('unauthenticated_sender');

  const suffixIdentity = multipartAlert.replace(/craigslist\.org/g, 'craigslist.org.evil.example');
  await expect(parseCraigslistAlertMime(Buffer.from(suffixIdentity))).rejects.toThrow('unauthenticated_sender');

  const commentInjection = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=fail header.from=evil.example (ignored; dmarc=pass header.from=craigslist.org); dkim=pass header.d=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(commentInjection))).rejects.toThrow('unauthenticated_sender');

  const quotedPropertyInjection = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass reason="x; header.from=craigslist.org" header.from=evil.example; dkim=pass header.d=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(quotedPropertyInjection))).rejects.toThrow('unauthenticated_sender');

  const quotedDkimInjection = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass reason="header.d=craigslist.org" header.d=evil.example',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(quotedDkimInjection))).rejects.toThrow('unauthenticated_sender');

  const adjacentQuotedProperty = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass reason="unrelated"header.from=craigslist.org; dkim=pass header.d=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(adjacentQuotedProperty))).rejects.toThrow('unauthenticated_sender');

  const bareSpfDomain = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=fail header.d=evil.example; spf=pass smtp.mailfrom=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(bareSpfDomain))).rejects.toThrow('unauthenticated_sender');

  const multipleAtSpf = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=fail header.d=evil.example; spf=pass smtp.mailfrom=attacker@evil.example@craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(multipleAtSpf))).rejects.toThrow('unauthenticated_sender');

  const unbalancedComment = multipartAlert.replace(
    'dmarc=pass header.from=craigslist.org',
    'dmarc=pass header.from=craigslist.org (unterminated',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(unbalancedComment))).rejects.toThrow('unauthenticated_sender');

  const unbalancedQuote = multipartAlert.replace(
    'dmarc=pass header.from=craigslist.org',
    'dmarc=pass reason="unterminated header.from=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(unbalancedQuote))).rejects.toThrow('unauthenticated_sender');

  const unmatchedClosingComment = multipartAlert.replace(
    'dmarc=pass header.from=craigslist.org',
    'dmarc=pass reason=ok) header.from=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(unmatchedClosingComment))).rejects.toThrow('unauthenticated_sender');

  const escapedUnmatchedClosingComment = multipartAlert.replace(
    'dmarc=pass header.from=craigslist.org',
    'dmarc=pass reason=ok\\) header.from=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(escapedUnmatchedClosingComment))).rejects.toThrow('unauthenticated_sender');

  const bareBackslash = multipartAlert.replace(
    'dmarc=pass header.from=craigslist.org',
    'dmarc=pass reason=bad\\escape header.from=craigslist.org',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(bareBackslash))).rejects.toThrow('unauthenticated_sender');

  const missingAuthentication = multipartAlert.replace(/^Authentication-Results:.*\r\n/m, '');
  await expect(parseCraigslistAlertMime(Buffer.from(missingAuthentication))).rejects.toThrow('unauthenticated_sender');

  const [missingAuthenticationHeaders, ...missingAuthenticationBody] = missingAuthentication.split('\r\n\r\n');
  for (const mixedBoundary of ['\n\n', '\r\n\n', '\n\r\n', '\r\r']) {
    const mixedLineEndingBodyInjection = [
      missingAuthenticationHeaders,
      mixedBoundary,
      'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org\r\n\r\n',
      missingAuthenticationBody.join('\r\n\r\n'),
    ].join('');
    await expect(parseCraigslistAlertMime(Buffer.from(mixedLineEndingBodyInjection))).rejects.toThrow('unauthenticated_sender');
  }

  const overlongUtf8LocalPart = 'उ'.repeat(30);
  const overlongAuthenticationMailbox = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    `Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=fail header.d=evil.example; spf=pass smtp.mailfrom=${overlongUtf8LocalPart}@craigslist.org`,
  );
  await expect(parseCraigslistAlertMime(Buffer.from(overlongAuthenticationMailbox))).rejects.toThrow('unauthenticated_sender');

  const overlongFromMailbox = multipartAlert.replace(
    'From: craigslist alerts <noreply@craigslist.org>',
    `From: craigslist alerts <${overlongUtf8LocalPart}@craigslist.org>`,
  );
  await expect(parseCraigslistAlertMime(Buffer.from(overlongFromMailbox))).rejects.toThrow('untrusted_sender');

  const normalizationShrinkingLocalPart = 'e\u0301'.repeat(22);
  const normalizationShrinkingAuthenticationMailbox = multipartAlert.replace(
    'Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=pass header.d=craigslist.org; spf=pass smtp.mailfrom=noreply@craigslist.org',
    `Authentication-Results: mx1.messagingengine.com; dmarc=pass header.from=craigslist.org; dkim=fail header.d=evil.example; spf=pass smtp.mailfrom=${normalizationShrinkingLocalPart}@craigslist.org`,
  );
  await expect(parseCraigslistAlertMime(Buffer.from(normalizationShrinkingAuthenticationMailbox))).rejects.toThrow('unauthenticated_sender');

  const normalizationShrinkingFromMailbox = multipartAlert.replace(
    'From: craigslist alerts <noreply@craigslist.org>',
    `From: craigslist alerts <${normalizationShrinkingLocalPart}@craigslist.org>`,
  );
  await expect(parseCraigslistAlertMime(Buffer.from(normalizationShrinkingFromMailbox))).rejects.toThrow('untrusted_sender');

  const forged = multipartAlert.replace(
    'From: craigslist alerts <noreply@craigslist.org>',
    'From: craigslist alerts <noreply@example.com>',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(forged))).rejects.toThrow('untrusted_sender');

  const multipleAtSender = multipartAlert.replace(
    'From: craigslist alerts <noreply@craigslist.org>',
    'From: craigslist alerts <attacker@evil.example@craigslist.org>',
  );
  await expect(parseCraigslistAlertMime(Buffer.from(multipleAtSender))).rejects.toThrow('untrusted_sender');

  const empty = multipartAlert
    .replace('noreply@craigslist.org', 'robot@craigslist.org')
    .replace(/https:\/\/atlanta\.craigslist\.org[^\r\n]+/g, 'https://example.com/not-craigslist')
    .replace(/https:\/\/dallas\.craigslist\.org[^\r\n]+/g, 'https://example.com/not-craigslist');
  await expect(parseCraigslistAlertMime(Buffer.from(empty))).rejects.toThrow('unparseable_alert');
});
