import React from 'react';
import { GuessRecord } from '../../shared/types';

interface DeductionConsoleProps {
  guessInput: string;
  onGuessChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  guesses: GuessRecord[];
  completed: boolean;
  selectedCategory: 'culprit' | 'motive' | 'method' | 'twist';
  onCategoryChange: (cat: 'culprit' | 'motive' | 'method' | 'twist') => void;
  solvedStatus: { culprit: boolean; motive: boolean; method: boolean; twist: boolean };
}

export default function DeductionConsole({
  guessInput,
  onGuessChange,
  onSubmit,
  submitting,
  guesses,
  completed,
  selectedCategory,
  onCategoryChange,
  solvedStatus
}: DeductionConsoleProps) {
  const categories: { id: 'culprit' | 'motive' | 'method' | 'twist'; label: string; icon: string }[] = [
    { id: 'culprit', label: 'Culprit', icon: '👤' },
    { id: 'motive', label: 'Motive', icon: '💰' },
    { id: 'method', label: 'Method', icon: '🗡' },
    { id: 'twist', label: 'Twist', icon: '🎭' }
  ];

  const filteredGuesses = guesses.filter(g => g.closestCategory === selectedCategory);
  const isCategorySolved = solvedStatus[selectedCategory];

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 className="font-mono text-cyan" style={{ fontSize: '13px', letterSpacing: '1px' }}>
        DEDUCTION CONSOLE
      </h4>

      {/* Category Selection Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '4px' }}>
        {categories.map(cat => {
          const solved = solvedStatus[cat.id];
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className="font-mono"
              type="button"
              style={{
                padding: '8px 4px',
                fontSize: '11.5px',
                background: active ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                border: active ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                fontWeight: active ? 'bold' : 'normal'
              }}
            >
              <span>{cat.icon}</span>
              <span className="hide-mobile">{cat.label}</span>
              {solved && <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓</span>}
            </button>
          );
        })}
      </div>
      
      {!isCategorySolved && !completed ? (
        <form onSubmit={onSubmit} className="console-input-wrapper">
          <input
            type="text"
            className="console-input"
            placeholder={`Enter guess for ${selectedCategory.toUpperCase()} (e.g. ${
              selectedCategory === 'culprit' ? "'the doctor'" : selectedCategory === 'motive' ? "'insurance payout'" : selectedCategory === 'method' ? "'poison'" : "'poison was in the ice'"
            })...`}
            value={guessInput}
            onChange={(e) => onGuessChange(e.target.value)}
            disabled={submitting}
            maxLength={80}
          />
          <button
            type="submit"
            className="btn"
            disabled={submitting || !guessInput.trim()}
            style={{ padding: '0 16px', borderRadius: '0 6px 6px 0', border: 'none', background: 'var(--primary)', color: '#000' }}
          >
            {submitting ? '...' : 'ANALYZE'}
          </button>
        </form>
      ) : (
        <div style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'center', padding: '10px', background: 'rgba(57, 211, 83, 0.05)', borderRadius: '6px', border: '1px solid rgba(57, 211, 83, 0.2)' }}>
          🔒 DEDUCTION SOLVED FOR {selectedCategory.toUpperCase()}
        </div>
      )}

      {filteredGuesses.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <h5 className="font-mono text-muted" style={{ fontSize: '11px', marginBottom: '6px' }}>ANALYZE LOGS ({selectedCategory.toUpperCase()})</h5>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Guess</th>
                  <th style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Sim</th>
                  <th style={{ padding: '4px 0', color: 'var(--text-muted)', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredGuesses].reverse().map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="fade-in">
                    <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>"{g.text}"</td>
                    <td style={{ padding: '6px 0', fontFamily: 'var(--font-mono)' }}>{(g.score * 100).toFixed(0)}%</td>
                    <td style={{ padding: '6px 0', textAlign: 'right' }}>
                      <span className={`status-pill ${g.status.toLowerCase().replace(' ', '-')}`}>
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
