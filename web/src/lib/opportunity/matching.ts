export type MatchWatch = {
  title: string;
  makes: string[];
  model: string;
  requiredTrim: string | null;
  yearMin: number;
  yearMax: number;
  maxPrice: number | null;
  maxMileage: number;
  cleanTitleOnly: boolean;
};

export type MatchListing = {
  title: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  priceAmount: number | null;
  mileage: number | null;
  titleStatus: 'clean' | 'salvage' | 'rebuilt' | 'unknown';
  distanceMiles: number | null;
};

export type MatchEvaluation = {
  score: number;
  accepted: boolean;
  matchReasons: string[];
  rejectReasons: string[];
  reviewReasons: string[];
};

function normalize(value: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function evaluateListingAgainstWatch(
  watch: MatchWatch,
  listing: MatchListing,
): MatchEvaluation {
  const matchReasons: string[] = [];
  const rejectReasons: string[] = [];
  const reviewReasons: string[] = [];
  let score = 0;

  const makeMatches = watch.makes.map(normalize).includes(normalize(listing.make));
  const modelMatches = normalize(listing.model) === normalize(watch.model);
  if (!makeMatches || !modelMatches) {
    rejectReasons.push('Make or model does not match the watch');
  } else if (listing.year === null) {
    score += 20;
    matchReasons.push('Make and model match the watch');
    reviewReasons.push('Year is not confirmed');
  } else if (listing.year < watch.yearMin || listing.year > watch.yearMax) {
    rejectReasons.push(`Year is outside ${watch.yearMin}–${watch.yearMax}`);
  } else {
    score += 40;
    matchReasons.push('Make, model, and year match the watch');
  }

  if (watch.requiredTrim) {
    if (normalize(listing.trim).includes(normalize(watch.requiredTrim))) {
      score += 20;
      matchReasons.push(`${watch.requiredTrim.toUpperCase()} trim is confirmed`);
    } else {
      rejectReasons.push(`${watch.requiredTrim.toUpperCase()} trim is required`);
    }
  }

  if (watch.maxPrice === null) {
    score += 15;
    matchReasons.push('This watch has an open price range');
  } else if (listing.priceAmount === null) {
    reviewReasons.push('Price is not confirmed');
  } else if (listing.priceAmount > watch.maxPrice) {
    rejectReasons.push('Price is over the watch limit');
  } else {
    score += 15;
    matchReasons.push('Price is inside the watch limit');
  }

  if (listing.mileage === null) {
    score += 5;
    reviewReasons.push('Mileage is not confirmed');
  } else if (listing.mileage > watch.maxMileage) {
    rejectReasons.push('Mileage is over the watch limit');
  } else {
    score += 10;
    matchReasons.push('Mileage is inside the watch limit');
  }

  if (listing.titleStatus === 'clean') {
    score += 10;
    matchReasons.push('Clean title is confirmed');
  } else if (watch.cleanTitleOnly && listing.titleStatus === 'unknown') {
    reviewReasons.push('Clean title is not confirmed');
  } else if (watch.cleanTitleOnly) {
    rejectReasons.push(`${listing.titleStatus} title conflicts with the clean-title rule`);
  }

  score += 5;
  matchReasons.push('Fixture record has a stable source identity');

  return {
    score,
    accepted: score >= 70 && rejectReasons.length === 0,
    matchReasons,
    rejectReasons,
    reviewReasons,
  };
}

export function rankMatches<T extends { score: number; distanceMiles: number | null; id: string }>(
  matches: T[],
): T[] {
  return [...matches].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    const leftAtlantaPriority = left.distanceMiles !== null && left.distanceMiles <= 50;
    const rightAtlantaPriority = right.distanceMiles !== null && right.distanceMiles <= 50;
    if (leftAtlantaPriority !== rightAtlantaPriority) return leftAtlantaPriority ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
}
