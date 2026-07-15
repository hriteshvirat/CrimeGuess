import React from 'react';
import { GuessRecord } from '../../shared/types';

interface DeductionConsoleProps {
  guessInput: string;
  onGuessChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  guesses: GuessRecord[];
  completed: boolean;
}

export default function DeductionConsole({
  guessInput,
  onGuessChange,
  onSubmit,
  submitting,
  guesses,
  completed
}: DeductionConsoleProps) {
  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 className="font-mono text-cyan" style={{ fontSize: '13px', letterSpacing: '1px' }}>
        DEDUCTION CONSOLE
      </h4>
      
      {!completed ? (
        <form onSubmit={onSubmit} className="console-input-wrapper">
          <input
            type="text"
            className="console-input"
            placeholder="Input guess (e.g. 'poison', 'the AI core', 'Vera')..."
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
        <div style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'center', padding: '8px' }}>
          🔒 CASE FILE RESOLVED - CONSOLE LOCKED
        </div>
      )}

      {guesses.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <h5 className="font-mono text-muted" style={{ fontSize: '11px', marginBottom: '6px' }}>ANALYZE LOGS</h5>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                  <th style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Guess</th>
                  <th style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Match Cat</th>
                  <th style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Sim</th>
                  <th style={{ padding: '4px 0', color: 'var(--text-muted)', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...guesses].reverse().map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="fade-in">
                    <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>"{g.text}"</td>
                    <td style={{ padding: '6px 0', textTransform: 'capitalize' }}>{g.closestCategory}</td>
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
