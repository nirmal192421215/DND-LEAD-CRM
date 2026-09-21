import { useState } from 'react';
import api from '../../lib/api';
import { formatDate, timeAgo } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface Proposal {
  id: string;
  amountLakhs: number;
  version: number;
  sentAt: string;
  status: 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';
  viewCount: number;
  lastViewedAt?: string;
  createdBy: { name: string; initials: string };
}

interface Props {
  leadId: string;
  proposal?: Proposal;
  leadBudget: number;
  onUpdated: () => void;
}

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  Sent:     { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  label: 'Sent',     icon: '📤' },
  Viewed:   { color: '#f5a623', bg: 'rgba(245,166,35,0.12)',  label: 'Viewed',   icon: '👁' },
  Accepted: { color: '#10d9a0', bg: 'rgba(16,217,160,0.12)',  label: 'Accepted', icon: '✅' },
  Rejected: { color: '#ff5f7e', bg: 'rgba(255,95,126,0.12)',  label: 'Rejected', icon: '❌' },
};

export default function ProposalPanel({ leadId, proposal, leadBudget, onUpdated }: Props) {
  const { isPrincipal } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(proposal?.amountLakhs.toString() ?? leadBudget.toString());
  const [saving, setSaving] = useState(false);

  const handleSend = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/proposals', { leadId, amountLakhs: val });
      setShowForm(false);
      onUpdated();
      toast(proposal ? `Proposal v${(proposal.version + 1)} sent! 📤` : 'Proposal sent! 📤', 'success');
    } catch { toast('Failed to send proposal', 'error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (status: string) => {
    if (!proposal) return;
    await api.patch(`/proposals/${proposal.id}`, { status });
    onUpdated();
    toast(`Proposal marked as ${status}`, 'success');
  };

  const statusInfo = proposal ? STATUS_COLORS[proposal.status] : null;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
            📋 Proposal
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {proposal ? `Version ${proposal.version} · ${formatDate(proposal.sentAt)}` : 'No proposal sent yet'}
          </div>
        </div>
        {(isPrincipal || !proposal) && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {proposal ? `📤 Revise (v${proposal.version + 1})` : '+ Create Proposal'}
          </button>
        )}
      </div>

      {/* Send/Revise Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
          padding: 16, border: '1px solid var(--border)', marginBottom: 16,
        }}>
          <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 13 }}>
            {proposal ? `Revise Proposal (v${proposal.version + 1})` : 'New Proposal'}
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Proposed Amount (₹ Lakhs)</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>₹</span>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ flex: 1 }}
                autoFocus
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>L</span>
            </div>
            {leadBudget > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Client budget: ₹{leadBudget}L
                {parseFloat(amount) > leadBudget && (
                  <span style={{ color: 'var(--rose)', marginLeft: 8 }}>⚠ Above client budget</span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSend} disabled={saving}>
              {saving ? 'Sending…' : '📤 Send Proposal'}
            </button>
          </div>
        </div>
      )}

      {/* Proposal Details */}
      {proposal && statusInfo && (
        <>
          {/* Status badge */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 'var(--radius-lg)',
              background: statusInfo.bg, border: `1px solid ${statusInfo.color}40`,
              color: statusInfo.color, fontWeight: 700, fontSize: 14,
            }}>
              <span style={{ fontSize: 18 }}>{statusInfo.icon}</span>
              {statusInfo.label}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                ₹{proposal.amountLakhs}L
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Proposed amount
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Version', value: `v${proposal.version}`, icon: '📝' },
              { label: 'Views', value: proposal.viewCount, icon: '👁' },
              { label: 'Last Viewed', value: proposal.lastViewedAt ? formatDate(proposal.lastViewedAt) : 'Never', icon: '🕐' },
            ].map((m) => (
              <div key={m.label} style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', border: '1px solid var(--border)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{m.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Real-time Tracking Signals */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: proposal.status === 'Accepted' ? 'rgba(16,217,160,0.12)' : proposal.viewCount > 0 ? 'rgba(245, 166, 35, 0.12)' : 'var(--bg-elevated)',
            border: `1px solid ${proposal.status === 'Accepted' ? '#10d9a0' : proposal.viewCount > 0 ? '#f5a623' : 'var(--border)'}`,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{proposal.status === 'Accepted' ? '🏆' : proposal.viewCount > 0 ? '🔥' : '📤'}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: proposal.status === 'Accepted' ? '#10d9a0' : proposal.viewCount > 0 ? '#f5a623' : 'var(--text-primary)' }}>
                  {proposal.status === 'Accepted'
                    ? 'Client Accepted the Proposal!'
                    : proposal.viewCount > 0
                    ? `Hot Signal · Viewed ${proposal.viewCount} times`
                    : 'Proposal Sent · Awaiting First View'}
                </div>
                {proposal.lastViewedAt && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Last viewed {timeAgo(proposal.lastViewedAt)}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const link = `${window.location.origin}/proposals/view/${proposal.id}`;
                navigator.clipboard.writeText(link);
                toast('🔗 Client proposal tracking link copied! Send on WhatsApp or Email', 'success');
              }}
              style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}
            >
              🔗 Copy Client Link
            </button>
          </div>

          {/* Sent by */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Sent by <strong style={{ color: 'var(--text-secondary)' }}>{proposal.createdBy.name}</strong></span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Proposal v${proposal.version} — DND Studio CRM</title>
                      <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6c63ff; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { font-size: 24px; font-weight: 800; color: #6c63ff; letter-spacing: -0.5px; }
                        .title { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
                        .meta { color: #64748b; font-size: 14px; margin-bottom: 30px; }
                        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
                        .amount { font-size: 36px; font-weight: 800; color: #10d9a0; margin-top: 10px; }
                        .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <div>
                          <div class="logo">DND STUDIO</div>
                          <div style="font-size:12px; color:#64748b;">Websites, Portfolios & Mobile Apps</div>
                        </div>
                        <div style="text-align:right; font-size:13px; color:#64748b;">
                          <div>Date: ${formatDate(proposal.sentAt)}</div>
                          <div>Proposal ID: PRO-${proposal.id.slice(-6).toUpperCase()}</div>
                        </div>
                      </div>
                      <div class="title">Project Commercial Proposal</div>
                      <div class="meta">Version ${proposal.version} · Prepared by ${proposal.createdBy.name}</div>
                      <div class="box">
                        <div style="font-size:13px; color:#64748b; font-weight:600; text-transform:uppercase;">Total Commercial Offer</div>
                        <div class="amount">₹ ${proposal.amountLakhs.toFixed(2)} Lakhs</div>
                        <div style="font-size:13px; color:#64748b; margin-top:12px;">Includes bespoke UI/UX design, web & mobile app engineering, testing, production deployment, and post-launch maintenance.</div>
                      </div>
                      <div style="margin-top:40px; display:flex; justify-content:space-between; padding-top:40px; border-top:1px dashed #cbd5e1;">
                        <div>
                          <div style="border-bottom:1px solid #94a3b8; width:200px; height:40px;"></div>
                          <div style="font-size:12px; color:#64748b; margin-top:6px;">Authorized Signature (DND Studio)</div>
                        </div>
                        <div>
                          <div style="border-bottom:1px solid #94a3b8; width:200px; height:40px;"></div>
                          <div style="font-size:12px; color:#64748b; margin-top:6px;">Client Acceptance Signature</div>
                        </div>
                      </div>
                      <div class="footer">
                        <div>Confidential Proposal — DND Studio CRM</div>
                        <div>Page 1 of 1</div>
                      </div>
                      <script>window.onload = function() { window.print(); }</script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🖨️ Export PDF
            </button>
          </div>

          {/* Status Actions — only Principal can change status */}
          {isPrincipal && proposal.status !== 'Accepted' && proposal.status !== 'Rejected' && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Update Status
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Viewed', 'Accepted', 'Rejected'] as const).filter((s) => s !== proposal.status).map((status) => {
                  const info = STATUS_COLORS[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        border: `1px solid ${info.color}50`,
                        background: info.bg, color: info.color,
                        cursor: 'pointer', transition: 'all 150ms',
                      }}
                    >
                      {info.icon} {info.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(proposal.status === 'Accepted') && (
            <div style={{
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--emerald-dim)', border: '1px solid rgba(16,217,160,0.3)',
              color: 'var(--emerald)', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              🎉 Proposal accepted! Mark this lead as <strong>Won</strong> in the pipeline.
            </div>
          )}
          {(proposal.status === 'Rejected') && (
            <div style={{
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--rose-dim)', border: '1px solid rgba(255,95,126,0.3)',
              color: 'var(--rose)', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ❌ Proposal rejected. Consider revising and re-sending.
            </div>
          )}
        </>
      )}

      {!proposal && !showForm && (
        <div style={{
          textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)',
          border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>No Proposal Yet</div>
          <div style={{ fontSize: 12, marginBottom: 14 }}>Create a proposal to share with the client</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Create Proposal</button>
        </div>
      )}
    </div>
  );
}
