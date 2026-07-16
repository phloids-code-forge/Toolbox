import { createHash } from 'node:crypto';

import { simpleParser } from 'mailparser';

import type { ListingInput } from './repository';

export type ParsedCraigslistAlert = {
  messageKey: string;
  listings: ListingInput[];
};

function splitAuthenticationClauses(value: string): string[] | null {
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
  if (depth !== 0 || quoted || escaped) return null;
  clauses.push(current);
  return clauses;
}

function stripAuthenticationComments(value: string): string | null {
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
      if (depth === 0 && output.length > 0 && !/\s$/.test(output)) output += ' ';
      depth += 1;
      continue;
    }
    if (!quoted && character === ')' && depth > 0) {
      depth -= 1;
      continue;
    }
    if (depth === 0) output += character;
  }
  if (depth !== 0 || quoted || escaped) return null;
  return output;
}

type AuthenticationProperty = {
  key: string;
  value: string;
};

function parseAuthenticationClause(clause: string): AuthenticationProperty[] | null {
  const stripped = stripAuthenticationComments(clause);
  if (stripped === null) return null;
  const value = stripped;
  const properties: AuthenticationProperty[] = [];
  let index = 0;

  while (index < value.length) {
    while (/\s/.test(value[index] ?? '')) index += 1;
    if (index >= value.length) break;

    const keyStart = index;
    while (/[a-z0-9_.\/-]/i.test(value[index] ?? '')) index += 1;
    if (keyStart === index) return null;
    const key = value.slice(keyStart, index).toLowerCase();

    while (/\s/.test(value[index] ?? '')) index += 1;
    if (value[index] !== '=') return null;
    index += 1;
    while (/\s/.test(value[index] ?? '')) index += 1;
    if (index >= value.length) return null;

    let propertyValue = '';
    if (value[index] === '"') {
      index += 1;
      let closed = false;
      while (index < value.length) {
        const character = value[index];
        if (character === '\\') {
          index += 1;
          if (index >= value.length) return null;
          propertyValue += value[index];
          index += 1;
          continue;
        }
        if (character === '"') {
          index += 1;
          closed = true;
          break;
        }
        propertyValue += character;
        index += 1;
      }
      if (!closed) return null;
      if (index < value.length && !/\s/.test(value[index])) return null;
    } else {
      const valueStart = index;
      while (index < value.length && !/\s/.test(value[index])) index += 1;
      propertyValue = value.slice(valueStart, index);
    }

    if (!propertyValue) return null;
    properties.push({ key, value: propertyValue.toLowerCase() });
  }

  return properties.length > 0 ? properties : null;
}

function validDomain(value: string): boolean {
  if (value.length === 0 || value.length > 253 || value.includes('..')) return false;
  const labels = value.split('.');
  return labels.length >= 2 && labels.every((label) => (
    label.length >= 1
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  ));
}

function mailboxDomain(value: string): string | null {
  if (value.length > 254 || /[\s\x00-\x1f\x7f]/.test(value)) return null;
  const firstSeparator = value.indexOf('@');
  if (firstSeparator <= 0 || firstSeparator !== value.lastIndexOf('@')) return null;
  const localPart = value.slice(0, firstSeparator);
  const domain = value.slice(firstSeparator + 1).toLowerCase();
  if (
    localPart.length > 64
    || localPart.startsWith('.')
    || localPart.endsWith('.')
    || localPart.includes('..')
    || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
    || !validDomain(domain)
  ) return null;
  return domain;
}

function isCraigslistDomain(domain: string | null): boolean {
  return domain !== null
    && validDomain(domain)
    && (domain === 'craigslist.org' || domain.endsWith('.craigslist.org'));
}

function passingAlignedClause(clause: string, method: 'dmarc' | 'dkim' | 'spf'): boolean {
  const properties = parseAuthenticationClause(clause);
  if (!properties || properties[0].key !== method || properties[0].value !== 'pass') return false;
  const propertyName = method === 'dmarc'
    ? 'header.from'
    : method === 'dkim'
      ? 'header.d'
      : 'smtp.mailfrom';
  const identities = properties.filter((property) => property.key === propertyName);
  if (identities.length !== 1) return false;
  return isCraigslistDomain(method === 'spf' ? mailboxDomain(identities[0].value) : identities[0].value);
}

function authenticatedByFastmail(rawMime: Buffer): boolean {
  const headerBoundary = rawMime.indexOf(Buffer.from('\r\n\r\n'));
  const fallbackBoundary = rawMime.indexOf(Buffer.from('\n\n'));
  const end = headerBoundary >= 0 ? headerBoundary : fallbackBoundary >= 0 ? fallbackBoundary : Math.min(rawMime.length, 65_536);
  const unfoldedHeaders = rawMime.subarray(0, Math.min(end, 65_536)).toString('utf8')
    .replace(/\r?\n[\t ]+/g, ' ');
  const firstAuthenticationResult = unfoldedHeaders.match(/^Authentication-Results:\s*(.+)$/im)?.[1];
  if (!firstAuthenticationResult) return false;

  const splitClauses = splitAuthenticationClauses(firstAuthenticationResult);
  if (!splitClauses) return false;
  const clauses = splitClauses;
  const authenticationServer = (clauses.shift()?.trim() ?? '').toLowerCase();
  if (!validDomain(authenticationServer)) return false;
  if (!(authenticationServer === 'messagingengine.com' || authenticationServer.endsWith('.messagingengine.com'))) return false;

  const alignedDmarc = clauses.some((clause) => passingAlignedClause(clause, 'dmarc'));
  const alignedDkimOrSpf = clauses.some((clause) => (
    passingAlignedClause(clause, 'dkim') || passingAlignedClause(clause, 'spf')
  ));
  return alignedDmarc && alignedDkimOrSpf;
}

function trustedCraigslistAddress(address: string | undefined): boolean {
  if (!address) return false;
  return isCraigslistDomain(mailboxDomain(address.trim().toLowerCase()));
}

function sanitizedText(value: string): string {
  return value
    .replace(/(?:"[^"\r\n]{1,64}"|[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+)@[A-Z0-9](?:[A-Z0-9.-]{0,251}[A-Z0-9])?/gi, '[contact redacted]')
    .replace(/(?<!\w)\+(?:\d[\d().\s-]{6,}\d)(?!\w)/g, '[contact redacted]')
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
