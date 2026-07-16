import { expect, test } from '@playwright/test';

import { evaluateListingAgainstWatch } from '../../src/lib/opportunity/matching';

const watch = {
  title: 'Toyota Land Cruiser · 2008–2015',
  makes: ['Toyota'],
  model: 'Land Cruiser',
  requiredTrim: null,
  yearMin: 2008,
  yearMax: 2015,
  maxPrice: 40_000,
  maxMileage: 250_000,
  cleanTitleOnly: true,
};

test('unknown year does not receive full required make/model/year credit', () => {
  const result = evaluateListingAgainstWatch(watch, {
    title: 'Toyota Land Cruiser · clean Georgia title',
    year: null,
    make: 'Toyota',
    model: 'Land Cruiser',
    trim: null,
    priceAmount: 33_900,
    mileage: 139_200,
    titleStatus: 'clean',
    distanceMiles: 27,
  });

  expect(result.accepted).toBe(false);
  expect(result.score).toBeLessThan(70);
  expect(result.reviewReasons).toContain('Year is not confirmed');
  expect(result.matchReasons).not.toContain('Make, model, and year match the watch');
});
