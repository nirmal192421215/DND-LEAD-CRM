import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Lead, Activity, Note, Meeting } from '@bind-build/shared';
import { formatBudget, stageLabel, timeAgo, formatDate, SOURCE_ICONS } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import CreateMeetingModal from '../components/leads/CreateMeetingModal';
import ProposalPanel from '../components/leads/ProposalPanel';
import FilesPanel from '../components/leads/FilesPanel';

type FileAsset = {
  id: string;
  fileName: string;
  kind: 'pdf' | 'dwg' | 'img' | 'xls';
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
  uploadedBy: { name: string; initials: string };
};

type FullLead = Lead & {
  activities?: Activity[];
  notes?: Note[];
  meetings?: Meeting[];
  fileAssets?: FileAsset[];
  proposal?: {
    id: string;
    amountLakhs: number;
    version: number;
    sentAt: string;
    status: 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';
    viewCount: number;
    lastViewedAt?: string;
    createdBy: { name: string; initials: string };
  } | null;
  owner?: { id: string; name: string; initials?: string };
};

const STEPPER_STAGES = [
  { key: 'NEW', label: 'New enquiry', stepNum: 1 },
  { key: 'CONTACTED', label: 'Contacted', stepNum: 2 },
  { key: 'MEETING', label: 'Meeting', stepNum: 3 },
  { key: 'PROPOSAL', label: 'Proposal sent', stepNum: 4 },
  { key: 'NEGOTIATION', label: 'Negotiation', stepNum: 5 },
  { key: 'WON', label: 'Won', stepNum: 6 },
];

function cleanPhone(phone?: string) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<FullLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'timeline' | 'notes' | 'meetings' | 'proposal' | 'files'>('timeline');
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [actText, setActText] = useState('');
  const [actType, setActType] = useState<'CALL' | 'WHATSAPP' | 'EMAIL' | 'NOTE'>('CALL');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingWinProb, setEditingWinProb] = useState(false);
  const [winProbInput, setWinProbInput] = useState('');

  const fetchLead = useCallback(async () => {
    const { data } = await api.get(`/leads/${id}`);
    setLead(data.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const updateStage = async (stage: string) => {
    if (stage === lead?.stage) return;
    await api.patch(`/leads/${id}`, { stage });
    fetchLead();
    toast(`Stage updated to ${stageLabel(stage)} ✓`, 'success');
  };

  const updateWinProb = async () => {
    const val = parseInt(winProbInput);
    if (isNaN(val) || val < 0 || val > 100) return;
    await api.patch(`/leads/${id}`, { winProbability: val });
    setEditingWinProb(false);
    fetchLead();
    toast('Win probability updated', 'success');
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    await api.post('/notes', { leadId: id, text: noteText });
    setNoteText('');
    setSavingNote(false);
    fetchLead();
    toast('Note added', 'success');
  };

  const addActivity = async () => {
    if (!actText.trim()) return;
    await api.post('/activities', { leadId: id, type: actType, text: actText });
    setActText('');
    fetchLead();
    toast('Activity logged', 'success');
  };

  const completeMeeting = async (meetingId: string) => {
    await api.patch(`/meetings/${meetingId}/complete`, {});
    fetchLead();
    toast('Meeting marked complete ✓', 'success');
  };

  const pinNote = async (noteId: string, currentPinned: boolean) => {
    await api.patch(`/notes/${noteId}`, { pinned: !currentPinned });
    fetchLead();
  };

  if (loading) {
    return (
      <div className="loader-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Lead not found</div>
        <button className="btn btn-secondary mt-12" onClick={() => navigate('/leads')}>← Back to Pipeline</button>
      </div>
    );
  }

  const currentStageIndex = STEPPER_STAGES.findIndex((s) => s.key === lead.stage);
  const daysInPipeline = Math.max(1, Math.floor((new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const initials = lead.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const ACT_ICONS: Record<string, string> = {
    CALL: '📞', WHATSAPP: '💬', EMAIL: '✉️', NOTE: '📝',
    MEETING: '🤝', STAGE_CHANGE: '🔄', FILE: '📁',
  };

  const MTG_TYPE_ICONS: Record<string, string> = {
    StudioMeeting: '🏛', VideoCall: '📹', SiteVisit: '🏗', PhoneCall: '📞',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Top Header Navigation & Action Bar ────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Back button link */}
        <button
          onClick={() => navigate('/leads')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer',
            width: 'fit-content', padding: 0,
          }}
        >
          <span>←</span> Back to pipeline
        </button>

        {/* Lead Main Banner & Quick Action Buttons */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>

            {/* Left: Avatar + Title + Badges + Metadata */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

              {/* Avatar circle */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #fb923c, #f5a623)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffffff', fontWeight: 800, fontSize: 20,
                fontFamily: 'var(--font-display)', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(245,166,35,0.25)',
              }}>
                {initials}
              </div>

              <div>
                {/* Lead Name & Pill Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{
                    fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
                    color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
                  }}>
                    {lead.name}
                  </h1>

                  {/* Badges */}
                  <span className={`priority-badge priority-${lead.priority}`} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12 }}>
                    ● {lead.priority === 'HOT' ? 'Hot lead' : lead.priority === 'WARM' ? 'Warm lead' : 'Cold lead'}
                  </span>

                  <span className={`stage-badge stage-${lead.stage}`} style={{ fontSize: 11, padding: '3px 12px', borderRadius: 12 }}>
                    ● {stageLabel(lead.stage)}
                  </span>

                  <span style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 12,
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {SOURCE_ICONS[lead.source]} {lead.source}
                  </span>
                </div>

                {/* Subtitle metadata */}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{lead.projectType}</span>
                  <span>·</span>
                  <span>{lead.location}</span>
                  <span>·</span>
                  <span>Lead <strong>{lead.id}</strong></span>
                  <span>·</span>
                  <span>created {formatDate(lead.createdAt)}</span>
                  <span>·</span>
                  <span>{daysInPipeline} {daysInPipeline === 1 ? 'day' : 'days'} in pipeline</span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Contact & Stage Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

              {/* Call button */}
              <a
                href={lead.phone ? `tel:${lead.phone}` : '#'}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                Call
              </a>

              {/* WhatsApp button */}
              <a
                href={lead.phone ? `https://wa.me/${cleanPhone(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, reaching out regarding your ${lead.projectType} project.`)}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                WhatsApp
              </a>

              {/* Email button */}
              <a
                href={lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(`Follow-up: ${lead.projectType} Project`)}` : '#'}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                Email
              </a>

              {/* Mark won button */}
              <button
                onClick={() => updateStage('WON')}
                style={{
                  borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 700,
                  background: lead.stage === 'WON' ? 'var(--emerald)' : 'var(--emerald)',
                  color: '#ffffff', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16,217,160,0.3)',
                  transition: 'transform 150ms, opacity 150ms',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                ✓ Mark won
              </button>

              {/* Mark lost button */}
              <button
                onClick={() => updateStage('LOST')}
                style={{
                  borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 700,
                  background: 'var(--rose-dim)', color: 'var(--rose)',
                  border: '1px solid rgba(255,95,126,0.3)', cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--rose)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--rose-dim)'; e.currentTarget.style.color = 'var(--rose)'; }}
              >
                Mark lost
              </button>
            </div>

          </div>
        </div>

        {/* ── Interactive Stepper Bar (Stage Progress Tracker) ─────────────── */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

            {/* Steps */}
            {STEPPER_STAGES.map((step, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isLast = idx === STEPPER_STAGES.length - 1;

              return (
                <div
                  key={step.key}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                >
                  {/* Top Line & Circle Row */}
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>

                    {/* Left half-line connecting to previous step */}
                    <div style={{
                      flex: 1, height: 2,
                      background: idx <= currentStageIndex ? 'var(--brand)' : 'var(--border-strong)',
                      visibility: idx === 0 ? 'hidden' : 'visible',
                      transition: 'background 300ms ease',
                    }} />

                    {/* Step Circle */}
                    <div
                      onClick={() => updateStage(step.key)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: isCompleted || isCurrent ? 'var(--brand)' : 'var(--bg-card)',
                        border: `2px solid ${isCompleted || isCurrent ? 'var(--brand)' : 'var(--border-strong)'}`,
                        color: isCompleted || isCurrent ? '#ffffff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, cursor: 'pointer', userSelect: 'none',
                        boxShadow: isCurrent ? '0 0 0 4px var(--brand-dim)' : 'none',
                        transition: 'all 200ms', zIndex: 2,
                      }}
                    >
                      {isCompleted ? '✓' : step.stepNum}
                    </div>

                    {/* Right half-line connecting to next step */}
                    <div style={{
                      flex: 1, height: 2,
                      background: idx < currentStageIndex ? 'var(--brand)' : 'var(--border-strong)',
                      visibility: isLast ? 'hidden' : 'visible',
                      transition: 'background 300ms ease',
                    }} />
                  </div>

                  {/* Step Label */}
                  <span
                    onClick={() => updateStage(step.key)}
                    style={{
                      fontSize: 12, fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                      marginTop: 10, textAlign: 'center', cursor: 'pointer',
                      transition: 'color 150ms',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* ── Main Content Body: 2 Columns ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* ── Left Column: Tabs & Feed Content ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Navigation Tabs */}
          <div className="tabs">
            <button className={`tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>
              Timeline <span style={{ fontSize: 11, background: tab === 'timeline' ? 'var(--brand)' : 'var(--bg-elevated)', color: tab === 'timeline' ? '#fff' : 'var(--text-muted)', padding: '1px 7px', borderRadius: 10, marginLeft: 4 }}>{lead.activities?.length ?? 0}</span>
            </button>
            <button className={`tab ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>
              Notes <span style={{ fontSize: 11, background: tab === 'notes' ? 'var(--brand)' : 'var(--bg-elevated)', color: tab === 'notes' ? '#fff' : 'var(--text-muted)', padding: '1px 7px', borderRadius: 10, marginLeft: 4 }}>{lead.notes?.length ?? 0}</span>
            </button>
            <button className={`tab ${tab === 'meetings' ? 'active' : ''}`} onClick={() => setTab('meetings')}>
              Meetings <span style={{ fontSize: 11, background: tab === 'meetings' ? 'var(--brand)' : 'var(--bg-elevated)', color: tab === 'meetings' ? '#fff' : 'var(--text-muted)', padding: '1px 7px', borderRadius: 10, marginLeft: 4 }}>{lead.meetings?.length ?? 0}</span>
            </button>
            <button className={`tab ${tab === 'files' ? 'active' : ''}`} onClick={() => setTab('files')}>
              Files <span style={{ fontSize: 11, background: tab === 'files' ? 'var(--brand)' : 'var(--bg-elevated)', color: tab === 'files' ? '#fff' : 'var(--text-muted)', padding: '1px 7px', borderRadius: 10, marginLeft: 4 }}>{lead.fileAssets?.length ?? 0}</span>
            </button>
            <button className={`tab ${tab === 'proposal' ? 'active' : ''}`} onClick={() => setTab('proposal')}>
              Proposal {lead.proposal ? `(v${lead.proposal.version})` : ''}
            </button>
          </div>

          {/* ── Timeline Tab Content ───────────────────────────────────────── */}
          {tab === 'timeline' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Activity Log Composer Box */}
              <div style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)', padding: 16,
              }}>
                {/* Type Selection Pill Buttons */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[
                    { type: 'CALL', label: 'Call', icon: '📞' },
                    { type: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
                    { type: 'EMAIL', label: 'Email', icon: '✉️' },
                    { type: 'NOTE', label: 'Note', icon: '✍️' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setActType(item.type as any)}
                      style={{
                        padding: '6px 14px', borderRadius: 20,
                        border: `1px solid ${actType === item.type ? 'var(--brand)' : 'transparent'}`,
                        background: actType === item.type ? 'var(--bg-card)' : 'transparent',
                        color: actType === item.type ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 6,
                        boxShadow: actType === item.type ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      <span>{item.icon}</span> {item.label}
                    </button>
                  ))}
                </div>

                {/* Log Input Textarea */}
                <textarea
                  className="form-textarea"
                  style={{
                    minHeight: 75, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)',
                    resize: 'vertical', width: '100%', outline: 'none',
                  }}
                  placeholder='Log a call, message or note... e.g. "Discussed terrace pergola budget"'
                  value={actText}
                  onChange={(e) => setActText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      addActivity();
                    }
                  }}
                />

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>⌘↵</kbd> to log
                  </span>

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ borderRadius: 8, padding: '7px 16px', gap: 6 }}
                    onClick={addActivity}
                    disabled={!actText.trim()}
                  >
                    <span>✈️</span> Log activity
                  </button>
                </div>
              </div>

              {/* Activity Timeline Feed */}
              {(lead.activities ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No activities recorded yet</div>
                  <div style={{ fontSize: 12 }}>Log a call, message, or note above</div>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Vertical Timeline Stem Line */}
                  <div style={{
                    position: 'absolute', top: 12, bottom: 12, left: 11, width: 2,
                    background: 'var(--border-strong)', zIndex: 0,
                  }} />

                  {(lead.activities ?? []).map((act) => {
                    const nodeColor =
                      act.type === 'CALL' ? '#38bdf8' :
                      act.type === 'WHATSAPP' ? '#25D366' :
                      act.type === 'EMAIL' ? '#6c63ff' :
                      act.type === 'STAGE_CHANGE' ? '#a78bfa' : 'var(--amber)';

                    return (
                      <div key={act.id} style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start' }}>

                        {/* Circular Node Icon on the Vertical Line */}
                        <div style={{
                          position: 'absolute', left: -24, top: 4,
                          width: 26, height: 26, borderRadius: '50%',
                          background: 'var(--bg-card)',
                          border: `2px solid ${nodeColor}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: nodeColor,
                          boxShadow: 'var(--shadow-sm)',
                        }}>
                          {ACT_ICONS[act.type] ?? '📌'}
                        </div>

                        {/* Content Box */}
                        <div style={{
                          flex: 1, background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                          padding: '12px 14px', marginLeft: 10,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: nodeColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {act.type.replace('_', ' ')}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(act.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                            {act.text}
                          </div>
                        </div>

                      </div>
                    );
                  })}

                </div>
              )}

            </div>
          )}

          {/* ── Notes Tab Content ────────────────────────────────────────── */}
          {tab === 'notes' && (
            <div className="card">
              <div style={{ marginBottom: 20 }}>
                <textarea
                  className="form-textarea"
                  placeholder="Add a private note about this client or project…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{ minHeight: 90 }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={addNote}
                  disabled={!noteText.trim() || savingNote}
                >
                  {savingNote ? 'Saving…' : '📝 Add Note'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(lead.notes ?? []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                    <div style={{ fontWeight: 600 }}>No notes created yet</div>
                  </div>
                ) : (
                  (lead.notes ?? []).map((note) => (
                    <div key={note.id} style={{
                      padding: '14px 16px',
                      background: note.pinned ? 'rgba(245,166,35,0.05)' : 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${note.pinned ? 'rgba(245,166,35,0.25)' : 'var(--border)'}`,
                    }}>
                      {note.pinned && (
                        <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          📌 Pinned Note
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, marginBottom: 8 }}>{note.text}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(note.createdAt)}</span>
                        <button
                          onClick={() => pinNote(note.id, note.pinned)}
                          style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 8,
                            border: `1px solid ${note.pinned ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
                            background: 'transparent', cursor: 'pointer',
                            color: note.pinned ? 'var(--amber)' : 'var(--text-muted)',
                            fontWeight: 600, transition: 'all var(--trans-fast)',
                          }}
                        >
                          {note.pinned ? 'Unpin' : 'Pin'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Meetings Tab Content ──────────────────────────────────────── */}
          {tab === 'meetings' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 14 }}>Scheduled Meetings</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowMeetingModal(true)}>
                  + Schedule Meeting
                </button>
              </div>

              {(lead.meetings ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No meetings scheduled yet</div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowMeetingModal(true)}>
                    + Schedule First Meeting
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(lead.meetings ?? []).map((mtg) => (
                    <div key={mtg.id} style={{
                      padding: '14px 16px',
                      background: mtg.completed ? 'var(--bg-elevated)' : 'rgba(108,99,255,0.04)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${mtg.completed ? 'var(--border)' : 'rgba(108,99,255,0.2)'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span>{MTG_TYPE_ICONS[mtg.type] ?? '📅'}</span>
                            <span style={{ color: mtg.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{mtg.title}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            📅 {formatDate(mtg.scheduledAt)} · ⏱ {mtg.durationMins}min · {mtg.type.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
                            background: mtg.completed ? 'var(--emerald-dim)' : 'rgba(108,99,255,0.12)',
                            color: mtg.completed ? 'var(--emerald)' : 'var(--brand-light)',
                          }}>
                            {mtg.completed ? '✓ Done' : '⏳ Upcoming'}
                          </span>
                          {!mtg.completed && (
                            <button
                              onClick={() => completeMeeting(mtg.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 11, padding: '4px 10px' }}
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Files Tab Content ─────────────────────────────────────────── */}
          {tab === 'files' && id && (
            <FilesPanel
              leadId={id}
              files={lead.fileAssets ?? []}
              onUpdated={fetchLead}
            />
          )}

          {/* ── Proposal Tab Content ──────────────────────────────────────── */}
          {tab === 'proposal' && id && (
            <ProposalPanel
              leadId={id}
              proposal={lead.proposal ?? undefined}
              leadBudget={lead.budgetLakhs}
              onUpdated={fetchLead}
            />
          )}

        </div>

        {/* ── Right Column: Contact Card & Deal Details Card ────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contact Details Card */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              Contact
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Phone */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>📞</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>Phone</div>
                  <a href={`tel:${lead.phone}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lead.phone || '—'}
                  </a>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>✉️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>Email</div>
                  <a href={`mailto:${lead.email}`} style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand-light)', wordBreak: 'break-all' }}>
                    {lead.email || '—'}
                  </a>
                </div>
              </div>

              {/* Site / Location */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>📍</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>Site</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {lead.location || '—'}
                  </div>
                </div>
              </div>

              {/* Project Type / Profession */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>💼</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>Scope / Profession</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {lead.projectType || 'Architecture & Design'}
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>👤</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>Owner</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lead.owner?.name ?? 'AR.PARTHIBAN MOORTHY'}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Deal Details Card */}
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              Deal details
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Budget */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 3 }}>Budget</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {formatBudget(lead.budgetLakhs)}
                </div>
              </div>

              {/* Scope */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 3 }}>Scope</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {lead.projectDescription || 'Design + turnkey execution'}
                </div>
              </div>

              {/* Win Probability */}
              <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Win Probability</span>
                  {editingWinProb ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="number" min="0" max="100"
                        style={{ width: 48, background: 'var(--bg-elevated)', border: '1px solid var(--brand)', borderRadius: 4, padding: '2px 4px', color: 'var(--text-primary)', fontSize: 12, textAlign: 'center' }}
                        value={winProbInput}
                        onChange={(e) => setWinProbInput(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 6px', fontSize: 10 }} onClick={updateWinProb}>✓</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setWinProbInput(String(lead.winProbability)); setEditingWinProb(true); }}
                      style={{ fontSize: 14, fontWeight: 700, color: 'var(--emerald)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {lead.winProbability}%
                    </button>
                  )}
                </div>
                <div className="progress-bar" style={{ height: 5 }}>
                  <div className="progress-fill" style={{ width: `${lead.winProbability}%`, background: 'var(--emerald)' }} />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Meeting Modal */}
      {showMeetingModal && id && (
        <CreateMeetingModal
          leadId={id}
          onClose={() => setShowMeetingModal(false)}
          onCreated={() => {
            setShowMeetingModal(false);
            setTab('meetings');
            fetchLead();
            toast('Meeting scheduled! 📅', 'success');
          }}
        />
      )}

    </div>
  );
}
