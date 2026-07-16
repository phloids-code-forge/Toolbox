import { createHash } from 'node:crypto';

import { simpleParser } from 'mailparser';

import type { ListingInput } from './repository';

export type ParsedCraigslistAlert = {
  messageKey: string;
  listings: ListingInput[];
};

function splitAuthenticationClauses(value: string): string[] {
  const clauses: string[] = [];
  let current = '';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      current += character;
      escaped = true;
      continue;
    }
    if (character === '"' && depth === 0) quoted = !quoted;
    if (!quoted && character === '(') depth += 1;
    if (!quoted && character === ')' && depth > 0) depth -= 1;
    if (character === ';' && depth === 0 && !quoted) {
      clauses.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  clauses.push(current);
  return clauses;
}

function stripAuthenticationComments(value: string): string {
  let output = '';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      if (depth === 0) output += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      if (depth === 0) output += character;
      escaped = true;
      continue;
    }
    if (character === '"' && depth === 0) {
      quoted = !quoted;
      output += character;
      continue;
    }
    if (!quoted && character === '(') {
      depth += 1;
      continue;
    }
    if (!quoted && character === ')' && depth > 0) {
      depth -= 1;
      continue;
    }
    if (depth === 0) output += character;
  }
  return output;
}

function authenticationIdentity(clause: string, property: string): string | null {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...clause.matchAll(new RegExp(`(?:^|\\s)${escapedProperty}\\s*=\\s*(?:"([^"]*)"|([^\\s;]+))`, 'gi'))];
  if (matches.length !== 1) return null;
  return (matches[0][1] ?? matches[0][2] ?? '').trim().toLowerCase();
}

function isCraigslistIdentity(value: string | null, mailbox = false): boolean {
  if (!value) return false;
  const domain = mailbox ? value.split('@').at(-1) ?? '' : value;
  return domain === 'craigslist.org' || domain.endsWith('.craigslist.org');
}

function passingAlignedClause(clause: string, method: 'dmarc' | 'dkim' | 'spf'): boolean {
  const cleaned = stripAuthenticationComments(clause).trim();
  if (!new RegExp(`^${method}\\s*=\\s*pass(?:\\s|$)`, 'i').test(cleaned)) return false;
  if (method === 'dmarc') return isCraigslistIdentity(authenticationIdentity(cleaned, 'header.from'));
  if (method === 'dkim') return isCraigslistIdentity(authenticationIdentity(cleaned, 'header.d'));
  return isCraigslistIdentity(authenticationIdentity(cleaned, 'smtp.mailfrom'), true);
}

function authenticatedByFastmail(rawMime: Buffer): boolean {
  const headerBoundary = rawMime.indexOf(Buffer.from('\r\n\r\n'));
  const fallbackBoundary = rawMime.indexOf(Buffer.from('\n\n'));
  const end = headerBoundary >= 0 ? headerBoundary : fallbackBoundary >= 0 ? fallbackBoundary : Math.min(rawMime.length, 65_536);
  const unfoldedHeaders = rawMime.subarray(0, Math.min(end, 65_536)).toString('utf8')
    .replace(/\r?\n[\t ]+/g, ' ');
  const firstAuthenticationResult = unfoldedHeaders.match(/^Authentication-Results:\s*(.+)$/im)?.[1];
  if (!firstAuthenticationResult) return false;

  const clauses = splitAuthenticationClauses(firstAuthenticationResult);
  const authenticationServer = clauses.shift()?.trim() ?? '';
  if (!(authenticationServer === 'messagingengine.com' || authenticationServer.endsWith('.messagingengine.com'))) return false;

  const alignedDmarc = clauses.some((clause) => passingAlignedClause(clause, 'dmarc'));
  const alignedDkimOrSpf = clauses.some((clause) => (
    passingAlignedClause(clause, 'dkim') || passingAlignedClause(clause, 'spf')
  ));
  return alignedDmarc && alignedDkimOrSpf;
}

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
    return { url: `https://${host}/listing/${match[1]}`, id: match[1] };
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
  if (!authenticatedByFastmail(rawMime)) throw new Error('unauthenticated_sender');
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

  if (listings.length === 0) throw new Error('unparseable_alert');

  const normalizedMessageId = message.messageId?.replace(/[<>]/g, '').trim().toLowerCase();
  const messageKey = normalizedMessageId
    ? `message-id:${normalizedMessageId}`
    : `mime-sha256:${createHash('sha256').update(rawMime).digest('hex')}`;
  return { messageKey, listings };
}
