import { describe, expect, it } from 'vitest';
import { findMatchesWithContext } from '../src/search/searchEngine';

describe('searchEngine', () => {
  const sample = [
    'int main() {',
    '  int count = 42;',
    '  int counter = 100;',
    '  return 0;',
    '}',
  ].join('\n');

  it('finds whole-word and case-sensitive matches with accurate line/col', () => {
    const res = findMatchesWithContext(sample, {
      query: 'count',
      replaceText: '',
      caseSensitive: true,
      wholeWord: true,
      useRegex: false,
      multiline: false,
    });

    expect(res.error).toBeNull();
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].line).toBe(2);
    expect(res.matches[0].column).toBe(7);
  });

  it('computes regex capture group replace previews', () => {
    const res = findMatchesWithContext(sample, {
      query: 'int (\\w+) = (\\d+);',
      replaceText: 'const $1 = $2;',
      caseSensitive: true,
      wholeWord: false,
      useRegex: true,
      multiline: false,
    });

    expect(res.error).toBeNull();
    expect(res.matches).toHaveLength(2);
    expect(res.matches[0].replacePreview).toBe('const count = 42;');
    expect(res.matches[1].replacePreview).toBe('const counter = 100;');
  });

  it('supports multiline search', () => {
    const res = findMatchesWithContext(sample, {
      query: 'return 0;\\n}',
      replaceText: '',
      caseSensitive: true,
      wholeWord: false,
      useRegex: true,
      multiline: true,
    });

    expect(res.error).toBeNull();
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].line).toBe(4);
  });

  it('returns an error on invalid regex', () => {
    const res = findMatchesWithContext(sample, {
      query: '[unclosed',
      replaceText: '',
      caseSensitive: false,
      wholeWord: false,
      useRegex: true,
      multiline: false,
    });

    expect(res.error).toBe('Invalid regular expression');
    expect(res.matches).toHaveLength(0);
  });
});
