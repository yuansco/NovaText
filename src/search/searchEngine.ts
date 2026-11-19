export interface SearchMatch {
  index: number;
  from: number;
  to: number;
  line: number;
  column: number;
  matchedText: string;
  linePreview: string;
  replacePreview: string;
}

export interface SearchQueryInput {
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  multiline: boolean;
}

const MAX_RESULTS = 2000;

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a JS RegExp from search options, returning null if query is empty or invalid.
 */
export function buildSearchRegExp(input: SearchQueryInput): RegExp | null {
  if (!input.query) return null;

  let pattern = input.useRegex ? input.query : escapeRegExp(input.query);
  if (input.wholeWord) {
    pattern = `\\b(?:${pattern})\\b`;
  }

  let flags = 'g';
  if (!input.caseSensitive) flags += 'i';
  if (input.multiline) flags += 'ms';

  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/**
 * Computes line/column and context preview for matches in a document.
 */
export function findMatchesWithContext(
  content: string,
  input: SearchQueryInput,
): { matches: SearchMatch[]; error: string | null } {
  if (!input.query) {
    return { matches: [], error: null };
  }

  let regex = buildSearchRegExp(input);
  if (!regex && input.useRegex) {
    return { matches: [], error: 'Invalid regular expression' };
  }
  if (!regex) {
    return { matches: [], error: null };
  }

  // Precompute line start offsets for O(log N) line lookup
  const lineStarts: number[] = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) {
      lineStarts.push(i + 1);
    }
  }

  const getLineInfo = (offset: number): { line: number; col: number; preview: string } => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (lineStarts[mid] <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const lineIdx = Math.max(0, high);
    const lineStart = lineStarts[lineIdx];
    const nextNewline = content.indexOf('\n', lineStart);
    const lineEnd = nextNewline === -1 ? content.length : nextNewline;
    const preview = content.slice(lineStart, Math.min(lineEnd, lineStart + 180));
    return {
      line: lineIdx + 1,
      col: offset - lineStart + 1,
      preview,
    };
  };

  const matches: SearchMatch[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  // Reset regex
  regex = new RegExp(regex.source, regex.flags);
  while ((match = regex.exec(content)) !== null && matches.length < MAX_RESULTS) {
    const matchedText = match[0];
    const from = match.index;
    const to = from + matchedText.length;

    if (matchedText.length === 0) {
      regex.lastIndex += 1;
      continue;
    }

    const { line, col, preview } = getLineInfo(from);
    let replacePreview = input.replaceText;
    if (input.useRegex) {
      try {
        const singleRegex = new RegExp(regex.source, regex.flags.replace('g', ''));
        replacePreview = matchedText.replace(singleRegex, input.replaceText);
      } catch {
        replacePreview = input.replaceText;
      }
    }

    index += 1;
    matches.push({
      index,
      from,
      to,
      line,
      column: col,
      matchedText,
      linePreview: preview,
      replacePreview,
    });
  }

  return { matches, error: null };
}
