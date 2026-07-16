import { expect, test } from '@playwright/test';

import { validateWatchInput } from '../../src/lib/opportunity/validation';

const validWatch = {
  title: 'Toyota Land Cruiser 2008–2015',
  query: 'Toyota Land Cruiser',
  status: 'active',
  yearMin: 2008,
  yearMax: 2015,
  maxPrice: 40_000,
  maxMileage: 250_000,
  nationwide: true,
  cleanTitleOnly: true,
};

test('invalid watch input is rejected with safe field errors', () => {
  const result = validateWatchInput({
    ...validWatch,
    title: 'x'.repeat(121),
    status: 'admin',
    yearMin: 2030,
    yearMax: 2000,
    maxPrice: -1,
    maxMileage: 2_000_001,
  });

  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected validation to fail.');
  expect(result.fieldErrors).toMatchObject({
    title: expect.any(String),
    status: expect.any(String),
    yearMin: expect.any(String),
    maxPrice: expect.any(String),
    maxMileage: expect.any(String),
  });
  expect(JSON.stringify(result)).not.toContain('stack');
});
