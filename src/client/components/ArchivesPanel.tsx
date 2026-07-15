import { ArchiveCase } from '../../shared/types';

interface ArchivesPanelProps {
  cases: (ArchiveCase & {
    caseNumber?: number;
    caseName?: string;
    postId?: string;
    redditUrl?: string;
    difficulty?: number;
    solveCount?: number;
  })[];
  onSelectCase: (c: any) => void;
  activeDate: string;
}

export default function ArchivesPanel({ cases, onSelectCase }: ArchivesPanelProps) {
  const getDifficultyStars = (diff?: number) => {
    const count = diff || 3;
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
  };

  const getMonthDay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[monthNum - 1] || 'Jul';
      return `${monthName} ${day}`;
    } catch {
      return dateStr;
    }
  };

  const getYear = (dateStr: string) => {
    try {
      return dateStr.split('-')[0] || '2026';
    } catch {
      return '2026';
    }
  };

  // Group cases by year only
  const years: Record<string, typeof cases> = {};
  cases.forEach((c) => {
    const yr = getYear(c.date);
    if (!years[yr]) {
      years[yr] = [];
    }
    years[yr].push(c);
  });

  const sortedYears = Object.keys(years).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
      {sortedYears.length > 0 ? (
        sortedYears.map((yr) => (
          <div key={yr} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Year Label */}
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', marginBottom: '8px' }}>
              {yr}
            </div>
            
            {/* Cases List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {years[yr].map((c) => {
                const isCompleted = c.completed;
                // Determine played/solve status
                const hasPlayed = c.completed || (c.score !== undefined && c.score < 100);
                const statusStr = isCompleted ? 'Solved' : (hasPlayed ? 'Unsolved' : 'Unplayed');
                const statusIcon = isCompleted ? '✓' : '○';
                const statusColor = isCompleted ? 'var(--success)' : (hasPlayed ? 'var(--secondary)' : 'var(--text-muted)');

                return (
                  <div
                    key={c.date}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1.5px solid rgba(255, 255, 255, 0.04)'
                    }}
                    className="cabinet-card"
                    onClick={() => onSelectCase(c)}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13.5px' }}>
                      <span style={{ color: statusColor, fontWeight: 'bold' }}>{statusIcon}</span>
                      <span style={{ color: 'var(--text-main)' }}>{getMonthDay(c.date)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                      <span style={{ color: statusColor }}>{statusStr}</span>
                    </div>
                    <div style={{ color: 'var(--secondary)', letterSpacing: '1px', fontSize: '12px' }}>
                      {getDifficultyStars(c.difficulty)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
          No cases found in archive.
        </p>
      )}
    </div>
  );
}
