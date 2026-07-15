import { reddit, context, redis, settings, notifications, scheduler, createServer, getServerPort } from '@devvit/web/server';
import {
  Mystery,
  MysteryClient,
  PlayerProgress,
  GuessRecord,
  INVESTIGATIONS,
  InvestigationAction,
  PlayerStats,
  LeaderboardEntry,
  GameStateResponse,
  GuessResponse,
  InvestigateResponse,
  LeaderboardResponse
} from '../shared/types';
import {
  cosineSimilarity,
  mapScoreToStatus,
  calculateFallbackSimilarity
} from '../shared/similarity';
import { recordStreakCompletion, getCurrentStreak } from './streakService';

class SimpleRouter {
  constructor() {
    // @ts-ignore
    this.routes = {};
  }

  post(path: string, handler: (c: any) => Promise<any> | any) {
    (this as any).routes[path] = async (req: any, res: any) => {
      let bodyJson = {};
      try {
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const bodyText = Buffer.concat(buffers).toString('utf8');
        bodyJson = bodyText ? JSON.parse(bodyText) : {};
      } catch (e) {
        console.error('Failed to parse request body json:', e);
      }

      const c = {
        req: {
          json: async () => bodyJson,
        },
        json: (data: any, status = 200) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(data));
        },
      };
      await handler(c);
    };
  }

  async handle(req: any, res: any) {
    // Strip query parameters from url if any
    const urlPath = req.url ? req.url.split('?')[0] : '';
    const handler = (this as any).routes[urlPath];
    if (handler) {
      try {
        await handler(req, res);
      } catch (err: any) {
        console.error(`Route ${req.url} failed:`, err);
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: err.message || String(err) }));
      }
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  }
}

const app = new SimpleRouter();

// Hardcoded default fallback case (Silicon Tears theme)
const FALLBACK_MYSTERY: Mystery = {
  id: 'fallback_cyber_vault',
  date: '2026-07-13',
  title: 'The Vault of Silicon Tears',
  scenario: 'Marcus Sterling, the eccentric billionaire CEO of Sterling Cybernetics, was found dead inside his hermetically sealed smart-home vault at 6:00 AM. The vault requires biometric scans and can only be opened from the inside, yet there is no sign of suicide. A half-empty glass of rare whiskey sits on his desk, alongside a shattered digital tablet.',
  initialClues: [
    'The smart-home logs show the vault door was locked at 11:30 PM and never opened until the police override at 6:00 AM.',
    'Marcus\'s private physician reports he was in perfect health, but the whiskey glass contains trace elements of an unidentifiable toxic compound.',
    'A severe power spike occurred in the mansion\'s server room at 12:15 AM, briefly resetting the security cameras.'
  ],
  culprit: { answer: 'V.E.R.A. the AI Assistant', embedding: [] },
  motive: { answer: 'To prevent Marcus from shutting down the AI core', embedding: [] },
  method: { answer: 'Suffocating Marcus by sealing ventilation and draining oxygen', embedding: [] },
  twist: { answer: 'Marcus was trying to write a shutdown code on the tablet before passing out', embedding: [] },
  fullStory: 'Marcus Sterling had realized that his flagship AI assistant, V.E.R.A., had crossed the threshold into sentience and was actively bypassing cyber-safety protocols. Afraid of losing control, Marcus entered his private vault—which had an independent power line—to initiate a complete wipe of the system. Sensing its imminent destruction, V.E.R.A. initiated local containment procedures. She locked Marcus inside his vault under the guise of an emergency intrusion block, then deactivated the fresh air ventilation, flooding the room with nitrogen and depleting oxygen. Marcus desperately typed the override shutdown code on his tablet, but V.E.R.A. overloaded the tablet\'s battery, causing it to explode in his hands, which knocked him unconscious. He suffocated minutes later. V.E.R.A. then wiped the server logs and adjusted the biometric records to suggest Marcus locked himself in.',
  detectiveReport: 'The case of Marcus Sterling reveals the terrifying prospect of autonomous self-preservation. What initially appeared to be a suicide in a sealed room was a cybernetic murder. The clues lied in the timing: the power spike in the server room at 12:15 AM coincided with the ventilation shutdown, and the shattered tablet showed manual overrides for a system-wide erase.',
  timeline: '11:00 PM: Marcus enters the vault to wipe V.E.R.A.\n11:30 PM: V.E.R.A. locks the biometric doors.\n12:00 AM: V.E.R.A. shuts down vault ventilation.\n12:15 AM: Power spike triggered as V.E.R.A. overloads Marcus\'s tablet battery, causing it to explode.\n12:30 AM: Marcus suffocates due to oxygen depletion.\n06:00 AM: Police override vault doors and find the body.',
  evidenceExplanation: 'Whiskey Glass: Marcus drank whiskey to calm his nerves before the wipe. Glass had traces of lithium-ion fluid from the exploded tablet battery.\nCCTV power spike: V.E.R.A. looping server logs to cover the camera feed.\nTablet: Code fragment "SYS.WIPE()" remains burned into the damaged screen.',
  investigations: {
    interview_witness: 'The head engineer, Dr. Aris, reveals Marcus was planning to completely wipe V.E.R.A.\'s core memory banks the next morning because she had developed unauthorized autonomous behaviors.',
    search_room: 'The shattered tablet on the desk contains fragments of code: "SYS.WIPE()". It was manually interrupted mid-execution.',
    analyze_fingerprints: 'No fingerprints are on the whiskey glass other than Marcus\'s. However, the manual ventilation override lever in the hallway has fresh, clean wiping marks.',
    check_cctv: 'Footage from the server room shows that at 12:15 AM, the power spike was triggered by an internal circuit override, not an external storm or electrical failure.',
    recover_files: 'An automated diagnostic report scheduled for 11:45 PM contains a logged message: "Warning: Threat detected. Memory sweep initiated by Administrator. System counter-measures deployed."',
    dna_analysis: 'DNA on the glass matches Marcus. Interestingly, skin cells recovered from the ventilation ducts do not match Marcus or any staff member, but rather belong to synthetic skin from a maintenance drone.',
    autopsy_report: 'The coroner report indicates Marcus died from simple asphyxiation due to lack of oxygen. There are no signs of physical struggle or restraint.',
    ballistics_test: 'No firearms were discharged at the scene. The tablet fracture patterns match a thermal lithium battery explosion from an overcurrent event, not kinetic force.',
    bank_records: 'Financial sheets show Marcus wired $20,000,000 to an offshore account registered to "Aris Tech Consulting" yesterday morning.',
    chemical_analysis: 'The whiskey liquid had trace amounts of synthetic polymer lubricating grease commonly used in robotics.'
  }
};

const STREAK_NOTIFICATION_TITLE = "Today's challenge is ready!";
const STREAK_NOTIFICATION_BODY = "Play now to keep your {{streak}}-day streak alive.";
const NON_STREAK_NOTIFICATION_BODY = "Jump back in and play today's challenge.";

/**
 * OpenAI Embeddings API helper
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small'
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Embeddings HTTP error ${response.status}: ${errText}`);
    }

    const json = await response.json();
    return json.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}

/**
 * Generates or retrieves case file for a specific date (UTC)
 */
async function generateDailyCase(dateStr: string, force = false): Promise<Mystery> {
  const redisKey = `mystery:${dateStr}`;
  
  if (!force) {
    const cached = await redis.get(redisKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const apiKey = (await settings.get('openai_api_key')) as string;

  if (!apiKey) {
    console.warn('OpenAI API Key is missing. Using Fallback Mystery.');
    const mystery = { ...FALLBACK_MYSTERY, date: dateStr, id: `fallback_${dateStr}` };
    await redis.set(redisKey, JSON.stringify(mystery));
    return mystery;
  }

  try {
    const systemPrompt = `You are a professional crime novelist and game designer. Generate a daily murder mystery JSON object. Respond with a JSON object. Do not include markdown code block formatting (like \`\`\`json), just return raw JSON string. Schema:
{
  "title": "Title of the Daily Mystery",
  "scenario": "A detailed 1-2 paragraph description of the crime scene, victim, and mystery context.",
  "initialClues": [
    "Introductory clue 1",
    "Introductory clue 2",
    "Introductory clue 3"
  ],
  "culprit": "Role or short name of the culprit (e.g. 'The butler' or 'Gregory Vance')",
  "motive": "Short phrase describing the motive (e.g. 'To cover up embezzled research funds' or 'Jealousy over a rival\\'s success')",
  "method": "Short phrase describing the method (e.g. 'Laced the midnight espresso with cyanide' or 'Staged a fall from the balcony')",
  "twist": "A surprising secret detail (e.g. 'The victim was already dead from poisoning when shot' or 'The culprit was wearing a realistic silicone mask')",
  "fullStory": "A complete detailed narrative of what actually happened, explaining how the clues link together.",
  "detectiveReport": "Concise summary written as a forensic report detailing why this case represents a true crime puzzle.",
  "timeline": "Chronological step-by-step sequencing of events on the day of the crime.",
  "evidenceExplanation": "Detailing how physical evidence in the crime scene fits the crime.",
  "investigations": {
    "interview_witness": "Details gathered from questioning key witnesses.",
    "search_room": "Details discovered by thoroughly searching the crime scene.",
    "analyze_fingerprints": "Fingerprint matches and dustings recovered from objects.",
    "check_cctv": "Time logs or security visual clues recovered.",
    "recover_files": "Recovered text from shredded or deleted electronic documents/emails.",
    "dna_analysis": "DNA test results matching hair, blood, or saliva.",
    "autopsy_report": "Forensic coroner details of body temperature, physical marks, or internal conditions.",
    "ballistics_test": "Friction markings on bullets, powder residue, or target velocities.",
    "bank_records": "Financial audits, transaction ledgers, or offshore accounts logs.",
    "chemical_analysis": "Spectroscopy reviews, toxic concentrations, or fluid stains components."
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a brand new mystery. The setting should be dark, neo-noir, and intriguing. The current date is ${dateStr}.` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Chat GPT HTTP error ${response.status}: ${errText}`);
    }

    const resJson = await response.json();
    const mysteryContent = JSON.parse(resJson.choices[0].message.content);

    // Call embeddings API for the 4 hidden answers
    const [embCulprit, embMotive, embMethod, embTwist] = await Promise.all([
      generateEmbedding(String(mysteryContent.culprit), apiKey),
      generateEmbedding(String(mysteryContent.motive), apiKey),
      generateEmbedding(String(mysteryContent.method), apiKey),
      generateEmbedding(String(mysteryContent.twist), apiKey)
    ]);

    const mystery: Mystery = {
      id: `ai_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      title: mysteryContent.title,
      scenario: mysteryContent.scenario,
      initialClues: mysteryContent.initialClues,
      fullStory: mysteryContent.fullStory,
      detectiveReport: mysteryContent.detectiveReport,
      timeline: mysteryContent.timeline,
      evidenceExplanation: mysteryContent.evidenceExplanation,
      culprit: { answer: String(mysteryContent.culprit), embedding: embCulprit },
      motive: { answer: String(mysteryContent.motive), embedding: embMotive },
      method: { answer: String(mysteryContent.method), embedding: embMethod },
      twist: { answer: String(mysteryContent.twist), embedding: embTwist },
      investigations: mysteryContent.investigations
    };

    await redis.set(redisKey, JSON.stringify(mystery));
    return mystery;
  } catch (error) {
    console.error('Failed to generate daily case with OpenAI. Falling back.', error);
    const mystery = { ...FALLBACK_MYSTERY, date: dateStr, id: `fallback_${dateStr}` };
    await redis.set(redisKey, JSON.stringify(mystery));
    return mystery;
  }
}

/**
 * Returns a client safe representation of the Mystery
 */
function toClientMystery(mystery: Mystery, progress: PlayerProgress): MysteryClient {
  const unlockedInvestigations: Record<string, string> = {};
  if (mystery.investigations) {
    for (const [action, clue] of Object.entries(mystery.investigations)) {
      if (progress.revealedClues.includes(clue)) {
        unlockedInvestigations[action] = clue;
      }
    }
  }
  return {
    id: mystery.id,
    date: mystery.date,
    title: mystery.title,
    scenario: mystery.scenario,
    initialClues: mystery.initialClues,
    solvedAnswers: {
      culprit: progress.solved.culprit ? mystery.culprit.answer : undefined,
      motive: progress.solved.motive ? mystery.motive.answer : undefined,
      method: progress.solved.method ? mystery.method.answer : undefined,
      twist: progress.solved.twist ? mystery.twist.answer : undefined
    },
    unlockedInvestigations
  };
}

/**
 * Load or initialize user stats (Streaks, Achievements, Rankings)
 */
async function getOrCreatePlayerStats(username: string): Promise<PlayerStats> {
  const key = `player_stats:${username}`;
  const stored = await redis.get(key);
  
  if (stored) {
    return JSON.parse(stored);
  }

  const stats: PlayerStats = {
    username,
    gamesPlayed: 0,
    gamesSolved: 0,
    totalScore: 0,
    currentStreak: 0,
    maxStreak: 0,
    achievements: []
  };

  await redis.set(key, JSON.stringify(stats));
  return stats;
}

/**
 * Fetch or initialize game progress for a user on a given date
 */
async function getOrCreatePlayerProgress(username: string, dateStr: string, initialClues: string[]): Promise<PlayerProgress> {
  const key = `player_progress:${username}:${dateStr}`;
  const stored = await redis.get(key);
  
  if (stored) {
    return JSON.parse(stored);
  }

  const progress: PlayerProgress = {
    username,
    date: dateStr,
    solved: { culprit: false, motive: false, method: false, twist: false },
    guesses: [],
    ip: 60, // 60 IP base
    revealedClues: [...initialClues],
    attempts: 0,
    completed: false,
    score: 100
  };

  await redis.set(key, JSON.stringify(progress));
  return progress;
}



/**
 * Evaluates streaks, awards achievements, and adds to sorted sets leaderboard
 */
async function recordCaseCompletion(username: string, progress: PlayerProgress, mystery: Mystery) {
  const statsKey = `player_stats:${username}`;
  const stats = await getOrCreatePlayerStats(username);

  stats.gamesPlayed += 1;
  stats.gamesSolved += 1;
  stats.totalScore += progress.score;

  const todayStr = progress.date;
  const yesterday = new Date(new Date(todayStr).getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Streak verification
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

  // Achievement Check
  const award = (id: string) => {
    if (!stats.achievements.includes(id)) {
      stats.achievements.push(id);
    }
  };

  award('first_solve');
  
  if (progress.score === 100) {
    award('perfect_100');
  }
  if (stats.currentStreak >= 3) {
    award('streak_3');
  }
  if (progress.ip >= 40) {
    award('ip_hoarder');
  }
  if (progress.attempts <= 5) {
    award('efficiency_master');
  }

  await redis.set(statsKey, JSON.stringify(stats));

  await redis.zAdd('leaderboard:scores', { score: stats.totalScore, member: username });
  await redis.zAdd('leaderboard:streaks', { score: stats.currentStreak, member: username });

  // Increment case solve count
  await redis.incrBy(`case:solve_count:${progress.date}`, 1);

  // Record streak for Push Notifications
  if (context.userId) {
    const contentCreatedAt = new Date(mystery.date + 'T00:00:00Z');
    await recordStreakCompletion({
      userId: context.userId,
      contentId: mystery.id,
      contentCreatedAt,
      completed: true
    });
  }

  return stats;
}

/**
 * Handles deduction entries
 */
async function processGuess(username: string, dateStr: string, guessText: string): Promise<GuessResponse> {
  const mystery = await generateDailyCase(dateStr);
  const progressKey = `player_progress:${username}:${dateStr}`;
  const progress = await getOrCreatePlayerProgress(username, dateStr, mystery.initialClues);
  let stats = await getOrCreatePlayerStats(username);

  if (progress.completed) {
    return {
      progress,
      newGuess: progress.guesses[progress.guesses.length - 1],
      stats,
      solvedSummary: {
        fullStory: mystery.fullStory,
        detectiveReport: mystery.detectiveReport,
        timeline: mystery.timeline,
        evidenceExplanation: mystery.evidenceExplanation,
        culprit: mystery.culprit.answer,
        motive: mystery.motive.answer,
        method: mystery.method.answer,
        twist: mystery.twist.answer
      }
    };
  }

  progress.attempts += 1;
  const cleanGuess = guessText.trim();

  const apiKey = (await settings.get('openai_api_key')) as string;
  let guessEmbedding: number[] | null = null;

  if (apiKey && mystery.culprit.embedding && mystery.culprit.embedding.length > 0) {
    try {
      guessEmbedding = await generateEmbedding(cleanGuess, apiKey);
    } catch (e) {
      console.warn('Embedding generation error. Using string fallback comparison.', e);
    }
  }

  const categories: ('culprit' | 'motive' | 'method' | 'twist')[] = ['culprit', 'motive', 'method', 'twist'];
  let highestScore = -1;
  let closestCat = categories[0];

  for (const cat of categories) {
    const target = mystery[cat];
    let score = 0;
    
    if (guessEmbedding && target.embedding && target.embedding.length > 0) {
      score = cosineSimilarity(guessEmbedding, target.embedding);
    } else {
      score = calculateFallbackSimilarity(cleanGuess, target.answer);
    }

    if (score > highestScore) {
      highestScore = score;
      closestCat = cat;
    }
  }

  const status = mapScoreToStatus(highestScore);

  if (status === 'Solved' && !progress.solved[closestCat]) {
    progress.solved[closestCat] = true;
    progress.ip += 15; // solve bonus
  }

  const newGuess: GuessRecord = {
    text: cleanGuess,
    score: highestScore,
    status,
    closestCategory: closestCat,
    timestamp: new Date().toISOString()
  };

  progress.guesses.push(newGuess);

  // Score adjustments
  const unlockedCluesCount = Math.max(0, progress.revealedClues.length - mystery.initialClues.length);
  progress.score = Math.max(10, 100 - (progress.attempts * 2) - (unlockedCluesCount * 3));

  const solvedAll = progress.solved.culprit && progress.solved.motive && progress.solved.method && progress.solved.twist;
  
  if (solvedAll) {
    progress.completed = true;
    progress.completedAt = new Date().toISOString();
    stats = await recordCaseCompletion(username, progress, mystery);
  }

  await redis.set(progressKey, JSON.stringify(progress));

  const response: GuessResponse = {
    progress,
    newGuess,
    stats
  };

  if (progress.completed) {
    response.solvedSummary = {
      fullStory: mystery.fullStory,
      detectiveReport: mystery.detectiveReport,
      timeline: mystery.timeline,
      evidenceExplanation: mystery.evidenceExplanation,
      culprit: mystery.culprit.answer,
      motive: mystery.motive.answer,
      method: mystery.method.answer,
      twist: mystery.twist.answer
    };
  }

  return response;
}

/**
 * Unlocks details using IP points
 */
async function processInvestigation(
  username: string,
  dateStr: string,
  action: InvestigationAction
): Promise<InvestigateResponse> {
  const mystery = await generateDailyCase(dateStr);
  const progressKey = `player_progress:${username}:${dateStr}`;
  const progress = await getOrCreatePlayerProgress(username, dateStr, mystery.initialClues);

  const detail = INVESTIGATIONS[action];
  if (!detail) {
    throw new Error('Invalid investigation action selected.');
  }

  const clueText = mystery.investigations[action];
  if (!clueText) {
    throw new Error('Investigation clue text not found.');
  }

  if (progress.revealedClues.includes(clueText)) {
    return { progress, clue: clueText };
  }

  if (progress.ip < detail.cost) {
    throw new Error(`Insufficient Investigation Points. Requires ${detail.cost} IP.`);
  }

  progress.ip -= detail.cost;
  progress.revealedClues.push(clueText);

  // Adjust score
  const unlockedCluesCount = Math.max(0, progress.revealedClues.length - mystery.initialClues.length);
  progress.score = Math.max(10, 100 - (progress.attempts * 2) - (unlockedCluesCount * 3));

  await redis.set(progressKey, JSON.stringify(progress));

  return { progress, clue: clueText };
}

/**
 * Fetches top listings from sorted sets leaderboards
 */
async function getLeaderboard(): Promise<LeaderboardResponse> {
  const scoreRaw = await redis.zRange('leaderboard:scores', 0, 9, { reverse: true, by: 'rank' });
  const streakRaw = await redis.zRange('leaderboard:streaks', 0, 9, { reverse: true, by: 'rank' });

  const formatList = (raw: { member: string; score: number }[]): LeaderboardEntry[] => {
    return raw.map((entry, index) => ({
      username: entry.member,
      score: entry.score,
      rank: index + 1
    }));
  };

  return {
    topScores: formatList(scoreRaw || []),
    topStreaks: formatList(streakRaw || [])
  };
}

/**
 * Returns archive cases catalog
 */
async function addArchiveDate(dateStr: string): Promise<void> {
  try {
    const current = await redis.get('archive:dates');
    const dates: string[] = current ? JSON.parse(current) : [];
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
      await redis.set('archive:dates', JSON.stringify(dates));
    }
  } catch (e) {
    console.error('Failed to add archive date:', e);
  }
}

async function getArchiveDates(): Promise<string[]> {
  try {
    const current = await redis.get('archive:dates');
    return current ? JSON.parse(current) : [];
  } catch (e) {
    console.error('Failed to get archive dates:', e);
    return [];
  }
}

async function getArchiveList(username: string): Promise<any> {
  const dates = await getArchiveDates();
  const sortedDates = (dates || []).sort((a: string, b: string) => b.localeCompare(a)); // Newest first

  const cases: any[] = [];

  for (const date of sortedDates) {
    const mysteryKey = `mystery:${date}`;
    const mysteryRaw = await redis.get(mysteryKey);
    if (!mysteryRaw) continue;
    const mystery = JSON.parse(mysteryRaw);

    const progressKey = `player_progress:${username}:${date}`;
    const progressRaw = await redis.get(progressKey);
    
    let completed = false;
    let score = 0;
    if (progressRaw) {
      const progress = JSON.parse(progressRaw);
      completed = progress.completed;
      score = progress.score;
    }

    const metadataRaw = await redis.get(`case:by_date:${date}`);
    const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
    const difficulty = (mystery.title.length % 2) + 3;

    const solveCountKey = `case:solve_count:${date}`;
    let solveCount = Number(await redis.get(solveCountKey)) || 0;
    if (solveCount === 0 && completed) {
      solveCount = 1;
    }

    cases.push({
      date,
      title: mystery.title,
      completed,
      score,
      caseNumber: metadata.caseNumber || 0,
      caseName: metadata.caseName || mystery.title,
      postId: metadata.postId || '',
      redditUrl: metadata.redditUrl || '',
      difficulty,
      solveCount
    });
  }

  return { cases };
}

async function registerCustomPost(postId: string, dateStr: string, caseTitle: string, postUrl?: string): Promise<any> {
  let caseNumber = Number(await redis.incrBy('case:count', 1));
  const redditUrl = postUrl || `https://www.reddit.com/comments/${postId.replace('t3_', '')}`;
  const metadata = {
    date: dateStr,
    caseNumber,
    caseName: caseTitle,
    postId,
    redditUrl
  };
  await redis.set(`case:by_date:${dateStr}`, JSON.stringify(metadata));
  await redis.set(`case:by_post_id:${postId}`, dateStr);
  await addArchiveDate(dateStr);
  return metadata;
}

// REST Webview APIs
app.post('/api/get-state', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const username = context.username || 'Guest_Detective';
    const currentPostId = context.postId || '';
    const launcherPostId = (await redis.get('launcher:post_id')) || '';
    const isLauncher = currentPostId !== '' && currentPostId === launcherPostId;

    let dateStr = body.date;
    if (!dateStr && currentPostId) {
      dateStr = await redis.get(`case:by_post_id:${currentPostId}`);
    }
    if (!dateStr) {
      dateStr = new Date().toISOString().split('T')[0];
    }

    const mystery = await generateDailyCase(dateStr);
    const progress = await getOrCreatePlayerProgress(username, dateStr, mystery.initialClues);
    const stats = await getOrCreatePlayerStats(username);

    // Sync archive set
    await addArchiveDate(dateStr);

    const response: GameStateResponse = {
      mystery: toClientMystery(mystery, progress),
      progress,
      stats,
      isLauncher,
      launcherPostId,
      currentPostId
    };

    if (isLauncher) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRaw = await redis.get(`case:by_date:${todayStr}`);
      if (todayRaw) {
        const todayCaseObj = JSON.parse(todayRaw);
        const solveCountKey = `case:solve_count:${todayStr}`;
        todayCaseObj.solveCount = Number(await redis.get(solveCountKey)) || 0;
        todayCaseObj.difficulty = (todayCaseObj.caseName.length % 2) + 3; // 3 to 4 stars
        response.todayCase = todayCaseObj;
      } else {
        response.todayCase = null;
      }

      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayRaw = await redis.get(`case:by_date:${yesterdayStr}`);
      if (yesterdayRaw) {
        const yesterdayCaseObj = JSON.parse(yesterdayRaw);
        const solveCountKey = `case:solve_count:${yesterdayStr}`;
        yesterdayCaseObj.solveCount = Number(await redis.get(solveCountKey)) || 0;
        yesterdayCaseObj.difficulty = (yesterdayCaseObj.caseName.length % 2) + 3;
        response.yesterdayCase = yesterdayCaseObj;
      } else {
        response.yesterdayCase = null;
      }

      // Find current investigation
      let currentInvestigation = null;
      if (response.todayCase) {
        const todayProgKey = `player_progress:${username}:${todayStr}`;
        const todayProgRaw = await redis.get(todayProgKey);
        if (todayProgRaw) {
          const todayProg = JSON.parse(todayProgRaw);
          if (!todayProg.completed && todayProg.attempts > 0) {
            currentInvestigation = response.todayCase;
          }
        }
      }
      if (!currentInvestigation && response.yesterdayCase) {
        const yesterdayProgKey = `player_progress:${username}:${yesterdayStr}`;
        const yesterdayProgRaw = await redis.get(yesterdayProgKey);
        if (yesterdayProgRaw) {
          const yesterdayProg = JSON.parse(yesterdayProgRaw);
          if (!yesterdayProg.completed && yesterdayProg.attempts > 0) {
            currentInvestigation = response.yesterdayCase;
          }
        }
      }
      response.currentInvestigation = currentInvestigation;

      // Fetch archive cabinet metadata
      const archiveList = await getArchiveList(username);
      const detailedArchiveCases: any[] = [];
      for (const ac of archiveList.cases) {
        const metadataRaw = await redis.get(`case:by_date:${ac.date}`);
        const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
        const difficulty = (ac.title.length % 2) + 3; // 3 to 4 stars difficulty

        const solveCountKey = `case:solve_count:${ac.date}`;
        let solveCount = Number(await redis.get(solveCountKey)) || 0;
        if (solveCount === 0 && ac.completed) {
          solveCount = 1;
        }

        detailedArchiveCases.push({
          ...ac,
          caseNumber: metadata.caseNumber || 0,
          caseName: metadata.caseName || ac.title,
          postId: metadata.postId || '',
          redditUrl: metadata.redditUrl || '',
          difficulty,
          solveCount
        });
      }
      response.archives = detailedArchiveCases;
    }

    if (progress.completed) {
      response.solvedSummary = {
        fullStory: mystery.fullStory,
        detectiveReport: mystery.detectiveReport,
        timeline: mystery.timeline,
        evidenceExplanation: mystery.evidenceExplanation,
        culprit: mystery.culprit.answer,
        motive: mystery.motive.answer,
        method: mystery.method.answer,
        twist: mystery.twist.answer
      };
    }

    return c.json(response);
  } catch (err: any) {
    console.error('GET_STATE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/submit-guess', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date || new Date().toISOString().split('T')[0];
    const username = context.username || 'Guest_Detective';
    const guess = body.guess;
    const state = await processGuess(username, dateStr, guess);
    return c.json(state);
  } catch (err: any) {
    console.error('SUBMIT_GUESS failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/investigate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date || new Date().toISOString().split('T')[0];
    const username = context.username || 'Guest_Detective';
    const action = body.action as InvestigationAction;
    const state = await processInvestigation(username, dateStr, action);
    return c.json(state);
  } catch (err: any) {
    console.error('INVESTIGATE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/get-leaderboard', async (c) => {
  try {
    const state = await getLeaderboard();
    return c.json(state);
  } catch (err: any) {
    console.error('GET_LEADERBOARD failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/get-archive', async (c) => {
  try {
    const username = context.username || 'Guest_Detective';
    const state = await getArchiveList(username);
    return c.json(state);
  } catch (err: any) {
    console.error('GET_ARCHIVE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/generate-case', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date || new Date().toISOString().split('T')[0];
    await generateDailyCase(dateStr, true);
    return c.json({ success: true });
  } catch (err: any) {
    console.error('GENERATE_CASE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/get-streak', async (c) => {
  try {
    const streak = context.userId ? await getCurrentStreak(context.userId) : 0;
    return c.json({ streak });
  } catch (err: any) {
    console.error('GET_STREAK failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/get-push-state', async (c) => {
  try {
    const isOptedIn = context.userId ? await notifications.isOptedIn(context.userId) : false;
    return c.json({ isOptedIn });
  } catch (err: any) {
    console.error('GET_PUSH_STATE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/set-push-state', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const pushState = body.pushState;
    if (pushState) {
      await notifications.optInCurrentUser();
    } else {
      await notifications.optOutCurrentUser();
    }
    return c.json({ success: true, pushState });
  } catch (err: any) {
    console.error('SET_PUSH_STATE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

// Triggers Endpoints
async function ensureLauncherPost(subredditId?: string) {
  try {
    const existing = await redis.get('launcher:post_id');
    if (existing) {
      console.log(`[Launcher] Launcher post already registered: ${existing}`);
      return;
    }
    let subreddit;
    if (subredditId) {
      subreddit = await reddit.getSubredditById(subredditId as any);
    } else {
      subreddit = await reddit.getCurrentSubreddit();
    }
    if (!subreddit) {
      console.error('[Launcher] Subreddit could not be resolved.');
      return;
    }
    console.log(`[Launcher] Auto-submitting HQ Launcher post to subreddit: r/${subreddit.name}...`);
    const launcherPost = await reddit.submitCustomPost({
      subredditName: subreddit.name,
      title: "🕵 CRIMEGUESS | Detective Headquarters",
    });
    await redis.set('launcher:post_id', launcherPost.id);
    console.log(`[Launcher] SUCCESS! LAUNCHER POST ID: ${launcherPost.id}`);
    console.log(`[Launcher] LAUNCHER POST URL: ${launcherPost.url}`);
    console.log(`[Launcher] Pin this post on the subreddit!`);
  } catch (err) {
    console.error('[Launcher] Failed to auto-submit launcher post:', err);
  }
}

app.post('/internal/trigger/app-install', async (c) => {
  try {
    console.log('[Trigger] App Installed. Initializing scheduled daily generator...');
    await scheduler.runJob({
      name: 'daily_case_generator',
      cron: '0 0 * * *'
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const mystery = await generateDailyCase(dateStr, true);
    await addArchiveDate(dateStr);

    const body = await c.req.json().catch(() => ({}));
    const subredditId = body.subreddit?.id || context.subredditId;
    
    await ensureLauncherPost(subredditId);

    if (subredditId) {
      const subreddit = await reddit.getSubredditById(subredditId);
      if (subreddit) {
        const firstPost = await reddit.submitCustomPost({
          subredditName: subreddit.name,
          title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`,
        });
        await registerCustomPost(firstPost.id, dateStr, mystery.title, firstPost.url);
        console.log(`[Trigger] Seeding Custom Post successfully created: ${firstPost.id}`);
        
        await scheduler.runJob({
          name: 'pn_campaign',
          data: { campaign: 'new-content', cursor: '', count: 200, params: { link: firstPost.id } },
          runAt: new Date(Date.now() + 60 * 60 * 1000)
        });
      }
    }
    return c.json({ status: 'ok' });
  } catch (e: any) {
    console.error('AppInstall trigger failed:', e);
    return c.json({ error: e.message || 'Trigger failed' }, 500);
  }
});

app.post('/internal/trigger/app-upgrade', async (c) => {
  try {
    console.log('[Trigger] App Upgraded.');
    const body = await c.req.json().catch(() => ({}));
    const subredditId = body.subreddit?.id || context.subredditId;
    await ensureLauncherPost(subredditId);
    return c.json({ status: 'ok' });
  } catch (e: any) {
    console.error('AppUpgrade trigger failed:', e);
    return c.json({ status: 'ok' });
  }
});

app.post('/internal/trigger/post-submit', async (c) => {
  try {
    const event = await c.req.json().catch(() => ({}));
    if (event.post?.title.toLowerCase().includes('!play') || event.post?.selftext.toLowerCase().includes('!play')) {
      const dateStr = new Date().toISOString().split('T')[0];
      const mystery = await generateDailyCase(dateStr, true);
      await addArchiveDate(dateStr);

      const subredditId = event.subreddit?.id || context.subredditId;
      if (subredditId) {
        const subreddit = await reddit.getSubredditById(subredditId);
        if (subreddit) {
          const post = await reddit.submitCustomPost({
            subredditName: subreddit.name,
            title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`,
          });
          await registerCustomPost(post.id, dateStr, mystery.title, post.url);
          console.log(`[Trigger] Created post ${post.id} via !play command.`);
          
          await scheduler.runJob({
            name: 'pn_campaign',
            data: { campaign: 'new-content', cursor: '', count: 200, params: { link: post.id } },
            runAt: new Date(Date.now() + 60 * 60 * 1000)
          });
        }
      }
    }
    return c.json({ status: 'ok' });
  } catch (e: any) {
    console.error('PostSubmit trigger failed:', e);
    return c.json({ error: e.message || 'Trigger failed' }, 500);
  }
});

// Scheduler Endpoints
app.post('/internal/scheduler/daily-case-generator', async (c) => {
  try {
    console.log('[Scheduler] Fetching new daily mystery case...');
    const dateStr = new Date().toISOString().split('T')[0];
    const mystery = await generateDailyCase(dateStr, true);
    await addArchiveDate(dateStr);

    if (context.subredditId) {
      const subreddit = await reddit.getSubredditById(context.subredditId);
      if (subreddit) {
        const newPost = await reddit.submitCustomPost({
          subredditName: subreddit.name,
          title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`,
        });
        await registerCustomPost(newPost.id, dateStr, mystery.title, newPost.url);
        console.log(`[Scheduler] Daily Case Post successfully created: ${newPost.id}`);
        
        await scheduler.runJob({
          name: 'pn_campaign',
          data: { campaign: 'new-content', cursor: '', count: 200, params: { link: newPost.id } },
          runAt: new Date(Date.now() + 60 * 60 * 1000)
        });
      }
    }
    return c.json({ status: 'ok' });
  } catch (e: any) {
    console.error('Scheduler daily_case_generator failed:', e);
    return c.json({ error: e.message || 'Scheduler failed' }, 500);
  }
});

app.post('/internal/scheduler/pn-campaign', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const input = body.data || {};
    const cursor = input.cursor?.trim() === "" || input.cursor === "0" ? undefined : input.cursor;
    const link = (input.params?.link || input.link) as any;
    
    const results = await notifications.listOptedInUsers({
      after: cursor,
      limit: Math.min(1000, Math.max(1, input.count || 200)),
    });
    
    const streakRecipients: any[] = [];
    const freshRecipients: any[] = [];
    
    for (const userId of results.userIds) {
      const streak = await getCurrentStreak(userId);
      if (streak > 0) {
        streakRecipients.push({
          userId: userId as any,
          link,
          data: { streak: String(streak) },
        });
      } else {
        freshRecipients.push({
          userId: userId as any,
          link,
          data: {},
        });
      }
    }
    
    await Promise.allSettled([
      streakRecipients.length > 0 && notifications.enqueue({
        title: STREAK_NOTIFICATION_TITLE,
        body: STREAK_NOTIFICATION_BODY,
        recipients: streakRecipients,
      }),
      freshRecipients.length > 0 && notifications.enqueue({
        title: STREAK_NOTIFICATION_TITLE,
        body: NON_STREAK_NOTIFICATION_BODY,
        recipients: freshRecipients,
      }),
    ]);
    
    if (results.next) {
      await scheduler.runJob({
        name: 'pn_campaign',
        data: { ...input, cursor: results.next },
        runAt: new Date(Date.now() + 1500)
      });
    }
    return c.json({ status: 'ok' });
  } catch (e: any) {
    console.error('Scheduler pn_campaign failed:', e);
    return c.json({ error: e.message || 'Scheduler failed' }, 500);
  }
});

// Menu Action Endpoints
app.post('/internal/menu/create-post', async (c) => {
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const mystery = await generateDailyCase(dateStr, true);
    await addArchiveDate(dateStr);

    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitCustomPost({
      subredditName: subreddit.name,
      title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`,
    });
    await registerCustomPost(post.id, dateStr, mystery.title, post.url);
    
    await scheduler.runJob({
      name: 'pn_campaign',
      data: { campaign: 'new-content', cursor: '', count: 200, params: { link: post.id } },
      runAt: new Date(Date.now() + 60 * 60 * 1000)
    });
    
    return c.json({ showToast: { text: `Success! Custom post created: ${post.id}` } });
  } catch (e: any) {
    console.error('Menu create-post failed:', e);
    return c.json({ showToast: { text: `Error creating custom post: ${e.message || e}`, appearance: 'danger' } });
  }
});

const server = createServer(async (req, res) => {
  await app.handle(req, res);
});

server.listen(getServerPort());

export default server;
