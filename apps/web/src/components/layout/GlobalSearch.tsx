import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatBudget, stageLabel } from '../../lib/utils';

interface SearchResult {
  id: string;
  name: string;
  stage: string;
  projectType: string;
  location: string;
  budgetLakhs: number;
  priority: string;
}

const STAGE_COLORS: Record<string, string> = {
  NEW: '#6c63ff', CONTACTED: '#38bdf8', MEETING: '#f5a623',
  PROPOSAL: '#a78bfa', NEGOTIATION: '#fb923c', WON: '#10d9a0', LOST: '#ff5f7e',
};

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}&limit=10`);
      setResults(data.data?.leads ?? []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIdx(-1);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 260);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(`/leads/${result.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === 'Enter' && selectedIdx >= 0) handleSelect(results[selectedIdx]);
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ flex: 1, maxWidth: 420, marginLeft: 'auto', position: 'relative' }}>
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <svg
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: 15, height: 15 }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        {loading && (
          <div className="spinner" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14 }} />
        )}
        <input
          id="global-search"
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search leads, clients, locations…"
          style={{
            width: '100%',
            background: 'var(--bg-elevated)',
            border: `1px solid ${open && query ? 'var(--brand)' : 'var(--border)'}`,
            borderRadius: open && results.length > 0 ? '10px 10px 0 0' : 'var(--radius-lg)',
            padding: '8px 36px 8px 38px',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            transition: 'border-color 150ms, box-shadow 150ms',
            boxShadow: open && query ? '0 0 0 3px var(--brand-dim)' : 'none',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && query && (
        <div style={{
          position: 'absolute',
          top: '100%', left: 0, right: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--brand)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          zIndex: 9000,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {results.length === 0 && !loading && (
            <div style={{ padding: '16px 16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              No leads found for "{query}"
            </div>
          )}
          {results.map((result, i) => (
            <div
              key={result.id}
              onClick={() => handleSelect(result)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                cursor: 'pointer',
                background: i === selectedIdx ? 'var(--brand-dim)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 100ms',
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${STAGE_COLORS[result.stage]}22`,
                border: `1px solid ${STAGE_COLORS[result.stage]}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: STAGE_COLORS[result.stage],
                fontFamily: 'var(--font-display)',
              }}>
                {result.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>{result.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.projectType} · 📍 {result.location}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{formatBudget(result.budgetLakhs)}</div>
                <div style={{
                  fontSize: 10, fontWeight: 600, color: STAGE_COLORS[result.stage],
                  background: `${STAGE_COLORS[result.stage]}18`,
                  padding: '1px 7px', borderRadius: 8, display: 'inline-block', marginTop: 2,
                }}>
                  {stageLabel(result.stage)}
                </div>
              </div>
            </div>
          ))}

          {results.length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
              ↑↓ navigate · ↵ open · esc close
            </div>
          )}
        </div>
      )}
    </div>
  );
}
