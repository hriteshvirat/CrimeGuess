import React, { useState, useEffect, useRef } from 'react';
import {
  GameStateResponse,
  GuessRecord,
  MysteryClient,
  PlayerProgress,
  PlayerStats,
  INVESTIGATIONS,
  InvestigationAction,
  LeaderboardResponse,
  ArchiveCase,
  LauncherCaseMetadata,
  CaseSubmission,
  CustomCaseData,
  CommunityCaseMetadata
} from '../shared/types';
import PhaserGame from './game/PhaserGame';
import Sidebar from './components/Sidebar';
import DeductionConsole from './components/DeductionConsole';
import ForensicsLab from './components/ForensicsLab';
import ProfilePanel from './components/ProfilePanel';
import LeaderboardPanel from './components/LeaderboardPanel';
import ArchivesPanel from './components/ArchivesPanel';
import FilingCabinet from './components/FilingCabinet';
import CaseEditor from './components/CaseEditor';
import ModeratorReview from './components/ModeratorReview';
import { executeMockRequest } from './utils/mockServer';
// @ts-ignore
import { getWebViewMode, addWebViewModeListener, removeWebViewModeListener, requestExpandedMode } from '@devvit/client';

const pendingRequests = new Map<
  string,
  { resolve: (val: any) => void; reject: (err: any) => void }
>();

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    const { data } = event;
    if (!data) return;

    const payload = data.type === 'devvit-message' ? data.message : data;
    if (!payload || !payload.type) return;

    const request = pendingRequests.get(payload.requestId);
    if (request) {
      pendingRequests.delete(payload.requestId);
      if (payload.type === 'ERROR') {
        request.reject(new Error(payload.error || 'Server error'));
      } else {
        request.resolve(payload.data);
      }
    }
  });
}

async function sendToHost<T>(type: string, payload?: any): Promise<T> {
  const isMockMode = typeof window !== 'undefined' && window.parent === window;
  if (isMockMode) {
    return executeMockRequest<T>(type, payload);
  }

  const route = `/api/${type.toLowerCase().replace(/_/g, '-')}`;
  const response = await fetch(route, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP error ${response.status}`);
  }

  const json = await response.json();
  return json as T;
}

export function relayLog(msg: string) {
  console.log(msg);
  fetch('/api/log', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: msg })
  }).catch(() => {});
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('office');
  const [activeDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [viewMode, setViewMode] = useState<'inline' | 'expanded'>(() => {
    try {
      const mode = getWebViewMode();
      // Default to expanded for local mock mode
      const isMockMode = typeof window !== 'undefined' && window.parent === window;
      if (isMockMode) return 'expanded';
      return mode || 'inline';
    } catch (e) {
      return 'expanded';
    }
  });

  const [postType, setPostType] = useState<'HEADQUARTERS' | 'DAILY_CASE' | 'COMMUNITY_CASE'>('DAILY_CASE');

  useEffect(() => {
    try {
      const handleModeChange = (newMode: 'inline' | 'expanded') => {
        setViewMode(newMode);
      };
      addWebViewModeListener(handleModeChange);
      return () => {
        removeWebViewModeListener(handleModeChange);
      };
    } catch (e) {
      // ignore
    }
  }, []);

  // Launcher state
  const [isLauncher, setIsLauncher] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [hqTab, setHqTab] = useState<'menu' | 'archives' | 'profile' | 'leaderboard' | 'settings' | 'submit_case' | 'community_files' | 'moderation'>('menu');

  const expandButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (viewMode !== 'inline') return;
    const btn = expandButtonRef.current;
    if (!btn) return;

    const handleNativeClick = (e: MouseEvent) => {
      relayLog('ENTER HQ CLICK');
      try {
        requestExpandedMode(e, 'game');
      } catch (err) {
        console.error('Failed to request expanded mode:', err);
      }
    };

    btn.addEventListener('click', handleNativeClick);
    return () => {
      btn.removeEventListener('click', handleNativeClick);
    };
  }, [viewMode, isLauncher, loading]);

  // Multi-post metadata
  const [todayCase, setTodayCase] = useState<LauncherCaseMetadata | null>(null);
  const [yesterdayCase, setYesterdayCase] = useState<LauncherCaseMetadata | null>(null);
  const [currentInvestigation, setCurrentInvestigation] = useState<LauncherCaseMetadata | null>(null);
  const [detailedArchives, setDetailedArchives] = useState<(ArchiveCase & LauncherCaseMetadata & { difficulty: number; solveCount: number })[]>([]);

  // Community Cases & submissions
  const [communityCases, setCommunityCases] = useState<CommunityCaseMetadata[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<CaseSubmission[]>([]);
  const [isMockMod, setIsMockMod] = useState(true);
  const [submittingCase, setSubmittingCase] = useState(false);
  const [loadingCommunityCases, setLoadingCommunityCases] = useState(false);
  const [loadingPendingSubmissions, setLoadingPendingSubmissions] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  // Category Selection state
  const [selectedCategory, setSelectedCategory] = useState<'culprit' | 'motive' | 'method' | 'twist'>('culprit');

  // Daily Case Game states
  const [mystery, setMystery] = useState<MysteryClient | null>(null);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [solvedSummary, setSolvedSummary] = useState<GameStateResponse['solvedSummary'] | null>(null);

  // Dynamic lists
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);

  // Settings states
  const [pushOptedIn, setPushOptedIn] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Guess / Clues input states
  const [guessInput, setGuessInput] = useState('');
  const [submittingGuess, setSubmittingGuess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // UI state
  const [toastText, setToastText] = useState<string | null>(null);
  const cluesEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    loadGameState(activeDate);
  }, [activeDate]);

  // Event bindings
  useEffect(() => {
    const handleFocusGuess = () => {
      const input = document.querySelector('.console-input') as HTMLInputElement;
      if (input) input.focus();
    };
    const handleNavTab = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab) setActiveTab(tab);
    };
    const handleLauncherBegin = () => {
      console.log('[React App] Received PHASER_LAUNCHER_BEGIN. Transitioning to Headquarters...');
      setShowIntro(false);
      setHqTab('menu');
    };

    window.addEventListener('PHASER_FOCUS_GUESS', handleFocusGuess);
    window.addEventListener('PHASER_NAV_TAB', handleNavTab);
    window.addEventListener('PHASER_LAUNCHER_BEGIN', handleLauncherBegin);

    return () => {
      window.removeEventListener('PHASER_FOCUS_GUESS', handleFocusGuess);
      window.removeEventListener('PHASER_NAV_TAB', handleNavTab);
      window.removeEventListener('PHASER_LAUNCHER_BEGIN', handleLauncherBegin);
    };
  }, []);

  // Sync tab loading logic
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    } else if (activeTab === 'archives') {
      loadArchives();
    }
  }, [activeTab]);

  useEffect(() => {
    if (hqTab === 'leaderboard') {
      loadLeaderboard();
    } else if (hqTab === 'settings') {
      loadPushSettings();
    } else if (hqTab === 'community_files' || hqTab === 'archives') {
      loadCommunityFiles();
    } else if (hqTab === 'moderation') {
      loadPendingSubmissions();
    }
  }, [hqTab, isMockMod]);

  const loadCommunityFiles = async () => {
    try {
      setLoadingCommunityCases(true);
      const res = await sendToHost<{ cases: CommunityCaseMetadata[] }>('GET_COMMUNITY_FILES');
      setCommunityCases(res.cases || []);
    } catch (err: any) {
      showToast('Failed to load community files cabinet.');
    } finally {
      setLoadingCommunityCases(false);
    }
  };

  const loadPendingSubmissions = async () => {
    try {
      setLoadingPendingSubmissions(true);
      const res = await sendToHost<{ submissions: CaseSubmission[] }>('GET_PENDING_CASES', { isMockMod });
      setPendingSubmissions(res.submissions || []);
    } catch (err: any) {
      showToast('Failed to pull pending cases.');
    } finally {
      setLoadingPendingSubmissions(false);
    }
  };

  const handleCaseSubmit = async (caseData: CustomCaseData) => {
    try {
      setSubmittingCase(true);
      const res = await sendToHost<{ success: boolean }>('SUBMIT_CASE', { caseData });
      if (res.success) {
        showToast('🚀 Case submitted successfully! Pending moderator review.');
        setHqTab('menu');
      }
    } catch (err: any) {
      showToast(err.message || 'Submission failed.');
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleApproveCase = async (submissionId: string, caseData: CustomCaseData) => {
    try {
      const res = await sendToHost<{ success: boolean }>('APPROVE_CASE', { submissionId, caseData, isMockMod });
      if (res.success) {
        showToast('✓ Case Approved and Published!');
        loadPendingSubmissions();
      }
    } catch (err: any) {
      showToast(err.message || 'Approval failed.');
    }
  };

  const handleRejectCase = async (submissionId: string, reason: string) => {
    try {
      const res = await sendToHost<{ success: boolean }>('REJECT_CASE', { submissionId, reason, isMockMod });
      if (res.success) {
        showToast('🛑 Case Rejected and returned to author.');
        loadPendingSubmissions();
      }
    } catch (err: any) {
      showToast(err.message || 'Rejection failed.');
    }
  };

  const handleRateCase = async (rating: number) => {
    if (!mystery) return;
    try {
      const res = await sendToHost<{ success: boolean; averageRating: number }>('RATE_CASE', { date: mystery.date, rating });
      if (res.success) {
        setUserRating(rating);
        showToast(`★ Rated: ${rating} stars!`);
      }
    } catch (err: any) {
      showToast('Rating failed.');
    }
  };

  const loadPushSettings = async () => {
    try {
      const res = await sendToHost<{ isOptedIn: boolean }>('GET_PUSH_STATE');
      setPushOptedIn(res.isOptedIn);
    } catch (err: any) {
      console.error('Failed to get push state:', err);
    }
  };

  useEffect(() => {
    if (cluesEndRef.current) {
      cluesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [progress?.revealedClues]);

  const showToast = (text: string) => {
    setToastText(text);
    setTimeout(() => setToastText(null), 4000);
  };

  const loadGameState = async (dateStr: string) => {
    try {
      setLoading(true);
      setFeedbackMsg(null);
      const res = await sendToHost<GameStateResponse>('GET_STATE', { date: dateStr });
      setMystery(res.mystery);
      setProgress(res.progress);
      setStats(res.stats);
      
      const resolved = res.resolvedPostType || 'DAILY_CASE';
      setPostType(resolved);
      setIsLauncher(resolved === 'HEADQUARTERS');



      relayLog(`[App CLIENT DEBUG] Current Post ID: "${res.currentPostId || 'None'}"`);
      relayLog(`[App CLIENT DEBUG] Resolved Post Type: "${resolved}"`);
      relayLog(`[App CLIENT DEBUG] isLauncher: ${resolved === 'HEADQUARTERS'}`);

      // Reset routing/navigation states dynamically to ensure no state carries over between posts
      if (resolved === 'HEADQUARTERS') {
        setShowIntro(true);
        setHqTab('menu');
      } else {
        setActiveTab('office');
      }

      setTodayCase(res.todayCase || null);
      setYesterdayCase(res.yesterdayCase || null);
      setCurrentInvestigation(res.currentInvestigation || null);
      if (res.archives) {
        setDetailedArchives(res.archives);
      }
      if (res.solvedSummary) {
        setSolvedSummary(res.solvedSummary);
      } else {
        setSolvedSummary(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Error pulling daily archives.');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await sendToHost<LeaderboardResponse>('GET_LEADERBOARD');
      setLeaderboard(res);
    } catch (err: any) {
      showToast('Failed to pull leaderboard database.');
    }
  };

  const loadArchives = async () => {
    try {
      const res = await sendToHost<{ cases: any[] }>('GET_ARCHIVE');
      setDetailedArchives(res.cases);
    } catch (err: any) {
      showToast('Failed to load case catalog.');
    }
  };



  const handleTogglePush = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    try {
      setSavingSettings(true);
      const res = await sendToHost<{ success: boolean; pushState: boolean }>('SET_PUSH_STATE', { pushState: nextVal });
      setPushOptedIn(res.pushState);
      showToast(res.pushState ? '🔔 Opted into daily case push alerts!' : '🔕 Opted out of push alerts.');
    } catch (err: any) {
      showToast('Settings update failed.');
    } finally {
      setSavingSettings(false);
    }
  };

  const playSolveSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  const handleGuessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || submittingGuess || !progress || progress.completed) return;

    try {
      setSubmittingGuess(true);
      setFeedbackMsg({ text: 'Analyzing...', type: 'info' });

      // Enforce a minimum 500ms delay for analysis feel
      const [res] = await Promise.all([
        sendToHost<{
          progress: PlayerProgress;
          newGuess: GuessRecord;
          stats: PlayerStats;
          solvedSummary?: GameStateResponse['solvedSummary'];
        }>('SUBMIT_GUESS', { guess: guessInput, date: activeDate, category: selectedCategory }),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);

      setProgress(res.progress);
      setStats(res.stats);

      const guess = res.newGuess;
      const categoryName = guess.closestCategory.toUpperCase();

      if (guess.status === 'Solved') {
        playSolveSound();
        showToast(`🎉 ${categoryName} solved successfully!`);
      }

      let hotnessPrefix = '❄️ Ice Cold';
      if (guess.status === 'Solved') hotnessPrefix = '🎉 Correct';
      else if (guess.status === 'Very Hot') hotnessPrefix = '🔥 Very Hot';
      else if (guess.status === 'Hot') hotnessPrefix = '🌡 Hot';
      else if (guess.status === 'Warm') hotnessPrefix = '♨️ Warm';
      else if (guess.status === 'Cold') {
        if (guess.score === 0.05) hotnessPrefix = '❄️ Ice Cold';
        else hotnessPrefix = '🧊 Cold';
      }

      const matchText = guess.hint
        ? guess.hint
        : `Analysis: Guess "${guess.text}" is closest to ${categoryName}. Hotness: ${guess.status}!`;

      setFeedbackMsg({
        text: `[${hotnessPrefix}] ${matchText}`,
        type: guess.status === 'Solved' ? 'success' : 'info'
      });

      setGuessInput('');

      if (res.progress.completed && res.solvedSummary) {
        setSolvedSummary(res.solvedSummary);
        showToast('🔓 CASE RESOLVED! Review dossier archives.');
      } else {
        const stateRes = await sendToHost<GameStateResponse>('GET_STATE', { date: activeDate });
        setMystery(stateRes.mystery);
        setProgress(stateRes.progress);
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || 'Guess processing error.', type: 'error' });
    } finally {
      setSubmittingGuess(false);
    }
  };

  const handleInvestigate = async (action: InvestigationAction) => {
    if (!progress || progress.completed) return;
    const config = INVESTIGATIONS[action];

    if (progress.ip < config.cost) {
      showToast(`⚠️ Need ${config.cost} IP.`);
      return;
    }

    try {
      setLoading(true);
      const res = await sendToHost<{ progress: PlayerProgress; clue: string }>('INVESTIGATE', { action, date: activeDate });
      setProgress(res.progress);
      setMystery(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          unlockedInvestigations: {
            ...prev.unlockedInvestigations,
            [action]: res.clue
          }
        };
      });
      showToast(`🔍 ${config.label} Unlocked!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to complete lab search.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!progress || !mystery) return;
    const unlockedCluesCount = Math.max(0, progress.revealedClues.length - (mystery.initialClues?.length || 3));
    const shareText = `🕵️ CrimeGuess Case Report - ${mystery.date}
Case: "${mystery.title}"
Score: ${progress.score}/100
Attempts: ${progress.attempts}
Clues Unlocked: ${unlockedCluesCount}

Rank: ${stats?.gamesSolved ? (stats.gamesSolved >= 10 ? 'Chief of Detectives' : stats.gamesSolved >= 6 ? 'Senior Inspector' : 'Inspector') : 'Novice'}
Streak: 🔥 ${stats?.currentStreak || 0} days

Play and solve cases on CrimeGuess!`;

    navigator.clipboard.writeText(shareText);
    showToast('📋 Copied scoring dossier to clipboard!');
  };



  const handleNavigateToCase = (metadata: LauncherCaseMetadata | null) => {
    if (!metadata) return;
    const isMockMode = typeof window !== 'undefined' && window.parent === window;
    if (isMockMode) {
      showToast(`[Mock Redirect] Navigating to: ${metadata.redditUrl}`);
      window.open(metadata.redditUrl, '_blank');
    } else {
      try {
        const normalizedUrl = new URL(metadata.redditUrl).toString();
        window.parent.postMessage({
          type: 'devvit-internal',
          scope: 1, // CLIENT
          navigateToUrl: {
            url: normalizedUrl,
          },
          effect: {
            navigateToUrl: {
              url: normalizedUrl,
            }
          }
        }, '*');
      } catch (err) {
        window.open(metadata.redditUrl, '_blank');
      }
    }
  };

  const getDetectiveRank = (solved?: number) => {
    const val = solved || 0;
    if (val >= 10) return 'Chief of Detectives';
    if (val >= 6) return 'Senior Inspector';
    if (val >= 3) return 'Inspector';
    return 'Novice Sleuth';
  };

  // Cover Screen / Splash view when inline
  if (viewMode === 'inline') {
    const handleExpand = async (e: React.MouseEvent) => {
      relayLog('ENTER HQ CLICK');
      try {
        await requestExpandedMode(e.nativeEvent, 'game');
      } catch (err) {
        console.error('Failed to request expanded mode:', err);
      }
    };

    if (isLauncher) {
      const rank = getDetectiveRank(stats?.gamesSolved);
      const streak = stats?.currentStreak || 0;
      const score = (stats?.totalScore || 0).toLocaleString();

      return (
        <div 
          className="app-container font-mono text-cyan" 
          style={{ 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '12px',
            background: '#050608',
            minHeight: '320px'
          }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              padding: '20px', 
              border: '2px solid var(--primary)', 
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
              background: 'rgba(10, 12, 16, 0.95)',
              borderRadius: '10px',
              textAlign: 'center'
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2', fontSize: '12px' }}>
              {`═══════════════════════════════\n\n        🕵 CRIMEGUESS\n\n      Think. Deduce. Solve.\n\n═══════════════════════════════`}
            </div>

            <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>⚡ Detective Rank: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{rank}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>🔥 Daily Streak: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{streak} Days</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>🏆 Detective Score: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{score}</span>
              </div>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2', fontSize: '12px', margin: '4px 0' }}>
              {`═══════════════════════════════`}
            </div>

            <button 
              ref={expandButtonRef}
              onClick={handleExpand}
              className="btn font-mono" 
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '13px', 
                fontWeight: 'bold',
                marginTop: '12px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1.5px solid var(--primary)',
                color: 'var(--primary)',
                borderRadius: '6px'
              }}
            >
              ▶ Enter Headquarters
            </button>
          </div>
        </div>
      );
    } else {
      const title = mystery?.title || 'Loading Mystery...';
      const difficulty = todayCase?.difficulty || 4;
      const difficultyStars = '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);

      return (
        <div 
          className="app-container font-mono text-cyan" 
          style={{ 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '12px',
            background: '#050608',
            minHeight: '320px'
          }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              padding: '20px', 
              border: '2px solid var(--primary)', 
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
              background: 'rgba(10, 12, 16, 0.95)',
              borderRadius: '10px',
              textAlign: 'center'
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2', fontSize: '12px' }}>
              {`═══════════════════════════════\n\n        🕵 CRIMEGUESS\n\n             DAILY CASE\n\n═══════════════════════════════`}
            </div>

            <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Case: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>{title}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Difficulty: </span>
                <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{difficultyStars}</span>
              </div>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2', fontSize: '12px', margin: '4px 0' }}>
              {`═══════════════════════════════`}
            </div>

            <button 
              ref={expandButtonRef}
              onClick={handleExpand}
              className="btn font-mono" 
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '13px', 
                fontWeight: 'bold',
                marginTop: '12px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1.5px solid var(--primary)',
                color: 'var(--primary)',
                borderRadius: '6px'
              }}
            >
              ▶ Start Investigation
            </button>
          </div>
        </div>
      );
    }
  }

  // Rendering Loader
  if (loading && !progress && !isLauncher) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ textAlign: 'center', width: '90%', maxWidth: '400px' }}>
          <div className="scanner-overlay" />
          <h2 className="text-cyan font-mono" style={{ letterSpacing: '2px', marginBottom: '12px' }}>
            CONNECTING...
          </h2>
          <p className="font-mono text-muted" style={{ fontSize: '13px' }}>
            Decoupling security vaults...
          </p>
        </div>
      </div>
    );
  }

  // A. HQ CINEMATIC INTRO VIEW
  if (isLauncher && showIntro) {
    relayLog('START INTRO');
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: '#050608' }}>
        <div style={{ width: '100%', maxWidth: '600px', padding: '12px' }}>
          <PhaserGame
            ipRemaining={0}
            onSelectInvestigation={() => {}}
            gameState={{ completed: false } as any}
            mystery={{} as any}
            solvedSummary={null}
            isLauncher={true}
            showIntro={true}
          />
        </div>
      </div>
    );
  }

  // B. HQ DASHBOARD HUD VIEW
  if (isLauncher) {
    relayLog('SHOW HEADQUARTERS');
    const currentCase = currentInvestigation || todayCase;
    const currentCaseNum = currentCase ? currentCase.caseNumber : 183;
    const currentDifficulty = currentCase ? currentCase.difficulty || 3 : 4;
    const currentSolveCount = currentCase ? currentCase.solveCount || 2413 : 2413;
    
    const solveCountStr = (currentSolveCount).toLocaleString();
    const difficultyStars = '★'.repeat(currentDifficulty) + '☆'.repeat(5 - currentDifficulty);

    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#050608', padding: '16px' }}>
        {toastText && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(10, 11, 14, 0.95)',
              border: '1px solid var(--primary)',
              color: 'var(--text-main)',
              padding: '10px 20px',
              borderRadius: '6px',
              zIndex: 9999,
              boxShadow: 'var(--glow-shadow)',
              fontSize: '13px',
              fontWeight: '600'
            }}
            className="fade-in font-mono"
          >
            {toastText}
          </div>
        )}

        <div 
          className="glass-panel font-mono text-cyan" 
          style={{ 
            width: '100%', 
            maxWidth: '420px', 
            padding: '24px', 
            border: '2px solid var(--primary)', 
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
            background: 'rgba(10, 12, 16, 0.96)',
            borderRadius: '12px'
          }}
        >
          {/* A. HEADER SECTION */}
          <div style={{ textAlign: 'center', whiteSpace: 'pre-wrap', lineHeight: '1.2', fontSize: '14px' }}>
            {`═══════════════════════════════\n\n        🕵 CRIMEGUESS\n\n      Think. Deduce. Solve.\n\n═══════════════════════════════`}
          </div>

          {/* B. MAIN HQ MENU */}
          {hqTab === 'menu' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Stats Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>⚡ Detective Rank (specific user rank)</span>
                  <span style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 'bold' }}>
                    {getDetectiveRank(stats?.gamesSolved)}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>🔥 Daily Streak (specific user streak)</span>
                  <span style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 'bold' }}>
                    {stats?.currentStreak || 0} Days
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>🏆 Detective Score (specific user score)</span>
                  <span style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 'bold' }}>
                    {(stats?.totalScore || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ whiteSpace: 'pre-wrap', textAlign: 'center', lineHeight: '1.2', fontSize: '14px', margin: '4px 0' }}>
                {`═══════════════════════════════`}
              </div>

              {/* Case Action Section */}
              <div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--secondary)', marginBottom: '8px' }}>
                  Case #{currentCaseNum}
                </div>
                
                <button 
                  className="btn font-mono" 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1.5px solid var(--primary)',
                    color: 'var(--primary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                  onClick={() => currentCase && handleNavigateToCase(currentCase)}
                >
                  ▶ Continue Investigation
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Difficulty {difficultyStars}</span>
                  <span>Solved by {solveCountStr} detectives</span>
                </div>
              </div>

              <div style={{ whiteSpace: 'pre-wrap', textAlign: 'center', lineHeight: '1.2', fontSize: '14px', margin: '4px 0' }}>
                {`═══════════════════════════════`}
              </div>

              {/* Navigation Options List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className="hq-menu-link"
                  onClick={() => todayCase && handleNavigateToCase(todayCase)}
                >
                  📰 Today’s Case
                </button>
                <button 
                  className="hq-menu-link"
                  disabled={!yesterdayCase}
                  onClick={() => yesterdayCase && handleNavigateToCase(yesterdayCase)}
                >
                  Yesterday’s Case
                </button>
                <button 
                  className="hq-menu-link"
                  onClick={() => setHqTab('archives')}
                >
                  📂 Case Archive
                </button>
                <button 
                  className="hq-menu-link"
                  onClick={() => setHqTab('submit_case')}
                >
                  📝 Submit a Case
                </button>
                <button 
                  className="hq-menu-link"
                  onClick={() => setHqTab('community_files')}
                >
                  🗂 Community Files
                </button>

                <button 
                  className="hq-menu-link"
                  onClick={() => setHqTab('profile')}
                >
                  👤 Detective Profile
                </button>
                <button 
                  className="hq-menu-link"
                  onClick={() => setHqTab('leaderboard')}
                >
                  🏅 Leaderboards
                </button>
                <button 
                  className="hq-menu-link"
                  onClick={() => setHqTab('settings')}
                >
                  ⚙ Settings
                </button>
                <button 
                  className="hq-menu-link"
                  onClick={() => setHqTab('moderation')}
                  style={{ borderLeft: '2px solid var(--secondary)', paddingLeft: '8px' }}
                >
                  ⚙️ Moderator Panel {isMockMod && '(Mock On)'}
                </button>
              </div>

              <div style={{ whiteSpace: 'pre-wrap', textAlign: 'center', lineHeight: '1.2', fontSize: '14px', marginTop: '4px' }}>
                {`═══════════════════════════════`}
              </div>
            </div>
          )}

          {/* C. ARCHIVES VIEW */}
          {hqTab === 'archives' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <FilingCabinet
                cases={communityCases}
                onSelectCase={handleNavigateToCase}
                title="Case Archive"
              />
              <button 
                className="btn font-mono" 
                style={{ width: '100%', padding: '10px', fontSize: '12px', marginTop: '8px' }}
                onClick={() => setHqTab('menu')}
              >
                ◀ Back to Headquarters
              </button>
            </div>
          )}

          {/* D. LEADERBOARD VIEW */}
          {hqTab === 'leaderboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <LeaderboardPanel data={leaderboard} />
              <button 
                className="btn font-mono" 
                style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                onClick={() => setHqTab('menu')}
              >
                ◀ Back to Headquarters
              </button>
            </div>
          )}

          {/* E. PROFILE VIEW */}
          {hqTab === 'profile' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <ProfilePanel stats={stats} />
              <button 
                className="btn font-mono" 
                style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                onClick={() => setHqTab('menu')}
              >
                ◀ Back to Headquarters
              </button>
            </div>
          )}

          {/* F. SETTINGS VIEW */}
          {hqTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: '6px' }}>
                  <div>
                    <h5 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Daily Case Dispatch Bulletins</h5>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Get notified when a new daily crime is available in the district.</p>
                  </div>
                  <div>
                    <input
                      type="checkbox"
                      checked={pushOptedIn}
                      disabled={savingSettings}
                      onChange={handleTogglePush}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
              <button 
                className="btn font-mono" 
                style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                onClick={() => setHqTab('menu')}
              >
                ◀ Back to Headquarters
              </button>
            </div>
          )}

          {/* SUBMIT A CASE VIEW */}
          {hqTab === 'submit_case' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <CaseEditor
                onSubmit={handleCaseSubmit}
                submitting={submittingCase}
              />
              <button 
                className="btn font-mono" 
                style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                onClick={() => setHqTab('menu')}
              >
                ◀ Back to Headquarters
              </button>
            </div>
          )}

          {/* COMMUNITY FILES VIEW */}
          {hqTab === 'community_files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {loadingCommunityCases ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Opening filing cabinet...</p>
              ) : (
                <FilingCabinet
                  cases={communityCases}
                  onSelectCase={handleNavigateToCase}
                  title="Community Files"
                />
              )}
              <button 
                className="btn font-mono" 
                style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                onClick={() => setHqTab('menu')}
              >
                ◀ Back to Headquarters
              </button>
            </div>
          )}

          {/* MODERATOR CONTROL PANEL */}
          {hqTab === 'moderation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mock Mod Mode (Local Testing)</span>
                <input
                  type="checkbox"
                  checked={isMockMod}
                  onChange={(e) => setIsMockMod(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <ModeratorReview
                submissions={pendingSubmissions}
                onApprove={handleApproveCase}
                onReject={handleRejectCase}
                loading={loadingPendingSubmissions}
              />
              <button 
                className="btn font-mono" 
                style={{ width: '100%', padding: '10px', fontSize: '12px', marginTop: '8px' }}
                onClick={() => setHqTab('menu')}
              >
                ◀ Back to Headquarters
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // C. DAILY GAME PLAYABLE POST VIEW
  relayLog('OPEN DAILY CASE');
  return (
    <div className="app-container layout-split">
      {toastText && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 11, 14, 0.95)',
            border: '1px solid var(--primary)',
            color: 'var(--text-main)',
            padding: '10px 20px',
            borderRadius: '6px',
            zIndex: 9999,
            boxShadow: 'var(--glow-shadow)',
            fontSize: '13px',
            fontWeight: '600'
          }}
          className="fade-in font-mono"
        >
          {toastText}
        </div>
      )}

      {/* Navigation HUD Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unlockedCluesCount={progress?.revealedClues?.length || 0}
        isLauncher={false}
      />

      {/* Main Viewport Content Area */}
      <div className="layout-content-wrapper fade-in">
        
        {/* HUD Top Bar */}
        {progress && mystery && (
          <div
            className="glass-panel"
            style={{
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              <p className="font-mono" style={{ fontSize: '9px', color: postType === 'COMMUNITY_CASE' ? 'var(--secondary)' : 'var(--text-muted)' }}>
                {postType === 'COMMUNITY_CASE' ? 'COMMUNITY CASE FILE' : `CASE FILE: ${mystery.date}`}
              </p>
              <h3 className="text-main" style={{ fontSize: '15px', fontWeight: '600' }}>{mystery.title}</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="ip-badge">⚡ {progress.ip} IP</div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '30px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                Score: {progress.score} pts
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Detective Office (Phaser Board + Guesses) */}
        {activeTab === 'office' && progress && mystery && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
            {/* Phaser Game Window */}
            <div className="glass-panel" style={{ padding: '8px', position: 'relative' }}>
              <div className="scanner-overlay" />
              <PhaserGame
                ipRemaining={progress.ip}
                onSelectInvestigation={handleInvestigate}
                gameState={progress}
                mystery={mystery}
                solvedSummary={solvedSummary}
                isLauncher={false}
                showIntro={false}
              />
            </div>

            {/* Deduction Console */}
            <DeductionConsole
              guessInput={guessInput}
              onGuessChange={setGuessInput}
              onSubmit={handleGuessSubmit}
              submitting={submittingGuess}
              guesses={progress.guesses}
              completed={progress.completed}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              solvedStatus={progress.solved}
            />

            {feedbackMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  border: '1px solid',
                  borderColor: feedbackMsg.type === 'success' ? 'var(--success)' : feedbackMsg.type === 'error' ? 'var(--accent)' : 'var(--primary)',
                  background: feedbackMsg.type === 'success' ? 'rgba(57, 211, 83, 0.04)' : feedbackMsg.type === 'error' ? 'rgba(255, 45, 85, 0.04)' : 'rgba(0, 240, 255, 0.04)',
                  color: feedbackMsg.type === 'success' ? 'var(--success)' : feedbackMsg.type === 'error' ? 'var(--accent)' : 'var(--primary)',
                  fontFamily: 'var(--font-mono)',
                  boxShadow: feedbackMsg.type === 'success' ? '0 0 10px rgba(57, 211, 83, 0.1)' : 'none'
                }}
                className="fade-in"
              >
                {feedbackMsg.text}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Case Dossier Clues */}
        {activeTab === 'clues' && progress && (
          <div className="glass-panel fade-in" style={{ padding: '16px', minHeight: '300px' }}>
            <h4 className="font-mono text-cyan" style={{ fontSize: '13px', marginBottom: '12px' }}>
              UNLOCKED EVIDENCE CLUES
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {progress.revealedClues.map((clue, idx) => (
                <div key={idx} className="clue-item">
                  {clue}
                </div>
              ))}
              <div ref={cluesEndRef} />
            </div>
          </div>
        )}

        {/* Tab 3: Forensics Lab */}
        {activeTab === 'forensics' && progress && (
          <div className="fade-in">
            <ForensicsLab
              progress={progress}
              onInvestigate={handleInvestigate}
              mystery={mystery}
            />
          </div>
        )}

        {/* Tab 4: Profile & Achievements */}
        {activeTab === 'profile' && stats && (
          <div className="fade-in">
            <ProfilePanel stats={stats} />
          </div>
        )}

        {/* Tab 5: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="fade-in">
            <LeaderboardPanel data={leaderboard} />
          </div>
        )}

        {/* Tab 6: Archives Catalog */}
        {activeTab === 'archives' && (
          <div className="fade-in">
            <ArchivesPanel
              cases={detailedArchives}
              onSelectCase={handleNavigateToCase}
              activeDate={activeDate}
            />
          </div>
        )}

        {/* Case Resolved Dossier Summary overlay */}
        {progress?.completed && solvedSummary && (
          <div className="glass-panel fade-in" style={{ padding: '20px', marginTop: '16px', borderColor: 'var(--success)' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span className="status-pill solved">CASE FILES SOLVED</span>
              <h2 className="text-cyan font-mono" style={{ fontSize: '20px', marginTop: '6px' }}>THE ARCHIVE DOSSIER</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--success)', padding: '8px 12px' }}>
                <span className="font-mono text-muted" style={{ fontSize: '10px' }}>CULPRIT / MOTIVE / METHOD</span>
                <p className="text-main" style={{ fontWeight: 'bold' }}>
                  {solvedSummary.culprit} | {solvedSummary.motive} | {solvedSummary.method}
                </p>
              </div>

              <div>
                <span className="font-mono text-cyan" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>CASE NARRATIVE</span>
                <p className="font-typewriter text-muted" style={{ color: '#cbd5e1', fontSize: '13.5px' }}>
                  {solvedSummary.fullStory}
                </p>
              </div>

              <div>
                <span className="font-mono text-cyan" style={{ fontSize: '11px', display: 'block', marginBottom: '2px' }}>TIMELINE</span>
                <p className="font-mono text-muted" style={{ whiteSpace: 'pre-wrap', fontSize: '11.5px', lineHeight: '1.4' }}>
                  {solvedSummary.timeline}
                </p>
              </div>
            </div>

            <button className="btn font-mono" style={{ width: '100%', marginTop: '16px', background: 'rgba(57, 211, 83, 0.1)', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={handleShare}>
              📋 COPY SCORE DOSSIER REPORT
            </button>

            {/* Feature 8: Rating Stars Feedback */}
            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', textAlign: 'center' }}>
              <span className="font-mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '8px' }}>
                RATE TODAY'S CRIMEGUESS CASE
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = userRating !== null ? star <= userRating : false;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRateCase(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '22px',
                        color: filled ? 'var(--gold)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
              {userRating !== null && (
                <span className="font-mono text-gold fade-in" style={{ fontSize: '10px', display: 'block', marginTop: '6px' }}>
                  Rating submitted! Average rating: ★ {((mystery?.averageRating || 4.5) * 1 + userRating) / 2}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
