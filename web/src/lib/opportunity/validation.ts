export const WATCH_STATUSES = ['draft', 'active', 'paused', 'archived'] as const;
export type WatchStatus = (typeof WATCH_STATUSES)[number];

export type ValidatedWatchInput = {
  title: string;
  query: string;
  status: WatchStatus;
  yearMin: number;
  yearMax: number;
  maxPrice: number | null;
  maxMileage: number;
  nationwide: boolean;
  cleanTitleOnly: boolean;
};

type ValidationFailure = {
  ok: false;
  fieldErrors: Record<string, string>;
};

type ValidationSuccess = {
  ok: true;
  value: ValidatedWatchInput;
};

export type WatchValidationResult = ValidationSuccess | ValidationFailure;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

export function validateWatchInput(input: unknown): WatchValidationResult {
  const raw = asRecord(input);
  const title = stringValue(raw.title);
  const query = stringValue(raw.query);
  const status = stringValue(raw.status);
  const yearMin = numberValue(raw.yearMin);
  const yearMax = numberValue(raw.yearMax);
  const rawMaxPrice = raw.maxPrice;
  const maxPrice = rawMaxPrice === null || rawMaxPrice === '' ? null : numberValue(rawMaxPrice);
  const maxMileage = numberValue(raw.maxMileage);
  const fieldErrors: Record<string, string> = {};
  const largestReasonableYear = new Date().getUTCFullYear() + 2;

  if (title.length < 3 || title.length > 120) {
    fieldErrors.title = 'Use a title between 3 and 120 characters.';
  }
  if (query.length < 2 || query.length > 200) {
    fieldErrors.query = 'Use search terms between 2 and 200 characters.';
  }
  if (!WATCH_STATUSES.includes(status as WatchStatus)) {
    fieldErrors.status = 'Choose draft, active, paused, or archived.';
  }
  if (!Number.isInteger(yearMin) || yearMin < 1900 || yearMin > largestReasonableYear) {
    fieldErrors.yearMin = 'Enter a valid starting year.';
  }
  if (!Number.isInteger(yearMax) || yearMax < 1900 || yearMax > largestReasonableYear) {
    fieldErrors.yearMax = 'Enter a valid ending year.';
  }
  if (!fieldErrors.yearMin && !fieldErrors.yearMax && yearMin > yearMax) {
    fieldErrors.yearMin = 'Starting year must not be after ending year.';
  }
  if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0 || maxPrice > 10_000_000)) {
    fieldErrors.maxPrice = 'Enter a price from 0 to 10,000,000, or leave it blank.';
  }
  if (!Number.isInteger(maxMileage) || maxMileage < 0 || maxMileage > 2_000_000) {
    fieldErrors.maxMileage = 'Enter mileage from 0 to 2,000,000.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      title,
      query,
      status: status as WatchStatus,
      yearMin,
      yearMax,
      maxPrice,
      maxMileage,
      nationwide: booleanValue(raw.nationwide),
      cleanTitleOnly: booleanValue(raw.cleanTitleOnly),
    },
  };
}
