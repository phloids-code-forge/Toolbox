const REDACTED_CONTACT = '[contact redacted]';

function consumeCfws(value: string, start: number): number | null {
  let index = start;
  while (index < value.length) {
    if (/\s/.test(value[index])) {
      index += 1;
      continue;
    }
    if (value[index] !== '(') return index;

    let depth = 0;
    let escaped = false;
    while (index < value.length) {
      const character = value[index];
      index += 1;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === '(') depth += 1;
      if (character === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0 || escaped) return null;
  }
  return index;
}

function hasStrongCfws(value: string, start: number, end: number): boolean {
  const segment = value.slice(start, end);
  return segment.includes('(') || segment.includes('\r') || segment.includes('\n');
}

function consumeQuotedWord(value: string, start: number): number | null {
  if (value[start] !== '"') return null;
  let index = start + 1;
  let escaped = false;
  while (index < value.length) {
    const character = value[index];
    index += 1;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '"') return index;
    if (character === '\r') {
      if (value[index] !== '\n' || !/[\t ]/.test(value[index + 1] ?? '')) return null;
      index += 2;
      continue;
    }
    if (character === '\n') {
      if (!/[\t ]/.test(value[index] ?? '')) return null;
      index += 1;
    }
  }
  return null;
}

function consumeDomainLiteral(value: string, start: number): number | null {
  if (value[start] !== '[') return null;
  let index = start + 1;
  let escaped = false;
  while (index < value.length) {
    const character = value[index];
    index += 1;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === ']') return index;
    if (character === '\r' || character === '\n') return null;
  }
  return null;
}

function mailboxEnd(value: string, start: number, hasLeadingCfws = false): number | null {
  let index = start;
  let consumedWord = false;
  let hasMailboxSyntax = hasLeadingCfws;

  while (index < value.length) {
    if (value[index] === '"') {
      hasMailboxSyntax = true;
      const quotedEnd = consumeQuotedWord(value, index);
      if (quotedEnd === null) return null;
      index = quotedEnd;
    } else {
      const atomStart = index;
      while (index < value.length && !/[\s@()."]/.test(value[index])) index += 1;
      if (index === atomStart) return null;
    }
    consumedWord = true;

    const wordEnd = index;
    const afterWordCfws = consumeCfws(value, wordEnd);
    if (afterWordCfws === null) return null;
    if (hasStrongCfws(value, wordEnd, afterWordCfws)) hasMailboxSyntax = true;
    index = afterWordCfws;
    if (value[index] !== '.') break;

    const dotEnd = index + 1;
    const afterDotCfws = consumeCfws(value, dotEnd);
    if (afterDotCfws === null) return null;
    if (hasStrongCfws(value, dotEnd, afterDotCfws)) hasMailboxSyntax = true;
    index = afterDotCfws;
  }

  if (!consumedWord) return null;

  const beforeAt = index;
  const atIndex = consumeCfws(value, beforeAt);
  if (atIndex === null || value[atIndex] !== '@') return null;
  if (hasStrongCfws(value, beforeAt, atIndex)) hasMailboxSyntax = true;
  const afterAt = atIndex + 1;
  const domainStart = consumeCfws(value, afterAt);
  if (domainStart === null || domainStart >= value.length || /\s/.test(value[domainStart])) return null;
  if (hasStrongCfws(value, afterAt, domainStart)) hasMailboxSyntax = true;

  if (value[domainStart] === '[') {
    const literalEnd = consumeDomainLiteral(value, domainStart);
    return literalEnd === null ? null : consumeCfws(value, literalEnd);
  }

  let domainEnd = domainStart;
  const domainLabels: string[] = [];
  while (domainEnd < value.length) {
    const atomStart = domainEnd;
    while (domainEnd < value.length && /[\p{L}\p{N}\p{M}-]/u.test(value[domainEnd])) {
      domainEnd += 1;
    }
    while (domainEnd > atomStart && value[domainEnd - 1] === '-') domainEnd -= 1;
    if (domainEnd === atomStart) return null;
    const label = value.slice(atomStart, domainEnd);
    if (!/^[\p{L}\p{N}\p{M}](?:[\p{L}\p{N}\p{M}-]*[\p{L}\p{N}\p{M}])?$/u.test(label)) return null;
    domainLabels.push(label);

    const domainWordEnd = domainEnd;
    const afterDomainCfws = consumeCfws(value, domainWordEnd);
    if (afterDomainCfws === null) return null;
    domainEnd = afterDomainCfws;
    if (value[domainEnd] !== '.') {
      if (hasStrongCfws(value, domainWordEnd, afterDomainCfws)) hasMailboxSyntax = true;
      break;
    }
    if (hasStrongCfws(value, domainWordEnd, afterDomainCfws)) hasMailboxSyntax = true;

    const domainDotEnd = domainEnd + 1;
    const afterDomainDotCfws = consumeCfws(value, domainDotEnd);
    if (afterDomainDotCfws === null) return null;
    if (hasStrongCfws(value, domainDotEnd, afterDomainDotCfws)) hasMailboxSyntax = true;
    domainEnd = afterDomainDotCfws;
  }
  if (value[domainEnd] === '@') return null;
  return domainLabels.length >= 2 || hasMailboxSyntax ? domainEnd : null;
}

export function redactContactMailboxes(value: string): string {
  const normalized = value.normalize('NFC');
  let output = '';
  let copiedThrough = 0;
  let index = 0;

  while (index < normalized.length) {
    const mailboxStart = consumeCfws(normalized, index);
    const end = mailboxStart === null
      ? null
      : mailboxEnd(
        normalized,
        mailboxStart,
        normalized.slice(index, mailboxStart).includes('('),
      );
    if (end === null) {
      index += 1;
      continue;
    }
    output += normalized.slice(copiedThrough, index);
    output += REDACTED_CONTACT;
    copiedThrough = end;
    index = end;
  }

  output += normalized.slice(copiedThrough);
  return output;
}
