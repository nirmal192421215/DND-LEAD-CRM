import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Lead } from '@bind-build/shared';
import { formatBudget, stageLabel, SOURCE_ICONS } from '../lib/utils';
import KanbanBoard from '../components/leads/KanbanBoard';
import CreateLeadModal from '../components/leads/CreateLeadModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

function exportToCSV(leads: Lead[]) {
  const headers = ['Name','Project Type','Location','Budget (L)','Stage','Priority','Source','Win %','Phone','Email','Created'];
  const rows = leads.map((l) => [
    `"${l.name}"`,
    `"${l.projectType}"`,
    `"${l.location}"`,
    l.budgetLakhs,
    stageLabel(l.stage),
    l.priority,
    l.source,
    l.winProbability,
    l.phone ?? '',
    l.email ?? '',
    new Date(l.createdAt).toLocaleDateString('en-IN'),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bind-build-leads-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type ViewMode = 'kanban' | 'list';

export default function LeadsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('kanban');
  const [showCreate, setShowCreate] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterOwner, setFilterOwner] = useState<string>('ALL');
  const { user } = useAuth();

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStage) params.set('stage', filterStage);
    if (filterPriority) params.set('priority', filterPriority);
    if (filterOwner === 'ME' && user) params.set('ownerId', user.id);
    params.set('limit', '1000');
    const { data } = await api.get(`/leads?${params}`);
    const sorted = (data.data || []).sort((a: Lead, b: Lead) =>
      (a.id || '').localeCompare(b.id || '', undefined, { numeric: true })
    );
    setLeads(sorted);
    setLoading(false);
  }, [filterStage, filterPriority, filterOwner, user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const PRIORITY_FILTERS = ['HOT', 'WARM', 'COLD'];
  const STAGE_FILTERS = ['NEW', 'CONTACTED', 'CALL_BACK', 'MEETING', 'PROPOSAL', 'NEGOTIATION'];

  const activeLeads = leads.filter((l) => !['WON', 'LOST'].includes(l.stage));
  const pipelineValue = activeLeads.reduce((a, l) => a + l.budgetLakhs, 0);

  if (loading) return (
    <div className="loader-center">
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Leads Pipeline</div>
          <div className="page-desc">
            {leads.length} leads · Active pipeline: {formatBudget(pipelineValue)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View Toggle */}
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button
              className={`tab ${view === 'kanban' ? 'active' : ''}`}
              onClick={() => setView('kanban')}
              title="Kanban view"
            >
              ⬜ Kanban
            </button>
            <button
              className={`tab ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="List view"
            >
              ≡ List
            </button>
          </div>
          {/* CSV Export */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { exportToCSV(leads); toast('CSV exported! 📊', 'success'); }}
            title="Export to CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export CSV
          </button>
          <button id="add-lead-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Lead
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>

        <button
          className={`filter-chip ${filterOwner === 'ME' ? 'active' : ''}`}
          onClick={() => setFilterOwner(filterOwner === 'ME' ? 'ALL' : 'ME')}
        >
          👤 My Leads
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {PRIORITY_FILTERS.map((p) => (
          <button
            key={p}
            className={`filter-chip ${filterPriority === p ? 'active' : ''}`}
            onClick={() => setFilterPriority(filterPriority === p ? '' : p)}
          >
            {p === 'HOT' ? '🔥' : p === 'WARM' ? '🌤' : '❄️'} {p}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {STAGE_FILTERS.map((s) => (
          <button
            key={s}
            className={`filter-chip ${filterStage === s ? 'active' : ''}`}
            onClick={() => setFilterStage(filterStage === s ? '' : s)}
          >
            {stageLabel(s)}
          </button>
        ))}

        {(filterStage || filterPriority || filterOwner === 'ME') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilterStage(''); setFilterPriority(''); setFilterOwner('ALL'); }}
          >
            ✕ Clear
          </button>
        )}

        {/* Drag hint */}
        {view === 'kanban' && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            ⠿ Drag cards between columns to update stage
          </span>
        )}
      </div>

      {/* ── Kanban View ── */}
      {view === 'kanban' && (
        <KanbanBoard leads={leads} onLeadMoved={fetchLeads} />
      )}

      {/* ── List View ── */}
      {view === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Client</th>
                <th>Project</th>
                <th>Location</th>
                <th>Budget</th>
                <th>Stage</th>
                <th>Priority</th>
                <th>Source</th>
                <th>Win %</th>
                <th style={{ textAlign: 'center' }}>Contact</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No leads found
                  </td>
                </tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                      color: 'var(--brand-light)', background: 'var(--brand-dim)',
                      padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(108,99,255,0.2)',
                      whiteSpace: 'nowrap', display: 'inline-block'
                    }}>
                      {lead.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: 'var(--brand-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: 'var(--brand-light)',
                      }}>
                        {lead.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{lead.projectType}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{lead.location}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatBudget(lead.budgetLakhs)}
                    </span>
                  </td>
                  <td>
                    <span className={`stage-badge stage-${lead.stage}`}>{stageLabel(lead.stage)}</span>
                  </td>
                  <td>
                    <span className={`priority-badge priority-${lead.priority}`}>
                      {lead.priority === 'HOT' ? '🔥' : lead.priority === 'WARM' ? '🌤' : '❄️'} {lead.priority}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {SOURCE_ICONS[lead.source]} {lead.source}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ width: `${lead.winProbability}%`, background: 'var(--emerald)' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.winProbability}%</span>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <a
                        href={lead.phone ? `tel:${lead.phone}` : '#'}
                        title={lead.phone ? `Call ${lead.name} (${lead.phone})` : 'No phone'}
                        style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 4, transition: 'color 150ms' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#38bdf8')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </a>
                      <a
                        href={lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.name}, reaching out regarding your ${lead.projectType} project.`)}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={lead.phone ? `WhatsApp ${lead.name}` : 'No phone'}
                        style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 4, transition: 'color 150ms' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#25D366')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </a>
                      <a
                        href={lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(`Follow-up: ${lead.projectType} Project`)}` : '#'}
                        title={lead.email ? `Email ${lead.name}` : 'No email'}
                        style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 4, transition: 'color 150ms' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#6c63ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateLeadModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchLeads();
            toast('Lead created successfully! 🎉', 'success');
          }}
        />
      )}
    </div>
  );
}
