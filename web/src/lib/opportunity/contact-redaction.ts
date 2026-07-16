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

function mailboxEnd(value: string, start: number): number | null {
  let index = start;
  if (value[start] === '"') {
    index += 1;
    let escaped = false;
    let closed = false;
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
      if (character === '"') {
        closed = true;
        break;
      }
      if (character === '\r' || character === '\n') return null;
    }
    if (!closed || escaped) return null;
  } else {
    let consumedAtom = false;
    while (index < value.length) {
      const segmentStart = index;
      while (index < value.length && !/[\s@().]/.test(value[index])) index += 1;
      if (index > segmentStart) consumedAtom = true;
      const afterCfws = consumeCfws(value, index);
      if (afterCfws === null) return null;
      index = afterCfws;
      if (value[index] === '.') {
        index += 1;
        const afterDotCfws = consumeCfws(value, index);
        if (afterDotCfws === null) return null;
        index = afterDotCfws;
        continue;
      }
      break;
    }
    if (!consumedAtom) return null;
  }

  const atIndex = consumeCfws(value, index);
  if (atIndex === null || value[atIndex] !== '@') return null;
  const domainStart = consumeCfws(value, atIndex + 1);
  if (domainStart === null || domainStart >= value.length || /\s/.test(value[domainStart])) return null;

  if (value[domainStart] === '[') {
    const close = value.indexOf(']', domainStart + 1);
    return close >= 0 ? close + 1 : null;
  }

  let domainEnd = domainStart;
  while (domainEnd < value.length && !/\s/.test(value[domainEnd])) domainEnd += 1;
  return domainEnd > domainStart ? domainEnd : null;
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
