export interface FuzzyMatchResult {
  score: number;
  positions: number[];
}

function isWordSeparator(ch: string | undefined): boolean {
  if (ch === undefined) return true;
  return ch === '/' || ch === '-' || ch === '_' || ch === '.' || ch === ' ';
}

function isCamelBoundary(prev: string | undefined, curr: string): boolean {
  if (prev === undefined) return true;
  return prev !== prev.toUpperCase() && prev === prev.toLowerCase() && curr === curr.toUpperCase();
}

export function fuzzyMatch(query: string, target: string): FuzzyMatchResult | null {
  if (query.length === 0) {
    return { score: 0, positions: [] };
  }

  if (target.length === 0) {
    return null;
  }

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  let bestScore = -Infinity;
  let bestPositions: number[] = [];

  for (let start = 0; start < lowerTarget.length; start++) {
    if (lowerTarget[start] !== lowerQuery[0]) continue;

    const positions: number[] = [start];
    let score = 1;

    if (isWordSeparator(target[start - 1]) || isCamelBoundary(target[start - 1], target[start])) {
      score += 2;
    }
    if (start === 0) {
      score += 2;
    }

    let queryIdx = 1;
    let prevPos = start;

    for (let pos = start + 1; pos < lowerTarget.length && queryIdx < lowerQuery.length; pos++) {
      if (lowerTarget[pos] !== lowerQuery[queryIdx]) continue;

      positions.push(pos);
      let charScore = 1;

      if (pos === prevPos + 1) {
        charScore += 7;
      } else {
        const gap = pos - prevPos - 1;
        charScore -= Math.min(gap * 0.5, 5);
      }

      if (isWordSeparator(target[pos - 1]) || isCamelBoundary(target[pos - 1], target[pos])) {
        charScore += 2;
      }

      score += charScore;
      prevPos = pos;
      queryIdx++;
    }

    if (queryIdx === query.length && score > bestScore) {
      bestScore = score;
      bestPositions = positions;
    }
  }

  if (bestPositions.length === query.length) {
    return { score: bestScore, positions: bestPositions };
  }

  return null;
}

export function filterAndSort(
  query: string,
  items: string[],
  maxResults: number = 50
): { path: string; match: FuzzyMatchResult }[] {
  if (!query.trim()) {
    return [...items].sort((a, b) => a.localeCompare(b)).slice(0, maxResults).map((path) => ({
      path,
      match: { score: 0, positions: [] },
    }));
  }

  const results: { path: string; match: FuzzyMatchResult }[] = [];

  for (const path of items) {
    const match = fuzzyMatch(query, path);
    if (match) {
      results.push({ path, match });
    }
  }

  results.sort((a, b) => {
    if (b.match.score !== a.match.score) {
      return b.match.score - a.match.score;
    }
    return a.path.localeCompare(b.path);
  });

  return results.slice(0, maxResults);
}
