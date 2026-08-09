import type { LeadStage } from '@bind-build/shared';

export function formatBudget(lakhs: number): string {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)}Cr`;
  return `₹${lakhs.toFixed(0)}L`;
}

export function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    MEETING: 'Meeting',
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
  'NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST',
];

export const SOURCE_ICONS: Record<string, string> = {
  Instagram: '📸',
  Google: '🔍',
  Referral: '🤝',
  Website: '🌐',
  Direct: '📞',
  WalkIn: '🚶',
};
