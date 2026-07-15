import { useState } from 'react';
import { LeaderboardResponse } from '../../shared/types';

interface LeaderboardPanelProps {
  data: LeaderboardResponse | null;
}

export default function LeaderboardPanel({ data }: LeaderboardPanelProps) {
  const [boardType, setBoardType] = useState<'scores' | 'streaks'>('scores');

  const list = boardType === 'scores' ? data?.topScores || [] : data?.topStreaks || [];

  return (
    <div className="glass-panel fade-in" style={{ padding: '16px' }}>
      <h4 className="font-mono text-cyan" style={{ fontSize: '13px', marginBottom: '12px', letterSpacing: '1px' }}>
        GLOBAL LEADERBOARD
      </h4>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
        <button
          className={`btn font-mono ${boardType === 'scores' ? '' : 'btn-secondary'}`}
          onClick={() => setBoardType('scores')}
          style={{ flexGrow: 1, fontSize: '11px', padding: '6px 4px' }}
        >
          🏆 LIFETIME SCORE
        </button>
        <button
          className={`btn font-mono ${boardType === 'streaks' ? '' : 'btn-secondary'}`}
          onClick={() => setBoardType('streaks')}
          style={{ flexGrow: 1, fontSize: '11px', padding: '6px 4px' }}
        >
          🔥 ACTIVE STREAK
        </button>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {list.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                <th style={{ padding: '6px 4px', color: 'var(--text-muted)', width: '60px' }}>Rank</th>
                <th style={{ padding: '6px 4px', color: 'var(--text-muted)' }}>Detective</th>
                <th style={{ padding: '6px 4px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {boardType === 'scores' ? 'Total Score' : 'Streak'}
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((entry, idx) => {
                let rankColor = 'var(--text-main)';
                let rankIcon = '';
                if (entry.rank === 1) { rankColor = 'var(--secondary)'; rankIcon = '🥇 '; }
                else if (entry.rank === 2) { rankColor = '#c0c0c0'; rankIcon = '🥈 '; }
                else if (entry.rank === 3) { rankColor = '#cd7f32'; rankIcon = '🥉 '; }

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 4px', color: rankColor, fontWeight: 'bold' }}>
                      {rankIcon}{entry.rank}
                    </td>
                    <td style={{ padding: '8px 4px', fontFamily: 'monospace' }}>u/{entry.username}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', color: boardType === 'scores' ? 'var(--primary)' : 'var(--secondary)' }}>
                      {boardType === 'scores' ? `${entry.score} pts` : `🔥 ${entry.score}d`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }} className="font-mono">
            No rankings logged in this division yet.
          </p>
        )}
      </div>
    </div>
  );
}
