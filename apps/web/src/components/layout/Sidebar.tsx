import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { label: 'Dashboard',      path: '/',          icon: '⬡',  exact: true },
  { label: 'Leads Pipeline', path: '/leads',     icon: '◈' },
  { label: 'Analytics',      path: '/analytics', icon: '◎' },
  { label: 'Team',           path: '/team',      icon: '◉' },
];

const NAV_BOTTOM = [
  { label: 'Settings', path: '/settings', icon: '⚙' },
];

export default function Sidebar() {
  const { user, logout, isPrincipal } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = isPrincipal ? 'Principal' : user?.role === 'ADMIN' ? 'Admin' : 'Sales';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏗</div>
        <div className="sidebar-logo-text">
          Bind Build
          <span>ERP · CRM</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-section-label">Menu</div>
      <nav className="sidebar-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-item-icon" style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section nav */}
      <div className="sidebar-section-label" style={{ marginTop: 16 }}>Account</div>
      <nav className="sidebar-nav">
        {NAV_BOTTOM.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-item-icon" style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div className="sidebar-footer">
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Role badge */}
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: isPrincipal ? 'var(--brand-light)' : 'var(--text-muted)',
              padding: '3px 8px',
              background: isPrincipal ? 'var(--brand-dim)' : 'transparent',
              borderRadius: 6, display: 'inline-block', marginBottom: 2,
            }}>
              {isPrincipal ? '👑' : '💼'} {roleLabel}
            </div>

            {/* User card → navigates to settings */}
            <NavLink
              to="/settings"
              className="user-card"
              style={{ textDecoration: 'none' }}
              title="Go to Settings"
            >
              <div className="user-avatar">
                {user.initials ?? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">Click to manage account</div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); handleLogout(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', flexShrink: 0 }}
                title="Sign out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
}
