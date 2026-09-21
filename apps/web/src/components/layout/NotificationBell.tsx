import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { timeAgo } from '../../lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  leadId?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  lead_won: '🏆',
  stage_change: '🔄',
  proposal_viewed: '📋',
  meeting_reminder: '📅',
  system: '💡',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef<number>(0);

  const enablePush = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support desktop notifications.');
      return;
    }
    const res = await Notification.requestPermission();
    setPushPermission(res);
    if (res === 'granted') {
      new Notification('🔔 Notifications Enabled!', {
        body: 'You will receive desktop alerts for callbacks, lead moves, and client proposal views.',
        icon: '/vite.svg',
      });
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      const list: Notification[] = data.data.notifications || [];
      const newUnread: number = data.data.unreadCount || 0;

      // Trigger native notification if new unread arrived
      if (
        prevCountRef.current !== 0 &&
        newUnread > prevCountRef.current &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        list.length > 0
      ) {
        const latest = list[0];
        if (!latest.read) {
          new Notification(latest.title, {
            body: latest.body,
            icon: '/vite.svg',
          });
        }
      }
      prevCountRef.current = newUnread;
      setNotifications(list);
      setUnreadCount(newUnread);
    } catch { /* silent fail */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30s for new notifications
    pollRef.current = setInterval(fetchNotifications, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all', {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.read) await markRead(notification.id);
    setOpen(false);
    if (notification.leadId) navigate(`/leads/${notification.leadId}`);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        style={{
          position: 'relative',
          background: open ? 'var(--bg-hover)' : 'none',
          border: '1px solid',
          borderColor: open ? 'var(--border-strong)' : 'transparent',
          borderRadius: 'var(--radius-md)',
          padding: 8,
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms',
        }}
        title="Notifications"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'var(--rose)',
            color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-surface)',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9000,
          overflow: 'hidden',
          animation: 'pageFadeIn 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              🔔 Notifications
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--rose)',
                  background: 'var(--rose-dim)', padding: '1px 7px', borderRadius: 10,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: 'var(--brand-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Push Permission Banner */}
          {pushPermission !== 'granted' && (
            <div style={{
              padding: '8px 16px',
              background: 'rgba(108, 99, 255, 0.08)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Get instant desktop alerts for leads</span>
              <button
                type="button"
                onClick={enablePush}
                style={{
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔔 Enable
              </button>
            </div>
          )}

          {/* Notification list */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>No notifications</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>You're all caught up!</div>
              </div>
            ) : notifications.map((n, i) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  cursor: n.leadId ? 'pointer' : 'default',
                  background: n.read ? 'transparent' : 'rgba(108,99,255,0.04)',
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 100ms',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'rgba(108,99,255,0.04)'; }}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)',
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'var(--bg-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                  border: '1px solid var(--border)',
                }}>
                  {TYPE_ICONS[n.type] ?? '💡'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: n.read ? 500 : 700, fontSize: 13,
                    color: 'var(--text-primary)', marginBottom: 2,
                  }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 4 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button
                onClick={async () => {
                  // Clear read notifications
                  const readIds = notifications.filter((n) => n.read).map((n) => n.id);
                  await Promise.all(readIds.map((id) => api.delete(`/notifications/${id}`)));
                  setNotifications((prev) => prev.filter((n) => !n.read));
                }}
                style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear read notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
