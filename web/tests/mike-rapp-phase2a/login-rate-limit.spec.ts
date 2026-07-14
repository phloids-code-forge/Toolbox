import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { applyOpportunityMigrations } from '../../src/lib/opportunity/migrations';
import { loginRateLimitKey } from '../../src/lib/opportunity/login-rate-limit';
import { OpportunityRepository } from '../../src/lib/opportunity/repository';
import { seedMikeStarterWatches } from '../../src/lib/opportunity/seed';

const databaseUrl = process.env.POSTGRES_URL ?? '';

test('rate-limit attribution ignores caller-controlled forwarding outside a trusted platform', () => {
  const first = new Request('https://portal.example.test', {
    headers: { 'x-forwarded-for': '192.0.2.10' },
  });
  const rotated = new Request('https://portal.example.test', {
    headers: { 'x-forwarded-for': '198.51.100.20' },
  });

  expect(loginRateLimitKey(first, 'mike-rapp', {}))
    .toBe(loginRateLimitKey(rotated, 'mike-rapp', {}));
});

test('rate-limit attribution accepts only a single validated Vercel address', () => {
  const first = new Request('https://portal.example.test', {
    headers: { 'x-vercel-forwarded-for': '192.0.2.10' },
  });
  const second = new Request('https://portal.example.test', {
    headers: { 'x-vercel-forwarded-for': '198.51.100.20' },
  });
  const ambiguous = new Request('https://portal.example.test', {
    headers: { 'x-vercel-forwarded-for': '192.0.2.10, 198.51.100.20' },
  });

  expect(loginRateLimitKey(first, 'mike-rapp', { VERCEL: '1' }))
    .not.toBe(loginRateLimitKey(second, 'mike-rapp', { VERCEL: '1' }));
  expect(loginRateLimitKey(ambiguous, 'mike-rapp', { VERCEL: '1' }))
    .toBe(loginRateLimitKey(first, 'mike-rapp', {}));
});

test('concurrent login reservations atomically admit only the bounded attempt count', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const keyHash = 'a'.repeat(64);
  const now = new Date('2026-01-26T00:00:00Z');

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await repository.clearLoginFailures('mike-rapp', keyHash);
    const reservations = await Promise.all(
      Array.from({ length: 10 }, () => repository.reserveLoginAttempt('mike-rapp', keyHash, now)),
    );
    expect(reservations.filter((reservation) => reservation.allowed)).toHaveLength(5);
    expect(reservations.filter((reservation) => !reservation.allowed)).toHaveLength(5);
    await repository.releaseLoginAttempt('mike-rapp', keyHash, now);
    const afterSuccess = await Promise.all([
      repository.reserveLoginAttempt('mike-rapp', keyHash, now),
      repository.reserveLoginAttempt('mike-rapp', keyHash, now),
    ]);
    expect(afterSuccess.filter((reservation) => reservation.allowed)).toHaveLength(1);
    expect(afterSuccess.filter((reservation) => !reservation.allowed)).toHaveLength(1);
    expect(await repository.checkLoginRateLimit('mike-rapp', keyHash, now))
      .toMatchObject({ allowed: false, retryAfterSeconds: 900 });
  } finally {
    await repository.clearLoginFailures('mike-rapp', keyHash);
    await pool.end();
  }
});

test('login failures are bounded durably and can be cleared after success', async () => {
  expect(databaseUrl).toContain('127.0.0.1:55432/mike_phase2a');
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new OpportunityRepository(pool);
  const key = 'a'.repeat(64);
  const now = new Date('2026-01-11T00:00:00Z');

  try {
    await applyOpportunityMigrations(pool);
    await seedMikeStarterWatches(pool);
    await repository.clearLoginFailures('mike-rapp', key);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(repository.checkLoginRateLimit('mike-rapp', key, now)).resolves.toEqual({
        allowed: true,
        retryAfterSeconds: 0,
      });
      await repository.recordLoginFailure('mike-rapp', key, now);
    }
    await expect(repository.checkLoginRateLimit('mike-rapp', key, now)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 900,
    });
    await expect(
      repository.checkLoginRateLimit('mike-rapp', key, new Date(now.getTime() + 900_001)),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });

    await repository.recordLoginFailure('mike-rapp', key, new Date(now.getTime() + 900_002));
    await repository.clearLoginFailures('mike-rapp', key);
    await expect(
      repository.checkLoginRateLimit('mike-rapp', key, new Date(now.getTime() + 900_003)),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  } finally {
    await repository.clearLoginFailures('mike-rapp', key);
    await pool.end();
  }
});
