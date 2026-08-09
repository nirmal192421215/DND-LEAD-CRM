import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lead } from '@bind-build/shared';
import { formatBudget, stageLabel, STAGE_ORDER, SOURCE_ICONS } from '../../lib/utils';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface Props {
  leads: Lead[];
  onLeadMoved: () => void;
}

const STAGE_COLORS: Record<string, string> = {
  NEW: '#6c63ff', CONTACTED: '#38bdf8', MEETING: '#f5a623',
  PROPOSAL: '#a78bfa', NEGOTIATION: '#fb923c', WON: '#10d9a0', LOST: '#ff5f7e',
};

function cleanPhone(phone?: string) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export default function KanbanBoard({ leads, onLeadMoved }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const draggingId = useRef<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragOverLeadId, setDragOverLeadId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const byStage = (stage: string) => leads.filter((l) => l.stage === stage);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    draggingId.current = leadId;
    e.dataTransfer.effectAllowed = 'move';
    // Small ghost image delay
    setTimeout(() => {
      const el = document.getElementById(`lead-card-${leadId}`);
      if (el) el.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (_e: React.DragEvent, leadId: string) => {
    const el = document.getElementById(`lead-card-${leadId}`);
    if (el) el.style.opacity = '1';
    draggingId.current = null;
    setDragOverStage(null);
    setDragOverLeadId(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: string, leadId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
    setDragOverLeadId(leadId ?? null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    setDragOverLeadId(null);

    const leadId = draggingId.current;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;

    setMovingId(leadId);
    try {
      await api.patch(`/leads/${leadId}`, { stage: targetStage });
      onLeadMoved();
      toast(`Moved to ${stageLabel(targetStage)} ✓`, 'success');
    } catch {
      toast('Failed to move lead', 'error');
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="kanban-board">
      {STAGE_ORDER.map((stage) => {
        const cols = byStage(stage);
        const total = cols.reduce((a, l) => a + l.budgetLakhs, 0);
        const isOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            className="kanban-column"
            style={{ transition: 'all 200ms' }}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={() => { setDragOverStage(null); setDragOverLeadId(null); }}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Column Header */}
            <div className="kanban-col-header" style={{
              borderBottom: isOver ? `2px solid ${STAGE_COLORS[stage]}` : '2px solid transparent',
              transition: 'border-color 150ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
                <span className="kanban-col-title" style={{ color: STAGE_COLORS[stage] }}>
                  {stageLabel(stage)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {total > 0 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>₹{total.toFixed(0)}L</span>
                )}
                <span className="kanban-col-count">{cols.length}</span>
              </div>
            </div>

            {/* Drop zone body */}
            <div
              className="kanban-col-body"
              style={{
                background: isOver ? `${STAGE_COLORS[stage]}08` : 'transparent',
                borderRadius: 'var(--radius-md)',
                transition: 'background 150ms',
                minHeight: 120,
              }}
            >
              {/* Drop indicator when empty */}
              {cols.length === 0 && (
                <div style={{
                  padding: '28px 12px',
                  textAlign: 'center',
                  color: isOver ? STAGE_COLORS[stage] : 'var(--text-muted)',
                  fontSize: 12,
                  border: `2px dashed ${isOver ? STAGE_COLORS[stage] : 'transparent'}`,
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 150ms',
                  opacity: isOver ? 1 : 0.5,
                }}>
                  {isOver ? '↓ Drop here' : 'No leads'}
                </div>
              )}

              {cols.map((lead) => (
                <div key={lead.id}>
                  {/* Drop indicator above card when dragging over it */}
                  {dragOverLeadId === lead.id && draggingId.current !== lead.id && (
                    <div style={{
                      height: 3, borderRadius: 2,
                      background: STAGE_COLORS[stage],
                      margin: '0 0 6px',
                      animation: 'none',
                    }} />
                  )}

                  <div
                    id={`lead-card-${lead.id}`}
                    className="lead-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={(e) => handleDragEnd(e, lead.id)}
                    onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, stage, lead.id); }}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    style={{
                      cursor: movingId === lead.id ? 'wait' : 'grab',
                      opacity: movingId === lead.id ? 0.6 : 1,
                      transition: 'opacity 150ms, transform 150ms, box-shadow 150ms',
                      userSelect: 'none',
                    }}
                  >
                    {/* Moving spinner */}
                    {movingId === lead.id && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                        <div className="spinner" style={{ width: 14, height: 14 }} />
                      </div>
                    )}

                    <div className="lead-card-header">
                      <div>
                        <div className="lead-card-name">{lead.name}</div>
                        <div className="lead-card-type">{lead.projectType}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)',
                          color: 'var(--brand-light)', background: 'var(--brand-dim)',
                          padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(108,99,255,0.2)',
                        }}>
                          {lead.id}
                        </span>
                        <span className={`priority-badge priority-${lead.priority}`}>
                          {lead.priority === 'HOT' ? '🔥' : lead.priority === 'WARM' ? '🌤' : '❄️'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {lead.location}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {SOURCE_ICONS[lead.source]} {lead.source}
                      </span>
                    </div>

                    <div className="flex-between">
                      <div className="lead-card-budget">{formatBudget(lead.budgetLakhs)}</div>
                      {lead.winProbability > 0 && (
                        <span style={{
                          fontSize: 11, color: 'var(--text-muted)',
                          background: 'var(--bg-elevated)',
                          padding: '2px 7px', borderRadius: 10,
                          border: '1px solid var(--border)',
                        }}>
                          {lead.winProbability}% win
                        </span>
                      )}
                    </div>

                    {lead.winProbability > 0 && (
                      <div className="progress-bar" style={{ marginTop: 8 }}>
                        <div className="progress-fill" style={{ width: `${lead.winProbability}%`, background: STAGE_COLORS[stage] }} />
                      </div>
                    )}

                    {/* Quick Contact Action Icons (Call, WhatsApp, Email) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px solid var(--border)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Call Icon */}
                      <a
                        href={lead.phone ? `tel:${lead.phone}` : '#'}
                        title={lead.phone ? `Call ${lead.name} (${lead.phone})` : 'No phone number'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#38bdf8';
                          e.currentTarget.style.borderColor = '#38bdf8';
                          e.currentTarget.style.background = 'rgba(56,189,248,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </a>

                      {/* WhatsApp Icon */}
                      <a
                        href={lead.phone ? `https://wa.me/${cleanPhone(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, reaching out regarding your ${lead.projectType} project.`)}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={lead.phone ? `WhatsApp ${lead.name}` : 'No phone number'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#25D366';
                          e.currentTarget.style.borderColor = '#25D366';
                          e.currentTarget.style.background = 'rgba(37,211,102,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </a>

                      {/* Email Icon */}
                      <a
                        href={lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(`Follow-up: ${lead.projectType} Project`)}` : '#'}
                        title={lead.email ? `Email ${lead.name} (${lead.email})` : 'No email'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#6c63ff';
                          e.currentTarget.style.borderColor = '#6c63ff';
                          e.currentTarget.style.background = 'rgba(108,99,255,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </a>
                    </div>

                    {/* Drag handle hint */}
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      opacity: 0, transition: 'opacity 150ms',
                      color: 'var(--text-muted)', fontSize: 12,
                      pointerEvents: 'none',
                    }} className="drag-handle">
                      ⠿
                    </div>
                  </div>
                </div>
              ))}

              {/* Bottom drop zone */}
              {cols.length > 0 && isOver && (
                <div style={{
                  height: 40, borderRadius: 'var(--radius-md)',
                  border: `2px dashed ${STAGE_COLORS[stage]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: STAGE_COLORS[stage], fontSize: 11, fontWeight: 600,
                  marginTop: 6,
                }}>
                  ↓ Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
