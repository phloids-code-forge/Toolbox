import { createHash } from 'node:crypto';

import { simpleParser } from 'mailparser';

import type { ListingInput } from './repository';

export type ParsedCraigslistAlert = {
  messageKey: string;
  listings: ListingInput[];
};

function trustedCraigslistAddress(address: string | undefined): boolean {
  if (!address) return false;
  const domain = address.trim().toLowerCase().split('@').at(-1) ?? '';
  return domain === 'craigslist.org' || domain.endsWith('.craigslist.org');
}

function sanitizedText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact redacted]')
    .replace(/(?<!\d)(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)/g, '[contact redacted]')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalCraigslistUrl(candidate: string): { url: string; id: string } | null {
  try {
    const url = new URL(candidate.replace(/[)>.,;]+$/, ''));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !(host === 'craigslist.org' || host.endsWith('.craigslist.org'))) {
      return null;
    }
    const match = url.pathname.match(/\/(\d{8,20})\.html$/);
    if (!match) return null;
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return { url: url.toString(), id: match[1] };
  } catch {
    return null;
  }
}

function numberFrom(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function vehicleFields(text: string): Pick<ListingInput, 'year' | 'make' | 'model' | 'trim'> {
  const lower = text.toLowerCase();
  const year = numberFrom(text.match(/\b(19[8-9]\d|20[0-2]\d)\b/)?.[1]);
  const make = lower.includes('toyota')
    ? 'Toyota'
    : lower.includes('chevrolet') || lower.includes('chevy')
      ? 'Chevrolet'
      : null;
  const model = lower.includes('land cruiser')
    ? 'Land Cruiser'
    : lower.includes('tahoe')
      ? 'Tahoe'
      : lower.includes('supra')
        ? 'Supra'
        : null;
  const trim = text.match(/\b(Z71|P-Type|LT)\b/i)?.[1] ?? null;
  return { year, make, model, trim };
}

function listingFromLines(lines: string[], urlIndex: number, sourceUrl: string, sourceItemId: string): ListingInput {
  let segmentStart = Math.max(0, urlIndex - 6);
  for (let index = urlIndex - 1; index >= segmentStart; index -= 1) {
    if (/https?:\/\//i.test(lines[index])) {
      segmentStart = index + 1;
      break;
    }
  }
  let segmentEnd = Math.min(lines.length, urlIndex + 4);
  for (let index = urlIndex + 1; index < segmentEnd; index += 1) {
    if (/\$\s*[0-9]/.test(lines[index]) || /https?:\/\//i.test(lines[index])) {
      segmentEnd = index;
      break;
    }
  }
  const nearby = lines.slice(segmentStart, segmentEnd);
  const headline = [...nearby].reverse().find((line) => /\$\s*[0-9]/.test(line))
    ?? `Craigslist listing ${sourceItemId}`;
  const context = nearby.join(' ');
  const priceAmount = numberFrom(headline.match(/\$\s*([0-9][0-9,]*)/)?.[1]);
  const mileage = numberFrom(context.match(/([0-9][0-9,]*)\s*(?:miles|mi\b)/i)?.[1]);
  const titleStatus: ListingInput['titleStatus'] = /salvage/i.test(context)
    ? 'salvage'
    : /rebuilt/i.test(context)
      ? 'rebuilt'
      : /clean\s+title/i.test(context)
        ? 'clean'
        : 'unknown';
  const locationText = sanitizedText(headline.match(/\(([^)]+)\)\s*$/)?.[1] ?? '') || null;
  const title = sanitizedText(
    headline
      .replace(/^\s*[*•]\s*/, '')
      .replace(/\s*[-–—]\s*\$\s*[0-9][0-9,]*(?:\.\d{2})?/, '')
      .replace(/\s*\([^)]+\)\s*$/, ''),
  ) || `Craigslist listing ${sourceItemId}`;

  return {
    canonicalKey: `craigslist:${sourceItemId}`,
    sourceType: 'craigslist_email',
    sourceItemId,
    sourceUrl,
    title,
    ...vehicleFields(context),
    priceAmount,
    mileage,
    titleStatus,
    locationText,
    distanceMiles: null,
    duplicateIdentity: { type: 'craigslist-listing-id', value: sourceItemId },
  };
}

export async function parseCraigslistAlertMime(rawMime: Buffer): Promise<ParsedCraigslistAlert> {
  const message = await simpleParser(rawMime, { skipImageLinks: true });
  const senders = message.from?.value.map((entry) => entry.address) ?? [];
  if (senders.length === 0 || !senders.every(trustedCraigslistAddress)) {
    throw new Error('untrusted_sender');
  }

  const text = message.text ?? '';
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const seen = new Set<string>();
  const listings: ListingInput[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    for (const candidate of lines[index].match(/https?:\/\/[^\s<>"']+/gi) ?? []) {
      const canonical = canonicalCraigslistUrl(candidate);
      if (!canonical || seen.has(canonical.id)) continue;
      seen.add(canonical.id);
      listings.push(listingFromLines(lines, index, canonical.url, canonical.id));
    }
  }

  const normalizedMessageId = message.messageId?.replace(/[<>]/g, '').trim().toLowerCase();
  const messageKey = normalizedMessageId
    ? `message-id:${normalizedMessageId}`
    : `mime-sha256:${createHash('sha256').update(rawMime).digest('hex')}`;
  return { messageKey, listings };
}
