import { expect, test } from '@playwright/test';

import {
  buildAlertPreview,
  explainFilteredOpportunity,
  rankOpportunities,
  runSampleScan,
} from '../../src/app/demo/mike-rapp/scan';

test('sample scan returns a deterministic useful result for every starter watch', () => {
  const firstRun = runSampleScan();
  const secondRun = runSampleScan();

  expect(secondRun).toEqual(firstRun);
  expect(firstRun.summary).toEqual({
    scanned: 7,
    unique: 6,
    duplicatesRemoved: 1,
    strongMatches: 3,
    filtered: 3,
  });
  expect(firstRun.matches.map((lead) => lead.watchId)).toEqual([
    'tahoe-z71',
    'land-cruiser',
    'supra',
  ]);
});

test('Atlanta-area opportunities win a tie while nationwide leads remain included', () => {
  const { matches } = runSampleScan();
  const local = { ...matches[1], id: 'local-tie', score: 88, isAtlantaPriority: true };
  const nationwide = { ...matches[2], id: 'nationwide-tie', score: 88, isAtlantaPriority: false };

  const ranked = rankOpportunities([nationwide, local]);

  expect(ranked.map((lead) => lead.id)).toEqual(['local-tie', 'nationwide-tie']);
  expect(ranked).toHaveLength(2);
});

test('a high-signal rejected lead explains the hard rule that filtered it', () => {
  const rebuiltTitleLead = runSampleScan().filtered.find((lead) => lead.titleStatus === 'rebuilt');

  expect(rebuiltTitleLead).toBeDefined();
  expect(rebuiltTitleLead?.score).toBeGreaterThanOrEqual(70);
  expect(explainFilteredOpportunity(rebuiltTitleLead!)).toEqual({
    decisionLabel: 'Filtered out',
    headline: 'Rebuilt title conflicts with Mike’s clean-title rule',
    reasons: ['rebuilt title is excluded'],
  });
});

test('alert preview is truthful and contains no delivery or recipient claim', () => {
  const bestOpportunity = runSampleScan().matches[0];
  const preview = buildAlertPreview(bestOpportunity);

  expect(preview.label).toBe('Alert preview—not sent');
  expect(preview.sent).toBe(false);
  expect(preview.deliveryState).toBe('Preview only — nothing sent');
  expect(preview.title).toBe(bestOpportunity.title);
  expect(preview.price).toBe(bestOpportunity.price);
  expect(preview.location).toBe(bestOpportunity.location);
  expect(preview.score).toBe(bestOpportunity.score);
  expect(preview.topReasons).toEqual(bestOpportunity.matchReasons.slice(0, 3));
  expect(Object.keys(preview)).not.toContain('recipient');
});
