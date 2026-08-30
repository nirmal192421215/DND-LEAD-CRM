import { useState, useEffect, useCallback } from 'react';
import type { Lead } from '@bind-build/shared';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface Props {
  lead: Lead;
  onStartCallWithScript?: () => void;
}

type Language = 'tanglish' | 'english';
type Channel = 'CALL_SCRIPT' | 'WHATSAPP' | 'EMAIL' | 'OBJECTIONS';

interface PitchData {
  stage: string;
  language: Language;
  headline: string;
  hook: string;
  valueProposition: string;
  stageAsk: string;
  fullCallScript: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  objections: Array<{ objection: string; rebuttal: string }>;
  keyBenefits: string[];
}

export default function AISalesCopilot({ lead, onStartCallWithScript }: Props) {
  const { toast } = useToast();
  const [stage, setStage] = useState<string>(lead.stage || 'NEW');
  const [language, setLanguage] = useState<Language>('tanglish');
  const [channel, setChannel] = useState<Channel>('CALL_SCRIPT');
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState<PitchData | null>(null);

  const fetchPitch = useCallback(async (targetStage: string, targetLang: Language) => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/pitch', {
        leadId: lead.id,
        stage: targetStage,
        language: targetLang,
      });
      setPitch(data.data);
    } catch {
      toast('Failed to load AI Sales Script', 'error');
    } finally {
      setLoading(false);
    }
  }, [lead.id, toast]);

  useEffect(() => {
    fetchPitch(stage, language);
  }, [stage, language, fetchPitch]);

  const copyToClipboard = (text: string, label = 'Script') => {
    navigator.clipboard.writeText(text);
    toast(`${label} copied to clipboard! 📋`, 'success');
  };

  const cleanPhone = (phone?: string | null) => (phone ? phone.replace(/\D/g, '') : '');

  const STAGE_OPTIONS = [
    { key: 'NEW', label: '1. New (Cold Hook)', icon: '🟢' },
    { key: 'CONTACTED', label: '2. Contacted (Book Demo)', icon: '🔵' },
    { key: 'CALL_BACK', label: '3. Call Back (Re-engage)', icon: '⏰' },
    { key: 'MEETING', label: '4. Google Meet (Demo Pitch)', icon: '🎥' },
    { key: 'PROPOSAL', label: '5. Proposal (Deliverables)', icon: '📄' },
    { key: 'NEGOTIATION', label: '6. Negotiation (Close Deal)', icon: '🤝' },
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24 }}>

      {/* ── Copilot Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        paddingBottom: 16, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #a78bfa 0%, var(--brand) 100%)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, boxShadow: '0 4px 16px rgba(167,139,250,0.3)',
          }}>
            ✨
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                DND Studio AI Sales Copilot
              </span>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)',
                letterSpacing: 0.5,
              }}>
                STAGE PSYCHOLOGY
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Tailored conversion pitch for <strong>{lead.name}</strong> ({lead.location.replace(/, Tamil Nadu/i, '')})
            </div>
          </div>
        </div>

        {/* Language Selector Toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg-elevated)', borderRadius: 20,
          padding: 3, border: '1px solid var(--border)',
        }}>
          <button
            type="button"
            onClick={() => setLanguage('tanglish')}
            style={{
              padding: '6px 14px', borderRadius: 16, border: 'none',
              background: language === 'tanglish' ? 'var(--brand)' : 'transparent',
              color: language === 'tanglish' ? '#fff' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
            }}
          >
            🇮🇳 Tanglish (Tamil+English)
          </button>
          <button
            type="button"
            onClick={() => setLanguage('english')}
            style={{
              padding: '6px 14px', borderRadius: 16, border: 'none',
              background: language === 'english' ? 'var(--brand)' : 'transparent',
              color: language === 'english' ? '#fff' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
            }}
          >
            🇬🇧 English
          </button>
        </div>
      </div>

      {/* ── Stage Selector Pills ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
          CURRENT STAGE CONTEXT: (Click any stage to adapt your pitch)
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAGE_OPTIONS.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStage(st.key)}
              style={{
                padding: '6px 12px', borderRadius: 20,
                border: `1px solid ${stage === st.key ? 'var(--brand)' : 'var(--border)'}`,
                background: stage === st.key ? 'rgba(108,99,255,0.15)' : 'var(--bg-elevated)',
                color: stage === st.key ? 'var(--brand-light)' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: stage === st.key ? 700 : 500, cursor: 'pointer',
                transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span>{st.icon}</span> {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Channel Selector Tabs ── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        {[
          { key: 'CALL_SCRIPT', label: 'Phone Call Script', icon: '📞' },
          { key: 'WHATSAPP', label: 'WhatsApp Message', icon: '💬' },
          { key: 'EMAIL', label: 'Email Pitch', icon: '✉️' },
          { key: 'OBJECTIONS', label: 'Objection Killer', icon: '🛡️' },
        ].map((ch) => (
          <button
            key={ch.key}
            type="button"
            onClick={() => setChannel(ch.key as Channel)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: 'none',
              background: channel === ch.key ? 'var(--bg-elevated)' : 'transparent',
              color: channel === ch.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: channel === ch.key ? 700 : 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: channel === ch.key ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <span>{ch.icon}</span> {ch.label}
          </button>
        ))}
      </div>

      {/* ── Content Display Area ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 12, animation: 'pulse 1s infinite' }}>🤖</div>
          <div style={{ fontWeight: 600 }}>AI is tailoring your sales pitch for {lead.name}…</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Applying stage conversion psychology & objection handles</div>
        </div>
      ) : pitch ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Headline Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(56,189,248,0.08) 100%)',
            border: '1px solid rgba(108,99,255,0.2)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-light)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                🎯 Strategy Focus
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {pitch.headline}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchPitch(stage, language)}
              title="Regenerate Pitch"
            >
              🔄 Refresh
            </button>
          </div>

          {/* 1. CHANNEL: PHONE CALL SCRIPT */}
          {channel === 'CALL_SCRIPT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Step 1: Hook */}
              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                  1. THE OPENING HOOK (Say this first):
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>
                  "{pitch.hook}"
                </div>
              </div>

              {/* Step 2: Value */}
              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)', marginBottom: 4 }}>
                  2. THE VALUE PROPOSITION (Why they need DND Studio):
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  "{pitch.valueProposition}"
                </div>
              </div>

              {/* Step 3: The Ask */}
              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                  3. THE EXACT STAGE ASK (Call-to-Action):
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 600 }}>
                  "{pitch.stageAsk}"
                </div>
              </div>

              {/* Full Step-by-Step Flow */}
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                  FULL SPOKEN WORD-FOR-WORD FLOW:
                </div>
                <pre style={{
                  whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13,
                  color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0,
                }}>
                  {pitch.fullCallScript}
                </pre>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => copyToClipboard(pitch.fullCallScript, 'Call Script')}
                >
                  📋 Copy Full Script
                </button>
                {onStartCallWithScript && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 2, background: 'linear-gradient(135deg, #10d9a0 0%, #38bdf8 100%)', color: '#000', fontWeight: 800 }}
                    onClick={onStartCallWithScript}
                  >
                    📞 Start Live Call With This Script
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. CHANNEL: WHATSAPP MESSAGE */}
          {channel === 'WHATSAPP' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: '#0d1f17', border: '1px solid rgba(37,211,102,0.3)',
                borderRadius: 'var(--radius-md)', padding: 18,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#25D366', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💬</span> PREVIEW (Formatted for WhatsApp):
                </div>
                <div style={{
                  whiteSpace: 'pre-wrap', fontSize: 13, color: '#e2e8f0',
                  lineHeight: 1.6, fontFamily: 'monospace',
                }}>
                  {pitch.whatsappMessage}
                </div>
              </div>

              {/* WhatsApp Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => copyToClipboard(pitch.whatsappMessage, 'WhatsApp Message')}
                >
                  📋 Copy Text
                </button>
                {lead.phone ? (
                  <a
                    href={`https://wa.me/${cleanPhone(lead.phone)}?text=${encodeURIComponent(pitch.whatsappMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ flex: 2, background: '#25D366', borderColor: '#25D366', color: '#000', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <span>💬</span> Send Directly via WhatsApp ↗
                  </a>
                ) : (
                  <button className="btn btn-secondary" disabled style={{ flex: 2 }}>
                    No phone number available
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. CHANNEL: EMAIL PITCH */}
          {channel === 'EMAIL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                  SUBJECT LINE:
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {pitch.emailSubject}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  EMAIL BODY:
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {pitch.emailBody}
                </div>
              </div>

              {/* Email Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => copyToClipboard(`Subject: ${pitch.emailSubject}\n\n${pitch.emailBody}`, 'Email Draft')}
                >
                  📋 Copy Email
                </button>
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}?subject=${encodeURIComponent(pitch.emailSubject)}&body=${encodeURIComponent(pitch.emailBody)}`}
                    className="btn btn-primary"
                    style={{ flex: 2, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <span>✉️</span> Open in Email Client ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 4. CHANNEL: OBJECTION KILLER */}
          {channel === 'OBJECTIONS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                If the client hesitates or raises objections, use these instant, proven rebuttals:
              </p>
              {pitch.objections.map((obj, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', padding: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--rose)', marginBottom: 6 }}>
                    <span>❌</span> If they say: "{obj.objection}"
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, color: 'var(--emerald)', lineHeight: 1.5, background: 'rgba(16,217,160,0.06)', padding: 10, borderRadius: 6 }}>
                    <span style={{ fontWeight: 800 }}>💡 Rebuttal:</span>
                    <span>"{obj.rebuttal}"</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key Value Deliverables checklist */}
          <div style={{
            background: 'var(--bg-card)', padding: 14, borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', marginTop: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
              ⚡ DND Studio Value Pillars to Highlight:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {pitch.keyBenefits.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--emerald)' }}>✓</span> {b}
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}

    </div>
  );
}
