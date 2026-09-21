import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Lead, AnalyticsOverview } from '@bind-build/shared';
import { formatBudget, stageLabel, cleanPhone, cleanWhatsAppPhone, format10DigitPhone, downloadLeadVCard, SOURCE_ICONS, SOURCE_COLORS, calculateLeadScore } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CreativeLoader from '../components/common/CreativeLoader';
import AIPriorityWidget from '../components/dashboard/AIPriorityWidget';

// ── Mini SVG Bar Chart ────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 280, chartH = 75, topPadding = 18;
  const barW = Math.max(8, (W / data.length) - 8), gap = W / data.length;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${chartH + topPadding + 20}`} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.value / max) * chartH);
        const x = i * gap + gap / 2 - barW / 2;
        const y = topPadding + chartH - barH;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={4} ry={4}
              fill={d.color ?? 'var(--brand)'}
              opacity={0.85}
            />
            <text
              x={x + barW / 2} y={topPadding + chartH + 15}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-muted)"
              fontFamily="var(--font-body)"
            >
              {d.label}
            </text>
            {d.value > 0 && (
              <text
                x={x + barW / 2} y={y - 5}
                textAnchor="middle"
                fontSize={10}
                fontWeight="700"
                fill="var(--text-secondary)"
                fontFamily="var(--font-body)"
              >
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ values, color = 'var(--brand)' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const W = 80, H = 32;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface UpcomingMeeting {
  id: string;
  title: string;
  scheduledAt: string;
  location?: string;
  lead?: { id: string; name: string };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [actionTab, setActionTab] = useState<'CALLBACKS' | 'HOT' | 'STALE'>('CALLBACKS');
  const [activeNoteLeadId, setActiveNoteLeadId] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);

  const saveQuickNote = async (leadId: string) => {
    if (!quickNoteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post('/notes', {
        leadId,
        text: quickNoteText.trim(),
        pinned: false,
      });
      toast('Quick note saved! 📝', 'success');
      setQuickNoteText('');
      setActiveNoteLeadId(null);
    } catch {
      toast('Failed to save note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const weekLater = new Date(today); weekLater.setDate(today.getDate() + 7);

    Promise.all([
      api.get('/analytics/overview'),
      api.get('/leads?limit=1000'),
      api.get(`/meetings?from=${today.toISOString()}&to=${weekLater.toISOString()}&limit=5`).catch(() => ({ data: { data: [] } })),
    ]).then(([analyticsRes, leadsRes, meetingsRes]) => {
      setAnalytics(analyticsRes.data.data);
      const leads = leadsRes.data.data ?? [];
      setAllLeads(leads);
      setRecentLeads(leads.slice(0, 5));
      setUpcomingMeetings(meetingsRes.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <CreativeLoader />;

  const kpis = [
    {
      label: 'Active Leads', value: analytics?.activeLeads ?? 0,
      sub: `${analytics?.totalLeads ?? 0} all-time`,
      icon: '◈', colorVar: 'var(--brand)', dimVar: 'var(--brand-dim)',
      sparkline: [3, 5, 4, 7, 6, 8, analytics?.activeLeads ?? 0],
      trend: '+12%', trendUp: true,
    },
    {
      label: 'Pipeline Value', value: `₹${(analytics?.pipelineValueLakhs ?? 0).toFixed(1)}L`,
      sub: `Weighted: ₹${(analytics?.weightedForecastLakhs ?? 0).toFixed(1)}L`,
      icon: '₹', colorVar: 'var(--emerald)', dimVar: 'var(--emerald-dim)',
      sparkline: [200, 280, 350, 410, 500, 600, analytics?.pipelineValueLakhs ?? 0],
      trend: '+8%', trendUp: true,
    },
    {
      label: 'Won Deals', value: analytics?.wonLeads ?? 0,
      sub: `${analytics?.conversionRate ?? 0}% conversion rate`,
      icon: '🏆', colorVar: 'var(--amber)', dimVar: 'var(--amber-dim)',
      sparkline: [0, 0, 1, 1, 1, 1, analytics?.wonLeads ?? 0],
      trend: '+3', trendUp: true,
    },
    {
      label: 'Lost Leads', value: analytics?.lostLeads ?? 0,
      sub: 'Needs recovery analysis',
      icon: '✕', colorVar: 'var(--rose)', dimVar: 'var(--rose-dim)',
      sparkline: [0, 1, 1, 2, 2, 2, analytics?.lostLeads ?? 0],
      trend: '-1', trendUp: false,
    },
  ];

  // Stage bar chart data
  const stageBarData = (analytics?.funnel ?? []).slice(0, 7).map((f) => ({
    label: f.stage.slice(0, 3),
    value: f.count,
    color: `var(--stage-${f.stage.toLowerCase()})`,
  }));

  // Source breakdown for donut-like display
  const sourceData = analytics?.bySource ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Greeting ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 22px',
        background: 'linear-gradient(135deg, var(--brand-dim), rgba(16,217,160,0.06))',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(108,99,255,0.2)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20,
            background: 'linear-gradient(135deg, var(--text-primary), var(--brand-light))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 4,
          }}>
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/leads')}>
            + New Lead
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/analytics')}>
            📊 Analytics
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            display: 'flex', flexDirection: 'column', gap: 6,
            position: 'relative', overflow: 'hidden',
            transition: 'border-color 150ms, transform 150ms',
          }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = kpi.colorVar;
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {/* Subtle gradient accent top-right */}
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 80, height: 80, borderRadius: '0 0 0 80px',
              background: kpi.dimVar, pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: kpi.dimVar,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, border: `1px solid ${kpi.colorVar}30`,
              }}>
                {kpi.icon}
              </div>
              <Sparkline values={kpi.sparkline} color={kpi.colorVar} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{kpi.sub}</div>
              <div style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                color: kpi.trendUp ? 'var(--emerald)' : 'var(--rose)',
                background: kpi.trendUp ? 'var(--emerald-dim)' : 'var(--rose-dim)',
              }}>
                {kpi.trendUp ? '↑' : '↓'} {kpi.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Balanced 2-Column Main Content Layout ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Left Column — Analytics & Funnel Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 1. Pipeline Funnel */}
          <div className="card">
            <div className="flex-between mb-16">
              <div>
                <div className="font-display font-bold text-md">Pipeline Funnel</div>
                <div className="text-sm text-muted">Leads per stage</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leads')}>View All</button>
            </div>

            {/* Bar chart */}
            <div style={{ marginBottom: 16, padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <BarChart data={stageBarData} />
            </div>

            {/* Stage rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(analytics?.funnel ?? []).map((item) => {
                const max = Math.max(...(analytics?.funnel ?? []).map((f) => f.count), 1);
                const pct = (item.count / max) * 100;
                const stageColorKey = item.stage.toLowerCase();
                return (
                  <div key={item.stage}>
                    <div className="flex-between mb-4">
                      <span className="text-sm font-medium">{stageLabel(item.stage)}</span>
                      <span className="text-sm text-muted">{item.count} · ₹{item.valueLakhs.toFixed(0)}L</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: `var(--stage-${stageColorKey})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Win / Loss + Lead Sources Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Win / Loss */}
            <div className="card">
              <div className="font-display font-bold text-md mb-4">Win / Loss</div>
              <div className="text-sm text-muted mb-16">All-time results</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Won', value: analytics?.winLoss.won ?? 0, color: 'var(--emerald)', bg: 'var(--emerald-dim)', icon: '🏆' },
                  { label: 'Lost', value: analytics?.winLoss.lost ?? 0, color: 'var(--rose)', bg: 'var(--rose-dim)', icon: '❌' },
                  { label: 'Stalled', value: analytics?.winLoss.stalled ?? 0, color: 'var(--amber)', bg: 'var(--amber-dim)', icon: '⏸' },
                ].map((item) => (
                  <div key={item.label} style={{
                    flex: 1, textAlign: 'center', padding: '12px 6px',
                    background: item.bg, borderRadius: 'var(--radius-md)',
                    border: `1px solid ${item.color}30`,
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead Sources */}
            <div className="card">
              <div className="font-display font-bold text-md mb-4">Lead Sources</div>
              <div className="text-sm text-muted mb-16">Where leads come from</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sourceData.slice(0, 4).map((s) => {
                  const total = sourceData.reduce((a, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.source}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 500 }}>{s.source}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.count} ({pct}%)</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--brand)' }} />
                      </div>
                    </div>
                  );
                })}
                {sourceData.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data yet</div>}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column — Operational Tasks & Quick Workflows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 🧠 Feature 3.1: AI Lead Prioritizer & Morning Focus Copilot */}
          <AIPriorityWidget />

          {/* ⚡ Today's Action Center & Follow-Up Tasks */}
          {(() => {
            const todayCallbacks = allLeads.filter((l) => l.stage === 'CALL_BACK' || Boolean(l.callBackAt));
            const hotLeads = allLeads.filter((l) => l.priority === 'HOT' && !['WON', 'LOST'].includes(l.stage));
            const staleLeads = allLeads.filter((l) => {
              if (['WON', 'LOST'].includes(l.stage)) return false;
              const daysOld = (Date.now() - new Date(l.updatedAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
              return daysOld >= 3;
            });

            const activeList =
              actionTab === 'CALLBACKS' ? todayCallbacks :
              actionTab === 'HOT' ? hotLeads : staleLeads;

            return (
              <div className="card" style={{
                border: '1px solid rgba(108, 99, 255, 0.3)',
                background: 'linear-gradient(180deg, rgba(108, 99, 255, 0.04) 0%, var(--bg-card) 100%)',
              }}>
                <div className="flex-between mb-12">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>⚡</span>
                      <div className="font-display font-bold text-md">Today's Action Center</div>
                    </div>
                    <div className="text-sm text-muted">Priority calls & scheduled follow-ups</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leads')}>View Kanban</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
                  <button
                    className="filter-chip"
                    onClick={() => setActionTab('CALLBACKS')}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      background: actionTab === 'CALLBACKS' ? 'rgba(245, 166, 35, 0.2)' : 'var(--bg-elevated)',
                      color: actionTab === 'CALLBACKS' ? '#f5a623' : 'var(--text-secondary)',
                      borderColor: actionTab === 'CALLBACKS' ? '#f5a623' : 'var(--border)',
                      fontWeight: actionTab === 'CALLBACKS' ? 700 : 500,
                    }}
                  >
                    ⏰ Callbacks ({todayCallbacks.length})
                  </button>
                  <button
                    className="filter-chip"
                    onClick={() => setActionTab('HOT')}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      background: actionTab === 'HOT' ? 'rgba(255, 95, 126, 0.2)' : 'var(--bg-elevated)',
                      color: actionTab === 'HOT' ? '#ff5f7e' : 'var(--text-secondary)',
                      borderColor: actionTab === 'HOT' ? '#ff5f7e' : 'var(--border)',
                      fontWeight: actionTab === 'HOT' ? 700 : 500,
                    }}
                  >
                    🔥 Hot Leads ({hotLeads.length})
                  </button>
                  <button
                    className="filter-chip"
                    onClick={() => setActionTab('STALE')}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      background: actionTab === 'STALE' ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-elevated)',
                      color: actionTab === 'STALE' ? '#38bdf8' : 'var(--text-secondary)',
                      borderColor: actionTab === 'STALE' ? '#38bdf8' : 'var(--border)',
                      fontWeight: actionTab === 'STALE' ? 700 : 500,
                    }}
                  >
                    ⏳ Follow-Up ({staleLeads.length})
                  </button>
                </div>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeList.slice(0, 4).map((lead) => {
                    const leadScore = calculateLeadScore(lead);
                    return (
                      <div
                        key={lead.id}
                        style={{
                          padding: '10px 12px',
                          background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div className="flex-between mb-4">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)',
                              color: 'var(--brand-light)', background: 'var(--brand-dim)',
                              padding: '1px 6px', borderRadius: 4,
                            }}>
                              DND-{lead.serialNo?.toString().padStart(3, '0') ?? 'NEW'}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                              {lead.name}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: leadScore.color,
                            background: 'rgba(0,0,0,0.2)',
                            padding: '1px 5px',
                            borderRadius: 6,
                          }}>
                            Score {leadScore.score}
                          </span>
                        </div>

                        <div className="flex-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                          <span>{lead.projectType} · {lead.location}</span>
                          {lead.phone && (
                            <span style={{ fontFamily: 'monospace', color: 'var(--emerald)' }}>
                              {format10DigitPhone(lead.phone)}
                            </span>
                          )}
                        </div>

                        {/* Quick action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {lead.phone && (
                            <a
                              href={`tel:${cleanPhone(lead.phone)}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => {
                                sessionStorage.setItem('active_call_start', Date.now().toString());
                                sessionStorage.setItem('active_call_lead_id', lead.id);
                                sessionStorage.setItem('active_call_lead_name', lead.name);
                              }}
                            >
                              📞 Call
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              href={`https://wa.me/${cleanWhatsAppPhone(lead.phone)}?text=${encodeURIComponent(`Hi ${lead.name}, following up from DND Studio.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11, color: '#25D366' }}
                            >
                              💬 WhatsApp
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => {
                              downloadLeadVCard(lead);
                              toast(`Saved ${lead.name} to mobile contacts! 📇`, 'success');
                            }}
                          >
                            📇 Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => {
                              if (activeNoteLeadId === lead.id) setActiveNoteLeadId(null);
                              else { setActiveNoteLeadId(lead.id); setQuickNoteText(''); }
                            }}
                          >
                            📝 Note
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '3px 6px', fontSize: 11, marginLeft: 'auto' }}
                            onClick={() => navigate(`/leads/${lead.id}`)}
                          >
                            View ↗
                          </button>
                        </div>

                        {/* Inline Note Composer */}
                        {activeNoteLeadId === lead.id && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              placeholder="Write note... (Press Enter)"
                              value={quickNoteText}
                              onChange={(e) => setQuickNoteText(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  await saveQuickNote(lead.id);
                                }
                              }}
                              autoFocus
                              style={{
                                flex: 1,
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                padding: '4px 8px',
                                fontSize: 12,
                                color: 'var(--text-primary)',
                              }}
                            />
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={savingNote || !quickNoteText.trim()}
                              onClick={() => saveQuickNote(lead.id)}
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {activeList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: 12 }}>
                      🎉 All caught up! No pending items in this category.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 1. Recent Leads */}
          <div className="card">
            <div className="flex-between mb-16">
              <div>
                <div className="font-display font-bold text-md">Recent Leads</div>
                <div className="text-sm text-muted">Latest entries</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/leads')}>View Pipeline</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="lead-card"
                  style={{ padding: '10px 12px', cursor: 'pointer' }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  <div className="lead-card-header">
                    <div>
                      <div className="lead-card-name" style={{ fontSize: 13 }}>{lead.name}</div>
                      <div className="lead-card-type">{lead.projectType}</div>
                    </div>
                    <span className={`stage-badge stage-${lead.stage}`}>{stageLabel(lead.stage)}</span>
                  </div>
                  <div className="flex-between">
                    <span className="text-sm text-muted">📍 {lead.location}</span>
                    <span className="lead-card-budget">{formatBudget(lead.budgetLakhs)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Upcoming Meetings */}
          <div className="card">
            <div className="flex-between mb-16">
              <div>
                <div className="font-display font-bold text-md">📅 Upcoming Meetings</div>
                <div className="text-sm text-muted">Next 7 days</div>
              </div>
            </div>
            {upcomingMeetings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🗓</div>
                No upcoming meetings this week
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingMeetings.map((m) => {
                  const dt = new Date(m.scheduledAt);
                  const isToday = dt.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex', gap: 12, alignItems: 'center',
                        padding: '10px 12px',
                        background: isToday ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isToday ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
                        cursor: m.lead ? 'pointer' : 'default',
                      }}
                      onClick={() => m.lead && navigate(`/leads/${m.lead.id}`)}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                        background: isToday ? 'rgba(108,99,255,0.2)' : 'var(--bg-card)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${isToday ? 'var(--brand)' : 'var(--border)'}`,
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? 'var(--brand-light)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {dt.toLocaleDateString('en', { month: 'short' })}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: isToday ? 'var(--brand-light)' : 'var(--text-primary)', lineHeight: 1 }}>
                          {dt.getDate()}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                          <span>{dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.location && <span>📍 {m.location}</span>}
                        </div>
                      </div>
                      {isToday && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                          background: 'var(--brand)', color: '#fff', flexShrink: 0,
                        }}>TODAY</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Quick Actions & Shortcuts */}
          <div className="card">
            <div className="font-display font-bold text-md mb-4">Quick Actions</div>
            <div className="text-sm text-muted mb-12">Jump to key workflows</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" style={{ justifyContent: 'center', gap: 6 }} onClick={() => navigate('/leads')}>
                <span>◈</span> Pipeline
              </button>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', gap: 6 }} onClick={() => navigate('/analytics')}>
                <span>◎</span> Analytics
              </button>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', gap: 6 }} onClick={() => navigate('/team')}>
                <span>👥</span> Team
              </button>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', gap: 6 }} onClick={() => navigate('/settings')}>
                <span>⚙️</span> Settings
              </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⌨ Shortcuts</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                {[
                  ['G D', 'Dashboard'],
                  ['G L', 'Leads'],
                  ['G A', 'Analytics'],
                  ['G T', 'Team'],
                ].map(([key, label]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <kbd style={{
                      fontFamily: 'var(--font-body)', fontSize: 9, fontWeight: 700,
                      background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
                      borderRadius: 4, padding: '2px 6px', color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-sm)', flexShrink: 0,
                    }}>{key}</kbd>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
