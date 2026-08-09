import { useState, useRef } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { timeAgo } from '../../lib/utils';

interface FileAsset {
  id: string;
  fileName: string;
  kind: 'pdf' | 'dwg' | 'img' | 'xls';
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
  uploadedBy: { name: string; initials: string };
}

interface Props {
  leadId: string;
  files: FileAsset[];
  onUpdated: () => void;
}

const KIND_ICONS: Record<string, string> = { pdf: '📄', dwg: '📐', img: '🖼', xls: '📊' };
const KIND_COLORS: Record<string, string> = {
  pdf: '#ff5f7e', dwg: '#f5a623', img: '#38bdf8', xls: '#10d9a0',
};
const KIND_LABELS: Record<string, string> = { pdf: 'PDF', dwg: 'DWG / CAD', img: 'Image', xls: 'Spreadsheet' };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilesPanel({ leadId, files, onUpdated }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { toast('File must be under 20MB', 'error'); return; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('leadId', leadId);
    setUploading(true);
    try {
      await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdated();
      toast(`📎 ${file.name} uploaded!`, 'success');
    } catch { toast('Upload failed', 'error'); }
    finally { setUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setDeletingId(fileId);
    try {
      await api.delete(`/files/${fileId}`);
      onUpdated();
      toast('File deleted', 'success');
    } catch { toast('Delete failed', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleDownload = (file: FileAsset) => {
    const url = `http://localhost:4000/uploads/${file.storagePath.split('/').pop()}`;
    const a = document.createElement('a');
    a.href = url; a.download = file.fileName; a.target = '_blank';
    a.click();
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
            📎 Files & Documents
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {files.length} file{files.length !== 1 ? 's' : ''} · PDF, DWG, Images, Spreadsheets (max 20MB)
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Uploading…</> : '+ Upload File'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.dwg,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '20px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 150ms',
          background: dragOver ? 'var(--brand-dim)' : 'transparent',
          marginBottom: files.length > 0 ? 16 : 0,
        }}
      >
        {uploading ? (
          <div style={{ color: 'var(--brand-light)', fontSize: 13 }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 8px' }} />
            Uploading file…
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{dragOver ? '📂' : '📎'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: dragOver ? 'var(--brand-light)' : 'var(--text-secondary)', marginBottom: 4 }}>
              {dragOver ? 'Drop to upload' : 'Drag & drop or click to upload'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              PDF · DWG · Images · Spreadsheets · Max 20MB
            </div>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                transition: 'border-color 150ms',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
            >
              {/* Kind icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `${KIND_COLORS[file.kind]}18`,
                border: `1px solid ${KIND_COLORS[file.kind]}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {KIND_ICONS[file.kind]}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 2,
                }}>
                  {file.fileName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                  <span style={{
                    color: KIND_COLORS[file.kind], fontWeight: 600, fontSize: 10,
                    background: `${KIND_COLORS[file.kind]}18`,
                    padding: '1px 7px', borderRadius: 8,
                  }}>
                    {KIND_LABELS[file.kind]}
                  </span>
                  <span>{formatSize(file.sizeBytes)}</span>
                  <span>↑ {file.uploadedBy.name}</span>
                  <span>{timeAgo(file.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleDownload(file)}
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Download"
                  style={{ padding: 7 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(file.id, file.fileName)}
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Delete"
                  disabled={deletingId === file.id}
                  style={{ padding: 7, color: 'var(--rose)' }}
                >
                  {deletingId === file.id
                    ? <span className="spinner" style={{ width: 12, height: 12 }} />
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
