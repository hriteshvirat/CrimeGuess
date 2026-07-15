import { INVESTIGATIONS, InvestigationAction, PlayerProgress, MysteryClient } from '../../shared/types';

interface ForensicsLabProps {
  progress: PlayerProgress;
  onInvestigate: (action: InvestigationAction) => void;
  mystery: MysteryClient | null;
}

export default function ForensicsLab({ progress, onInvestigate, mystery }: ForensicsLabProps) {
  const actions = mystery?.forensicsConfig
    ? (Object.keys(mystery.forensicsConfig) as InvestigationAction[])
    : (Object.keys(INVESTIGATIONS) as InvestigationAction[]);

  return (
    <div className="glass-panel" style={{ padding: '16px' }}>
      <h4 className="font-mono text-cyan" style={{ fontSize: '13px', marginBottom: '12px', letterSpacing: '1px' }}>
        FORENSIC LAB DATA SCREEN
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
        {actions.map((act) => {
          const standardItem = INVESTIGATIONS[act];
          const overrideItem = mystery?.forensicsConfig?.[act];
          if (mystery?.forensicsConfig && !overrideItem) return null;
          const item = overrideItem ? { ...standardItem, ...overrideItem } : standardItem;
          const clueText = mystery?.unlockedInvestigations?.[act];
          const isUnlocked = !!clueText;

          return (
            <div
              key={act}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                background: isUnlocked ? 'rgba(0, 240, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                borderColor: isUnlocked ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255,255,255,0.06)',
                gap: '8px'
              }}
              className="fade-in"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '12px' }}>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: isUnlocked ? 'var(--primary)' : 'var(--text-main)' }}>
                      {item.label}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                    {item.description}
                  </p>
                </div>

                {isUnlocked ? (
                  <span
                    style={{
                      color: 'var(--primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      border: '1px solid rgba(0, 240, 255, 0.35)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      flexShrink: 0,
                      boxShadow: '0 0 10px rgba(0, 240, 255, 0.15)'
                    }}
                  >
                    UNLOCKED
                  </span>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 12px', flexShrink: 0 }}
                    onClick={() => onInvestigate(act)}
                    disabled={progress.ip < item.cost || progress.completed}
                  >
                    -{item.cost} IP
                  </button>
                )}
              </div>

              {isUnlocked && clueText && (
                <div
                  style={{
                    background: 'rgba(10, 11, 14, 0.65)',
                    borderLeft: '3px solid var(--primary)',
                    padding: '10px 12px',
                    borderRadius: '0 6px 6px 0',
                    fontSize: '12.5px',
                    color: 'var(--text-main)',
                    lineHeight: '1.5',
                    fontFamily: 'var(--font-main)',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(0, 240, 255, 0.1)',
                    borderLeftWidth: '3px'
                  }}
                  className="fade-in"
                >
                  <span className="font-mono" style={{ display: 'block', fontSize: '9px', color: 'var(--primary)', opacity: 0.8, marginBottom: '4px', letterSpacing: '1px' }}>
                    FORENSIC EVIDENCE DETAILS:
                  </span>
                  {clueText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
