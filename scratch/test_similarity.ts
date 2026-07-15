// @ts-nocheck
import { cosineSimilarity, calculateFallbackSimilarity, mapScoreToStatus } from '../src/shared/similarity.ts';

// Test runner helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

console.log('--- RUNNING SIMILARITY MODULE TESTS ---');

// 1. Test Cosine Similarity Math
const v1 = [1, 0, 0];
const v2 = [1, 0, 0];
const v3 = [0, 1, 0];
const v4 = [-1, 0, 0];

assert(Math.abs(cosineSimilarity(v1, v2) - 1.0) < 1e-6, 'Cosine similarity of identical vectors is 1.0');
assert(Math.abs(cosineSimilarity(v1, v3) - 0.0) < 1e-6, 'Cosine similarity of orthogonal vectors is 0.0');
assert(Math.abs(cosineSimilarity(v1, v4) - -1.0) < 1e-6, 'Cosine similarity of opposite vectors is -1.0');

// 2. Test Fallback Token-matching Similarity Logic (Jaccard + Containment)
const targetCulprit = 'V.E.R.A. the AI Assistant';

// Exact match override
const scoreExact = calculateFallbackSimilarity('V.E.R.A. the AI Assistant', targetCulprit);
assert(scoreExact === 1.0, `Exact match score is 1.0 (got ${scoreExact})`);

// Good match (high token containment)
const scoreGood = calculateFallbackSimilarity('VERA AI Assistant', targetCulprit);
const statusGood = mapScoreToStatus(scoreGood);
assert(scoreGood >= 0.82, `High-containment guess "VERA AI Assistant" resolves as Solved (score: ${scoreGood.toFixed(2)})`);

// Warm/Hot match (some overlap)
const scoreWarm = calculateFallbackSimilarity('the AI system', targetCulprit);
const statusWarm = mapScoreToStatus(scoreWarm);
assert(statusWarm === 'Hot' || statusWarm === 'Warm', `Partial guess "the AI system" matches as Hot/Warm (score: ${scoreWarm.toFixed(2)})`);

// Cold match (no overlap)
const scoreCold = calculateFallbackSimilarity('the butler done it', targetCulprit);
const statusCold = mapScoreToStatus(scoreCold);
assert(statusCold === 'Cold', `Irrelevant guess "the butler done it" matches as Cold (score: ${scoreCold.toFixed(2)})`);

console.log('--- ALL SIMILARITY TESTS COMPLETED SUCCESSFULLY ---');
