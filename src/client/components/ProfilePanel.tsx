import { PlayerStats, ACHIEVEMENTS } from '../../shared/types';

interface ProfilePanelProps {
  stats: PlayerStats;
}

export default function ProfilePanel({ stats }: ProfilePanelProps) {
  // Rank calculations
  const getRank = (solved: number) => {
    if (solved === 0) return { title: 'Novice Sleuth', icon: '🥚', color: '#8e9cae' };
    if (solved <= 2) return { title: 'Junior Detective', icon: '🔍', color: '#00f0ff' };
    if (solved <= 5) return { title: 'Inspector', icon: '🕵️', color: '#ffa800' };
    if (solved <= 9) return { title: 'Senior Inspector', icon: '🎖️', color: '#ff2d55' };
    return { title: 'Chief of Detectives', icon: '👑', color: '#39d353' };
  };

  const rank = getRank(stats.gamesSolved);
  const successRate = stats.gamesPlayed > 0 ? ((stats.gamesSolved / stats.gamesPlayed) * 100).toFixed(0) : '0';

  return (
    <div className="glass-panel fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
        <div
          style={{
            fontSize: '32px',
            background: 'rgba(255,255,255,0.03)',
            border: `2px solid ${rank.color}`,
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 10px ${rank.color}40`
          }}
        >
          {rank.icon}
        </div>
        <div>
          <h3 className="text-main" style={{ fontSize: '18px', fontWeight: 'bold' }}>u/{stats.username}</h3>
          <p style={{ color: rank.color, fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            RANK: {rank.title}
          </p>
        </div>
      </div>

      {/* Grid of stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }} className="font-mono text-center">
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 4px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>CASES SOLVED</span>
          <span className="text-cyan" style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.gamesSolved}</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 4px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>STREAK</span>
          <span className="text-gold" style={{ fontSize: '20px', fontWeight: 'bold' }}>🔥 {stats.currentStreak}d</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 4px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>SOLVE RATE</span>
          <span className="text-main" style={{ fontSize: '20px', fontWeight: 'bold' }}>{successRate}%</span>
        </div>
      </div>

      {/* Achievements grid */}
      <div>
        <h4 className="font-mono text-cyan" style={{ fontSize: '13px', marginBottom: '8px' }}>BADGES & ACHIEVEMENTS</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {Object.keys(ACHIEVEMENTS).map((key) => {
            const ach = ACHIEVEMENTS[key];
            const unlocked = stats.achievements.includes(key);

            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '8px 10px',
                  border: '1px solid',
                  borderRadius: '6px',
                  background: unlocked ? 'rgba(255, 168, 0, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                  borderColor: unlocked ? 'rgba(255, 168, 0, 0.2)' : 'rgba(255,255,255,0.04)',
                  opacity: unlocked ? 1 : 0.4
                }}
              >
                <div style={{ fontSize: '20px' }}>{unlocked ? ach.icon : '🔒'}</div>
                <div>
                  <h5 style={{ fontSize: '12px', fontWeight: 'bold', color: unlocked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {ach.title}
                  </h5>
                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1.2' }}>
                    {ach.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
