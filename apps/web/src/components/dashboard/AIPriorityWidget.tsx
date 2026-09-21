import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { cleanPhone, downloadLeadVCard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface PrioritizedLead {
  leadId: string;
  serialNo: number;
  name: string;
  phone: string;
  location: string;
  projectType: string;
  budgetLakhs: number;
  stage: string;
  priority: string;
  score: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  conversionLikelihood: number;
  recommendedAction: string;
  aiReason: string;
  bestTimeToCall: string;
  suggestedAngle: string;
  ownerName: string;
  priorityRank: number;
}

interface PriorityData {
  totalActive: number;
  criticalCount: number;
  highCount: number;
  pipelineValueLakhs: number;
  prioritizedLeads: PrioritizedLead[];
}

export const AIPriorityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<PriorityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAngleLeadId, setExpandedAngleLeadId] = useState<string | null>(null);

  const fetchPriorities = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.post('/ai/prioritize-leads');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
        if (isManual) toast('AI Pipeline re-analyzed with latest signals! 🧠', 'success');
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
  }, []);

  const handleSaveContact = (lead: PrioritizedLead) => {
    if (!lead.phone) {
      toast('No phone number available to save', 'warning');
      return;
    }
    const serialFormatted = `DND-${String(lead.serialNo).padStart(3, '0')}`;
    downloadLeadVCard({
      name: lead.name,
      phone: lead.phone,
      serialNo: lead.serialNo,
      location: lead.location,
      projectType: lead.projectType,
    });
    toast(`Contact saved as "${serialFormatted} - ${lead.name}" 📇`, 'success');
  };

  if (loading) {
    return (
      <div
        className="card"
        style={{
          border: '1px solid rgba(139, 92, 246, 0.3)',
          background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, var(--bg-card) 100%)',
          padding: 20,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        <span className="spinner" style={{ width: 18, height: 18 }} />
        <span>AI Copilot is analyzing closing probabilities & pipeline urgency...</span>
      </div>
    );
  }

  const leads = data?.prioritizedLeads || [];

  return (
    <div
      className="card"
      style={{
        border: '1px solid rgba(139, 92, 246, 0.35)',
        background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, rgba(15, 23, 42, 0.6) 100%)',
        boxShadow: '0 8px 32px -4px rgba(139, 92, 246, 0.12)',
        padding: '18px 20px',
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top ambient glow banner */}
      <div
        style={{
          position: 'absolute',
          top: -24,
          right: 20,
          width: 140,
          height: 140,
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
            }}
          >
            🧠
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="font-display font-bold text-md" style={{ color: '#e0e7ff', letterSpacing: '-0.01em' }}>
                AI Sales Copilot · Morning Focus
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#a78bfa',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                }}
              >
                LIVE SIGNALS
              </span>
            </div>
            <div className="text-sm text-muted">
              Ranked by deal value, proposal activity & immediate closing likelihood
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchPriorities(true)}
            disabled={refreshing}
            style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 500ms' }}>
              🔄
            </span>
            <span>{refreshing ? 'Re-analyzing...' : 'Refresh AI'}</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 8,
          marginBottom: 14,
          padding: '10px 14px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Priorities</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
            {data?.criticalCount ?? 0} Critical · {data?.highCount ?? 0} High
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High-Intent Pipeline</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>
            ₹{(data?.pipelineValueLakhs ?? 0).toFixed(1)} Lakhs
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closing Target</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>
            Top 3 Calls by 1:30 PM
          </div>
        </div>
      </div>

      {/* Ranked Leads List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leads.slice(0, 3).map((lead) => {
          const isExpanded = expandedAngleLeadId === lead.leadId;
          const urgencyColor =
            lead.urgency === 'CRITICAL' ? '#ef4444' :
            lead.urgency === 'HIGH' ? '#f59e0b' : '#38bdf8';
          const urgencyBg =
            lead.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' :
            lead.urgency === 'HIGH' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)';

          return (
            <div
              key={lead.leadId}
              style={{
                padding: '12px 14px',
                background: 'rgba(30, 41, 59, 0.7)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${lead.urgency === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                transition: 'all 200ms ease',
              }}
            >
              {/* Row 1: Rank, Name, Urgency, Budget */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Rank Badge */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: lead.priorityRank === 1 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255, 255, 255, 0.1)',
                      color: lead.priorityRank === 1 ? '#000' : '#f8fafc',
                      boxShadow: lead.priorityRank === 1 ? '0 0 10px rgba(245, 158, 11, 0.5)' : 'none',
                    }}
                  >
                    #{lead.priorityRank}
                  </span>

                  <span
                    onClick={() => navigate(`/leads/${lead.leadId}`)}
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: '#f8fafc',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
                  >
                    {lead.name}
                  </span>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: urgencyBg,
                      color: urgencyColor,
                      border: `1px solid ${urgencyColor}40`,
                    }}
                  >
                    {lead.urgency}
                  </span>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {lead.stage}
                  </span>
                </div>

                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--brand)' }}>
                    ₹{lead.budgetLakhs.toFixed(1)}L
                  </div>
                  <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>
                    {lead.conversionLikelihood}% Close Probability
                  </div>
                </div>
              </div>

              {/* Row 2: AI Action Recommendation */}
              <div
                style={{
                  fontSize: 12,
                  color: '#cbd5e1',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: '#8b5cf6', fontSize: 13 }}>⚡</span>
                <span style={{ fontWeight: 600 }}>{lead.recommendedAction}</span>
              </div>

              {/* Row 3: Strategic Reason & Best Time */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                <div>
                  <span style={{ color: '#94a3b8' }}>Reason:</span> {lead.aiReason}
                </div>
                <div style={{ color: '#38bdf8' }}>
                  ⏰ {lead.bestTimeToCall}
                </div>
              </div>

              {/* Collapsible Tanglish Opening Angle */}
              {isExpanded && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    fontSize: 12,
                    color: '#e2e8f0',
                    marginBottom: 10,
                    fontStyle: 'italic',
                  }}
                >
                  <strong style={{ color: '#a78bfa', fontStyle: 'normal' }}>💡 Recommended Pitch Angle: </strong>
                  {lead.suggestedAngle}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${cleanPhone(lead.phone)}`}
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  📞 Call Now
                </a>

                <a
                  href={`https://wa.me/91${cleanPhone(lead.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    color: '#25D366',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  💬 WhatsApp
                </a>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSaveContact(lead)}
                  style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Save contact directly to phone address book"
                >
                  📇 Save Contact
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setExpandedAngleLeadId(isExpanded ? null : lead.leadId)}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    color: isExpanded ? '#a78bfa' : 'var(--text-secondary)',
                  }}
                >
                  {isExpanded ? 'Hide Pitch ✕' : '💡 Pitch Angle'}
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/leads/${lead.leadId}`)}
                  style={{ fontSize: 11, padding: '4px 10px', marginLeft: 'auto' }}
                >
                  View Lead →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AIPriorityWidget;
