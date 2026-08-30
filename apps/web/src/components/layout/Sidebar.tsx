import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';

const NAV = [
  { label: 'Dashboard',  path: '/',          icon: '⬡', exact: true },
  { label: 'Leads',      path: '/leads',     icon: '◈' },
  { label: 'Analytics',  path: '/analytics', icon: '◎' },
  { label: 'Team',       path: '/team',      icon: '◉' },
  { label: 'Settings',   path: '/settings',  icon: '⚙' },
];

const NAV_BOTTOM = [
  { label: 'Settings', path: '/settings', icon: '⚙' },
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';
  const isPrincipalRole = user?.role === 'PRINCIPAL';
  const roleLabel = isAdmin ? 'Admin' : isPrincipalRole ? 'Principal' : 'Sales';

  // ─── Mobile: Bottom Navigation Bar ───────────────────────────────────────────
  if (isMobile) {
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'rgba(17,19,24,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 200,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        {NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              flex: 1,
              padding: '6px 0',
              textDecoration: 'none',
              color: isActive ? '#8b84ff' : 'rgba(255,255,255,0.4)',
              fontSize: 9,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.04em',
              transition: 'color 150ms',
              borderTop: isActive ? '2px solid #6c63ff' : '2px solid transparent',
            })}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    );
  }

  // ─── Desktop: Regular Sidebar ────────────────────────────────────────────────
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <div className="sidebar-logo-text">
          DND Studio
          <span>Web · App · Portfolio</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-section-label">Menu</div>
      <nav className="sidebar-nav">
        {NAV.filter(i => i.path !== '/settings').map((item) => (
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
              letterSpacing: '0.08em',
              color: isAdmin ? '#38bdf8' : isPrincipalRole ? 'var(--brand-light)' : 'var(--text-muted)',
              padding: '3px 8px',
              background: isAdmin ? 'rgba(56,189,248,0.12)' : isPrincipalRole ? 'var(--brand-dim)' : 'transparent',
              borderRadius: 6, display: 'inline-block', marginBottom: 2,
            }}>
              {isAdmin ? '⚡' : isPrincipalRole ? '👑' : '💼'} {roleLabel}
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
