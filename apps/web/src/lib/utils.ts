import type { LeadStage } from '@bind-build/shared';

export function formatBudget(lakhs: number): string {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)}Cr`;
  return `₹${lakhs.toFixed(0)}L`;
}

export function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    CALL_BACK: 'Call Back',
    MEETING: 'Google Meet',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negotiation',
    WON: 'Won',
    LOST: 'Lost',
  };
  return labels[stage] ?? stage;
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const STAGE_ORDER: LeadStage[] = [
  'NEW', 'CONTACTED', 'CALL_BACK', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST',
];

export const SOURCE_ICONS: Record<string, string> = {
  Instagram: '📸',
  Google: '🔍',
  Referral: '🤝',
  Website: '🌐',
  Direct: '📞',
  WalkIn: '🚶',
};

/**
 * Returns a clean 10-digit phone number without 91, +91, 0, spaces or symbols
 */
export function cleanPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/**
 * Returns a 10-digit phone formatted for display, e.g. "93609 31010"
 */
export function format10DigitPhone(phone?: string | null): string {
  const p = cleanPhone(phone);
  if (p.length === 10) {
    return `${p.slice(0, 5)} ${p.slice(5)}`;
  }
  return p || phone || '';
}

/**
 * Returns country code + 10 digits for WhatsApp wa.me links
 */
export function cleanWhatsAppPhone(phone?: string | null): string {
  const tenDigit = cleanPhone(phone);
  return tenDigit ? `91${tenDigit}` : '';
}
