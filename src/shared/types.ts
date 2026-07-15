export interface HiddenAnswer {
  answer: string;
  embedding: number[];
}

export interface Mystery {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  scenario: string;
  initialClues: string[];
  fullStory: string;
  detectiveReport: string;
  timeline: string;
  evidenceExplanation: string;
  culprit: HiddenAnswer;
  motive: HiddenAnswer;
  method: HiddenAnswer;
  twist: HiddenAnswer;
  investigations: Record<string, string>; // Maps InvestigationAction to clue string
}

// Client-safe version of the mystery (withholding target solutions and embeddings)
export interface MysteryClient {
  id: string;
  date: string;
  title: string;
  scenario: string;
  initialClues: string[];
  solvedAnswers: {
    culprit?: string;
    motive?: string;
    method?: string;
    twist?: string;
  };
  unlockedInvestigations?: Record<string, string>; // Maps InvestigationAction to clue string
}

export interface GuessRecord {
  text: string;
  score: number; // Cosine similarity score
  status: 'Cold' | 'Warm' | 'Hot' | 'Very Hot' | 'Solved';
  closestCategory: 'culprit' | 'motive' | 'method' | 'twist';
  timestamp: string;
}

export interface PlayerProgress {
  username: string;
  date: string;
  solved: {
    culprit: boolean;
    motive: boolean;
    method: boolean;
    twist: boolean;
  };
  guesses: GuessRecord[];
  ip: number; // Investigation Points remaining
  revealedClues: string[]; // Clues unlocked by player
  attempts: number;
  completed: boolean;
  completedAt?: string;
  score: number;
}

// 10 Investigation types (expanded for Part 5)
export type InvestigationAction =
  | 'interview_witness'
  | 'search_room'
  | 'analyze_fingerprints'
  | 'check_cctv'
  | 'recover_files'
  | 'dna_analysis'
  | 'autopsy_report'
  | 'ballistics_test'
  | 'bank_records'
  | 'chemical_analysis';

export interface InvestigationDetail {
  action: InvestigationAction;
  label: string;
  cost: number;
  icon: string;
  description: string;
}

export const INVESTIGATIONS: Record<InvestigationAction, InvestigationDetail> = {
  interview_witness: {
    action: 'interview_witness',
    label: 'Interview Witness',
    cost: 10,
    icon: '🗣️',
    description: 'Question key witnesses near the scene to gather testimonials.'
  },
  search_room: {
    action: 'search_room',
    label: 'Search Room',
    cost: 10,
    icon: '🔍',
    description: 'Inspect desk drawers, trash bins, and safe zones for physical clues.'
  },
  analyze_fingerprints: {
    action: 'analyze_fingerprints',
    label: 'Analyze Fingerprints',
    cost: 15,
    icon: '🖐️',
    description: 'Lift dustings off door handles, weapons, and desk glass.'
  },
  check_cctv: {
    action: 'check_cctv',
    label: 'Check CCTV',
    cost: 15,
    icon: '📹',
    description: 'Examine building security recordings for timeline gaps.'
  },
  recover_files: {
    action: 'recover_files',
    label: 'Recover Deleted Files',
    cost: 20,
    icon: '💻',
    description: 'Snoop through the local PC hard-drive to recover shredded emails.'
  },
  dna_analysis: {
    action: 'dna_analysis',
    label: 'DNA Analysis',
    cost: 25,
    icon: '🧬',
    description: 'Run lab diagnostics on biological trace evidence to confirm identity.'
  },
  autopsy_report: {
    action: 'autopsy_report',
    label: 'Autopsy Report',
    cost: 15,
    icon: '🩺',
    description: 'Review the coroner report to verify cause and exact time of death.'
  },
  ballistics_test: {
    action: 'ballistics_test',
    label: 'Ballistics Test',
    cost: 20,
    icon: '🔫',
    description: 'Cross-examine bullet grooves and casing firing-pin impressions.'
  },
  bank_records: {
    action: 'bank_records',
    label: 'Bank Records',
    cost: 15,
    icon: '🏦',
    description: 'Audit wire transactions, credit accounts, and recent debts.'
  },
  chemical_analysis: {
    action: 'chemical_analysis',
    label: 'Chemical Analysis',
    cost: 20,
    icon: '🧪',
    description: 'Run spectroscopy scans to identify mysterious poisons or toxins.'
  }
};

// Player Progression Stats (Part 7)
export interface PlayerStats {
  username: string;
  gamesPlayed: number;
  gamesSolved: number;
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate?: string;
  achievements: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_solve: {
    id: 'first_solve',
    title: 'Rookie Detective',
    description: 'Solve your first daily case.',
    icon: '🕵️'
  },
  perfect_100: {
    id: 'perfect_100',
    title: 'Perfect File',
    description: 'Solve a case with a score of 100/100.',
    icon: '🌟'
  },
  streak_3: {
    id: 'streak_3',
    title: 'Unstoppable Sleuth',
    description: 'Maintain a 3-day case streak.',
    icon: '🔥'
  },
  ip_hoarder: {
    id: 'ip_hoarder',
    title: 'Frugal Inspector',
    description: 'Complete a case with 40 or more Investigation Points remaining.',
    icon: '⚡'
  },
  efficiency_master: {
    id: 'efficiency_master',
    title: 'Direct Deduction',
    description: 'Solve a case in 5 or fewer guess attempts.',
    icon: '🎯'
  }
};

export interface LeaderboardEntry {
  username: string;
  score: number;
  rank: number;
}

export interface ArchiveCase {
  date: string;
  title: string;
  completed: boolean;
  score: number;
}

export interface LauncherCaseMetadata {
  date: string;
  caseNumber: number;
  caseName: string;
  postId: string;
  redditUrl: string;
  difficulty?: number;
  solveCount?: number;
}

export interface GameStateResponse {
  mystery: MysteryClient;
  progress: PlayerProgress;
  stats: PlayerStats;
  isLauncher?: boolean;
  launcherPostId?: string;
  currentPostId?: string;
  todayCase?: LauncherCaseMetadata | null;
  yesterdayCase?: LauncherCaseMetadata | null;
  currentInvestigation?: LauncherCaseMetadata | null;
  archives?: (ArchiveCase & LauncherCaseMetadata & { difficulty: number; solveCount: number })[];
  solvedSummary?: {
    fullStory: string;
    detectiveReport: string;
    timeline: string;
    evidenceExplanation: string;
    culprit: string;
    motive: string;
    method: string;
    twist: string;
  };
}

export interface GuessRequest {
  guess: string;
  date?: string; // date query override for archives
}

export interface GuessResponse {
  progress: PlayerProgress;
  newGuess: GuessRecord;
  stats: PlayerStats;
  solvedSummary?: GameStateResponse['solvedSummary'];
}

export interface InvestigateRequest {
  action: InvestigationAction;
  date?: string;
}

export interface InvestigateResponse {
  progress: PlayerProgress;
  clue: string;
}

export interface LeaderboardResponse {
  topScores: LeaderboardEntry[];
  topStreaks: LeaderboardEntry[];
}

export interface ArchiveListResponse {
  cases: ArchiveCase[];
}
