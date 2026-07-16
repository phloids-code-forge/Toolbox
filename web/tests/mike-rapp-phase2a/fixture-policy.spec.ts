import { expect, test } from '@playwright/test';

import { isFixtureControlVisible, isFixtureExecutionAllowed } from '../../src/lib/opportunity/fixture-policy';

test('fixture execution fails closed in deployed production environments', () => {
  expect(isFixtureExecutionAllowed('https://www.phloid.com', {
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
    OPPORTUNITY_LOCAL_FIXTURE_TEST: 'enabled',
  })).toBe(false);
  expect(isFixtureExecutionAllowed('https://railway.example.test', {
    NODE_ENV: 'production',
    VERCEL: '1',
    OPPORTUNITY_LOCAL_FIXTURE_TEST: 'enabled',
  })).toBe(false);
  expect(isFixtureExecutionAllowed('http://127.0.0.1:3111', {
    NODE_ENV: 'production',
  })).toBe(false);
});

test('fixture execution remains available only for development or explicit loopback production QA', () => {
  expect(isFixtureExecutionAllowed('https://preview.example.test', {
    NODE_ENV: 'development',
  })).toBe(true);
  expect(isFixtureExecutionAllowed('http://127.0.0.1:3111', {
    NODE_ENV: 'production',
    OPPORTUNITY_LOCAL_FIXTURE_TEST: 'enabled',
  })).toBe(true);
});

test('fixture control is never rendered by a production build', () => {
  expect(isFixtureControlVisible({ NODE_ENV: 'production', VERCEL_ENV: 'production' })).toBe(false);
  expect(isFixtureControlVisible({ NODE_ENV: 'production', OPPORTUNITY_LOCAL_FIXTURE_TEST: 'enabled' })).toBe(false);
  expect(isFixtureControlVisible({ NODE_ENV: 'development' })).toBe(true);
});
