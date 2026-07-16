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

function mailboxEnd(value: string, start: number): number | null {
  let index = start;
  let consumedWord = false;

  while (index < value.length) {
    if (value[index] === '"') {
      const quotedEnd = consumeQuotedWord(value, index);
      if (quotedEnd === null) return null;
      index = quotedEnd;
    } else {
      const atomStart = index;
      while (index < value.length && !/[\s@()."]/.test(value[index])) index += 1;
      if (index === atomStart) return null;
    }
    consumedWord = true;

    const afterWordCfws = consumeCfws(value, index);
    if (afterWordCfws === null) return null;
    index = afterWordCfws;
    if (value[index] !== '.') break;

    const afterDotCfws = consumeCfws(value, index + 1);
    if (afterDotCfws === null) return null;
    index = afterDotCfws;
  }

  if (!consumedWord) return null;

  const atIndex = consumeCfws(value, index);
  if (atIndex === null || value[atIndex] !== '@') return null;
  const domainStart = consumeCfws(value, atIndex + 1);
  if (domainStart === null || domainStart >= value.length || /\s/.test(value[domainStart])) return null;

  if (value[domainStart] === '[') return consumeDomainLiteral(value, domainStart);

  let domainEnd = domainStart;
  const domainLabels: string[] = [];
  while (domainEnd < value.length) {
    const atomStart = domainEnd;
    while (domainEnd < value.length && !/[\s@().]/.test(value[domainEnd])) domainEnd += 1;
    if (domainEnd === atomStart) return null;
    const label = value.slice(atomStart, domainEnd);
    if (!/^[\p{L}\p{N}\p{M}](?:[\p{L}\p{N}\p{M}-]*[\p{L}\p{N}\p{M}])?$/u.test(label)) return null;
    domainLabels.push(label);

    const afterDomainCfws = consumeCfws(value, domainEnd);
    if (afterDomainCfws === null) return null;
    domainEnd = afterDomainCfws;
    if (value[domainEnd] !== '.') break;

    const afterDomainDotCfws = consumeCfws(value, domainEnd + 1);
    if (afterDomainDotCfws === null) return null;
    domainEnd = afterDomainDotCfws;
  }
  return domainLabels.length >= 2 ? domainEnd : null;
}

export function redactContactMailboxes(value: string): string {
  const normalized = value.normalize('NFC');
  let output = '';
  let copiedThrough = 0;
  let index = 0;

  while (index < normalized.length) {
    const end = mailboxEnd(normalized, index);
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
  return output.replace(/[^\s@]+@[^\s@]+/gu, REDACTED_CONTACT);
}
