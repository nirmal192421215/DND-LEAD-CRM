import { useState, useRef, useMemo } from 'react';
import api from '../../lib/api';
import type { Lead } from '@bind-build/shared';
import { cleanPhone, format10DigitPhone } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
  onImported: (insertedCount: number) => void;
  existingLeads: Lead[];
}

interface ParsedRow {
  id: string;
  rawName: string;
  name: string;
  rawPhone: string;
  cleanPhone: string;
  category: 'INTERIOR' | 'RESTAURANT' | 'CONSTRUCTION' | 'INFRA';
  projectType: string;
  location: string;
  rating?: string;
  budgetLakhs: number;
  isDuplicate: boolean;
  duplicateReason?: string;
  isValidPhone: boolean;
  status: 'READY' | 'DUPLICATE' | 'INVALID_PHONE';
}

function parseCSVLine(text: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

function detectCategory(name: string, typeOrDesc: string): 'INTERIOR' | 'RESTAURANT' | 'CONSTRUCTION' | 'INFRA' {
  const text = `${name} ${typeOrDesc}`.toLowerCase();
  if (text.includes('sand') || text.includes('infra') || text.includes('rental') || text.includes('material') || text.includes('machine') || text.includes('wholesale') || text.includes('quarry') || text.includes('aggregate')) {
    return 'INFRA';
  }
  if (text.includes('restaurant') || text.includes('dining') || text.includes('cafe') || text.includes('biryani') || text.includes('food') || text.includes('cloud kitchen') || text.includes('mess') || text.includes('tiffen') || text.includes('tiffin') || text.includes('bakery') || text.includes('bhavan') || text.includes('hotel') || text.includes('hospitality') || text.includes('sweets') || text.includes('kitchen')) {
    return 'RESTAURANT';
  }
  if (text.includes('interior') || text.includes('decor') || text.includes('wood') || text.includes('plywood') || text.includes('ceiling') || text.includes('modular') || text.includes('design studio') || text.includes('transforming spaces') || text.includes('pixel space') || text.includes('sree sai') || text.includes('ｓｒｅｅ') || text.includes('aadithya') || text.includes('sriko') || text.includes('associates') || text.includes('lab') || text.includes('styling') || text.includes('furnishing') || text.includes('architect')) {
    return 'INTERIOR';
  }
  if (text.includes('construction') || text.includes('builder') || text.includes('brick') || text.includes('contractor') || text.includes('civil') || text.includes('building') || text.includes('turnkey') || text.includes('developer')) {
    return 'CONSTRUCTION';
  }
  return 'INTERIOR';
}

const CATEGORY_LABELS: Record<'INTERIOR' | 'RESTAURANT' | 'CONSTRUCTION' | 'INFRA', { label: string; icon: string; color: string; bg: string }> = {
  INTERIOR: { label: 'Interior Design', icon: '🎨', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  RESTAURANT: { label: 'Restaurants & Food', icon: '🍽️', color: '#f5a623', bg: 'rgba(245, 166, 35, 0.15)' },
  CONSTRUCTION: { label: 'Construction', icon: '🏗️', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  INFRA: { label: 'Infra & Materials', icon: '⚙️', color: '#10d9a0', bg: 'rgba(16, 217, 160, 0.15)' },
};

export default function CSVImportModal({ onClose, onImported, existingLeads }: Props) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'READY' | 'DUPLICATE' | 'INVALID'>('ALL');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [defaultSource, setDefaultSource] = useState<'Google' | 'Instagram' | 'Referral' | 'Direct'>('Google');
  const [defaultPriority, setDefaultPriority] = useState<'HOT' | 'WARM' | 'COLD'>('WARM');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    skipped: number;
    firstSerial?: number;
    lastSerial?: number;
  } | null>(null);

  // Set of existing phone numbers and names for instant duplicate detection
  const existingPhonesSet = useMemo(() => {
    const set = new Set<string>();
    for (const lead of existingLeads) {
      const p = cleanPhone(lead.phone);
      if (p.length === 10) set.add(p);
    }
    return set;
  }, [existingLeads]);

  const existingNamesSet = useMemo(() => {
    const set = new Set<string>();
    for (const lead of existingLeads) {
      if (lead.name) set.add(lead.name.trim().toLowerCase());
    }
    return set;
  }, [existingLeads]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      parseCSVContent(text);
    };
    reader.readAsText(file);
  };

  const parseCSVContent = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      alert('CSV file must have a header row and at least one data row.');
      return;
    }

    // Determine delimiter (comma, semicolon, or tab)
    const firstLine = lines[0];
    let delimiter = ',';
    if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = ';';
    if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) delimiter = '\t';

    const headers = parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Find column indexes
    let nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('company') || h.includes('title') || h.includes('business') || h.includes('firm') || h.includes('store'));
    let phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('tel') || h.includes('call'));
    let catIdx = headers.findIndex((h) => h.includes('category') || h.includes('type') || h.includes('industry') || h.includes('subcat'));
    let addrIdx = headers.findIndex((h) => h.includes('address') || h.includes('location') || h.includes('city') || h.includes('street') || h.includes('place'));
    let ratingIdx = headers.findIndex((h) => h.includes('rating') || h.includes('stars') || h.includes('score'));

    if (nameIdx === -1) nameIdx = 0; // Default to first column if not found
    if (phoneIdx === -1) phoneIdx = 1; // Default to second column if not found

    const parsed: ParsedRow[] = [];
    const seenPhonesInBatch = new Set<string>();
    const seenNamesInBatch = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cols = parseCSVLine(line, delimiter);

      const rawName = (cols[nameIdx] || '').trim();
      const rawPhone = (cols[phoneIdx] || '').trim();
      const rawCat = catIdx !== -1 ? (cols[catIdx] || '').trim() : '';
      const rawAddr = addrIdx !== -1 ? (cols[addrIdx] || '').trim() : 'Coimbatore';
      const rawRating = ratingIdx !== -1 ? (cols[ratingIdx] || '').trim() : '';

      if (!rawName && !rawPhone) continue;

      const cleaned = cleanPhone(rawPhone);
      const isValidPhone = cleaned.length === 10;
      const category = detectCategory(rawName, rawCat || rawAddr);

      const nameLower = rawName.toLowerCase();
      let isDuplicate = false;
      let duplicateReason = '';

      if (isValidPhone) {
        if (existingPhonesSet.has(cleaned)) {
          isDuplicate = true;
          duplicateReason = 'Phone exists in CRM';
        } else if (seenPhonesInBatch.has(cleaned)) {
          isDuplicate = true;
          duplicateReason = 'Duplicate phone in file';
        }
      }

      if (!isDuplicate && rawName) {
        if (existingNamesSet.has(nameLower)) {
          isDuplicate = true;
          duplicateReason = 'Company exists in CRM';
        } else if (seenNamesInBatch.has(nameLower)) {
          isDuplicate = true;
          duplicateReason = 'Duplicate company in file';
        }
      }

      if (isValidPhone && !isDuplicate) {
        seenPhonesInBatch.add(cleaned);
      }
      if (rawName && !isDuplicate) {
        seenNamesInBatch.add(nameLower);
      }

      let status: 'READY' | 'DUPLICATE' | 'INVALID_PHONE' = 'READY';
      if (!isValidPhone) {
        status = 'INVALID_PHONE';
      } else if (isDuplicate) {
        status = 'DUPLICATE';
      }

      parsed.push({
        id: `row-${i}`,
        rawName: rawName || 'Untitled Business',
        name: rawName || 'Untitled Business',
        rawPhone,
        cleanPhone: cleaned,
        category,
        projectType: rawCat || CATEGORY_LABELS[category].label,
        location: rawAddr || 'Coimbatore',
        rating: rawRating,
        budgetLakhs: 15,
        isDuplicate,
        duplicateReason,
        isValidPhone,
        status,
      });
    }

    setRows(parsed);
  };

  const downloadSampleCSV = () => {
    const sampleHeaders = ['Business Name', 'Phone Number', 'Category', 'Address', 'Rating', 'Google Maps URL'];
    const sampleRows = [
      ['Apex Studio & Modular Interiors', '9842210101', 'Interior Designer', 'R.S. Puram, Coimbatore', '4.8', 'https://maps.google.com/?cid=101'],
      ['Kovai Cloud Kitchen & Mess', '9443320202', 'Restaurant & Food', 'Gandhipuram, Coimbatore', '4.6', 'https://maps.google.com/?cid=102'],
      ['Siva Sakthi Brick & Civil Contractors', '9789030303', 'Construction & Turnkey', 'Avinashi Road, Coimbatore', '4.7', 'https://maps.google.com/?cid=103'],
      ['Kongu M-Sand Aggregates & Infra', '9944040404', 'Infra Materials & Sand', 'Sulur, Coimbatore', '4.5', 'https://maps.google.com/?cid=104'],
      ['Aura Living Luxury Decorators', '9894450505', 'Interior & Wood Studio', 'Saibaba Colony, Coimbatore', '4.9', 'https://maps.google.com/?cid=105'],
    ];

    const csvContent = [sampleHeaders.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'google_maps_leads_sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const leadsToImport = rows.filter((r) => {
      if (!r.isValidPhone) return false;
      if (skipDuplicates && r.isDuplicate) return false;
      return true;
    });

    if (leadsToImport.length === 0) {
      alert('No valid leads to import. Check that phone numbers are 10-digits and not duplicates.');
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        leads: leadsToImport.map((r) => ({
          name: r.name,
          phone: r.cleanPhone,
          projectType: r.projectType || CATEGORY_LABELS[r.category].label,
          projectDescription: `Imported via Google Maps CSV (${r.rating ? `Rating: ${r.rating}★` : 'Verified Lead'})`,
          location: r.location,
          budgetLakhs: r.budgetLakhs,
          source: defaultSource,
          priority: defaultPriority,
          stage: 'NEW' as const,
          tags: ['Google Maps', CATEGORY_LABELS[r.category].label],
          winProbability: 30,
        })),
        options: {
          skipDuplicates,
          ownerId: user?.id,
          defaultPriority,
          defaultSource,
        },
      };

      const res = await api.post('/leads/bulk-import', payload);
      if (res.data.success) {
        setImportResult({
          inserted: res.data.inserted,
          skipped: res.data.skipped,
          firstSerial: res.data.firstSerial,
          lastSerial: res.data.lastSerial,
        });
        // Bump cache and notify parent
        localStorage.removeItem('dnd_cached_leads_v5');
        localStorage.setItem('dnd_cached_leads_v6_timestamp', String(Date.now()));
        onImported(res.data.inserted);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      alert(`Import failed: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Filtered rows for table view
  const filteredRows = useMemo(() => {
    if (filterTab === 'READY') return rows.filter((r) => r.status === 'READY');
    if (filterTab === 'DUPLICATE') return rows.filter((r) => r.status === 'DUPLICATE');
    if (filterTab === 'INVALID') return rows.filter((r) => r.status === 'INVALID_PHONE');
    return rows;
  }, [rows, filterTab]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      ready: rows.filter((r) => r.status === 'READY').length,
      duplicates: rows.filter((r) => r.status === 'DUPLICATE').length,
      invalid: rows.filter((r) => r.status === 'INVALID_PHONE').length,
    };
  }, [rows]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal"
        style={{
          maxWidth: 920,
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'rgba(17, 19, 24, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(108, 99, 255, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(108, 99, 255, 0.15)',
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>📂</span>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                Bulk Import Google Maps Leads
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'var(--brand-dim)',
                  color: 'var(--brand-light)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Phase 1.1 Live
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Upload CSV / Excel · Auto-cleans 10-digit phone numbers · Smart deduplication · Assigns sequential DND IDs
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0' }}>
          {/* Success Result View */}
          {importResult ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 24px',
                background: 'rgba(16, 217, 160, 0.05)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(16, 217, 160, 0.25)',
                margin: '0 24px',
              }}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--emerald)', margin: '0 0 8px 0', fontWeight: 700 }}>
                Successfully Imported {importResult.inserted} Leads!
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 24px auto', fontSize: '0.92rem' }}>
                {importResult.firstSerial && importResult.lastSerial
                  ? `Assigned serial numbers DND-${String(importResult.firstSerial).padStart(3, '0')} to DND-${String(importResult.lastSerial).padStart(3, '0')}.`
                  : 'All valid leads added to your sales pipeline.'}{' '}
                {importResult.skipped > 0 ? `${importResult.skipped} duplicates/invalid rows were automatically skipped.` : ''}
              </p>

              <div
                style={{
                  display: 'inline-flex',
                  gap: 16,
                  background: 'var(--bg-elevated)',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  marginBottom: 28,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--emerald)' }}>{importResult.inserted}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Added</div>
                </div>
                <div style={{ width: 1, background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--amber)' }}>{importResult.skipped}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Skipped</div>
                </div>
                <div style={{ width: 1, background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brand-light)' }}>100%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>10-Digit Clean</div>
                </div>
              </div>

              <div>
                <button
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{
                    padding: '10px 28px',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 20px var(--brand-glow)',
                  }}
                >
                  🚀 View Leads Pipeline
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Dropzone & Sample Download */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--brand)',
                  borderRadius: 'var(--radius-lg)',
                  padding: rows.length > 0 ? '20px' : '40px 24px',
                  textAlign: 'center',
                  background: 'rgba(108, 99, 255, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {fileName ? `Selected: ${fileName}` : 'Drop Google Maps CSV here or Click to Browse'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Supports Google Maps Scraper, Instant Data Scraper, or standard CSV files
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    📂 Choose File
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSampleCSV();
                    }}
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--brand-light)',
                    }}
                  >
                    📥 Download Sample Google Maps CSV
                  </button>
                </div>
              </div>

              {/* Once parsed, show summary statistics, filters, settings, and preview table */}
              {rows.length > 0 && (
                <>
                  {/* Summary Metric Chips */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <div
                      onClick={() => setFilterTab('ALL')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: filterTab === 'ALL' ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                        border: filterTab === 'ALL' ? '1px solid var(--brand)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Rows</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{counts.total}</div>
                    </div>

                    <div
                      onClick={() => setFilterTab('READY')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: filterTab === 'READY' ? 'rgba(16, 217, 160, 0.15)' : 'var(--bg-elevated)',
                        border: filterTab === 'READY' ? '1px solid var(--emerald)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: 'var(--emerald)', textTransform: 'uppercase' }}>Ready to Import</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--emerald)' }}>{counts.ready}</div>
                    </div>

                    <div
                      onClick={() => setFilterTab('DUPLICATE')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: filterTab === 'DUPLICATE' ? 'rgba(245, 166, 35, 0.15)' : 'var(--bg-elevated)',
                        border: filterTab === 'DUPLICATE' ? '1px solid var(--amber)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: 'var(--amber)', textTransform: 'uppercase' }}>Duplicates</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber)' }}>{counts.duplicates}</div>
                    </div>

                    <div
                      onClick={() => setFilterTab('INVALID')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: filterTab === 'INVALID' ? 'rgba(255, 95, 126, 0.15)' : 'var(--bg-elevated)',
                        border: filterTab === 'INVALID' ? '1px solid var(--rose)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: 'var(--rose)', textTransform: 'uppercase' }}>No Phone (Skipped)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--rose)' }}>{counts.invalid}</div>
                    </div>
                  </div>

                  {/* Settings Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: '10px 14px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        style={{ accentColor: 'var(--brand)', width: 16, height: 16 }}
                      />
                      <span>
                        <strong>Skip Duplicates</strong> (prevents calling same lead twice)
                      </span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Source:</span>
                        <select
                          className="form-select"
                          value={defaultSource}
                          onChange={(e) => setDefaultSource(e.target.value as any)}
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                        >
                          <option value="Google">Google Maps</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Referral">Referral</option>
                          <option value="Direct">Direct / Offline</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Priority:</span>
                        <select
                          className="form-select"
                          value={defaultPriority}
                          onChange={(e) => setDefaultPriority(e.target.value as any)}
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                        >
                          <option value="WARM">WARM 🟡</option>
                          <option value="HOT">HOT 🔥</option>
                          <option value="COLD">COLD ❄️</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      maxHeight: 280,
                      overflowY: 'auto',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>#</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Business Name</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Clean 10-Digit Phone</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Auto-Category</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Location</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.slice(0, 100).map((row, idx) => {
                          const catInfo = CATEGORY_LABELS[row.category];
                          return (
                            <tr
                              key={row.id}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                                opacity: row.status === 'INVALID_PHONE' ? 0.5 : 1,
                              }}
                            >
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {row.name}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {row.isValidPhone ? (
                                  <span
                                    style={{
                                      fontFamily: 'monospace',
                                      color: 'var(--emerald)',
                                      background: 'rgba(16, 217, 160, 0.1)',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {format10DigitPhone(row.cleanPhone)}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--rose)', fontStyle: 'italic' }}>
                                    {row.rawPhone ? `Invalid (${row.rawPhone})` : 'Missing Phone'}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: '0.74rem',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: catInfo.bg,
                                    color: catInfo.color,
                                    fontWeight: 500,
                                  }}
                                >
                                  {catInfo.icon} {catInfo.label}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.location}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {row.status === 'READY' && (
                                  <span style={{ color: 'var(--emerald)', fontWeight: 600, fontSize: '0.75rem' }}>
                                    ✅ Ready
                                  </span>
                                )}
                                {row.status === 'DUPLICATE' && (
                                  <span
                                    style={{
                                      color: 'var(--amber)',
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      title: row.duplicateReason,
                                    }}
                                  >
                                    ⚠️ {row.duplicateReason || 'Duplicate'}
                                  </span>
                                )}
                                {row.status === 'INVALID_PHONE' && (
                                  <span style={{ color: 'var(--rose)', fontWeight: 600, fontSize: '0.75rem' }}>
                                    ❌ Skipped
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredRows.length > 100 && (
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Showing first 100 rows of {filteredRows.length} total.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!importResult && (
          <div
            className="modal-footer"
            style={{
              borderTop: '1px solid var(--border)',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {rows.length > 0 ? (
                <span>
                  <strong>
                    {skipDuplicates
                      ? rows.filter((r) => r.isValidPhone && !r.isDuplicate).length
                      : rows.filter((r) => r.isValidPhone).length}
                  </strong>{' '}
                  leads will be imported with clean 10-digit phone numbers
                </span>
              ) : (
                'Select or drop a CSV file above to begin'
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isImporting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImport}
                disabled={isImporting || rows.length === 0 || counts.ready === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 15px var(--brand-glow)',
                }}
              >
                {isImporting ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Importing Leads...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Import{' '}
                    {skipDuplicates
                      ? rows.filter((r) => r.isValidPhone && !r.isDuplicate).length
                      : rows.filter((r) => r.isValidPhone).length}{' '}
                    Leads
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
