import { useState } from 'react';
import { CommunityCaseMetadata } from '../../shared/types';

interface FilingCabinetProps {
  cases: CommunityCaseMetadata[];
  onSelectCase: (c: CommunityCaseMetadata) => void;
  title: string;
}

export default function FilingCabinet({ cases, onSelectCase, title }: FilingCabinetProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'played' | 'difficulty'>('newest');
  const [filterDifficulty, setFilterDifficulty] = useState<number | 'all'>('all');
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // "Year-Month" key

  // Sort and filter logic
  const filtered = cases
    .filter((c) => {
      const matchSearch =
        c.caseName.toLowerCase().includes(search.toLowerCase()) ||
        c.author?.toLowerCase().includes(search.toLowerCase());
      const matchDiff = filterDifficulty === 'all' || c.difficulty === filterDifficulty;
      return matchSearch && matchDiff;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.date.localeCompare(a.date);
      if (sortBy === 'oldest') return a.date.localeCompare(b.date);
      if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'played') return (b.playCount || 0) - (a.playCount || 0);
      if (sortBy === 'difficulty') return (b.difficulty || 3) - (a.difficulty || 3);
      return 0;
    });

  // Group by Year -> Month
  const groups: Record<string, Record<string, CommunityCaseMetadata[]>> = {};
  filtered.forEach((c) => {
    try {
      const parts = c.date.split('-');
      const year = parts[0] || '2026';
      const monthNum = parseInt(parts[1], 10);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = months[monthNum - 1] || 'July';

      if (!groups[year]) groups[year] = {};
      if (!groups[year][monthName]) groups[year][monthName] = [];
      groups[year][monthName].push(c);
    } catch {
      // Fallback
      if (!groups['2026']) groups['2026'] = {};
      if (!groups['2026']['July']) groups['2026']['July'] = [];
      groups['2026']['July'].push(c);
    }
  });

  const years = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const getDifficultyStars = (diff?: number) => {
    const count = diff || 3;
    return '⭐'.repeat(count) + '☆'.repeat(5 - count);
  };

  const handleOpenFolder = (year: string, month: string) => {
    const key = `${year}-${month}`;
    if (activeFolder === key) {
      setActiveFolder(null);
    } else {
      setActiveFolder(key);
      // Trigger Phaser filing cabinet sound/animation
      window.dispatchEvent(new CustomEvent('PHASER_CABINET_DRAWER_OPEN', { detail: { year, month } }));
    }
  };

  const handleCaseClick = (c: CommunityCaseMetadata) => {
    // Trigger Phaser folder-desk slide/open animation
    window.dispatchEvent(new CustomEvent('PHASER_FOLDER_SLIDE_DESK', { detail: { caseId: c.postId } }));
    setTimeout(() => {
      onSelectCase(c);
    }, 800); // Wait for phaser animation
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 className="font-mono text-cyan" style={{ fontSize: '14px', margin: 0 }}>
          📁 {title.toUpperCase()}
        </h4>
      </div>

      {/* Search & Sort Panel */}
      <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(0, 240, 255, 0.1)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="console-input"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, fontSize: '12.5px', padding: '6px 10px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
            <span style={{ color: 'var(--text-muted)' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ background: '#0a0b0e', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '3px 6px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating">Highest Rated</option>
              <option value="played">Most Played</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Stars:</span>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              style={{ background: '#0a0b0e', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '3px 6px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
            >
              <option value="all">All Difficulties</option>
              <option value="1">1 Star</option>
              <option value="2">2 Stars</option>
              <option value="3">3 Stars</option>
              <option value="4">4 Stars</option>
              <option value="5">5 Stars</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cabin Drawer Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {years.length > 0 ? (
          years.map((year) => (
            <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid rgba(0, 240, 255, 0.15)', paddingBottom: '2px', fontFamily: 'monospace' }}>
                {year}
              </div>

              {Object.keys(groups[year]).map((month) => {
                const folderKey = `${year}-${month}`;
                const isOpen = activeFolder === folderKey;
                const caseList = groups[year][month];

                return (
                  <div key={month} style={{ marginLeft: '8px' }}>
                    {/* Folder Tab Header */}
                    <div
                      onClick={() => handleOpenFolder(year, month)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isOpen ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      className="cabinet-folder-row"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                        <span>{isOpen ? '📂' : '📁'}</span>
                        <span style={{ color: 'var(--text-main)' }}>{month}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({caseList.length} files)</span>
                      </div>
                      <span style={{ color: 'var(--primary)', fontSize: '11px' }}>{isOpen ? 'CLOSE ▲' : 'OPEN ▼'}</span>
                    </div>

                    {/* Case Files Container inside active Drawer */}
                    {isOpen && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          marginTop: '8px',
                          paddingLeft: '12px',
                          borderLeft: '1.5px dashed rgba(0, 240, 255, 0.2)'
                        }}
                        className="fade-in"
                      >
                        {caseList.map((c) => (
                          <div
                            key={c.postId}
                            className="glass-panel"
                            style={{
                              padding: '12px',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '6px',
                              background: 'rgba(10, 11, 14, 0.9)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block', fontFamily: 'monospace' }}>
                                  CASE #{c.caseNumber} • {c.date}
                                </span>
                                <h5 style={{ fontSize: '14.5px', color: 'var(--text-main)', margin: '4px 0', fontWeight: 'bold' }}>
                                  {c.caseName}
                                </h5>
                                <span style={{ color: 'var(--primary)', fontSize: '11px', display: 'block' }}>
                                  Author: u/{c.author || 'Anonymous'}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                                  {getDifficultyStars(c.difficulty)}
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                                  ⏳ {c.estimatedTime || '15 mins'}
                                </span>
                              </div>
                            </div>

                            {/* Ratings and Stats */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '10px',
                                paddingTop: '8px',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontFamily: 'monospace'
                              }}
                            >
                              <div>
                                <span>Rating: </span>
                                <span style={{ color: 'var(--gold)' }}>
                                  ★ {(c.averageRating || 0).toFixed(1)}
                                </span>
                                <span> ({c.totalRatings || 0} votes)</span>
                              </div>
                              <div>
                                <span>Plays: {c.playCount || 0} • Solved: {c.solvedCount || 0}</span>
                              </div>
                            </div>

                            <button
                              className="btn font-mono"
                              onClick={() => handleCaseClick(c)}
                              style={{
                                width: '100%',
                                marginTop: '10px',
                                padding: '6px',
                                fontSize: '11.5px',
                                background: 'rgba(0, 240, 255, 0.05)',
                                borderColor: 'rgba(0, 240, 255, 0.3)',
                                color: 'var(--primary)'
                              }}
                            >
                              📁 Open File
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
            No file dossiers matches your query.
          </p>
        )}
      </div>
    </div>
  );
}
