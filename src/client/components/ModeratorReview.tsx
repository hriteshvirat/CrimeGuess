import { useState } from 'react';
import { CaseSubmission, CustomCaseData, INVESTIGATIONS } from '../../shared/types';

interface ModeratorReviewProps {
  submissions: CaseSubmission[];
  onApprove: (id: string, updatedCaseData: CustomCaseData) => void;
  onReject: (id: string, reason: string) => void;
  loading: boolean;
}

export default function ModeratorReview({ submissions, onApprove, onReject, loading }: ModeratorReviewProps) {
  const [activeSubmission, setActiveSubmission] = useState<CaseSubmission | null>(null);
  const [editedData, setEditedData] = useState<CustomCaseData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const handleSelect = (sub: CaseSubmission) => {
    setActiveSubmission(sub);
    setEditedData({ ...sub.caseData });
    setShowRejectBox(false);
    setRejectionReason('');
  };

  const handleFieldChange = (field: keyof CustomCaseData, value: any) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      [field]: value
    });
  };

  const handleClueChange = (idx: number, value: string) => {
    if (!editedData) return;
    const updatedClues = [...editedData.initialClues];
    updatedClues[idx] = value;
    setEditedData({
      ...editedData,
      initialClues: updatedClues
    });
  };

  const handleReplyChange = (action: string, value: string) => {
    if (!editedData) return;
    setEditedData({
      ...editedData,
      investigations: {
        ...editedData.investigations,
        [action]: value
      }
    });
  };

  const handleApproveClick = () => {
    if (!activeSubmission || !editedData) return;
    onApprove(activeSubmission.id, editedData);
    setActiveSubmission(null);
    setEditedData(null);
  };

  const handleRejectClick = () => {
    if (!activeSubmission || !rejectionReason.trim()) return;
    onReject(activeSubmission.id, rejectionReason);
    setActiveSubmission(null);
    setEditedData(null);
    setShowRejectBox(false);
  };

  if (activeSubmission && editedData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 className="font-mono text-cyan" style={{ fontSize: '13px', margin: 0 }}>
            🔧 EDIT & AUDIT CASE FILE
          </h4>
          <button className="btn font-mono" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => { setActiveSubmission(null); setEditedData(null); }}>
            ◀ BACK TO LIST
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Case Title</label>
            <input
              type="text"
              className="console-input"
              value={editedData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              style={{ fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Story Scenario</label>
            <textarea
              className="console-input"
              rows={4}
              value={editedData.story}
              onChange={(e) => handleFieldChange('story', e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Initial Clues</label>
            {editedData.initialClues.map((c, i) => (
              <input
                key={i}
                type="text"
                className="console-input"
                value={c}
                onChange={(e) => handleClueChange(i, e.target.value)}
                style={{ fontSize: '12px' }}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Culprit</label>
              <input
                type="text"
                className="console-input"
                value={editedData.culprit}
                onChange={(e) => handleFieldChange('culprit', e.target.value)}
                style={{ fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Motive</label>
              <input
                type="text"
                className="console-input"
                value={editedData.motive}
                onChange={(e) => handleFieldChange('motive', e.target.value)}
                style={{ fontSize: '12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Method</label>
              <input
                type="text"
                className="console-input"
                value={editedData.method}
                onChange={(e) => handleFieldChange('method', e.target.value)}
                style={{ fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Twist</label>
              <input
                type="text"
                className="console-input"
                value={editedData.twist}
                onChange={(e) => handleFieldChange('twist', e.target.value)}
                style={{ fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Investigations Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>EDIT INVESTIGATION RESULTS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
              {Object.entries(INVESTIGATIONS).map(([key, config]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-main)' }}>{config.icon} {config.label}</span>
                  <textarea
                    className="console-input"
                    rows={2}
                    value={editedData.investigations[key] || ''}
                    onChange={(e) => handleReplyChange(key, e.target.value)}
                    style={{ fontSize: '11.5px', fontFamily: 'monospace' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {showRejectBox ? (
          <div className="glass-panel" style={{ padding: '12px', border: '1px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--accent)' }}>Provide Rejection Reason</label>
            <input
              type="text"
              className="console-input"
              placeholder="e.g. Broken starting clues or typos..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ flex: 1, padding: '8px', background: 'var(--accent)', border: 'none', color: '#fff' }} onClick={handleRejectClick} disabled={!rejectionReason.trim()}>
                CONFIRM REJECTION
              </button>
              <button className="btn" style={{ flex: 1, padding: '8px' }} onClick={() => setShowRejectBox(false)}>
                CANCEL
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn font-mono" style={{ flex: 1, padding: '10px', background: '#ff2d55', border: 'none', color: '#fff' }} onClick={() => setShowRejectBox(true)}>
              🛑 REJECT FILE
            </button>
            <button className="btn font-mono" style={{ flex: 1, padding: '10px', background: '#39d353', border: 'none', color: '#000', fontWeight: 'bold' }} onClick={handleApproveClick}>
              ✓ APPROVE & PUBLISH TO SUBREDDIT
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
      <h4 className="font-mono text-cyan" style={{ fontSize: '14px', margin: 0 }}>
        🔒 MODERATOR REVIEW PANEL
      </h4>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Filing cabinets indexing...</p>
      ) : submissions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="glass-panel"
              style={{
                padding: '12px',
                border: '1.5px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.01)'
              }}
              onClick={() => handleSelect(sub)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Created: {sub.createdDate} by u/{sub.author}
                  </span>
                  <h5 style={{ fontSize: '14.5px', color: 'var(--text-main)', margin: '4px 0', fontWeight: 'bold' }}>
                    {sub.caseData.title}
                  </h5>
                </div>
                <span className="status-pill warn" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
          Cabinet is clean. No pending cases for review.
        </p>
      )}
    </div>
  );
}
