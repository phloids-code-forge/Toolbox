import { expect, test } from '@playwright/test';

import {
  authorizeClientSession,
  createPasswordHash,
  createSignedSession,
  verifyPasswordHash,
  verifySignedSession,
} from '../../src/lib/opportunity/auth';

const secret = 'synthetic-test-secret-with-enough-length';

test('tampered session is rejected', () => {
  const token = createSignedSession({ clientSlug: 'mike-rapp', secret, now: 1_000, ttlSeconds: 60 });
  const [payload, signature] = token.split('.');
  const tamperedSignature = `${signature.startsWith('A') ? 'B' : 'A'}${signature.slice(1)}`;

  expect(verifySignedSession(`${payload}.${tamperedSignature}`, { secret, now: 1_010 })).toBeNull();
});

test('expired session is rejected', () => {
  const token = createSignedSession({ clientSlug: 'mike-rapp', secret, now: 1_000, ttlSeconds: 60 });

  expect(verifySignedSession(token, { secret, now: 1_060 })).toBeNull();
});

test('client slug must match the signed session owner', () => {
  const token = createSignedSession({ clientSlug: 'mike-rapp', secret, now: 1_000, ttlSeconds: 60 });

  expect(authorizeClientSession(token, 'another-client', { secret, now: 1_010 })).toBeNull();
  expect(authorizeClientSession(token, 'mike-rapp', { secret, now: 1_010 })?.clientSlug).toBe('mike-rapp');
});

test('salted password hash verifies only the submitted password', () => {
  const encoded = createPasswordHash('synthetic-preview-password', {
    iterations: 120_000,
    salt: Buffer.from('0123456789abcdef', 'utf8'),
  });

  expect(encoded).toMatch(/^pbkdf2-sha256\$120000\$/);
  expect(verifyPasswordHash('synthetic-preview-password', encoded)).toBe(true);
  expect(verifyPasswordHash('wrong-password', encoded)).toBe(false);
  expect(verifyPasswordHash('synthetic-preview-password', 'malformed')).toBe(false);
});
