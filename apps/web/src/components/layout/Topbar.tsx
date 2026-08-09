import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

const TITLES: Record<string, { title: string; desc: string }> = {
  '/': { title: 'Dashboard', desc: 'Overview of your pipeline' },
  '/leads': { title: 'Leads Pipeline', desc: 'Manage and track all your leads' },
  '/analytics': { title: 'Analytics', desc: 'Performance metrics and insights' },
  '/settings': { title: 'Settings', desc: 'Profile, preferences and account security' },
  '/team': { title: 'Team', desc: 'Manage team members and permissions' },
};

export default function Topbar() {
  const { pathname } = useLocation();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark';
  });

  const isLeadDetail = pathname.startsWith('/leads/') && pathname !== '/leads';
  const meta = TITLES[pathname] ?? (isLeadDetail
    ? { title: 'Lead Detail', desc: 'Full lead profile' }
    : { title: 'Bind Build ERP', desc: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className="topbar">
      <div style={{ flexShrink: 0 }}>
        <div className="topbar-title">{meta.title}</div>
        {meta.desc && <div className="topbar-subtitle">{meta.desc}</div>}
      </div>

      {/* Global Search */}
      <GlobalSearch />

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 150ms',
          }}
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <NotificationBell />
      </div>
    </header>
  );
}
