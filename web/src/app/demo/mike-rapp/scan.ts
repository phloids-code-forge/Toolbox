export type WatchId = 'land-cruiser' | 'tahoe-z71' | 'supra';

export type StarterWatch = {
  id: WatchId;
  label: string;
  makes: string[];
  model: string;
  yearMin: number;
  yearMax: number;
  requiredTrim?: string;
  maxPrice: number | null;
  maxMileage: number;
};

export type SampleLead = {
  id: string;
  canonicalKey: string;
  source: 'Atlanta estate sale' | 'Georgia auction' | 'Enthusiast listing';
  title: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  price: number;
  mileage: number;
  titleStatus: 'clean' | 'salvage' | 'rebuilt' | 'unknown';
  location: string;
  distanceMiles: number;
  sourceUrl: string;
};

export type ScannedLead = SampleLead & {
  watchId: WatchId;
  watchLabel: string;
  score: number;
  matchReasons: string[];
  rejectReasons: string[];
  alertWorthy: boolean;
};

export const starterWatches: StarterWatch[] = [
  {
    id: 'land-cruiser',
    label: 'Toyota Land Cruiser · 2008–2015',
    makes: ['toyota'],
    model: 'land cruiser',
    yearMin: 2008,
    yearMax: 2015,
    maxPrice: 40_000,
    maxMileage: 250_000,
  },
  {
    id: 'tahoe-z71',
    label: 'Chevy Tahoe Z71 · 2001–2006',
    makes: ['chevrolet', 'chevy'],
    model: 'tahoe',
    yearMin: 2001,
    yearMax: 2006,
    requiredTrim: 'z71',
    maxPrice: 40_000,
    maxMileage: 100_000,
  },
  {
    id: 'supra',
    label: 'Toyota Supra · 1983–1986',
    makes: ['toyota'],
    model: 'supra',
    yearMin: 1983,
    yearMax: 1986,
    maxPrice: null,
    maxMileage: 250_000,
  },
];

const sampleLeads: SampleLead[] = [
  {
    id: 'atl-estate-tahoe-01',
    canonicalKey: 'atl-estate:tahoe-2004-z71',
    source: 'Atlanta estate sale',
    title: '2004 Chevrolet Tahoe Z71 · one-owner estate vehicle',
    year: 2004,
    make: 'Chevrolet',
    model: 'Tahoe',
    trim: 'Z71',
    price: 14_800,
    mileage: 82_400,
    titleStatus: 'clean',
    location: 'Atlanta, GA',
    distanceMiles: 8,
    sourceUrl: '#sample-source-note',
  },
  {
    id: 'atl-estate-tahoe-01-copy',
    canonicalKey: 'atl-estate:tahoe-2004-z71',
    source: 'Atlanta estate sale',
    title: '2004 Chevrolet Tahoe Z71 · one-owner estate vehicle',
    year: 2004,
    make: 'Chevrolet',
    model: 'Tahoe',
    trim: 'Z71',
    price: 14_800,
    mileage: 82_400,
    titleStatus: 'clean',
    location: 'Atlanta, GA',
    distanceMiles: 8,
    sourceUrl: '#sample-source-note',
  },
  {
    id: 'ga-auction-lc-01',
    canonicalKey: 'ga-auction:land-cruiser-2011',
    source: 'Georgia auction',
    title: '2011 Toyota Land Cruiser · clean Georgia title',
    year: 2011,
    make: 'Toyota',
    model: 'Land Cruiser',
    price: 33_900,
    mileage: 139_200,
    titleStatus: 'clean',
    location: 'Alpharetta, GA',
    distanceMiles: 27,
    sourceUrl: '#sample-source-note',
  },
  {
    id: 'enthusiast-supra-01',
    canonicalKey: 'enthusiast:supra-1985',
    source: 'Enthusiast listing',
    title: '1985 Toyota Supra P-Type · documented survivor',
    year: 1985,
    make: 'Toyota',
    model: 'Supra',
    trim: 'P-Type',
    price: 28_500,
    mileage: 122_300,
    titleStatus: 'clean',
    location: 'Savannah, GA',
    distanceMiles: 249,
    sourceUrl: '#sample-source-note',
  },
  {
    id: 'ga-auction-tahoe-rebuilt',
    canonicalKey: 'ga-auction:tahoe-rebuilt',
    source: 'Georgia auction',
    title: '2003 Chevrolet Tahoe Z71 · rebuilt title',
    year: 2003,
    make: 'Chevrolet',
    model: 'Tahoe',
    trim: 'Z71',
    price: 9_400,
    mileage: 91_000,
    titleStatus: 'rebuilt',
    location: 'Marietta, GA',
    distanceMiles: 20,
    sourceUrl: '#sample-source-note',
  },
  {
    id: 'atl-estate-lc-newer',
    canonicalKey: 'atl-estate:land-cruiser-2017',
    source: 'Atlanta estate sale',
    title: '2017 Toyota Land Cruiser',
    year: 2017,
    make: 'Toyota',
    model: 'Land Cruiser',
    price: 39_500,
    mileage: 98_000,
    titleStatus: 'clean',
    location: 'Decatur, GA',
    distanceMiles: 7,
    sourceUrl: '#sample-source-note',
  },
  {
    id: 'enthusiast-supra-parts',
    canonicalKey: 'enthusiast:supra-parts-1986',
    source: 'Enthusiast listing',
    title: '1986 Toyota Supra parts car · no title',
    year: 1986,
    make: 'Toyota',
    model: 'Supra',
    price: 2_200,
    mileage: 260_000,
    titleStatus: 'unknown',
    location: 'Charlotte, NC',
    distanceMiles: 245,
    sourceUrl: '#sample-source-note',
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function evaluateLead(lead: SampleLead): ScannedLead {
  const watch = starterWatches.find(
    (candidate) =>
      candidate.makes.includes(normalize(lead.make)) &&
      candidate.model === normalize(lead.model),
  );

  if (!watch) {
    throw new Error(`Sample lead ${lead.id} has no starter watch`);
  }

  const matchReasons: string[] = [];
  const rejectReasons: string[] = [];
  let score = 0;

  if (lead.year >= watch.yearMin && lead.year <= watch.yearMax) {
    score += 40;
    matchReasons.push(`${lead.year} is inside the ${watch.yearMin}–${watch.yearMax} watch window`);
  } else {
    rejectReasons.push(`Year ${lead.year} is outside ${watch.yearMin}–${watch.yearMax}`);
  }

  if (watch.requiredTrim) {
    if (normalize(lead.trim ?? '').includes(watch.requiredTrim)) {
      score += 20;
      matchReasons.push(`${lead.trim} trim confirmed`);
    } else {
      rejectReasons.push(`${watch.requiredTrim.toUpperCase()} trim is required`);
    }
  }

  if (watch.maxPrice === null || lead.price <= watch.maxPrice) {
    score += 15;
    matchReasons.push(watch.maxPrice === null ? 'Price is open for this watch' : 'Price is inside budget');
  } else {
    rejectReasons.push(`Price is over the $${watch.maxPrice.toLocaleString('en-US')} ceiling`);
  }

  if (lead.mileage <= watch.maxMileage) {
    score += 10;
    matchReasons.push('Mileage is inside the watch limit');
  } else {
    rejectReasons.push(`Mileage is over the ${watch.maxMileage.toLocaleString('en-US')} limit`);
  }

  if (lead.titleStatus === 'clean') {
    score += 10;
    matchReasons.push('Clean title confirmed');
  } else {
    rejectReasons.push(
      lead.title.toLowerCase().includes('parts car')
        ? 'Parts car / non-running project is excluded'
        : `${lead.titleStatus === 'unknown' ? 'Clean title is not confirmed' : `${lead.titleStatus} title`} is excluded`,
    );
  }

  score += 5;
  matchReasons.push('Sample source has complete listing details');

  return {
    ...lead,
    watchId: watch.id,
    watchLabel: watch.label,
    score,
    matchReasons,
    rejectReasons,
    alertWorthy: score >= 70 && rejectReasons.length === 0,
  };
}

export function buildAlertPreview(lead: ScannedLead) {
  return {
    label: 'Alert preview—not sent' as const,
    sent: false as const,
    deliveryState: 'Preview only — nothing sent' as const,
    title: lead.title,
    price: lead.price,
    location: lead.location,
    score: lead.score,
    topReasons: lead.matchReasons.slice(0, 3),
    detailTarget: lead.id,
  };
}

export function explainFilteredOpportunity(lead: ScannedLead) {
  const headline =
    lead.titleStatus === 'rebuilt'
      ? 'Rebuilt title conflicts with Mike’s clean-title rule'
      : lead.title.toLowerCase().includes('parts car')
        ? 'Project and parts cars are held back'
        : lead.rejectReasons[0] ?? 'A must-have rule was not met';

  return {
    decisionLabel: 'Filtered out' as const,
    headline,
    reasons: [...lead.rejectReasons],
  };
}

export function rankOpportunities(opportunities: ScannedLead[]): ScannedLead[] {
  return [...opportunities].sort((left, right) => {
    const scoreDifference = right.score - left.score;
    if (scoreDifference !== 0) return scoreDifference;

    const leftIsAtlantaPriority = left.distanceMiles <= 50;
    const rightIsAtlantaPriority = right.distanceMiles <= 50;
    if (leftIsAtlantaPriority !== rightIsAtlantaPriority) return leftIsAtlantaPriority ? -1 : 1;

    return left.id.localeCompare(right.id);
  });
}

export function runSampleScan() {
  const uniqueLeads = Array.from(
    new Map(sampleLeads.map((lead) => [lead.canonicalKey, lead])).values(),
  );
  const evaluated = uniqueLeads.map(evaluateLead);
  const matches = rankOpportunities(evaluated.filter((lead) => lead.alertWorthy));
  const filtered = rankOpportunities(evaluated.filter((lead) => !lead.alertWorthy));

  return {
    summary: {
      scanned: sampleLeads.length,
      unique: uniqueLeads.length,
      duplicatesRemoved: sampleLeads.length - uniqueLeads.length,
      strongMatches: matches.length,
      filtered: filtered.length,
    },
    matches,
    filtered,
  };
}

export const demoUpdatedAt = 'Sample snapshot · July 12, 2026';
