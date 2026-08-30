import { useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const SOURCES = ['Instagram', 'Google', 'Referral', 'Website', 'Direct', 'WalkIn'];
const STAGES = ['NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION'];
const PRIORITIES = ['HOT', 'WARM', 'COLD'];

export default function CreateLeadModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', projectType: '', projectDescription: '', location: '',
    budgetLakhs: '', source: 'Instagram', priority: 'WARM', stage: 'NEW',
    phone: '', email: '', winProbability: '0',
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/leads', {
        ...form,
        budgetLakhs: parseFloat(form.budgetLakhs),
        winProbability: parseInt(form.winProbability),
        ownerId: user?.id,
      });
      onCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create lead';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Lead</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Lead Code / Serial Number</label>
            <input className="form-input" disabled value="Auto-generated on save" style={{ background: 'var(--bg-elevated)', color: 'var(--brand)' }} />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Client / Business Name *</label>
              <input className="form-input" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Apex Tech / Alex Smith" />
            </div>
            <div className="form-group">
              <label className="form-label">Project Type *</label>
              <input className="form-input" required value={form.projectType} onChange={(e) => set('projectType', e.target.value)} placeholder="e.g. Website Building, Portfolio, Mobile App" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Project Description</label>
            <textarea className="form-textarea" value={form.projectDescription} onChange={(e) => set('projectDescription', e.target.value)} placeholder="Brief description of web, portfolio, or mobile app requirements…" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Location *</label>
              <input className="form-input" required value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Chennai, Remote, Bangalore" />
            </div>
            <div className="form-group">
              <label className="form-label">Budget (Lakhs) *</label>
              <input className="form-input" type="number" required min="0" step="0.1" value={form.budgetLakhs} onChange={(e) => set('budgetLakhs', e.target.value)} placeholder="e.g. 1.5" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="client@email.com" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={(e) => set('source', e.target.value)}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="form-select" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Win Probability (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={form.winProbability} onChange={(e) => set('winProbability', e.target.value)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating…</> : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
