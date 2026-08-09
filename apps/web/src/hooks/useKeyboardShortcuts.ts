import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts for the CRM.
 *
 * G → D  Dashboard
 * G → L  Leads Pipeline
 * G → A  Analytics
 * G → T  Team
 * G → S  Settings
 * N       New Lead  (fires a custom event — LeadsPage listens)
 * /       Focus search bar
 * Esc     Blur search / close modals
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const gPressed = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isTyping = ['input', 'textarea', 'select'].includes(tag) ||
        (e.target as HTMLElement).isContentEditable;

      // ── / → Focus global search ─────────────────────────────────────────
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
        return;
      }

      // Don't trigger shortcuts while typing in an input
      if (isTyping) return;

      // ── Escape → blur search ────────────────────────────────────────────
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      // ── G sequence (Go to …) ────────────────────────────────────────────
      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        gPressed.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => { gPressed.current = false; }, 1500);
        return;
      }

      if (gPressed.current) {
        gPressed.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);

        switch (e.key.toLowerCase()) {
          case 'd': navigate('/');         break;
          case 'l': navigate('/leads');    break;
          case 'a': navigate('/analytics'); break;
          case 't': navigate('/team');     break;
          case 's': navigate('/settings'); break;
        }
        return;
      }

      // ── N → Open "New Lead" modal ────────────────────────────────────────
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        const btn = document.getElementById('add-lead-btn');
        if (btn) { e.preventDefault(); btn.click(); }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
  }, [navigate]);
}
