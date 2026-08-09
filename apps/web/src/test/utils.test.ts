import { describe, it, expect } from 'vitest';
import {
  formatBudget,
  stageLabel,
  timeAgo,
  formatDate,
  STAGE_ORDER,
  SOURCE_ICONS,
} from '../lib/utils';

// ── formatBudget ──────────────────────────────────────────────────────────────
describe('formatBudget', () => {
  it('displays lakhs below 100 as L', () => {
    expect(formatBudget(45)).toBe('₹45L');
    expect(formatBudget(1)).toBe('₹1L');
    expect(formatBudget(99)).toBe('₹99L');
  });

  it('converts 100+ lakhs to Crores', () => {
    expect(formatBudget(100)).toBe('₹1.0Cr');
    expect(formatBudget(250)).toBe('₹2.5Cr');
    expect(formatBudget(1000)).toBe('₹10.0Cr');
  });

  it('handles zero gracefully', () => {
    expect(formatBudget(0)).toBe('₹0L');
  });

  it('handles decimal lakhs', () => {
    expect(formatBudget(28.5)).toBe('₹29L'); // toFixed(0) rounds
  });
});

// ── stageLabel ────────────────────────────────────────────────────────────────
describe('stageLabel', () => {
  it('returns human-readable label for known stages', () => {
    expect(stageLabel('NEW')).toBe('New');
    expect(stageLabel('CONTACTED')).toBe('Contacted');
    expect(stageLabel('MEETING')).toBe('Meeting');
    expect(stageLabel('PROPOSAL')).toBe('Proposal');
    expect(stageLabel('NEGOTIATION')).toBe('Negotiation');
    expect(stageLabel('WON')).toBe('Won');
    expect(stageLabel('LOST')).toBe('Lost');
  });

  it('returns the raw string for unknown stages', () => {
    expect(stageLabel('UNKNOWN_STAGE')).toBe('UNKNOWN_STAGE');
    expect(stageLabel('')).toBe('');
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────────
describe('timeAgo', () => {
  const minsAgo = (mins: number) =>
    new Date(Date.now() - mins * 60000).toISOString();

  it('returns "just now" for sub-minute times', () => {
    expect(timeAgo(minsAgo(0))).toBe('just now');
  });

  it('returns minutes for < 1 hour', () => {
    expect(timeAgo(minsAgo(5))).toBe('5m ago');
    expect(timeAgo(minsAgo(59))).toBe('59m ago');
  });

  it('returns hours for < 24h', () => {
    expect(timeAgo(minsAgo(60))).toBe('1h ago');
    expect(timeAgo(minsAgo(120))).toBe('2h ago');
  });

  it('returns days for < 7 days', () => {
    expect(timeAgo(minsAgo(60 * 24))).toBe('1d ago');
    expect(timeAgo(minsAgo(60 * 24 * 6))).toBe('6d ago');
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('returns a localized date string', () => {
    const result = formatDate('2024-01-15T10:00:00Z');
    expect(result).toMatch(/15/); // day should appear
  });

  it('handles ISO date strings', () => {
    const result = formatDate('2023-06-01T00:00:00.000Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

// ── STAGE_ORDER ───────────────────────────────────────────────────────────────
describe('STAGE_ORDER', () => {
  it('has exactly 7 stages', () => {
    expect(STAGE_ORDER).toHaveLength(7);
  });

  it('starts with NEW and ends with LOST', () => {
    expect(STAGE_ORDER[0]).toBe('NEW');
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe('LOST');
  });

  it('contains WON before LOST', () => {
    const wonIdx = STAGE_ORDER.indexOf('WON');
    const lostIdx = STAGE_ORDER.indexOf('LOST');
    expect(wonIdx).toBeLessThan(lostIdx);
  });
});

// ── SOURCE_ICONS ──────────────────────────────────────────────────────────────
describe('SOURCE_ICONS', () => {
  it('has icons for all standard lead sources', () => {
    const sources = ['Instagram', 'Google', 'Referral', 'Website', 'Direct', 'WalkIn'];
    sources.forEach((s) => {
      expect(SOURCE_ICONS[s]).toBeTruthy();
    });
  });

  it('icons are emoji strings', () => {
    Object.values(SOURCE_ICONS).forEach((icon) => {
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    });
  });
});
