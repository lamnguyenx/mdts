import { fuzzyMatch, filterAndSort } from '../../../../src/components/FuzzySearch/fuzzy';

describe('fuzzyMatch', () => {
  describe('basic matching', () => {
    it('returns null when query characters are not in order', () => {
      expect(fuzzyMatch('zx', 'example.txt')).toBeNull();
    });

    it('returns a match when query is a subsequence', () => {
      const result = fuzzyMatch('ext', 'example.txt');
      expect(result).not.toBeNull();
      expect(result!.positions).toHaveLength(3);
    });

    it('is case-insensitive', () => {
      const lower = fuzzyMatch('readme', 'README.md');
      const upper = fuzzyMatch('README', 'readme.md');
      expect(lower).not.toBeNull();
      expect(upper).not.toBeNull();
      expect(lower!.score).toBe(upper!.score);
    });

    it('returns null for empty target', () => {
      expect(fuzzyMatch('test', '')).toBeNull();
    });

    it('returns score 0 with empty positions for empty query', () => {
      const result = fuzzyMatch('', 'anything');
      expect(result).toEqual({ score: 0, positions: [] });
    });

    it('returns null when query is longer than target', () => {
      expect(fuzzyMatch('longerthantarget', 'short')).toBeNull();
    });
  });

  describe('scoring', () => {
    it('gives higher score to consecutive matches than scattered matches', () => {
      const consecutive = fuzzyMatch('file', 'file.md');
      const scattered = fuzzyMatch('file', 'f_o_o_i_l_e.md');
      expect(consecutive!.score).toBeGreaterThan(scattered!.score);
    });

    it('gives bonus for matching at start of string', () => {
      const atStart = fuzzyMatch('doc', 'document.md');
      const midString = fuzzyMatch('doc', 'mydocument.md');
      expect(atStart!.score).toBeGreaterThan(midString!.score);
    });

    it('gives bonus for matching at word boundaries', () => {
      const atBoundary = fuzzyMatch('btn', 'MyButton.tsx');
      const noBoundary = fuzzyMatch('btn', 'mybutton.tsx');
      expect(atBoundary!.score).toBeGreaterThan(noBoundary!.score);
    });

    it('gives bonus for matching after path separators', () => {
      const withSlash = fuzzyMatch('comp', 'src/components/Button.tsx');
      const withoutSlash = fuzzyMatch('comp', 'srccomponents/Button.tsx');
      expect(withSlash!.score).toBeGreaterThan(withoutSlash!.score);
    });
  });

  describe('positions', () => {
    it('returns correct positions for a simple match', () => {
      const result = fuzzyMatch('abc', 'xaxbxc');
      expect(result).not.toBeNull();
      expect(result!.positions).toEqual([1, 3, 5]);
    });

    it('prefers consecutive matches over scattered ones', () => {
      const result = fuzzyMatch('ab', 'aab');
      expect(result).not.toBeNull();
      expect(result!.positions).toEqual([1, 2]);
    });
  });

  describe('special characters', () => {
    it('matches dot characters in extensions', () => {
      const result = fuzzyMatch('f.md', 'file.md');
      expect(result).not.toBeNull();
    });

    it('matches hyphens and underscores literally', () => {
      const result = fuzzyMatch('my-file', 'my-awesome-file.md');
      expect(result).not.toBeNull();
    });
  });
});

describe('filterAndSort', () => {
  const files = [
    'src/components/Button.tsx',
    'src/utils/formatDate.ts',
    'README.md',
    'CHANGELOG.md',
    'docs/api/reference.md',
    'src/components/Header.tsx',
  ];

  it('returns all files sorted alphabetically when query is empty', () => {
    const results = filterAndSort('', files);
    expect(results).toHaveLength(files.length);
    expect(results[0].path).toBe('CHANGELOG.md');
  });

  it('returns all files sorted alphabetically when query is whitespace', () => {
    const results = filterAndSort('   ', files);
    expect(results).toHaveLength(files.length);
  });

  it('filters files by query', () => {
    const results = filterAndSort('readme', files);
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('README.md');
  });

  it('returns empty array when no files match', () => {
    const results = filterAndSort('zzznotfound', files);
    expect(results).toHaveLength(0);
  });

  it('ranks better matches first', () => {
    const results = filterAndSort('btn', [
      'src/other/Button.tsx',
      'button.css',
      'btn.tsx',
    ]);
    expect(results[0].path).toBe('btn.tsx');
  });

  it('respects maxResults', () => {
    const manyFiles = Array.from({ length: 100 }, (_, i) => `file${i}.md`);
    const results = filterAndSort('', manyFiles, 10);
    expect(results).toHaveLength(10);
  });

  it('sorts by alphabet when scores are equal', () => {
    const results = filterAndSort('fi', [
      'fig.md',
      'fia.md',
      'fib.md',
    ]);
    expect(results[0].path).toBe('fia.md');
    expect(results[1].path).toBe('fib.md');
    expect(results[2].path).toBe('fig.md');
  });
});
