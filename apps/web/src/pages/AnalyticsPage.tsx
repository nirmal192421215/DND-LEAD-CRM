import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../lib/api';
import CreativeLoader from '../components/common/CreativeLoader';

/* ─── Types ──────────────────────────────────────────────────── */
interface Overview {
  totalLeads: number; activeLeads: number; wonLeads: number; lostLeads: number;
  conversionRate: number; pipelineValueLakhs: number; weightedForecastLakhs: number;
  winLoss: { won: number; lost: number; stalled: number };
  funnel: { stage: string; count: number; valueLakhs: number }[];
}
interface Trend { month: string; newLeads: number; wonLeads: number; wonValueLakhs: number; }
interface Source { source: string; count: number; }
interface TeamMember {
  id: string; name: string; initials: string; role: string;
  totalLeads: number; activeLeads: number; wonLeads: number;
  pipelineLakhs: number; weightedLakhs: number; conversionRate: number;
}

/* ─── Constants ──────────────────────────────────────────────── */
const STAGE_COLORS: Record<string, string> = {
  NEW: '#6c63ff', CONTACTED: '#38bdf8', MEETING: '#f5a623',
  PROPOSAL: '#a78bfa', NEGOTIATION: '#fb923c', WON: '#10d9a0', LOST: '#ff5f7e',
};
const SOURCE_PALETTE = ['#6c63ff', '#38bdf8', '#f5a623', '#10d9a0', '#ff5f7e', '#a78bfa'];
const STAGE_ORDER = ['NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const STAGE_LABELS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', MEETING: 'Meeting',
  PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost',
};

/* ─── Custom Tooltip ─────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12, minWidth: 140,
      boxShadow: 'var(--shadow-lg)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ color: p.color ?? 'var(--text-muted)' }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [ov, tr, src, tm] = await Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/monthly-trends'),
      api.get('/analytics/source-breakdown'),
      api.get('/analytics/team-leaderboard'),
    ]);
    setOverview(ov.data.data);
    setTrends(tr.data.data);
    setSources(src.data.data);
    setTeam(tm.data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <CreativeLoader />;
  if (!overview) return null;

  const funnelOrdered = STAGE_ORDER.map((s) => overview.funnel.find((f) => f.stage === s) ?? { stage: s, count: 0, valueLakhs: 0 });
  const maxFunnel = Math.max(...funnelOrdered.map((f) => f.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI Row ── */}
      <div className="grid-4" style={{ gap: 14 }}>
        <StatCard label="Total Leads" value={overview.totalLeads} sub={`${overview.activeLeads} active`} accent="var(--brand)" />
        <StatCard label="Pipeline Value" value={`₹${overview.pipelineValueLakhs}L`} sub={`Weighted: ₹${overview.weightedForecastLakhs}L`} accent="var(--sky)" />
        <StatCard label="Won Deals" value={overview.wonLeads} sub={`${overview.conversionRate}% conversion`} accent="var(--emerald)" />
        <StatCard label="Lost Leads" value={overview.lostLeads} sub={`${overview.winLoss.stalled} stalled`} accent="var(--rose)" />
      </div>

      {/* ── Monthly Trend Chart ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 3 }}>Lead Acquisition Trend</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>New leads vs. won deals over the last 6 months</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[{ color: 'var(--brand)', label: 'New Leads' }, { color: 'var(--emerald)', label: 'Won Deals' }].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />{l.label}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trends} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradBrand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10d9a0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10d9a0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fill: '#555d75', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#555d75', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="newLeads" name="New Leads" stroke="#6c63ff" strokeWidth={2} fill="url(#gradBrand)" dot={{ fill: '#6c63ff', r: 4 }} activeDot={{ r: 6 }} />
            <Area type="monotone" dataKey="wonLeads" name="Won Deals" stroke="#10d9a0" strokeWidth={2} fill="url(#gradEmerald)" dot={{ fill: '#10d9a0', r: 4 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Middle Row: Funnel + Sources ── */}
      <div className="grid-2" style={{ gap: 14 }}>

        {/* Pipeline Funnel */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Pipeline Funnel</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>Leads per stage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {funnelOrdered.map(({ stage, count, valueLakhs }) => (
              <div key={stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{STAGE_LABELS[stage]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {valueLakhs > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>₹{valueLakhs}L</span>}
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', minWidth: 20, textAlign: 'right' }}>{count}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(count / maxFunnel) * 100}%`,
                    background: STAGE_COLORS[stage],
                    borderRadius: 6,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Lead Sources</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>Where leads are coming from</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={sources} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {sources.map((_, i) => (
                    <Cell key={i} fill={SOURCE_PALETTE[i % SOURCE_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sources.map((s, i) => (
                <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: SOURCE_PALETTE[i % SOURCE_PALETTE.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.source}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Won Value Bar Chart ── */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Won Deal Value (₹ Lakhs)</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>Revenue closed per month</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trends} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <XAxis dataKey="month" tick={{ fill: '#555d75', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#555d75', fontSize: 11 }} axisLine={false} tickLine={false} width={36} unit="L" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="wonValueLakhs" name="Won ₹L" fill="#10d9a0" radius={[5, 5, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Team Leaderboard ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Team Leaderboard</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ranked by weighted pipeline value</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Team Member</th>
              <th>Role</th>
              <th style={{ textAlign: 'right' }}>Total Leads</th>
              <th style={{ textAlign: 'right' }}>Active</th>
              <th style={{ textAlign: 'right' }}>Won</th>
              <th style={{ textAlign: 'right' }}>Pipeline ₹L</th>
              <th style={{ textAlign: 'right' }}>Weighted ₹L</th>
              <th style={{ textAlign: 'right' }}>Conv. %</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member, i) => (
              <tr key={member.id} style={{ cursor: 'default' }}>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    background: i === 0 ? 'rgba(245,166,35,0.15)' : i === 1 ? 'rgba(192,192,192,0.15)' : 'rgba(176,140,88,0.1)',
                    color: i === 0 ? '#f5a623' : i === 1 ? '#aaa' : '#b08c58',
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, background: 'var(--brand-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--brand-light)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      {member.initials}
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</span>
                  </div>
                </td>
                <td>
                  <span style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 600,
                    background: member.role === 'PRINCIPAL' ? 'rgba(108,99,255,0.12)' : 'var(--bg-elevated)',
                    color: member.role === 'PRINCIPAL' ? 'var(--brand-light)' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}>
                    {member.role === 'PRINCIPAL' ? '👑 Principal' : '💼 Sales'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{member.totalLeads}</td>
                <td style={{ textAlign: 'right', color: 'var(--sky)' }}>{member.activeLeads}</td>
                <td style={{ textAlign: 'right', color: 'var(--emerald)', fontWeight: 600 }}>{member.wonLeads}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>₹{member.pipelineLakhs}L</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--emerald)' }}>₹{member.weightedLakhs}L</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <div style={{ width: 48, height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${member.conversionRate}%`, background: 'var(--emerald)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>{member.conversionRate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Win / Loss Summary ── */}
      <div className="grid-3" style={{ gap: 14 }}>
        {[
          { label: 'Won Deals', val: overview.winLoss.won, color: 'var(--emerald)', icon: '🏆', bg: 'var(--emerald-dim)' },
          { label: 'Lost Deals', val: overview.winLoss.lost, color: 'var(--rose)', icon: '❌', bg: 'var(--rose-dim)' },
          { label: 'Stalled / Active', val: overview.winLoss.stalled, color: 'var(--amber)', icon: '⏳', bg: 'var(--amber-dim)' },
        ].map((item) => (
          <div key={item.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, background: item.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
            }}>
              {item.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: item.color }}>{item.val}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
