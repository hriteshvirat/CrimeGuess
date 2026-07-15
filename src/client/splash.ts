// @ts-ignore
import { requestExpandedMode } from '@devvit/client';

function relayLog(msg: string) {
  console.log(msg);
  fetch('/api/log', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: msg })
  }).catch(() => {});
}

function getDetectiveRank(solved?: number) {
  const val = solved || 0;
  if (val >= 10) return 'Chief of Detectives';
  if (val >= 6) return 'Senior Inspector';
  if (val >= 3) return 'Inspector';
  return 'Novice Sleuth';
}

async function initState() {
  const loadingView = document.getElementById('loading-view');
  const launcherView = document.getElementById('launcher-view');
  const caseView = document.getElementById('case-view');

  try {
    const res = await fetch('/api/get-state', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch state: ${res.status}`);
    }

    const data = await res.json();

    if (data.isLauncher) {
      const stats = data.stats;
      const rank = getDetectiveRank(stats?.gamesSolved);
      const streak = stats?.currentStreak || 0;
      const score = (stats?.totalScore || 0).toLocaleString();

      const rankEl = document.getElementById('rank-val');
      const streakEl = document.getElementById('streak-val');
      const scoreEl = document.getElementById('score-val');

      if (rankEl) rankEl.textContent = rank;
      if (streakEl) streakEl.textContent = `${streak} Days`;
      if (scoreEl) scoreEl.textContent = score;

      if (launcherView) launcherView.classList.remove('hidden');
    } else {
      const mystery = data.mystery;
      const title = mystery?.title || 'Unknown Case';
      const difficulty = data.progress?.difficulty || 3;
      const stars = '★'.repeat(difficulty) + '☆'.repeat(Math.max(0, 5 - difficulty));

      const titleEl = document.getElementById('case-title-val');
      const diffEl = document.getElementById('difficulty-val');

      if (titleEl) titleEl.textContent = title;
      if (diffEl) diffEl.textContent = stars;

      if (caseView) caseView.classList.remove('hidden');
    }
  } catch (e) {
    console.error('Error initializing splash screen state:', e);
    // Simple fallback to show launcher view with guest stats
    const rankEl = document.getElementById('rank-val');
    if (rankEl) rankEl.textContent = 'Guest Detective';
    if (launcherView) launcherView.classList.remove('hidden');
  } finally {
    if (loadingView) loadingView.classList.add('hidden');
  }
}

// Bind click listeners to standard buttons
const btnLauncher = document.getElementById('btn-launcher');
if (btnLauncher) {
  btnLauncher.addEventListener('click', (e) => {
    relayLog('ENTER HQ CLICK');
    try {
      requestExpandedMode(e, 'game');
    } catch (err) {
      console.error('Failed to request expanded mode:', err);
    }
  });
}

const btnCase = document.getElementById('btn-case');
if (btnCase) {
  btnCase.addEventListener('click', (e) => {
    console.log('[Splash] Start Investigation clicked. Requesting expanded mode...');
    try {
      requestExpandedMode(e, 'game');
    } catch (err) {
      console.error('Failed to request expanded mode:', err);
    }
  });
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initState);
} else {
  initState();
}
