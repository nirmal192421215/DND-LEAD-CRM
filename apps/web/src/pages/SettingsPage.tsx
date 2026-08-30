import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

const ROLE_META: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  PRINCIPAL: { label: 'Principal / Owner', icon: '👑', color: 'var(--brand-light)', desc: 'Full access — view all leads, manage proposals, see analytics' },
  SALES:     { label: 'Sales Executive',   icon: '💼', color: 'var(--sky)',          desc: 'Manage own leads, log activities, schedule meetings' },
  ADMIN:     { label: 'Administrator',     icon: '⚙️', color: 'var(--amber)',        desc: 'System administration and team management' },
};

export default function SettingsPage() {
  const { user, refreshUser, isPrincipal } = useAuth();
  const { toast } = useToast();

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [initials, setInitials] = useState(user?.initials ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  if (!user) return null;
  const role = ROLE_META[user.role] ?? ROLE_META['SALES'];

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('Name cannot be empty', 'error'); return; }
    setSavingProfile(true);
    try {
      await api.patch('/auth/profile', { name: name.trim(), initials: initials.trim() || name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) });
      await refreshUser();
      toast('Profile updated ✓', 'success');
    } catch { toast('Failed to update profile', 'error'); }
    finally { setSavingProfile(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    if (newPw !== confirmPw) { toast('Passwords do not match', 'error'); return; }
    setSavingPw(true);
    try {
      await api.patch('/auth/password', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast('Password changed successfully 🔐', 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password';
      toast(msg, 'error');
    } finally { setSavingPw(false); }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Profile Header ── */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--brand), var(--brand-light))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)',
          boxShadow: 'var(--shadow-brand)',
        }}>
          {user.initials ?? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{user.email} &bull; +91 9342626096</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: 'var(--brand-dim)', color: role.color, border: '1px solid var(--border)',
          }}>
            {role.icon} {role.label}
          </div>
        </div>
      </div>

      {/* ── Role Info ── */}
      <div className="card" style={{
        background: 'var(--brand-dim)', border: '1px solid rgba(108,99,255,0.2)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>{role.icon}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: role.color, marginBottom: 4 }}>{role.label}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{role.desc}</div>
        </div>
      </div>

      {/* ── Edit Profile ── */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Edit Profile</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Update your display name and initials</div>
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Initials</label>
              <input className="form-input" value={initials} maxLength={3} onChange={(e) => setInitials(e.target.value.toUpperCase())} placeholder="Auto from name" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed. Contact admin.</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : '💾 Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change Password ── */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Change Password</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Use a strong password with at least 8 characters</div>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Current Password *</label>
            <input className="form-input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input className="form-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                className="form-input"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                style={{ borderColor: confirmPw && confirmPw !== newPw ? 'var(--rose)' : undefined }}
                autoComplete="new-password"
              />
              {confirmPw && confirmPw !== newPw && (
                <div style={{ fontSize: 11, color: 'var(--rose)', marginTop: 4 }}>Passwords do not match</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingPw || (!!confirmPw && confirmPw !== newPw)}>
              {savingPw ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Changing…</> : '🔐 Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* ── System Info ── */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>System Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Application', value: 'DND Studio CRM' },
            { label: 'Company',     value: 'DND Studio' },
            { label: 'Services',    value: 'Web, Portfolio & Apps' },
            { label: 'API Server',  value: 'http://localhost:4000' },
          ].map((item) => (
            <div key={item.label} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Danger Zone (Principal only) ── */}
      {isPrincipal && (
        <div className="card" style={{ border: '1px solid rgba(255,95,126,0.25)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--rose)', marginBottom: 4 }}>⚠ Danger Zone</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Irreversible actions — proceed with caution</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Export All Data</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Download complete lead database as JSON</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('accessToken');
                  const resp = await fetch('http://localhost:4000/api/leads?limit=1000', { headers: { Authorization: `Bearer ${token}` } });
                  const json = await resp.json();
                  const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'bind-build-leads.json'; a.click();
                  URL.revokeObjectURL(url);
                  toast('Data exported!', 'success');
                } catch { toast('Export failed', 'error'); }
              }}
            >
              ⬇ Export JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
