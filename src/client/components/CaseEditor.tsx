import React, { useState } from 'react';
import { CustomCaseData, INVESTIGATIONS, InvestigationAction } from '../../shared/types';

interface CaseEditorProps {
  onSubmit: (caseData: CustomCaseData) => void;
  submitting: boolean;
}

export default function CaseEditor({ onSubmit, submitting }: CaseEditorProps) {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [initialClues, setInitialClues] = useState<string[]>(['', '', '']);
  const [culprit, setCulprit] = useState('');
  const [motive, setMotive] = useState('');
  const [method, setMethod] = useState('');
  const [twist, setTwist] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [estimatedTime, setEstimatedTime] = useState('15 mins');
  const [timeline, setTimeline] = useState('');
  const [evidenceExplanation, setEvidenceExplanation] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // Initialize investigation actions list with empty response texts
  const [investigationReplies, setInvestigationReplies] = useState<Record<string, string>>(() => {
    const replies: Record<string, string> = {};
    Object.keys(INVESTIGATIONS).forEach((key) => {
      replies[key] = '';
    });
    return replies;
  });

  const handleClueChange = (index: number, val: string) => {
    const updated = [...initialClues];
    updated[index] = val;
    setInitialClues(updated);
  };

  const handleAddClue = () => {
    setInitialClues([...initialClues, '']);
  };

  const handleRemoveClue = (index: number) => {
    if (initialClues.length <= 3) return; // Keep at least 3 initial clues
    const updated = initialClues.filter((_, idx) => idx !== index);
    setInitialClues(updated);
  };

  const handleReplyChange = (action: string, val: string) => {
    setInvestigationReplies({
      ...investigationReplies,
      [action]: val
    });
  };

  const validate = () => {
    if (!title.trim()) return 'Case title is required.';
    if (!story.trim()) return 'Story case description is required.';
    if (initialClues.some(c => !c.trim())) return 'All starting clues must be filled out.';
    if (!culprit.trim()) return 'Culprit target solution is required.';
    if (!motive.trim()) return 'Motive target solution is required.';
    if (!method.trim()) return 'Method target solution is required.';
    if (!twist.trim()) return 'Twist target solution is required.';
    if (!timeline.trim()) return 'Timeline sequencing is required.';
    if (!evidenceExplanation.trim()) return 'Evidence breakdown explanation is required.';

    // Validate that all 10 investigation replies are filled
    const missingAction = Object.keys(INVESTIGATIONS).find(k => !investigationReplies[k].trim());
    if (missingAction) {
      const label = INVESTIGATIONS[missingAction as InvestigationAction].label;
      return `Please fill in the response clue for the forensic action: ${label}.`;
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(`⚠️ Validation Error:\n${err}`);
      return;
    }

    const payload: CustomCaseData = {
      title,
      story,
      initialClues,
      culprit,
      motive,
      method,
      twist,
      difficulty,
      estimatedTime,
      investigations: investigationReplies,
      timeline,
      evidenceExplanation,
      thumbnailUrl: thumbnailUrl.trim() || undefined
    };

    onSubmit(payload);
  };

  const getPreviewObj = (): CustomCaseData => ({
    title: title || 'Untitled Mystery',
    story: story || 'In the silent corridors of the cyber-manor...',
    initialClues: initialClues.filter(c => c.trim()),
    culprit,
    motive,
    method,
    twist,
    difficulty,
    estimatedTime,
    investigations: investigationReplies,
    timeline,
    evidenceExplanation,
    thumbnailUrl
  });

  if (previewMode) {
    const preview = getPreviewObj();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 className="font-mono text-cyan" style={{ fontSize: '14px', margin: 0 }}>
            👁️ CASE DOSSIER PREVIEW
          </h4>
          <button className="btn font-mono" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setPreviewMode(false)}>
            ◀ BACK TO EDITOR
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#0a0b0e' }}>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
            <span className="font-mono text-muted" style={{ fontSize: '10px' }}>CASE PREVIEW (DIFFICULTY {'⭐'.repeat(preview.difficulty)})</span>
            <h2 className="text-cyan font-mono" style={{ fontSize: '18px', margin: '4px 0' }}>{preview.title}</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Est. Play Time: {preview.estimatedTime}</span>
          </div>

          <div>
            <h5 className="font-mono text-cyan" style={{ fontSize: '11px', marginBottom: '4px' }}>CRIME SCENE SCENARIO</h5>
            <p className="text-main" style={{ fontSize: '13px', lineHeight: '1.4' }}>{preview.story}</p>
          </div>

          <div>
            <h5 className="font-mono text-cyan" style={{ fontSize: '11px', marginBottom: '4px' }}>INITIAL CLUES DISCOVERED</h5>
            <ul style={{ paddingLeft: '16px', fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {preview.initialClues.map((c, i) => (
                <li key={i}>{c || '(Empty clue slot)'}</li>
              ))}
            </ul>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid var(--secondary)', padding: '8px 12px', marginTop: '4px' }}>
            <h5 className="font-mono text-gold" style={{ fontSize: '11px', margin: 0 }}>TARGET DEDUCTION KEY</h5>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', color: 'var(--text-main)' }}>
              <span>👤 <strong>Culprit:</strong> {preview.culprit || 'TBD'}</span>
              <span>💰 <strong>Motive:</strong> {preview.motive || 'TBD'}</span>
              <span>🗡 <strong>Method:</strong> {preview.method || 'TBD'}</span>
              <span>🎭 <strong>Twist:</strong> {preview.twist || 'TBD'}</span>
            </div>
          </div>
        </div>

        <button className="btn font-mono" disabled={submitting} onClick={handleSubmit} style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: '#000', fontWeight: 'bold' }}>
          {submitting ? 'SUBMITTING FILE...' : '🚀 CONFIRM SUBMIT TO SUBREDDIT LOG'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 className="font-mono text-cyan" style={{ fontSize: '14px', margin: 0 }}>
          📝 CASE DOSSIER COMPILER
        </h4>
        <button className="btn font-mono" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => setPreviewMode(true)}>
          👁️ PREVIEW DOSSIER
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Core Metadata */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h5 className="font-mono text-cyan" style={{ fontSize: '11.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            SECTION I: GENERAL METADATA
          </h5>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Case Title</label>
            <input
              type="text"
              className="console-input"
              placeholder="e.g. The Quantum Lab Murder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Difficulty Level</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}
                style={{ background: '#0a0b0e', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '6px', borderRadius: '4px', fontSize: '13px' }}
              >
                <option value="1">⭐☆☆☆☆ (Very Easy)</option>
                <option value="2">⭐⭐☆☆☆ (Easy)</option>
                <option value="3">⭐⭐⭐☆☆ (Medium)</option>
                <option value="4">⭐⭐⭐⭐☆ (Hard)</option>
                <option value="5">⭐⭐⭐⭐⭐ (Expert)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Est. Play Time</label>
              <input
                type="text"
                className="console-input"
                placeholder="e.g. 15 mins"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                style={{ fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Optional Case Thumbnail URL</label>
            <input
              type="text"
              className="console-input"
              placeholder="https://..."
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              style={{ fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Narrative & Starting Clues */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h5 className="font-mono text-cyan" style={{ fontSize: '11.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            SECTION II: NARRATIVE & SCENARIO
          </h5>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Crime Scene Scenario Description</label>
            <textarea
              className="console-input"
              rows={4}
              placeholder="Describe the initial scene, the victim, their state, time of discovery, and surrounding context."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '12px', resize: 'vertical', padding: '8px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Starting Clues (Min. 3)</span>
              <button type="button" onClick={handleAddClue} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>
                + ADD CLUE
              </button>
            </label>
            {initialClues.map((clue, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="console-input"
                  placeholder={`Starting clue #${idx + 1}`}
                  value={clue}
                  onChange={(e) => handleClueChange(idx, e.target.value)}
                  style={{ flex: 1, fontSize: '12.5px' }}
                />
                {initialClues.length > 3 && (
                  <button type="button" onClick={() => handleRemoveClue(idx)} style={{ color: '#ff2d55', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Deductions Target Solutions */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h5 className="font-mono text-cyan" style={{ fontSize: '11.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            SECTION III: SOLUTION KEYS (DEDUCTIONS)
          </h5>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>👤 Culprit Answer</label>
              <input
                type="text"
                className="console-input"
                placeholder="e.g. Dr. Arthur Vance"
                value={culprit}
                onChange={(e) => setCulprit(e.target.value)}
                style={{ fontSize: '12.5px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>💰 Motive Answer</label>
              <input
                type="text"
                className="console-input"
                placeholder="e.g. Cover up laboratory data theft"
                value={motive}
                onChange={(e) => setMotive(e.target.value)}
                style={{ fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>🗡 Method Answer</label>
              <input
                type="text"
                className="console-input"
                placeholder="e.g. Poisoned the ventilation unit"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ fontSize: '12.5px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>🎭 Twist Answer</label>
              <input
                type="text"
                className="console-input"
                placeholder="e.g. The suspect has a twins clone"
                value={twist}
                onChange={(e) => setTwist(e.target.value)}
                style={{ fontSize: '12.5px' }}
              />
            </div>
          </div>
        </div>

        {/* 10 Investigations Clues */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h5 className="font-mono text-cyan" style={{ fontSize: '11.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            SECTION IV: FORENSIC INVESTIGATIONS (10 CLUES)
          </h5>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Define what players learn when spending IP points on each specific lab action.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {Object.entries(INVESTIGATIONS).map(([key, config]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'normal' }}>(Cost: {config.cost} IP)</span>
                </label>
                <textarea
                  className="console-input"
                  rows={2}
                  placeholder={`Response clue when checking: ${config.label}...`}
                  value={investigationReplies[key]}
                  onChange={(e) => handleReplyChange(key, e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '11.5px', resize: 'vertical', padding: '6px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Narrative Details */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h5 className="font-mono text-cyan" style={{ fontSize: '11.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            SECTION V: POST-GAME NARRATIVE FILE & SCHEMATICS
          </h5>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Case Timeline Sequencing</label>
            <textarea
              className="console-input"
              rows={3}
              placeholder="e.g. 10:00 PM: Intruder spotted on camera..."
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '11.5px', resize: 'vertical', padding: '6px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Evidence Explanation</label>
            <textarea
              className="console-input"
              rows={3}
              placeholder="Explain how each physical item left at the crime scene logically ties back to the suspect."
              value={evidenceExplanation}
              onChange={(e) => setEvidenceExplanation(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '11.5px', resize: 'vertical', padding: '6px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn font-mono"
            onClick={() => setPreviewMode(true)}
            style={{ flex: 1, padding: '10px' }}
          >
            👁️ PREVIEW DOSSIER
          </button>
          <button
            type="submit"
            className="btn font-mono"
            disabled={submitting}
            style={{ flex: 1, padding: '10px', background: 'var(--primary)', color: '#000', fontWeight: 'bold' }}
          >
            {submitting ? 'SUBMITTING...' : '🚀 SUBMIT DOSSIER'}
          </button>
        </div>
      </form>
    </div>
  );
}
