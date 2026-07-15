/**
 * Computes the dot product of two vectors of the same dimension.
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Computes the magnitude (Euclidean norm) of a vector.
 */
export function magnitude(vector: number[]): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

/**
 * Computes the Cosine Similarity between vector A and vector B.
 * Value ranges between -1 and 1. Near 1 represents high semantic similarity.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

/**
 * Maps a similarity score to a semantic hotness status.
 * Target thresholds:
 * - Solved: >= 0.82
 * - Very Hot: >= 0.68
 * - Hot: >= 0.55
 * - Warm: >= 0.40
 * - Cold: < 0.40
 */
export function mapScoreToStatus(score: number): 'Cold' | 'Warm' | 'Hot' | 'Very Hot' | 'Solved' {
  if (score >= 0.82) return 'Solved';
  if (score >= 0.68) return 'Very Hot';
  if (score >= 0.55) return 'Hot';
  if (score >= 0.40) return 'Warm';
  return 'Cold';
}

/**
 * Calculates a fallback similarity score based on Jaccard similarity and token overlap.
 * Used when OpenAI API key is missing or calls fail.
 */
export function calculateFallbackSimilarity(guess: string, target: string): number {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'in', 'out',
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
    'just', 'don', 'should', 'now', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
    'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
    'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves'
  ]);

  const tokenize = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/[\s_]+/)
      .filter(token => token.length > 1 && !stopWords.has(token));
  };

  const tokensGuess = tokenize(guess);
  const tokensTarget = tokenize(target);

  if (tokensGuess.length === 0 || tokensTarget.length === 0) {
    // If Jaccard drops to 0, check if case-insensitive exact string containment exists
    const cleanGuess = guess.toLowerCase().trim();
    const cleanTarget = target.toLowerCase().trim();
    if (cleanGuess === cleanTarget) return 1.0;
    if (cleanTarget.includes(cleanGuess) && cleanGuess.length > 3) return 0.75;
    return 0;
  }

  const setGuess = new Set(tokensGuess);
  const setTarget = new Set(tokensTarget);

  let intersectionCount = 0;
  for (const token of setTarget) {
    if (setGuess.has(token)) {
      intersectionCount++;
    }
  }

  // Jaccard index
  const unionCount = new Set([...tokensGuess, ...tokensTarget]).size;
  const jaccard = intersectionCount / unionCount;

  // Containment index (how much of the target did they name)
  const containment = intersectionCount / tokensTarget.length;

  // Combine Jaccard index and Containment with weights
  // This gives high similarity when they get the core keywords of the answer correct.
  const score = Math.max(jaccard, containment * 0.90);

  // Exact matching overrides
  const cleanGuess = guess.toLowerCase().trim();
  const cleanTarget = target.toLowerCase().trim();
  if (cleanGuess === cleanTarget) {
    return 1.0;
  }

  return score;
}
