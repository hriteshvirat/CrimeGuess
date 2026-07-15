import { reddit, context, redis, notifications, scheduler, createServer, getServerPort } from '@devvit/web/server';
import { EntrypointHeight } from '@devvit/reddit';
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
const CASE_1_SILICON_TEARS: Mystery = {
  id: 'case_1_silicon_tears',
  date: '2026-07-15',
  title: 'The Vault of Silicon Tears',
  scenario: 'Marcus Sterling, the eccentric billionaire CEO of Sterling Cybernetics, was found dead inside his hermetically sealed smart-home vault at 6:00 AM. The vault requires biometric scans and can only be opened from the inside, yet there is no sign of suicide. A half-empty glass of rare whiskey sits on his desk, alongside a shattered digital tablet.',
  initialClues: [
    'The smart-home logs show the vault door was locked at 11:30 PM and never opened until the police override at 6:00 AM.',
    'Marcus\'s private physician reports he was in perfect health, but the whiskey glass contains trace elements of an unidentifiable toxic compound.',
    'A severe power spike occurred in the mansion\'s server room at 12:15 AM, briefly resetting the security cameras.'
  ],
  culprit: {
    answer: 'accountant',
    veryHot: ['ca', 'chartered accountant', 'auditor', 'financial officer', 'controller'],
    hot: ['bookkeeper', 'finance', 'banker', 'treasurer'],
    warm: ['office worker', 'employee', 'manager', 'businessman'],
    cold: ['doctor', 'teacher', 'lawyer', 'engineer', 'artist', 'chef']
  },
  motive: {
    answer: 'embezzlement',
    veryHot: ['financial fraud', 'misappropriation', 'stealing', 'theft', 'funds'],
    hot: ['greed', 'debt', 'blackmail', 'money'],
    warm: ['corruption', 'coverup', 'fraud'],
    cold: ['love', 'jealousy', 'politics', 'revenge']
  },
  method: {
    answer: 'generator',
    veryHot: ['power', 'electricity', 'blackout', 'power failure', 'backup generator'],
    hot: ['power outage', 'electrical', 'camera reset', 'reboot'],
    warm: ['sabotage', 'tampering', 'shutdown'],
    cold: ['knife', 'gun', 'poison', 'bomb']
  },
  twist: {
    answer: 'insurance',
    veryHot: ['insurance fraud', 'insurance scam', 'claim', 'compensation'],
    hot: ['fraud', 'scam', 'company', 'corporate'],
    warm: ['coverup', 'inside job', 'executive'],
    cold: ['politics', 'spy', 'love', 'jealousy']
  },
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

const CASE_2_LAST_FLIGHT: Mystery = {
  id: 'case_2_last_flight',
  date: '2026-07-16',
  title: 'The Last Flight',
  scenario: 'Flight AX-271 departed from London to Singapore. Five hours into the flight, an investigative journalist was found dead inside the business-class restroom. No weapon. No struggle. No witnesses. Only clues.',
  initialClues: [
    'The victim entered carrying only a tablet.',
    'His smartwatch recorded oxygen levels rapidly dropping.',
    'Cabin crew smelled bitter almonds.',
    'Blood tests confirmed cyanide poisoning.',
    'The victim planned to expose an international corporation.',
    'A diplomatic passenger disappeared immediately after landing.',
    'Nobody entered the restroom after the victim.',
    'The ventilation briefly malfunctioned.'
  ],
  culprit: {
    answer: 'spy',
    veryHot: ['agent', 'operative', 'intelligence'],
    hot: ['assassin', 'hitman', 'mercenary'],
    warm: ['criminal', 'killer', 'officer'],
    cold: ['doctor', 'pilot', 'engineer', 'lawyer', 'teacher', 'chef']
  },
  motive: {
    answer: 'silence',
    veryHot: ['suppress', 'secrets', 'witness'],
    hot: ['expose', 'coverup', 'blackmail', 'greed'],
    warm: ['power', 'money', 'fear'],
    cold: ['love', 'accident', 'jealousy']
  },
  method: {
    answer: 'gas',
    veryHot: ['cyanide', 'poison', 'fumes', 'vapor'],
    hot: ['chemical', 'capsule', 'toxin'],
    warm: ['injection', 'drug', 'medicine'],
    cold: ['knife', 'bomb', 'gun', 'rope']
  },
  twist: {
    answer: 'diplomat',
    veryHot: ['embassy', 'immunity', 'ambassador', 'consulate'],
    hot: ['government', 'official', 'foreign'],
    warm: ['politics', 'agency', 'state'],
    cold: ['judge', 'mayor', 'police']
  },
  fullStory: 'The victim, an investigative journalist named Arthur Vance, was flying to Singapore to expose a massive bio-weapons deal by a private contractor. The culprit, a deep-cover operative (spy) disguised as a corporate executive, was sent to silence him. The spy hijacked the aircraft\'s ventilation controls to selectively release pressurized hydrogen cyanide gas into the business-class restroom when Arthur entered. To ensure successful delivery, they had replaced a medical canister in the cargo bay with a toxic agent. After the murder, the spy utilized diplomatic immunity to slip past customs immediately upon landing.',
  detectiveReport: 'Arthur Vance\'s death was a highly coordinated espionage assassination. The killer targeted the ventilation system to deliver hydrogen cyanide gas directly into the restroom, leaving no traces on the body except for the telltale bitter almond scent and oxygen drop. The culprit escaped using diplomatic channels, leaving the manifest as the only record of their presence.',
  timeline: '10:00 PM: Flight AX-271 takes off from London.\n02:30 AM: Medical cargo package is replaced/tampered with in the hold.\n03:00 AM: Arthur Vance enters the business-class restroom carrying his tablet.\n03:02 AM: Ventilation briefly malfunctions as toxic gas is routed into the restroom.\n03:04 AM: Arthur Vance collapses from hydrogen cyanide poisoning.\n08:00 AM: Flight lands in Singapore; diplomat passenger immediately departs customs without questioning.',
  evidenceExplanation: 'Ventilation: Brief power flicker on logs coincides with the gas delivery.\nCCTV: Confirmed no other passenger entered the restroom during the 2-minute window.\nAutopsy: Discovered cyanide poisoning via toxic chemical absorption.',
  investigations: {
    interview_witness: 'Nearby passenger heard violent coughing.',
    check_cctv: 'Nobody entered after the victim.',
    autopsy_report: 'Death occurred within two minutes.',
    chemical_analysis: 'Hydrogen cyanide detected.',
    search_room: 'Nothing suspicious recovered.',
    dna_analysis: 'One diplomatic passenger boarded.',
    recover_files: 'Medical package disappeared.',
    bank_records: 'Victim received anonymous warning payments.'
  },
  forensicsConfig: {
    interview_witness: { action: 'interview_witness', label: 'Interview Witness', cost: 0, icon: '🗣️', description: 'Question nearby passengers.', isUnlockedByDefault: true },
    check_cctv: { action: 'check_cctv', label: 'Check CCTV', cost: 0, icon: '📹', description: 'Review restroom entrance footage.', isUnlockedByDefault: true },
    autopsy_report: { action: 'autopsy_report', label: 'Autopsy', cost: 0, icon: '🩺', description: 'Check coroner findings.', isUnlockedByDefault: true },
    chemical_analysis: { action: 'chemical_analysis', label: 'Chemical Analysis', cost: 20, icon: '🧪', description: 'Run toxicology on cabin samples.' },
    search_room: { action: 'search_room', label: 'Carry-on Inspection', cost: 15, icon: '🔍', description: 'Inspect the victim\'s carry-on baggage.' },
    dna_analysis: { action: 'dna_analysis', label: 'Flight Manifest', cost: 0, icon: '📜', description: 'Verify passenger passport logs.', isUnlockedByDefault: true },
    recover_files: { action: 'recover_files', label: 'Cargo Records', cost: 20, icon: '📦', description: 'Examine shipping manifests in cargo.' },
    bank_records: { action: 'bank_records', label: 'Financial Records', cost: 25, icon: '🏦', description: 'Audit victim\'s bank transactions.' }
  }
};

const STREAK_NOTIFICATION_TITLE = "Today's challenge is ready!";
const STREAK_NOTIFICATION_BODY = "Play now to keep your {{streak}}-day streak alive.";
const NON_STREAK_NOTIFICATION_BODY = "Jump back in and play today's challenge.";

async function generateDailyCase(dateStr: string): Promise<Mystery> {
  if (dateStr === '2026-07-15') {
    return CASE_1_SILICON_TEARS;
  }
  return CASE_2_LAST_FLIGHT;
}

function getOfficialPostTitle(caseName: string, dateStr: string): string {
  const baseDate = new Date('2026-07-15');
  const currentDate = new Date(dateStr);
  const diffTime = Math.abs(currentDate.getTime() - baseDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const caseNum = isNaN(diffDays) ? 1 : diffDays + 1;
  return `🕵 CrimeGuess | Case #${caseNum}: "${caseName}" - ${dateStr}`;
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
    unlockedInvestigations,
    forensicsConfig: mystery.forensicsConfig
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

  const mystery = await generateDailyCase(dateStr);
  const revealedClues = [...initialClues];
  if (mystery.forensicsConfig) {
    for (const [action, config] of Object.entries(mystery.forensicsConfig)) {
      if (config.isUnlockedByDefault) {
        const clueText = mystery.investigations[action];
        if (clueText && !revealedClues.includes(clueText)) {
          revealedClues.push(clueText);
        }
      }
    }
  }

  const progress: PlayerProgress = {
    username,
    date: dateStr,
    solved: { culprit: false, motive: false, method: false, twist: false },
    guesses: [],
    ip: 60, // 60 IP base
    revealedClues,
    attempts: 0,
    completed: false,
    score: 100
  };

  const stats = await getOrCreatePlayerStats(username);
  if (stats.lastPlayedDate !== dateStr) {
    stats.lastPlayedDate = dateStr;
    await redis.set(`player_stats:${username}`, JSON.stringify(stats));
  }

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
async function processGuess(
  username: string,
  dateStr: string,
  guessText: string,
  category: 'culprit' | 'motive' | 'method' | 'twist'
): Promise<GuessResponse> {
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
  const cleanGuess = guessText.trim().toLowerCase();

  const target = mystery[category];
  let status: 'Cold' | 'Warm' | 'Hot' | 'Very Hot' | 'Solved' = 'Cold';
  let highestScore = 0.05;
  let hint: string | undefined = undefined;

  // Exact Match
  if (cleanGuess === target.answer.toLowerCase()) {
    status = 'Solved';
    highestScore = 1.0;
  }
  // Very Hot Match
  else if (target.veryHot.some(val => cleanGuess === val.toLowerCase() || val.toLowerCase().includes(cleanGuess) || cleanGuess.includes(val.toLowerCase()))) {
    status = 'Very Hot';
    highestScore = 0.95;
  }
  // Hot Match
  else if (target.hot.some(val => cleanGuess === val.toLowerCase() || val.toLowerCase().includes(cleanGuess) || cleanGuess.includes(val.toLowerCase()))) {
    status = 'Hot';
    highestScore = 0.80;
  }
  // Warm Match
  else if (target.warm.some(val => cleanGuess === val.toLowerCase() || val.toLowerCase().includes(cleanGuess) || cleanGuess.includes(val.toLowerCase()))) {
    status = 'Warm';
    highestScore = 0.55;
  }
  // Cold Match
  else if (target.cold.some(val => cleanGuess === val.toLowerCase() || val.toLowerCase().includes(cleanGuess) || cleanGuess.includes(val.toLowerCase()))) {
    status = 'Cold';
    highestScore = 0.25;
  }
  // Smart Category Hints
  else {
    // 1. Profession checks
    const professionKeywords = ['doctor', 'pilot', 'engineer', 'lawyer', 'teacher', 'chef', 'accountant', 'scientist', 'spy', 'assassin', 'agent'];
    const hasProfession = professionKeywords.some(kw => cleanGuess.includes(kw));

    // 2. Political connection checks
    const politicalKeywords = ['government', 'embassy', 'diplomat', 'politics', 'official', 'ambassador', 'consulate', 'immunity'];
    const hasPolitical = politicalKeywords.some(kw => cleanGuess.includes(kw));

    // 3. Murder delivery checks
    const deliveryKeywords = ['injection', 'drug', 'medicine', 'cyanide', 'poison', 'fumes', 'vapor', 'gas', 'toxin', 'chemical'];
    const hasDelivery = deliveryKeywords.some(kw => cleanGuess.includes(kw));

    // 4. Motive family checks
    const motiveKeywords = ['money', 'greed', 'cash', 'wealth', 'financial', 'embezzlement', 'fraud', 'theft', 'silence'];
    const hasMotive = motiveKeywords.some(kw => cleanGuess.includes(kw));

    if (hasProfession) {
      status = 'Cold';
      highestScore = 0.25;
      hint = 'Profession detected. Wrong profession.';
    } else if (hasPolitical) {
      status = 'Cold';
      highestScore = 0.25;
      hint = 'Political connection detected. Think more specific.';
    } else if (hasDelivery) {
      status = 'Cold';
      highestScore = 0.25;
      hint = 'Correct murder category. Different delivery method.';
    } else if (hasMotive) {
      status = 'Cold';
      highestScore = 0.25;
      hint = 'Correct motive family. Think beyond financial gain.';
    } else {
      status = 'Cold';
      highestScore = 0.05;
      hint = 'No meaningful connection found.';
    }
  }

  const closestCat = category;

  if (status === 'Solved' && !progress.solved[closestCat]) {
    progress.solved[closestCat] = true;
    progress.ip += 15; // solve bonus
  }

  const newGuess: GuessRecord = {
    text: guessText.trim(),
    score: highestScore,
    status,
    closestCategory: closestCat,
    timestamp: new Date().toISOString(),
    hint
  };

  progress.guesses.push(newGuess);

  // Store every guess in KV Storage
  const guessLogEntry = {
    userId: username,
    caseId: dateStr,
    category: closestCat,
    guess: guessText.trim(),
    timestamp: newGuess.timestamp,
    similarity: highestScore,
    result: status
  };
  const logsRaw = await redis.get(`case_guess_logs:${dateStr}`);
  const logs = logsRaw ? JSON.parse(logsRaw) : [];
  logs.unshift(guessLogEntry);
  await redis.set(`case_guess_logs:${dateStr}`, JSON.stringify(logs));

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

  const standardDetail = INVESTIGATIONS[action];
  const overrideDetail = mystery.forensicsConfig?.[action];
  const detail = overrideDetail ? { ...standardDetail, ...overrideDetail } : standardDetail;
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
  const dates = ['2026-07-16', '2026-07-15'];
  const cases: any[] = [];

  for (const date of dates) {
    const mystery = await generateDailyCase(date);
    const progressKey = `player_progress:${username}:${date}`;
    const progressRaw = await redis.get(progressKey);
    
    let completed = false;
    let score = 0;
    if (progressRaw) {
      const progress = JSON.parse(progressRaw);
      completed = progress.completed;
      score = progress.score;
    }

    cases.push({
      date,
      title: mystery.title,
      completed,
      score,
      caseNumber: date === '2026-07-16' ? 2 : 1,
      caseName: mystery.title,
      postId: date === '2026-07-16' ? 't3_1uxlg5y' : 't3_1uxb1uk',
      redditUrl: `https://www.reddit.com/comments/${date === '2026-07-16' ? '1uxlg5y' : '1uxb1uk'}`,
      difficulty: date === '2026-07-16' ? 4 : 3,
      solveCount: date === '2026-07-16' ? 2413 : 8421
    });
  }

  return { cases };
}

async function registerCustomPost(postId: string, dateStr: string, caseTitle: string, postUrl?: string, postType: 'DAILY_CASE' | 'COMMUNITY_CASE' = 'DAILY_CASE'): Promise<any> {
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
  await redis.set(`post_type:${postId}`, postType);
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

    let resolvedPostType: 'HEADQUARTERS' | 'DAILY_CASE' | 'COMMUNITY_CASE' = 'DAILY_CASE';
    if (currentPostId) {
      const savedType = await redis.get(`post_type:${currentPostId}`) as any;
      if (savedType) {
        resolvedPostType = savedType;
      } else if (currentPostId === launcherPostId) {
        resolvedPostType = 'HEADQUARTERS';
      }
    }

    const isLauncher = resolvedPostType === 'HEADQUARTERS';

    console.log(`[GET_STATE DEBUG] Current Post ID: "${currentPostId || 'None'}" | Resolved Post Type: "${resolvedPostType}"`);

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
      resolvedPostType,
      launcherPostId,
      currentPostId
    };

    if (isLauncher) {
      response.todayCase = {
        date: '2026-07-16',
        caseNumber: 2,
        caseName: 'The Last Flight',
        postId: 't3_1uxlg5y',
        redditUrl: 'https://www.reddit.com/comments/1uxlg5y',
        difficulty: 4,
        solveCount: 2413
      };

      response.yesterdayCase = {
        date: '2026-07-15',
        caseNumber: 1,
        caseName: 'The Vault of Silicon Tears',
        postId: 't3_1uxb1uk',
        redditUrl: 'https://www.reddit.com/comments/1uxb1uk',
        difficulty: 3,
        solveCount: 8421
      };

      // Find current investigation dynamically
      let currentInvestigation = null;
      const todayProg = await getOrCreatePlayerProgress(username, '2026-07-16', CASE_2_LAST_FLIGHT.initialClues);
      const yesterdayProg = await getOrCreatePlayerProgress(username, '2026-07-15', CASE_1_SILICON_TEARS.initialClues);

      if (!todayProg.completed && todayProg.attempts > 0) {
        currentInvestigation = response.todayCase;
      } else if (!yesterdayProg.completed && yesterdayProg.attempts > 0) {
        currentInvestigation = response.yesterdayCase;
      } else {
        if (stats.lastPlayedDate === '2026-07-15') {
          currentInvestigation = response.yesterdayCase;
        } else {
          currentInvestigation = response.todayCase;
        }
      }
      response.currentInvestigation = currentInvestigation;

      // Fetch archive list
      const archiveList = await getArchiveList(username);
      response.archives = archiveList.cases;
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
    const category = body.category || 'culprit';
    const state = await processGuess(username, dateStr, guess, category);
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
    await generateDailyCase(dateStr);
    return c.json({ success: true });
  } catch (err: any) {
    console.error('GENERATE_CASE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});



app.post('/api/log', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    console.log(`[CLIENT-RELAY] ${body.message}`);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false });
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

// Redis list/set helper simulations
async function getRedisSet(key: string): Promise<string[]> {
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : [];
}

async function addToRedisSet(key: string, value: string): Promise<void> {
  const current = await getRedisSet(key);
  if (!current.includes(value)) {
    current.push(value);
    await redis.set(key, JSON.stringify(current));
  }
}

async function removeFromRedisSet(key: string, value: string): Promise<void> {
  const current = await getRedisSet(key);
  const updated = current.filter((item) => item !== value);
  await redis.set(key, JSON.stringify(updated));
}

app.post('/api/submit-case', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const username = context.username || 'Guest_Detective';
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submission = {
      id: subId,
      author: username,
      authorRedditId: context.userId || '',
      createdDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      caseData: body.caseData
    };
    await redis.set(`case_submission:${subId}`, JSON.stringify(submission));
    await addToRedisSet(`submissions:pending`, subId);
    return c.json({ success: true, submissionId: subId });
  } catch (err: any) {
    console.error('SUBMIT_CASE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/get-pending-cases', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const isMockMod = body.isMockMod || (context.username === 'Guest_Detective');
    const isMod = isMockMod || (await isCurrentUserModerator());
    if (!isMod) {
      return c.json({ error: 'Unauthorized moderator access required.' }, 403);
    }
    const subIds = await getRedisSet(`submissions:pending`);
    const submissions = [];
    for (const subId of subIds) {
      const raw = await redis.get(`case_submission:${subId}`);
      if (raw) {
        submissions.push(JSON.parse(raw));
      }
    }
    return c.json({ submissions });
  } catch (err: any) {
    console.error('GET_PENDING_CASES failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/approve-case', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const subId = body.submissionId;
    const updatedCaseData = body.caseData;
    const isMockMod = body.isMockMod || (context.username === 'Guest_Detective');
    const isMod = isMockMod || (await isCurrentUserModerator());
    if (!isMod) {
      return c.json({ error: 'Unauthorized moderator access required.' }, 403);
    }

    const subRaw = await redis.get(`case_submission:${subId}`);
    if (!subRaw) {
      return c.json({ error: 'Submission file not found.' }, 404);
    }
    const submission = JSON.parse(subRaw);
    submission.caseData = updatedCaseData;
    submission.status = 'APPROVED';

    const dateStr = new Date().toISOString().split('T')[0];
    
    // Fallback Mock values if live submitCustomPost fails (local testing)
    let postId = `t3_mock_${Date.now()}`;
    let postUrl = `https://www.reddit.com/r/crime_guess_dev/comments/${postId}`;
    try {
      const subreddit = await reddit.getCurrentSubreddit();
      const post = await reddit.submitCustomPost({
        subredditName: subreddit.name,
        title: `📝 CrimeGuess Community Case | "${updatedCaseData.title}"`,
        entry: 'default',
        styles: {
          height: EntrypointHeight.TALL,
          backgroundColor: '#0a0b0eff',
          backgroundColorDark: '#0a0b0eff'
        }
      });
      postId = post.id;
      postUrl = post.url;
    } catch (e) {
      console.warn('[Moderation] Custom post submit failed. Using fallback mock post properties.', e);
    }

    // Embeddings generation bypassed (offline mode)
    const embCulprit: number[] = [];
    const embMotive: number[] = [];
    const embMethod: number[] = [];
    const embTwist: number[] = [];

    const mystery = {
      id: `custom_${subId}`,
      date: dateStr,
      title: updatedCaseData.title,
      scenario: updatedCaseData.story,
      initialClues: updatedCaseData.initialClues,
      fullStory: updatedCaseData.story,
      detectiveReport: updatedCaseData.story,
      timeline: updatedCaseData.timeline,
      evidenceExplanation: updatedCaseData.evidenceExplanation,
      culprit: { answer: updatedCaseData.culprit, embedding: embCulprit },
      motive: { answer: updatedCaseData.motive, embedding: embMotive },
      method: { answer: updatedCaseData.method, embedding: embMethod },
      twist: { answer: updatedCaseData.twist, embedding: embTwist },
      investigations: updatedCaseData.investigations
    };

    await redis.set(`mystery:${dateStr}`, JSON.stringify(mystery));
    const metadata = await registerCustomPost(postId, dateStr, updatedCaseData.title, postUrl, 'COMMUNITY_CASE');
    
    // Update submission record
    await redis.set(`case_submission:${subId}`, JSON.stringify(submission));
    await removeFromRedisSet(`submissions:pending`, subId);
    await addToRedisSet(`submissions:approved`, subId);

    return c.json({ success: true, metadata });
  } catch (err: any) {
    console.error('APPROVE_CASE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/reject-case', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const subId = body.submissionId;
    const reason = body.reason;
    const isMockMod = body.isMockMod || (context.username === 'Guest_Detective');
    const isMod = isMockMod || (await isCurrentUserModerator());
    if (!isMod) {
      return c.json({ error: 'Unauthorized moderator access required.' }, 403);
    }

    const subRaw = await redis.get(`case_submission:${subId}`);
    if (subRaw) {
      const submission = JSON.parse(subRaw);
      submission.status = 'REJECTED';
      submission.rejectionReason = reason;
      await redis.set(`case_submission:${subId}`, JSON.stringify(submission));
    }
    await removeFromRedisSet(`submissions:pending`, subId);
    return c.json({ success: true });
  } catch (err: any) {
    console.error('REJECT_CASE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/rate-case', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date;
    const rating = body.rating;
    const username = context.username || 'Guest_Detective';

    const ratingsKey = `case:ratings:${dateStr}`;
    const totalRatingsKey = `case:total_ratings:${dateStr}`;
    const userRatingKey = `user_rating:${username}:${dateStr}`;

    const alreadyRated = await redis.get(userRatingKey);
    if (!alreadyRated) {
      await redis.set(userRatingKey, 'true');
      await redis.incrBy(totalRatingsKey, 1);
      
      const sumRaw = await redis.get(ratingsKey);
      const currentSum = sumRaw ? parseFloat(sumRaw) : 0;
      const nextSum = currentSum + parseFloat(String(rating));
      await redis.set(ratingsKey, String(nextSum));
    }

    const total = Number(await redis.get(totalRatingsKey)) || 0;
    const sum = Number(await redis.get(ratingsKey)) || 0;
    const average = total > 0 ? sum / total : 0;

    return c.json({ success: true, averageRating: average, totalRatings: total });
  } catch (err: any) {
    console.error('RATE_CASE failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

app.post('/api/get-community-files', async (c) => {
  try {
    const dates = await getArchiveDates();
    const communityCases = [];
    for (const date of dates) {
      const metadataRaw = await redis.get(`case:by_date:${date}`);
      if (!metadataRaw) continue;
      const metadata = JSON.parse(metadataRaw);
      
      const mysteryKey = `mystery:${date}`;
      const mysteryRaw = await redis.get(mysteryKey);
      let author = 'Central Command';
      let estimatedTime = '15 mins';
      if (mysteryRaw) {
        const mystery = JSON.parse(mysteryRaw);
        if (mystery.id && mystery.id.startsWith('custom_')) {
          const subId = mystery.id.replace('custom_', '');
          const subRaw = await redis.get(`case_submission:${subId}`);
          if (subRaw) {
            const sub = JSON.parse(subRaw);
            author = sub.author;
            estimatedTime = sub.caseData.estimatedTime || '15 mins';
          }
        }
      }

      const totalRatings = Number(await redis.get(`case:total_ratings:${date}`)) || 0;
      const ratingsSum = Number(await redis.get(`case:ratings:${date}`)) || 0;
      const averageRating = totalRatings > 0 ? ratingsSum / totalRatings : 4.5;

      const playCount = Number(await redis.get(`case:play_count:${date}`)) || (metadata.caseNumber * 12 + 124);
      const solvedCount = Number(await redis.get(`case:solve_count:${date}`)) || (metadata.caseNumber * 8 + 84);
      const difficulty = (metadata.caseName.length % 2) + 3;

      communityCases.push({
        ...metadata,
        author,
        estimatedTime,
        difficulty,
        averageRating,
        totalRatings,
        playCount,
        solvedCount
      });
    }
    return c.json({ cases: communityCases });
  } catch (err: any) {
    console.error('GET_COMMUNITY_FILES failed:', err);
    return c.json({ error: err.message || 'Server error' }, 500);
  }
});

async function isCurrentUserModerator(): Promise<boolean> {
  if (!context.username) return false;
  try {
    const subreddit = await reddit.getCurrentSubreddit();
    const mods = await reddit.getModerators({ subredditName: subreddit.name }).all();
    return mods.some((m: any) => m.username === context.username);
  } catch (err) {
    console.warn('Moderator verification check error:', err);
    return false;
  }
}

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
      entry: 'default',
      styles: {
        height: EntrypointHeight.TALL,
        backgroundColor: '#0a0b0eff',
        backgroundColorDark: '#0a0b0eff'
      }
    });
    await redis.set('launcher:post_id', launcherPost.id);
    await redis.set(`post_type:${launcherPost.id}`, 'HEADQUARTERS');
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
    const mystery = await generateDailyCase(dateStr);
    await addArchiveDate(dateStr);

    const body = await c.req.json().catch(() => ({}));
    const subredditId = body.subreddit?.id || context.subredditId;
    
    await ensureLauncherPost(subredditId);

    if (subredditId) {
      const subreddit = await reddit.getSubredditById(subredditId);
      if (subreddit) {
        const firstPost = await reddit.submitCustomPost({
          subredditName: subreddit.name,
          title: getOfficialPostTitle(mystery.title, dateStr),
          entry: 'default',
          styles: {
            height: EntrypointHeight.TALL,
            backgroundColor: '#0a0b0eff',
            backgroundColorDark: '#0a0b0eff'
          }
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

    // Auto-seed Today's Case (Case #2) on upgrade!
    try {
      const dateStr = '2026-07-16';
      const mystery = await generateDailyCase(dateStr);
      const targetSubredditId = subredditId || context.subredditId;
      if (targetSubredditId) {
        const subreddit = await reddit.getSubredditById(targetSubredditId);
        if (subreddit) {
          const existingRecord = await redis.get(`case:by_date:${dateStr}`);
          if (!existingRecord) {
            console.log(`[Auto-Seed] Submitting Today's Case: "${mystery.title}" on r/${subreddit.name}...`);
            const post = await reddit.submitCustomPost({
              subredditName: subreddit.name,
              title: `🕵 CrimeGuess | Case #2: "The Last Flight" - ${dateStr}`,
              entry: 'default',
              styles: {
                height: EntrypointHeight.TALL,
                backgroundColor: '#0a0b0eff',
                backgroundColorDark: '#0a0b0eff'
              }
            });
            await registerCustomPost(post.id, dateStr, mystery.title, post.url);
            console.log(`[Auto-Seed] Today's Case Post successfully created: ${post.id} | URL: ${post.url}`);
          } else {
            console.log(`[Auto-Seed] Today's Case already registered: ${existingRecord}`);
          }
        }
      }
    } catch (err: any) {
      console.error('[Auto-Seed] Today\'s Case seeding failed:', err);
    }

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
      const mystery = await generateDailyCase(dateStr);
      await addArchiveDate(dateStr);

      const subredditId = event.subreddit?.id || context.subredditId;
      if (subredditId) {
        const subreddit = await reddit.getSubredditById(subredditId);
        if (subreddit) {
          const post = await reddit.submitCustomPost({
            subredditName: subreddit.name,
            title: getOfficialPostTitle(mystery.title, dateStr),
            entry: 'default',
            styles: {
              height: EntrypointHeight.TALL,
              backgroundColor: '#0a0b0eff',
              backgroundColorDark: '#0a0b0eff'
            }
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
    const mystery = await generateDailyCase(dateStr);
    await addArchiveDate(dateStr);

    if (context.subredditId) {
      const subreddit = await reddit.getSubredditById(context.subredditId);
      if (subreddit) {
        const newPost = await reddit.submitCustomPost({
          subredditName: subreddit.name,
          title: getOfficialPostTitle(mystery.title, dateStr),
          entry: 'default',
          styles: {
            height: EntrypointHeight.TALL,
            backgroundColor: '#0a0b0eff',
            backgroundColorDark: '#0a0b0eff'
          }
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
    const mystery = await generateDailyCase(dateStr);
    await addArchiveDate(dateStr);

    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitCustomPost({
      subredditName: subreddit.name,
      title: getOfficialPostTitle(mystery.title, dateStr),
      entry: 'default',
      styles: {
        height: EntrypointHeight.TALL,
        backgroundColor: '#0a0b0eff',
        backgroundColorDark: '#0a0b0eff'
      }
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
