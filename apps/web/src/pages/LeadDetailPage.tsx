import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Lead, Activity, Note, Meeting } from '@bind-build/shared';
import { formatBudget, stageLabel, timeAgo, formatDate, SOURCE_ICONS, cleanPhone, cleanWhatsAppPhone, format10DigitPhone, downloadLeadVCard } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import CreateMeetingModal from '../components/leads/CreateMeetingModal';
import LiveCallDialerModal from '../components/leads/LiveCallDialerModal';
import ProposalPanel from '../components/leads/ProposalPanel';
import FilesPanel from '../components/leads/FilesPanel';
import AISalesCopilot from '../components/leads/AISalesCopilot';
import WhatsAppTemplatesModal from '../components/leads/WhatsAppTemplatesModal';
import AICallSummaryModal from '../components/leads/AICallSummaryModal';
import InvoiceModal from '../components/leads/InvoiceModal';
import CreativeLoader from '../components/common/CreativeLoader';

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
  callBackAt?: string | null;
  callBackNote?: string | null;
  meetingUrl?: string | null;
};

const STEPPER_STAGES = [
  { key: 'NEW', label: 'New enquiry', stepNum: 1 },
  { key: 'CONTACTED', label: 'Contacted', stepNum: 2 },
  { key: 'CALL_BACK', label: 'Call Back', stepNum: 3 },
  { key: 'MEETING', label: 'Google Meet', stepNum: 4 },
  { key: 'PROPOSAL', label: 'Proposal sent', stepNum: 5 },
  { key: 'NEGOTIATION', label: 'Negotiation', stepNum: 6 },
  { key: 'WON', label: 'Won 🎉', stepNum: 7 },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<FullLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'timeline' | 'notes' | 'meetings' | 'proposal' | 'files' | 'ai'>('timeline');
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [actText, setActText] = useState('');
  const [actType, setActType] = useState<'CALL' | 'WHATSAPP' | 'EMAIL' | 'NOTE'>('CALL');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingWinProb, setEditingWinProb] = useState(false);
  const [winProbInput, setWinProbInput] = useState('');
  const [showCallDialer, setShowCallDialer] = useState(false);

  // Direct Phone Call Tracking & Automatic Detection
  const callStartTimeRef = useRef<number | null>(null);
  const [callDetectionBanner, setCallDetectionBanner] = useState<{
    durationSecs: number;
    attended: boolean;
    durationFormatted: string;
  } | null>(null);

  // DND Studio Sales Workflow Modal States
  const [showCallBackModal, setShowCallBackModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [callBackTime, setCallBackTime] = useState('');
  const [callBackNote, setCallBackNote] = useState('');

  const [showMeetModal, setShowMeetModal] = useState(false);
  const [meetTitle, setMeetTitle] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetDuration, setMeetDuration] = useState(60);
  const [meetUrl, setMeetUrl] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Already has website / App');
  const [rejectNote, setRejectNote] = useState('');

  // Feature 3.2: AI Call Summary & Action Item Generator
  const [showAISummaryModal, setShowAISummaryModal] = useState(false);
  const [aiSummaryCallText, setAiSummaryCallText] = useState('');
  const [aiSummaryDuration, setAiSummaryDuration] = useState(0);

  // Feature 4.3: Invoicing & Payment Tracker
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchLead = useCallback(async () => {
    const { data } = await api.get(`/leads/${id}`);
    setLead(data.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Initiate direct phone call to device dialer
  const handleInitiatePhoneCall = () => {
    if (!lead?.phone) {
      toast('No phone number available for this lead', 'warning');
      return;
    }
    const now = Date.now();
    callStartTimeRef.current = now;
    sessionStorage.setItem('active_call_start', now.toString());
    sessionStorage.setItem('active_call_lead_id', lead.id);
    // Directly launch native device phone dialer
    window.location.href = `tel:${cleanPhone(lead.phone)}`;
  };

  // Automatic Call Detection when user switches back from phone dialer
  useEffect(() => {
    const handleCallReturn = async () => {
      if (document.visibilityState === 'visible') {
        const storedStart = sessionStorage.getItem('active_call_start');
        const storedLeadId = sessionStorage.getItem('active_call_lead_id');
        const startTime = storedStart ? Number(storedStart) : callStartTimeRef.current;

        if (startTime && (!storedLeadId || storedLeadId === id)) {
          // Clear immediately so it does not trigger again
          sessionStorage.removeItem('active_call_start');
          sessionStorage.removeItem('active_call_lead_id');
          callStartTimeRef.current = null;

          const elapsedSecs = Math.max(0, Math.round((Date.now() - startTime) / 1000));

          // Only process if user was away for at least 3 seconds (avoiding immediate accidental click)
          if (elapsedSecs >= 3) {
            // Under 8 seconds indicates call was not answered / canceled / busy
            // 8 seconds or more indicates the call was connected and attended
            const attended = elapsedSecs >= 8;
            const mins = Math.floor(elapsedSecs / 60);
            const secs = elapsedSecs % 60;
            const durationFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

            const callText = attended
              ? `📞 Outbound Call Completed · Attended · Talk Time: ${durationFormatted}`
              : `📞 Outbound Call Attempted · Not Attended / Busy (${durationFormatted})`;

            // 1. Switch tab to timeline and set actType to 'CALL'
            setTab('timeline');
            setActType('CALL');

            // 2. Pre-fill the composer text area (Image 2) so user sees it
            setActText(callText);

            // 3. Set a banner notification in the timeline composer
            setCallDetectionBanner({
              durationSecs: elapsedSecs,
              attended,
              durationFormatted,
            });

            // 4. Automatically save this activity to the server so it appears in the chat/timeline feed
            try {
              await api.post('/activities', {
                leadId: id,
                type: 'CALL',
                durationSecs: elapsedSecs,
                text: callText,
              });

              // Promote lead stage to CONTACTED if NEW
              if (lead?.stage === 'NEW') {
                await api.patch(`/leads/${id}`, { stage: 'CONTACTED' });
              }

              // Refresh lead data so the new activity instantly displays in the timeline chat
              fetchLead();

              toast(
                attended
                  ? `✓ Call attended (${durationFormatted}) logged to chat timeline!`
                  : `📞 Call not attended (${durationFormatted}) recorded`,
                'success'
              );
            } catch {
              toast(`Detected call: ${durationFormatted}. Click 'Log activity' to save.`, 'info');
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleCallReturn);
    window.addEventListener('focus', handleCallReturn);

    return () => {
      document.removeEventListener('visibilitychange', handleCallReturn);
      window.removeEventListener('focus', handleCallReturn);
    };
  }, [id, lead?.stage, fetchLead, toast]);

  const updateStage = async (stage: string) => {
    if (stage === lead?.stage) return;
    await api.patch(`/leads/${id}`, { stage });
    fetchLead();
    toast(`Stage updated to ${stageLabel(stage)} ✓`, 'success');
  };

  const submitCallBack = async () => {
    if (!callBackTime) {
      toast('Please pick a callback date and time', 'error');
      return;
    }
    try {
      await api.patch(`/leads/${id}`, {
        stage: 'CALL_BACK',
        callBackAt: new Date(callBackTime).toISOString(),
        callBackNote,
      });
      await api.post('/activities', {
        leadId: id,
        type: 'CALL',
        text: `Client requested call back on ${new Date(callBackTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.${callBackNote ? ' Note: ' + callBackNote : ''}`,
      });
      setShowCallBackModal(false);
      fetchLead();
      toast('Call Back scheduled & Stage updated ⏰', 'success');
    } catch {
      toast('Failed to schedule call back', 'error');
    }
  };

  const submitGoogleMeet = async () => {
    if (!meetTime) {
      toast('Please pick a meeting date and time', 'error');
      return;
    }
    try {
      await api.patch(`/leads/${id}`, {
        stage: 'MEETING',
        meetingUrl: meetUrl || null,
      });
      await api.post('/meetings', {
        leadId: id,
        title: meetTitle || `DND Studio Demo with ${lead?.name}`,
        type: 'VideoCall',
        scheduledAt: new Date(meetTime).toISOString(),
        durationMins: meetDuration || 60,
        meetingUrl: meetUrl || null,
      });
      await api.post('/activities', {
        leadId: id,
        type: 'MEETING',
        text: `Scheduled Google Meet demo on ${new Date(meetTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.${meetUrl ? ' Meet Link: ' + meetUrl : ''}`,
      });
      setShowMeetModal(false);
      fetchLead();
      toast('Google Meet demo scheduled & Stage updated 🎥', 'success');
    } catch {
      toast('Failed to schedule meeting', 'error');
    }
  };

  const submitReject = async () => {
    try {
      await api.patch(`/leads/${id}`, {
        stage: 'LOST',
        lostReason: rejectReason,
        lostNote: rejectNote || null,
      });
      await api.post('/activities', {
        leadId: id,
        type: 'STAGE_CHANGE',
        text: `Lead marked as Rejected / Lost. Reason: ${rejectReason}${rejectNote ? ' (' + rejectNote + ')' : ''}`,
      });
      setShowRejectModal(false);
      fetchLead();
      toast('Lead marked as Lost / Rejected ❌', 'info');
    } catch {
      toast('Failed to update stage', 'error');
    }
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

  if (loading) return <CreativeLoader />;

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
                  <span>Lead <strong>DND-{lead.serialNo?.toString().padStart(3, '0') ?? 'NEW'}</strong></span>
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
              <button
                type="button"
                onClick={handleInitiatePhoneCall}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                Call
              </button>

              {/* WhatsApp button with templates */}
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600, color: '#25D366' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                WhatsApp
              </button>

              {/* Email button */}
              <a
                href={lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(`Website & Mobile App Solutions — DND Studio`)}` : '#'}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                Email
              </a>

              {/* Save Contact to Mobile */}
              <button
                type="button"
                onClick={() => {
                  downloadLeadVCard(lead);
                  toast(`Saved contact DND-${lead.serialNo?.toString().padStart(3, '0') ?? ''} ${lead.name} to mobile contacts! 📇`, 'success');
                }}
                className="btn btn-secondary btn-sm"
                title={`Save DND-${lead.serialNo?.toString().padStart(3, '0') ?? ''} ${lead.name} to your Phone Contacts`}
                style={{
                  borderRadius: 20,
                  padding: '8px 16px',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#10d9a0',
                  borderColor: 'rgba(16,217,160,0.4)',
                  background: 'rgba(16,217,160,0.08)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                📇 Save Contact
              </button>

              {/* Feature 4.3: Invoicing & Payment Tracker */}
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="btn btn-secondary btn-sm"
                title="Generate milestone invoice and UPI payment request"
                style={{
                  borderRadius: 20,
                  padding: '8px 16px',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#a78bfa',
                  borderColor: 'rgba(167, 139, 250, 0.4)',
                  background: 'rgba(167, 139, 250, 0.08)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                🧾 Invoice & UPI
              </button>

              {/* Google Maps button */}
              {lead.projectDescription?.includes('http') && (
                <a
                  href={lead.projectDescription.match(/https?:\/\/[^\s\n]+/)?.[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600, color: '#ea4335' }}
                >
                  📍 Google Maps
                </a>
              )}

              {/* Google Meet join button if link exists */}
              {lead.meetingUrl && (
                <a
                  href={lead.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: 20, padding: '8px 16px', gap: 6, fontSize: 13, fontWeight: 600, color: '#38bdf8', borderColor: '#38bdf8' }}
                >
                  🎥 Join Google Meet
                </a>
              )}

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
                onClick={() => setShowRejectModal(true)}
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

        {/* ── DND Studio Sales Workflow Action Hub ── */}
        <div
          className="card"
          style={{
            padding: '18px 22px',
            background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(56,189,248,0.06) 100%)',
            border: '1px solid rgba(108,99,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Sales Outreach & Next Action Hub</span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 9px',
                  borderRadius: 12,
                  fontWeight: 700,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Current: {stageLabel(lead.stage)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              {lead.stage === 'NEW' && '👉 Make discovery call or WhatsApp outreach to introduce DND Studio services.'}
              {lead.stage === 'CONTACTED' && '👉 Client reached! Did they ask to call back, confirm for Google Meet demo, or reject?'}
              {lead.stage === 'CALL_BACK' && `👉 ⏰ Call back scheduled${lead.callBackAt ? ' for ' + new Date(lead.callBackAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}. Ready to call back and confirm?`}
              {lead.stage === 'MEETING' && (lead.meetingUrl ? `👉 🎥 Google Meet demo scheduled: ${lead.meetingUrl}` : '👉 Google Meet demo scheduled. Present website/mobile app portfolio.')}
              {lead.stage === 'PROPOSAL' && '👉 Commercial quotation & scope sent. Awaiting client review.'}
              {lead.stage === 'NEGOTIATION' && '👉 Finalizing commercial terms and advance payment.'}
              {lead.stage === 'WON' && '🎉 Project signed & advance received! Development in progress.'}
              {lead.stage === 'LOST' && `❌ Opportunity closed. Reason: ${lead.lostReason || 'Not interested'}${lead.lostNote ? ' (' + lead.lostNote + ')' : ''}`}
            </div>
          </div>

          {/* Quick Action Decision Triggers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleInitiatePhoneCall}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, rgba(16,217,160,0.2) 0%, rgba(56,189,248,0.2) 100%)',
                border: '1px solid rgba(16,217,160,0.5)',
                color: '#10d9a0', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>📞</span> Live Call & Timer
            </button>

            <button
              type="button"
              onClick={() => setShowCallBackModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
                color: '#fbbf24', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>⏰</span> Will Call Back
            </button>

            <button
              type="button"
              onClick={() => setShowMeetModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)',
                color: '#38bdf8', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>🎥</span> Confirmed ➔ Google Meet
            </button>

            <button
              type="button"
              onClick={() => setTab('ai')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, rgba(167,139,250,0.2) 0%, rgba(108,99,255,0.2) 100%)',
                border: '1px solid rgba(167,139,250,0.5)',
                color: '#c4b5fd', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>✨</span> AI Pitch Copilot
            </button>

            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)',
                color: '#f43f5e', cursor: 'pointer', transition: 'all 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>❌</span> Reject / Lost
            </button>
          </div>
        </div>

      </div>

      {/* ── Main 2-Column Grid ───────────────────────────────────────────── */}
      <div className="lead-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.85fr) minmax(320px, 1fr)', gap: 20, alignItems: 'start' }}>

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
            <button
              className={`tab ${tab === 'ai' ? 'active' : ''}`}
              onClick={() => setTab('ai')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: tab === 'ai' ? '#c4b5fd' : 'inherit',
                fontWeight: 700,
              }}
            >
              <span>✨ AI Sales Copilot</span>
              <span style={{
                fontSize: 10, background: 'linear-gradient(135deg, #a78bfa 0%, var(--brand) 100%)',
                color: '#fff', padding: '1px 6px', borderRadius: 8, fontWeight: 800,
              }}>
                AI
              </span>
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
                {/* Detected Call Result Banner */}
                {callDetectionBanner && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: callDetectionBanner.attended ? 'rgba(16,217,160,0.12)' : 'rgba(245,166,35,0.12)',
                    border: `1px solid ${callDetectionBanner.attended ? 'rgba(16,217,160,0.35)' : 'rgba(245,166,35,0.35)'}`,
                    borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{callDetectionBanner.attended ? '✅' : '📵'}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: callDetectionBanner.attended ? '#10d9a0' : '#f5a623' }}>
                          {callDetectionBanner.attended ? 'Call Attended' : 'Call Not Attended / Busy'} · {callDetectionBanner.durationFormatted}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Automatically detected and saved to timeline chat below ✓
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {callDetectionBanner.attended && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          onClick={() => {
                            setAiSummaryCallText(`Outbound call attended for ${callDetectionBanner.durationFormatted}.`);
                            setAiSummaryDuration(callDetectionBanner.durationSecs);
                            setShowAISummaryModal(true);
                          }}
                        >
                          ✨ AI Summarize
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCallDetectionBanner(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>⌘↵</kbd> to log
                  </span>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        borderRadius: 8,
                        padding: '7px 12px',
                        gap: 6,
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                        borderColor: 'rgba(139, 92, 246, 0.35)',
                        color: '#c4b5fd',
                        fontWeight: 600,
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onClick={() => {
                        setAiSummaryCallText(actText.trim() || `Discussed project scope with ${lead.name}`);
                        setShowAISummaryModal(true);
                      }}
                    >
                      <span>✨</span> AI Analyze & Next Action
                    </button>

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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: nodeColor, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                {act.type.replace('_', ' ')}
                              </span>
                              {act.durationSecs ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                                  background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)',
                                }}>
                                  ⏱️ {Math.floor(act.durationSecs / 60)}m {act.durationSecs % 60}s talk time
                                </span>
                              ) : null}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(act.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                            {act.text}
                          </div>
                          {(act.type === 'CALL' || act.type === 'NOTE') && (
                            <div style={{ marginTop: 8 }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: 'rgba(139, 92, 246, 0.1)',
                                  color: '#c4b5fd',
                                  borderColor: 'rgba(139, 92, 246, 0.25)',
                                }}
                                onClick={() => {
                                  setAiSummaryCallText(act.text);
                                  setAiSummaryDuration(act.durationSecs || 0);
                                  setShowAISummaryModal(true);
                                }}
                              >
                                ✨ AI Action Items & Follow-Up
                              </button>
                            </div>
                          )}
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

          {/* ── AI Sales Copilot Tab Content ───────────────────────────────── */}
          {tab === 'ai' && (
            <AISalesCopilot
              lead={lead}
              onStartCallWithScript={handleInitiatePhoneCall}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {lead.phone ? format10DigitPhone(lead.phone) : '—'}
                    </span>
                    {lead.phone && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleInitiatePhoneCall}
                          style={{ padding: '2px 8px', fontSize: 11, borderRadius: 12, color: '#38bdf8', borderColor: 'rgba(56,189,248,0.4)', cursor: 'pointer' }}
                        >
                          ⚡ Dial
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            downloadLeadVCard(lead);
                            toast(`Saved contact DND-${lead.serialNo?.toString().padStart(3, '0') ?? ''} ${lead.name} to mobile contacts! 📇`, 'success');
                          }}
                          title="Save contact card to mobile contacts"
                          style={{ padding: '2px 8px', fontSize: 11, borderRadius: 12, color: '#10d9a0', borderColor: 'rgba(16,217,160,0.4)', background: 'rgba(16,217,160,0.08)', cursor: 'pointer' }}
                        >
                          📇 Save Contact
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Talk Time */}
              {(lead.totalCallDurationSecs ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 14, color: '#38bdf8', marginTop: 2 }}>⏱️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>Total Talk Time</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                      {Math.floor((lead.totalCallDurationSecs ?? 0) / 60)}m {(lead.totalCallDurationSecs ?? 0) % 60}s ({lead.activities?.filter((a) => a.type === 'CALL').length ?? 1} calls)
                    </div>
                  </div>
                </div>
              )}

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
                    {lead.projectType || 'Web & App Development'}
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>👤</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 2 }}>Owner</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lead.owner?.name ?? 'Nirmal kumar N'}
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

      {/* ── 1. Call Back Modal ── */}
      {showCallBackModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCallBackModal(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title">⏰ Schedule Call Back</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCallBackModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Client requested a follow-up call. Pick a callback time to set reminders and move to <strong>Call Back</strong> stage.
              </p>

              {/* Quick Presets */}
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 6 }}>Quick Time Presets</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Today 4:00 PM', offsetHours: () => { const d = new Date(); d.setHours(16, 0, 0, 0); return d; } },
                    { label: 'Today 6:30 PM', offsetHours: () => { const d = new Date(); d.setHours(18, 30, 0, 0); return d; } },
                    { label: 'Tomorrow 11:00 AM', offsetHours: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d; } },
                    { label: 'Tomorrow 4:00 PM', offsetHours: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(16, 0, 0, 0); return d; } },
                    { label: 'In 2 Days', offsetHours: () => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(11, 0, 0, 0); return d; } },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const local = p.offsetHours();
                        const pad = (n: number) => String(n).padStart(2, '0');
                        setCallBackTime(`${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`);
                      }}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Call Back Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  required
                  value={callBackTime}
                  onChange={(e) => setCallBackTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Call Back Note / Client Instruction</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Owner in kitchen, call after lunch rush at 4 PM"
                  value={callBackNote}
                  onChange={(e) => setCallBackNote(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCallBackModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submitCallBack}
                  style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 700 }}
                >
                  ⏰ Save & Move to Call Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Google Meet Modal ── */}
      {showMeetModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowMeetModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">🎥 Schedule Google Meet Demo</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMeetModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Client confirmed interest! Schedule the demo meeting, add your Google Meet link, and advance to <strong>Google Meet</strong> stage.
              </p>

              <div className="form-group">
                <label className="form-label">Meeting Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Website & Mobile App Demo Discussion"
                  value={meetTitle}
                  onChange={(e) => setMeetTitle(e.target.value)}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    required
                    value={meetTime}
                    onChange={(e) => setMeetTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <select
                    className="form-select"
                    value={meetDuration}
                    onChange={(e) => setMeetDuration(Number(e.target.value))}
                  >
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Google Meet Link</label>
                  <a
                    href="https://meet.google.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}
                  >
                    + Open meet.google.com/new ↗
                  </a>
                </div>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                />
              </div>

              {/* WhatsApp invitation preview */}
              {lead.phone && (
                <div style={{ padding: '10px 14px', background: 'rgba(37,211,102,0.08)', borderRadius: 8, border: '1px solid rgba(37,211,102,0.25)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#25D366', marginBottom: 4 }}>💬 WhatsApp Invitation to Client:</div>
                  <a
                    href={`https://wa.me/${cleanWhatsAppPhone(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, confirming our Google Meet demo on ${meetTime ? new Date(meetTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'our scheduled time'}.\nGoogle Meet Link: ${meetUrl || 'https://meet.google.com/new'}\n\nLooking forward to speaking with you! — Nirmal, DND Studio`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12, color: '#25D366', borderColor: '#25D366' }}
                  >
                    Send Meeting Link via WhatsApp ↗
                  </a>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeetModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submitGoogleMeet}
                  style={{ background: '#38bdf8', borderColor: '#38bdf8', color: '#000', fontWeight: 700 }}
                >
                  🎥 Schedule & Move to Google Meet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Rejection / Lost Modal ── */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--rose)' }}>❌ Mark Lead as Lost / Rejected</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Record why this lead declined or was rejected. This data improves future outreach targeting.
              </p>

              <div className="form-group">
                <label className="form-label">Primary Reason *</label>
                <select
                  className="form-select"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                >
                  <option value="Already has website / App">Already has website / App</option>
                  <option value="No budget right now">No budget right now</option>
                  <option value="Not interested in digital solutions">Not interested in digital solutions</option>
                  <option value="Did not answer / Call disconnected">Did not answer / Call disconnected</option>
                  <option value="Went with competitor">Went with competitor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Feedback / Note (Optional)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Owner stated they already hired a freelancer last month."
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={submitReject}
                  style={{ background: 'var(--rose)', borderColor: 'var(--rose)', color: '#fff', fontWeight: 700 }}
                >
                  Confirm Rejection & Mark Lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Live Call In-App Dialer & Duration Tracker Modal ── */}
      {showCallDialer && lead && (
        <LiveCallDialerModal
          lead={lead}
          onClose={() => setShowCallDialer(false)}
          onCallLogged={() => {
            fetchLead();
            setTab('timeline');
          }}
        />
      )}

      {/* ── 5. WhatsApp Templates & Auto Activity Logger ── */}
      {showWhatsAppModal && lead && (
        <WhatsAppTemplatesModal
          lead={lead}
          onClose={() => setShowWhatsAppModal(false)}
          onSent={() => {
            fetchLead();
            setTab('timeline');
          }}
        />
      )}

      {/* ── 6. Feature 3.2: AI Call Summary & Action Item Modal ── */}
      {showAISummaryModal && lead && (
        <AICallSummaryModal
          isOpen={showAISummaryModal}
          onClose={() => setShowAISummaryModal(false)}
          lead={lead}
          initialCallText={aiSummaryCallText}
          durationSecs={aiSummaryDuration}
          onLeadUpdated={() => {
            fetchLead();
            setTab('timeline');
          }}
        />
      )}

      {/* ── 7. Feature 4.3: Invoicing & Payment Tracker Modal ── */}
      {showInvoiceModal && lead && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          lead={lead}
        />
      )}

    </div>
  );
}
