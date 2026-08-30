import { useState } from 'react';
import api from '../../lib/api';

interface Props {
  leadId: string;
  onClose: () => void;
  onCreated: () => void;
}

const MEETING_TYPES = ['StudioMeeting', 'VideoCall', 'SiteVisit', 'PhoneCall'];
const TYPE_ICONS: Record<string, string> = {
  StudioMeeting: '🏛',
  VideoCall: '📹',
  SiteVisit: '🏗',
  PhoneCall: '📞',
};

export default function CreateMeetingModal({ leadId, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'StudioMeeting',
    scheduledAt: '',
    durationMins: '60',
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/meetings', {
        leadId,
        title: form.title,
        type: form.type,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMins: parseInt(form.durationMins),
      });
      onCreated();
    } catch {
      alert('Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  // Default to tomorrow at 10am
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultDate = tomorrow.toISOString().slice(0, 16);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title">📅 Schedule Meeting</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Meeting Title *</label>
            <input
              className="form-input"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Initial Concept Discussion"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Meeting Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {MEETING_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${form.type === t ? 'var(--brand)' : 'var(--border)'}`,
                    background: form.type === t ? 'var(--brand-dim)' : 'var(--bg-elevated)',
                    color: form.type === t ? 'var(--brand-light)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--trans-fast)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>{TYPE_ICONS[t]}</span> {t.replace(/([A-Z])/g, ' $1').trim()}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input
                className="form-input"
                type="datetime-local"
                required
                defaultValue={defaultDate}
                onChange={(e) => set('scheduledAt', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <select className="form-select" value={form.durationMins} onChange={(e) => set('durationMins', e.target.value)}>
                {['30', '45', '60', '90', '120'].map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Google Meet Link Field */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Google Meet Link (Optional)</label>
              <a
                href="https://meet.google.com/new"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}
              >
                + Create on Google Meet ↗
              </a>
            </div>
            <input
              className="form-input"
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              onChange={(e) => set('meetingUrl', e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Scheduling…</> : '📅 Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
