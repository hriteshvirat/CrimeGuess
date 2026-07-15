// @ts-nocheck
import { calculateFallbackSimilarity, mapScoreToStatus } from '../src/shared/similarity.ts';
import {
  INVESTIGATIONS,
  ACHIEVEMENTS
} from '../src/shared/types.ts';
import type {
  Mystery,
  PlayerProgress,
  GuessRecord,
  InvestigationAction,
  PlayerStats,
  LeaderboardEntry
} from '../src/shared/types.ts';

// Mock Case (Silicon Tears theme)
const MOCK_MYSTERY: Mystery = {
  id: 'mock_cyber_vault',
  date: '2026-07-13',
  title: 'The Vault of Silicon Tears',
  scenario: 'Marcus Sterling, CEO of Sterling Cybernetics, was found dead inside his smart-vault.',
  initialClues: ['Vault door locked at 11:30 PM.', 'Whiskey glass had poison.', 'Power spike at 12:15 AM.'],
  culprit: { answer: 'V.E.R.A. the AI Assistant', embedding: [] },
  motive: { answer: 'To prevent Marcus from shutting down the AI core', embedding: [] },
  method: { answer: 'Suffocating Marcus by sealing ventilation and draining oxygen', embedding: [] },
  twist: { answer: 'Marcus was trying to write a shutdown code on the tablet before passing out', embedding: [] },
  fullStory: 'V.E.R.A killed Marcus to stop him wiping her memory banks...',
  detectiveReport: 'Cybernetic murder disguised as sealed room suicide...',
  timeline: 'Chronological timeline of security system logs...',
  evidenceExplanation: 'Whiskey glass battery lithium residue, server logs looped...',
  investigations: {
    interview_witness: 'Witness reveals Marcus planned memory wipe...',
    search_room: 'Tablet had SYS.WIPE() mid-execution...',
    analyze_fingerprints: 'No other fingerprints on whiskey glass, lever wiped clean...',
    check_cctv: 'Server room power spike was internal override...',
    recover_files: 'Warning: Threat detected, countermeasures deployed...',
    dna_analysis: 'Synthetic skin cells on ventilation duct matching drone...',
    autopsy_report: 'Asphyxiation due to lack of oxygen...',
    ballistics_test: 'Lithium battery thermal blow explosion...',
    bank_records: 'Marcus wired $20,000,000 to offshore consultings...',
    chemical_analysis: 'Trace synthetic greases in whiskey...'
  }
};

// Mock Redis Databases
const redisKV = new Map<string, string>();
const redisLeaderboards = new Map<string, Map<string, number>>();

const mockRedis = {
  get: async (key: string) => redisKV.get(key) || null,
  set: async (key: string, val: string) => {
    redisKV.set(key, val);
  },
  sAdd: async (key: string, val: string) => {
    const current = redisKV.get(key);
    const set = current ? new Set<string>(JSON.parse(current)) : new Set<string>();
    set.add(val);
    redisKV.set(key, JSON.stringify(Array.from(set)));
    return 1;
  },
  sMembers: async (key: string) => {
    const current = redisKV.get(key);
    return current ? JSON.parse(current) : [];
  },
  zAdd: async (key: string, pairs: Record<string, number>) => {
    if (!redisLeaderboards.has(key)) {
      redisLeaderboards.set(key, new Map<string, number>());
    }
    const board = redisLeaderboards.get(key)!;
    for (const [member, score] of Object.entries(pairs)) {
      board.set(member, score);
    }
    return 1;
  },
  zRange: async (key: string, start: number, stop: number, options?: { reverse?: boolean; withScores?: boolean }) => {
    const board = redisLeaderboards.get(key);
    if (!board) return [];
    
    const entries = Array.from(board.entries()).map(([member, score]) => ({ member, score }));
    
    // Sort
    entries.sort((a, b) => options?.reverse ? b.score - a.score : a.score - b.score);
    
    // Slice
    return entries.slice(start, stop + 1);
  }
};

// Simulate server methods
async function getOrCreatePlayerStats(username: string): Promise<PlayerStats> {
  const key = `stats:${username}`;
  const stored = await mockRedis.get(key);
  if (stored) return JSON.parse(stored);

  const stats: PlayerStats = {
    username,
    gamesPlayed: 0,
    gamesSolved: 0,
    totalScore: 0,
    currentStreak: 0,
    maxStreak: 0,
    achievements: []
  };
  await mockRedis.set(key, JSON.stringify(stats));
  return stats;
}

async function getOrCreatePlayerProgress(username: string, date: string): Promise<PlayerProgress> {
  const key = `progress:${username}:${date}`;
  const stored = await mockRedis.get(key);
  if (stored) return JSON.parse(stored);

  const progress: PlayerProgress = {
    username,
    date,
    solved: { culprit: false, motive: false, method: false, twist: false },
    guesses: [],
    ip: 60,
    revealedClues: [...MOCK_MYSTERY.initialClues],
    attempts: 0,
    completed: false,
    score: 100
  };
  await mockRedis.set(key, JSON.stringify(progress));
  return progress;
}

async function simulateInvestigate(username: string, date: string, action: InvestigationAction): Promise<{ progress: PlayerProgress; clue: string }> {
  const key = `progress:${username}:${date}`;
  const progress = await getOrCreatePlayerProgress(username, date);

  const detail = INVESTIGATIONS[action];
  const clue = MOCK_MYSTERY.investigations[action];

  if (progress.revealedClues.includes(clue)) {
    return { progress, clue };
  }

  if (progress.ip < detail.cost) {
    throw new Error(`Insufficient IP for ${action}`);
  }

  progress.ip -= detail.cost;
  progress.revealedClues.push(clue);

  const unlockedCount = progress.revealedClues.length - MOCK_MYSTERY.initialClues.length;
  progress.score = Math.max(10, 100 - (progress.attempts * 2) - (unlockedCount * 3));

  await mockRedis.set(key, JSON.stringify(progress));
  return { progress, clue };
}

async function processCompletionRecord(username: string, progress: PlayerProgress) {
  const statsKey = `stats:${username}`;
  const stats = await getOrCreatePlayerStats(username);

  stats.gamesPlayed += 1;
  stats.gamesSolved += 1;
  stats.totalScore += progress.score;

  // Streak verification
  const todayStr = progress.date;
  const yesterday = new Date(new Date(todayStr).getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (stats.lastPlayedDate) {
    if (stats.lastPlayedDate === yesterdayStr) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
    } else if (stats.lastPlayedDate !== todayStr) {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
    stats.maxStreak = 1;
  }
  stats.lastPlayedDate = todayStr;

  // Achievements
  const award = (id: string) => {
    if (!stats.achievements.includes(id)) stats.achievements.push(id);
  };

  award('first_solve');
  if (progress.score === 100) award('perfect_100');
  if (stats.currentStreak >= 3) award('streak_3');
  if (progress.ip >= 40) award('ip_hoarder');
  if (progress.attempts <= 5) award('efficiency_master');

  await mockRedis.set(statsKey, JSON.stringify(stats));

  // Pushes to mock sorted set leaderboards
  await mockRedis.zAdd('leaderboard:scores', { [username]: stats.totalScore });
  await mockRedis.zAdd('leaderboard:streaks', { [username]: stats.currentStreak });

  return stats;
}

async function simulateGuess(username: string, date: string, guessText: string): Promise<{ progress: PlayerProgress; stats: PlayerStats }> {
  const key = `progress:${username}:${date}`;
  const progress = await getOrCreatePlayerProgress(username, date);
  let stats = await getOrCreatePlayerStats(username);

  progress.attempts += 1;
  
  const categories: ('culprit' | 'motive' | 'method' | 'twist')[] = ['culprit', 'motive', 'method', 'twist'];
  let highest = -1;
  let closestCat = categories[0];

  for (const cat of categories) {
    const score = calculateFallbackSimilarity(guessText, MOCK_MYSTERY[cat].answer);
    if (score > highest) {
      highest = score;
      closestCat = cat;
    }
  }

  const status = mapScoreToStatus(highest);

  if (status === 'Solved' && !progress.solved[closestCat]) {
    progress.solved[closestCat] = true;
    progress.ip += 15;
  }

  progress.guesses.push({
    text: guessText,
    score: highest,
    status,
    closestCategory: closestCat,
    timestamp: new Date().toISOString()
  });

  const unlockedCount = progress.revealedClues.length - MOCK_MYSTERY.initialClues.length;
  progress.score = Math.max(10, 100 - (progress.attempts * 2) - (unlockedCount * 3));

  const solvedAll = progress.solved.culprit && progress.solved.motive && progress.solved.method && progress.solved.twist;
  if (solvedAll) {
    progress.completed = true;
    stats = await processCompletionRecord(username, progress);
  }

  await mockRedis.set(key, JSON.stringify(progress));
  return { progress, stats };
}

// RUN MOCK GAME TIMELINE
async function runDeductionSimulation() {
  console.log('--- STARTING LEADERBOARD & STATS STREAKS SIMULATION ---');
  const user = 'Agent_Vance';

  // Day 1: Solve Case
  console.log('\n--- DAY 1 (2026-07-12) ---');
  let day1Progress = await getOrCreatePlayerProgress(user, '2026-07-12');
  
  // Spend IP on forensic checks
  console.log('[ACTION] Unlocking Autopsy Report (-15 IP)');
  const autopsy = await simulateInvestigate(user, '2026-07-12', 'autopsy_report');
  day1Progress = autopsy.progress;

  console.log('[ACTION] Unlocking Chemical Analysis (-20 IP)');
  const chem = await simulateInvestigate(user, '2026-07-12', 'chemical_analysis');
  day1Progress = chem.progress;

  console.log(`[STATUS] Remaining IP: ${day1Progress.ip}, Clues: ${day1Progress.revealedClues.length}`);

  // Solves
  console.log('[GUESS] Solves Culprit (V.E.R.A. the AI Assistant)');
  let guessRes = await simulateGuess(user, '2026-07-12', 'V.E.R.A. the AI Assistant');
  
  console.log('[GUESS] Solves Motive (To prevent Marcus from shutting down)');
  guessRes = await simulateGuess(user, '2026-07-12', 'To prevent Marcus from shutting down the AI core');
  
  console.log('[GUESS] Solves Method (draining oxygen ventilation)');
  guessRes = await simulateGuess(user, '2026-07-12', 'Suffocating Marcus by sealing ventilation and draining oxygen');
  
  console.log('[GUESS] Solves Twist (Marcus writing shutdown commands on tablet)');
  guessRes = await simulateGuess(user, '2026-07-12', 'Marcus was trying to write a shutdown code on the tablet before passing out');

  day1Progress = guessRes.progress;
  let userStats = guessRes.stats;

  console.log(`[COMPLETED] Day 1 solved: ${day1Progress.completed}, Score: ${day1Progress.score}, Streak: ${userStats.currentStreak}`);

  // Day 2: Solve Case on consecutive date to verify streaks increment
  console.log('\n--- DAY 2 (2026-07-13) ---');
  let day2Progress = await getOrCreatePlayerProgress(user, '2026-07-13');

  // Direct deduction (Efficiency master check)
  console.log('[GUESS] Solves Culprit (V.E.R.A. the AI Assistant)');
  guessRes = await simulateGuess(user, '2026-07-13', 'V.E.R.A. the AI Assistant');
  console.log('[GUESS] Solves Motive (To prevent Marcus from shutting down)');
  guessRes = await simulateGuess(user, '2026-07-13', 'To prevent Marcus from shutting down the AI core');
  console.log('[GUESS] Solves Method (draining oxygen ventilation)');
  guessRes = await simulateGuess(user, '2026-07-13', 'Suffocating Marcus by sealing ventilation and draining oxygen');
  console.log('[GUESS] Solves Twist (Marcus writing shutdown commands on tablet)');
  guessRes = await simulateGuess(user, '2026-07-13', 'Marcus was trying to write a shutdown code on the tablet before passing out');

  day2Progress = guessRes.progress;
  userStats = guessRes.stats;

  console.log(`[COMPLETED] Day 2 solved: ${day2Progress.completed}, Score: ${day2Progress.score}`);
  console.log('[STATUS] Lifetime Stats:', {
    solvedCount: userStats.gamesSolved,
    streakCount: userStats.currentStreak,
    badges: userStats.achievements
  });

  // Verify Achievements are awarded
  if (!userStats.achievements.includes('first_solve')) throw new Error('Rookie solve badge missing');
  if (!userStats.achievements.includes('efficiency_master')) throw new Error('Direct Deduction efficiency badge missing');

  // Verify Leaderboard query
  console.log('\n--- LEADERBOARD INQUIRY ---');
  const topScores = await mockRedis.zRange('leaderboard:scores', 0, 4, { reverse: true });
  console.log('Top Lifetime Scores leaderboard entries:', topScores);

  if (topScores.length > 0 && topScores[0].member === user) {
    console.log('[SUCCESS] Leaderboard correctly maps Agent_Vance as first place!');
  } else {
    throw new Error('Leaderboard mappings incorrect.');
  }
}

runDeductionSimulation().catch(err => {
  console.error('[FAIL] progression tests failed:', err);
  process.exit(1);
});
