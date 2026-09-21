import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { cleanPhone } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface AICallSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    phone?: string;
    stage: string;
    projectType?: string;
    budgetLakhs: number;
  };
  initialCallText: string;
  durationSecs?: number;
  attended?: boolean;
  onLeadUpdated?: () => void;
}

interface SummaryResult {
  sentiment: string;
  durationFormatted: string;
  executiveSummary: string;
  actionItems: string[];
  recommendedNextStage: string;
  winProbabilityDelta: number;
  suggestedWhatsApp: string;
}

export const AICallSummaryModal: React.FC<AICallSummaryModalProps> = ({
  isOpen,
  onClose,
  lead,
  initialCallText,
  durationSecs = 0,
  attended = true,
  onLeadUpdated,
}) => {
  const { toast } = useToast();
  const [callNotes, setCallNotes] = useState(initialCallText);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [customWhatsApp, setCustomWhatsApp] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

  useEffect(() => {
    setCallNotes(initialCallText);
  }, [initialCallText]);

  useEffect(() => {
    if (isOpen && initialCallText) {
      handleAnalyze(initialCallText);
    }
  }, [isOpen]);

  const handleAnalyze = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/ai/summarize-call', {
        leadId: lead.id,
        callText: textToAnalyze,
        durationSecs,
        attended,
      });
      if (res.data?.success && res.data?.data) {
        const result = res.data.data;
        setSummary(result);
        setCustomWhatsApp(result.suggestedWhatsApp);
        // Initialize checkboxes as unchecked
        const initialChecks: Record<number, boolean> = {};
        result.actionItems.forEach((_: string, idx: number) => {
          initialChecks[idx] = false;
        });
        setCheckedItems(initialChecks);
      }
    } catch {
      toast('Failed to analyze call text', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheck = (index: number) => {
    setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleApplyNextStage = async () => {
    if (!summary || !summary.recommendedNextStage) return;
    setUpdatingStage(true);
    try {
      await api.patch(`/leads/${lead.id}`, { stage: summary.recommendedNextStage });
      toast(`Lead stage moved to ${summary.recommendedNextStage}! 🚀`, 'success');
      if (onLeadUpdated) onLeadUpdated();
    } catch {
      toast('Failed to update stage', 'error');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!lead.phone) {
      toast('No phone number available', 'warning');
      return;
    }
    const phone10 = cleanPhone(lead.phone);
    const encoded = encodeURIComponent(customWhatsApp);
    window.open(`https://wa.me/91${phone10}?text=${encoded}`, '_blank');

    // Auto log to timeline
    try {
      await api.post('/activities', {
        leadId: lead.id,
        type: 'WHATSAPP',
        text: `💬 Sent AI Follow-Up WhatsApp:\n"${customWhatsApp.slice(0, 100)}..."`,
      });
      toast('WhatsApp sent & activity logged to timeline! 📱', 'success');
      if (onLeadUpdated) onLeadUpdated();
      onClose();
    } catch {
      // ignore
    }
  };

  const handleSaveActionItemsAsNotes = async () => {
    if (!summary?.actionItems?.length) return;
    try {
      const itemsList = summary.actionItems.map((item, idx) => `• ${item}`).join('\n');
      await api.post('/notes', {
        leadId: lead.id,
        text: `🎯 AI Call Action Items:\n${itemsList}`,
        pinned: true,
      });
      toast('Action items saved to pinned notes! 📌', 'success');
      if (onLeadUpdated) onLeadUpdated();
    } catch {
      toast('Failed to save notes', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.2)',
          padding: 24,
          borderRadius: 16,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-between mb-16">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div>
              <div className="font-display font-bold text-lg" style={{ color: '#f8fafc' }}>
                AI Call Summary & Next Action
              </div>
              <div className="text-sm text-muted">
                {lead.name} · {lead.projectType || 'Project'} · ₹{lead.budgetLakhs}L
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Input Textarea to refine notes */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Call Transcript / Notes to Analyze:
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              rows={2}
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              className="form-input"
              style={{ flex: 1, fontSize: 12, resize: 'vertical' }}
              placeholder="Enter what the client said during the call..."
            />
            <button
              className="btn btn-primary"
              onClick={() => handleAnalyze(callNotes)}
              disabled={loading || !callNotes.trim()}
              style={{ fontSize: 12, whiteSpace: 'nowrap', padding: '0 14px' }}
            >
              {loading ? 'Analyzing...' : '⚡ Re-Analyze'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ width: 24, height: 24, marginBottom: 12, display: 'inline-block' }} />
            <div>Extracting sentiment, next steps & drafting follow-up message...</div>
          </div>
        ) : summary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Sentiment & Talk Time Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sentiment:</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background:
                      summary.sentiment === 'VERY_POSITIVE' || summary.sentiment === 'POSITIVE'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : summary.sentiment === 'PRICE_SENSITIVE'
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(56, 189, 248, 0.2)',
                    color:
                      summary.sentiment === 'VERY_POSITIVE' || summary.sentiment === 'POSITIVE'
                        ? '#10b981'
                        : summary.sentiment === 'PRICE_SENSITIVE'
                        ? '#f59e0b'
                        : '#38bdf8',
                  }}
                >
                  {summary.sentiment.replace('_', ' ')}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ⏱️ Talk Time: <strong style={{ color: '#f8fafc' }}>{summary.durationFormatted}</strong>
              </div>
            </div>

            {/* Executive Summary */}
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(139, 92, 246, 0.08)',
                borderRadius: 8,
                border: '1px solid rgba(139, 92, 246, 0.2)',
                fontSize: 13,
                color: '#e2e8f0',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: '#a78bfa' }}>Executive Briefing: </strong>
              {summary.executiveSummary}
            </div>

            {/* Action Items Checklist */}
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(30, 41, 59, 0.7)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="flex-between mb-8">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                  🎯 Next Action Items ({summary.actionItems.length}):
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSaveActionItemsAsNotes}
                  style={{ fontSize: 10, padding: '2px 8px' }}
                >
                  📌 Pin to Notes
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {summary.actionItems.map((item, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 12,
                      color: checkedItems[idx] ? 'var(--text-muted)' : '#cbd5e1',
                      textDecoration: checkedItems[idx] ? 'line-through' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[idx]}
                      onChange={() => handleToggleCheck(idx)}
                      style={{ marginTop: 2 }}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stage Recommendation */}
            {summary.recommendedNextStage && summary.recommendedNextStage !== lead.stage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 8,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>
                    RECOMMENDED STAGE ADVANCE
                  </div>
                  <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 600 }}>
                    {lead.stage} ➔ <span style={{ color: '#10b981' }}>{summary.recommendedNextStage}</span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleApplyNextStage}
                  disabled={updatingStage}
                  style={{ fontSize: 11, padding: '5px 12px' }}
                >
                  {updatingStage ? 'Updating...' : `Move to ${summary.recommendedNextStage}`}
                </button>
              </div>
            )}

            {/* Tailored WhatsApp Follow-up */}
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(37, 211, 102, 0.05)',
                borderRadius: 8,
                border: '1px solid rgba(37, 211, 102, 0.25)',
              }}
            >
              <div className="flex-between mb-6">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#25D366' }}>
                  💬 Ready WhatsApp Follow-Up Message:
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Editable</span>
              </div>

              <textarea
                rows={4}
                value={customWhatsApp}
                onChange={(e) => setCustomWhatsApp(e.target.value)}
                className="form-input"
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  marginBottom: 10,
                  background: '#090d16',
                  borderColor: 'rgba(37, 211, 102, 0.3)',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(customWhatsApp);
                    toast('Message copied to clipboard! 📋', 'success');
                  }}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  📋 Copy Text
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSendWhatsApp}
                  style={{
                    fontSize: 11,
                    padding: '4px 12px',
                    background: '#25D366',
                    borderColor: '#25D366',
                    color: '#000',
                    fontWeight: 700,
                  }}
                >
                  🚀 Open WhatsApp & Log
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default AICallSummaryModal;
