import { useState, useEffect, useRef } from 'react';
import type { Lead } from '@bind-build/shared';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface Props {
  lead: Lead;
  onClose: () => void;
  onCallLogged: () => void;
}

type CallStatus = 'DIALING' | 'IN_CALL' | 'ENDED';
type CallOutcome = 'CONTACTED' | 'CALL_BACK' | 'MEETING' | 'LOST' | 'GENERAL';

export default function LiveCallDialerModal({ lead, onClose, onCallLogged }: Props) {
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<CallStatus | 'READY'>('READY');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);
  const [typedDigits, setTypedDigits] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome>('CONTACTED');
  const [callBackTime, setCallBackTime] = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAiPrompts, setShowAiPrompts] = useState(false);
  const [quickPitch, setQuickPitch] = useState<any>(null);
  const [aiLanguage, setAiLanguage] = useState<'tanglish' | 'english'>('tanglish');
  const [aiStage] = useState<string>(lead.stage || 'NEW');

  const timerRef = useRef<any>(null);

  // Load AI Quick Pitch dynamically
  useEffect(() => {
    api.post('/ai/pitch', { leadId: lead.id, stage: aiStage, language: aiLanguage })
      .then(res => setQuickPitch(res.data.data))
      .catch(() => {});
  }, [lead.id, aiStage, aiLanguage]);

  // Auto-connect dialer removed - now requires manual click

  // Timer counter when IN_CALL
  useEffect(() => {
    if (callStatus === 'IN_CALL') {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDurationFriendly = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs} seconds`;
    return `${mins} min${mins > 1 ? 's' : ''} ${secs} sec${secs !== 1 ? 's' : ''}`;
  };

  const handleEndCall = () => {
    setCallStatus('ENDED');
  };

  const handleSaveAndLog = async () => {
    setSaving(true);
    try {
      const durationStr = formatDurationFriendly(seconds);
      let outcomeLabel = 'Initial Discovery Call';
      if (outcome === 'CALL_BACK') outcomeLabel = 'Client requested Call Back';
      if (outcome === 'MEETING') outcomeLabel = 'Confirmed for Google Meet Demo';
      if (outcome === 'CONTACTED') outcomeLabel = 'Interested in DND Studio Services';
      if (outcome === 'LOST') outcomeLabel = 'Not interested / Declined';

      const activityText = `📞 Outbound Call Completed · Duration: ${durationStr}\n\nOutcome: ${outcomeLabel}${callNotes ? '\nNotes: ' + callNotes : ''}`;

      // 1. Log Activity with durationSecs
      await api.post('/activities', {
        leadId: lead.id,
        type: 'CALL',
        durationSecs: seconds,
        text: activityText,
      });

      // 2. Update Lead Stage based on selected outcome
      const patchData: Record<string, any> = {};
      if (outcome === 'CALL_BACK') {
        patchData.stage = 'CALL_BACK';
        if (callBackTime) patchData.callBackAt = new Date(callBackTime).toISOString();
        if (callNotes) patchData.callBackNote = callNotes;
      } else if (outcome === 'MEETING') {
        patchData.stage = 'MEETING';
        if (meetUrl) patchData.meetingUrl = meetUrl;
      } else if (outcome === 'LOST') {
        patchData.stage = 'LOST';
        patchData.lostReason = 'Not interested in services';
        if (callNotes) patchData.lostNote = callNotes;
      } else {
        // If lead was NEW, promote to CONTACTED
        if (lead.stage === 'NEW') {
          patchData.stage = 'CONTACTED';
        }
      }

      if (Object.keys(patchData).length > 0) {
        await api.patch(`/leads/${lead.id}`, patchData);
      }

      toast(`Call logged (${durationStr}) ✓`, 'success');
      onCallLogged();
      onClose();
    } catch {
      toast('Failed to save call log', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, overflow: 'hidden', padding: 0 }}>

        {/* ── Top Header Brand ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1e2e 0%, #161622 100%)',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(108,99,255,0.2)', color: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700,
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                DND Studio In-App Dialer
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Real-time Outbound Call & Duration Tracker
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* ── Main Call Screen ── */}
        <div style={{ padding: '24px' }}>

          {/* Contact Profile Summary */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand) 0%, #38bdf8 100%)',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, margin: '0 auto 12px auto',
              boxShadow: '0 4px 20px rgba(108,99,255,0.4)',
            }}>
              {lead.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              {lead.name}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#38bdf8', marginTop: 2 }}>
              {lead.phone || 'No phone number'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              📍 {lead.location} · {lead.projectType}
            </div>
          </div>

          {/* ── STATE 0: READY ── */}
          {callStatus === 'READY' ? (
            <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 24 }}>
              <a
                href={`tel:${lead.phone}`}
                onClick={() => setCallStatus('IN_CALL')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '16px 32px', borderRadius: 30,
                  background: 'var(--brand)', color: '#fff',
                  fontSize: 18, fontWeight: 800, textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(108,99,255,0.4)',
                }}
              >
                <span>📞</span> Open Dialer & Start Call
              </a>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
                Clicking this will open your phone app and start the call timer.
              </div>
            </div>
          ) : callStatus !== 'ENDED' ? (
            <div>
              {/* Call Status & Live Timer */}
              <div style={{
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                border: '1px solid var(--border)',
                textAlign: 'center',
                marginBottom: 16,
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                  color: callStatus === 'IN_CALL' ? '#10d9a0' : '#f5a623',
                  marginBottom: 8,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: callStatus === 'IN_CALL' ? '#10d9a0' : '#f5a623',
                    boxShadow: callStatus === 'IN_CALL' ? '0 0 10px #10d9a0' : 'none',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  {callStatus === 'IN_CALL' ? 'Call in progress' : 'Connecting to line...'}
                </div>

                {/* Duration Clock */}
                <div style={{
                  fontSize: 38,
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  letterSpacing: 2,
                  color: callStatus === 'IN_CALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                  {formatDuration(seconds)}
                </div>

                {/* Audio Waveform Animation when in call */}
                {callStatus === 'IN_CALL' && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, height: 24, marginTop: 8 }}>
                    {[8, 16, 24, 14, 20, 10, 18, 22, 12, 16, 20, 10].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: 3,
                          height: isMuted ? 4 : h,
                          background: isMuted ? 'var(--text-muted)' : 'var(--brand)',
                          borderRadius: 2,
                          transition: 'height 200ms ease',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Call Action Controls (Mute, Dialpad, Phone App Bridge) */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                {/* Mute Mic */}
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  style={{
                    padding: '8px 16px', borderRadius: 20,
                    background: isMuted ? 'rgba(255,95,126,0.15)' : 'var(--bg-elevated)',
                    border: `1px solid ${isMuted ? 'var(--rose)' : 'var(--border)'}`,
                    color: isMuted ? 'var(--rose)' : 'var(--text-primary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>{isMuted ? '🔇' : '🎙️'}</span> {isMuted ? 'Unmute' : 'Mute Mic'}
                </button>

                {/* Dialpad Toggle */}
                <button
                  type="button"
                  onClick={() => setShowDialpad(!showDialpad)}
                  style={{
                    padding: '8px 16px', borderRadius: 20,
                    background: showDialpad ? 'rgba(108,99,255,0.15)' : 'var(--bg-elevated)',
                    border: `1px solid ${showDialpad ? 'var(--brand)' : 'var(--border)'}`,
                    color: showDialpad ? 'var(--brand-light)' : 'var(--text-primary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>⌨️</span> Dialpad
                </button>

                {/* AI Script Prompts Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAiPrompts(!showAiPrompts)}
                  style={{
                    padding: '8px 16px', borderRadius: 20,
                    background: showAiPrompts ? 'rgba(167,139,250,0.2)' : 'var(--bg-elevated)',
                    border: `1px solid ${showAiPrompts ? '#a78bfa' : 'var(--border)'}`,
                    color: showAiPrompts ? '#c4b5fd' : 'var(--text-primary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>✨</span> AI Script
                </button>


              </div>

              {/* Collapsible AI Script Prompts */}
              {showAiPrompts && quickPitch && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(108,99,255,0.08) 100%)',
                  border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10,
                  padding: 12, marginBottom: 16, fontSize: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(167,139,250,0.2)' }}>
                    <span style={{ fontWeight: 800, color: '#c4b5fd' }}>✨ In-Call Script Copilot</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setAiLanguage('tanglish')}
                        style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: 'none',
                          background: aiLanguage === 'tanglish' ? 'var(--brand)' : 'var(--bg-elevated)',
                          color: aiLanguage === 'tanglish' ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
                        }}
                      >
                        🇮🇳 Tanglish
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiLanguage('english')}
                        style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, border: 'none',
                          background: aiLanguage === 'english' ? 'var(--brand)' : 'var(--bg-elevated)',
                          color: aiLanguage === 'english' ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
                        }}
                      >
                        🇬🇧 English
                      </button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#c4b5fd', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>🎯</span> OPENING HOOK:
                  </div>
                  <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic' }}>
                    "{quickPitch.hook}"
                  </div>
                  <div style={{ fontWeight: 800, color: '#10d9a0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span>🚀</span> THE ASK / CTA:
                  </div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    "{quickPitch.stageAsk}"
                  </div>
                </div>
              )}

              {/* Collapsible Keypad */}
              {showDialpad && (
                <div style={{
                  background: 'var(--bg-elevated)', padding: 12, borderRadius: 10,
                  marginBottom: 16, border: '1px solid var(--border)',
                }}>
                  <div style={{ textAlign: 'center', fontSize: 14, fontFamily: 'monospace', height: 20, marginBottom: 8, color: '#38bdf8' }}>
                    {typedDigits || 'Tap numbers...'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setTypedDigits((prev) => prev + d)}
                        style={{ fontSize: 14, fontWeight: 700 }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* In-Call Scratchpad Notes */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontSize: 11 }}>📝 Live In-Call Notes (Captured in Real-Time)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Type notes as you speak with the client..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
              </div>

              {/* Red End Call Button */}
              <button
                type="button"
                onClick={handleEndCall}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#ff5f7e',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 16px rgba(255,95,126,0.4)',
                  transition: 'transform 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <span>🔴</span> End Call
              </button>
            </div>
          ) : (
            /* ── STATE 3: CALL ENDED - SUMMARY & LOGGING ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Completed Call Banner */}
              <div style={{
                background: 'rgba(16,217,160,0.1)',
                border: '1px solid rgba(16,217,160,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald)' }}>
                    ✓ Call Finished
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                    Duration: {formatDurationFriendly(seconds)}
                  </div>
                </div>
                <div style={{
                  fontSize: 24, background: 'var(--emerald)', color: '#fff',
                  width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  ⏱️
                </div>
              </div>

              {/* Outcome Selection */}
              <div>
                <label className="form-label" style={{ marginBottom: 8 }}>Select Call Outcome & Update Stage</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'CONTACTED', label: '💬 Interested ➔ Sent WhatsApp Portfolio & Info', stage: 'CONTACTED' },
                    { key: 'CALL_BACK', label: '⏰ Client asked to Call Back Later', stage: 'CALL_BACK' },
                    { key: 'MEETING', label: '🎥 Confirmed for Google Meet Demo', stage: 'MEETING' },
                    { key: 'LOST', label: '❌ Not Interested / Decline / Wrong Number', stage: 'LOST' },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 'var(--radius-md)',
                        border: `1px solid ${outcome === opt.key ? 'var(--brand)' : 'var(--border)'}`,
                        background: outcome === opt.key ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                        cursor: 'pointer', fontSize: 13, fontWeight: outcome === opt.key ? 700 : 500,
                        color: outcome === opt.key ? 'var(--brand-light)' : 'var(--text-primary)',
                      }}
                    >
                      <input
                        type="radio"
                        name="callOutcome"
                        checked={outcome === opt.key}
                        onChange={() => setOutcome(opt.key as any)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditional Field: Call Back Time */}
              {outcome === 'CALL_BACK' && (
                <div className="form-group">
                  <label className="form-label">Call Back Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={callBackTime}
                    onChange={(e) => setCallBackTime(e.target.value)}
                  />
                </div>
              )}

              {/* Conditional Field: Google Meet Link */}
              {outcome === 'MEETING' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Google Meet Link</label>
                    <a
                      href="https://meet.google.com/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none' }}
                    >
                      + Create on Google Meet ↗
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
              )}

              {/* Call Summary Notes */}
              <div className="form-group">
                <label className="form-label">Call Notes / Discussion Summary</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Summarize key points discussed with the client..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={onClose}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2, background: 'var(--brand)', fontWeight: 700 }}
                  disabled={saving}
                  onClick={handleSaveAndLog}
                >
                  {saving ? 'Saving…' : '✓ Save & Log Call to Timeline'}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
