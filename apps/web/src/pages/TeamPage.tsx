import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../lib/utils';
import CreativeLoader from '../components/common/CreativeLoader';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  initials?: string;
  avatar?: string;
  createdAt: string;
  _count?: { ownedLeads: number };
}

const ROLE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  ADMIN:     { label: 'Admin',     icon: '⚡', color: '#38bdf8',            bg: 'rgba(56,189,248,0.12)' },
  PRINCIPAL: { label: 'Principal', icon: '👑', color: 'var(--brand-light)', bg: 'var(--brand-dim)' },
  SALES:     { label: 'Sales',     icon: '💼', color: 'var(--sky)',         bg: 'var(--sky-dim)' },
};

export default function TeamPage() {
  const { isPrincipal, user } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'SALES' | 'PRINCIPAL' | 'ADMIN'>('SALES');
  const [inviting, setInviting] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/team');
      setMembers(data.data);
    } catch { toast('Failed to load team', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || invitePassword.length < 8) {
      toast('Fill all fields (password min 8 chars)', 'error'); return;
    }
    setInviting(true);
    try {
      await api.post('/auth/register', {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        password: invitePassword,
        role: inviteRole,
      });
      await fetchTeam();
      setShowInvite(false);
      setInviteName(''); setInviteEmail(''); setInvitePassword(''); setInviteRole('SALES');
      toast(`✅ ${inviteName} added to the team!`, 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add member';
      toast(msg, 'error');
    } finally { setInviting(false); }
  };

  const handleRoleChange = async (memberId: string, newRole: string, memberName: string) => {
    try {
      await api.patch(`/auth/team/${memberId}`, { role: newRole });
      await fetchTeam();
      toast(`${memberName}'s role updated to ${newRole}`, 'success');
    } catch { toast('Failed to update role', 'error'); }
  };

  if (loading) return <CreativeLoader title="DND STUDIO" subtitle="Loading Team Members..." />;

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            👥 Team Members
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} · DND Studio
          </div>
        </div>
        {isPrincipal && (
          <button className="btn btn-primary" onClick={() => setShowInvite(!showInvite)}>
            {showInvite ? '✕ Cancel' : '+ Add Member'}
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && isPrincipal && (
        <div className="card" style={{ border: '1px solid rgba(108,99,255,0.3)', background: 'var(--brand-dim)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            ✉️ Add New Team Member
          </div>
          <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g. Priya Sharma" required />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'SALES' | 'PRINCIPAL' | 'ADMIN')}>
                  <option value="SALES">💼 Sales Executive</option>
                  <option value="PRINCIPAL">👑 Principal / Owner</option>
                  <option value="ADMIN">⚙️ Administrator</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="priya@bindbuild.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password *</label>
                <input className="form-input" type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} minLength={8} placeholder="Min. 8 characters" required />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>They can change this in Settings</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={inviting}>
                {inviting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Adding…</> : '✅ Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {members.map((member) => {
          const rc = ROLE_CONFIG[member.role] ?? ROLE_CONFIG['SALES'];
          const isMe = member.id === user?.id;

          return (
            <div key={member.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg, var(--brand), ${rc.color})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff',
                fontFamily: 'var(--font-display)',
                boxShadow: 'var(--shadow-brand)',
              }}>
                {member.initials ?? member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)' }}>{member.name}</span>
                  {isMe && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                      background: 'var(--brand-dim)', color: 'var(--brand-light)',
                    }}>You</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{member.email}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                    background: rc.bg, color: rc.color,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    {rc.icon} {rc.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {member._count?.ownedLeads ?? 0} leads · Joined {timeAgo(member.createdAt)}
                  </span>
                </div>
              </div>

              {/* Role changer — only Principal can change roles, and not their own */}
              {isPrincipal && !isMe && (
                <div style={{ flexShrink: 0 }}>
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value, member.name)}
                    className="form-input"
                    style={{ fontSize: 12, padding: '6px 10px', width: 'auto', minWidth: 130 }}
                  >
                    <option value="SALES">💼 Sales</option>
                    <option value="PRINCIPAL">👑 Principal</option>
                    <option value="ADMIN">⚙️ Admin</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Members', value: members.length, icon: '👥' },
          { label: 'Admin & Principal', value: members.filter((m) => m.role === 'ADMIN' || m.role === 'PRINCIPAL').length, icon: '👑' },
          { label: 'Sales Reps', value: members.filter((m) => m.role === 'SALES').length, icon: '💼' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
