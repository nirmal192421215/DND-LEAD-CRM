import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import KanbanBoard from '../components/leads/KanbanBoard';
import { ToastProvider } from '../context/ToastContext';
import type { Lead } from '@bind-build/shared';

const mockLeads: Lead[] = [
  {
    id: 'lead-101',
    name: 'Sharma Luxury Villa',
    projectType: 'Residential Interior',
    location: 'Indiranagar, Bangalore',
    budgetLakhs: 75,
    source: 'Instagram',
    priority: 'HOT',
    stage: 'NEW',
    winProbability: 60,
    tags: ['Luxury', 'Villa'],
    createdAt: new Date().toISOString(),
    ownerId: 'user-1',
    owner: { id: 'user-1', name: 'Priya Sharma', email: 'priya@bindbuild.com', role: 'SALES_REPRESENTATIVE', initials: 'PS' },
    _count: { activities: 2, notes: 1, meetings: 1, fileAssets: 3 },
  },
];

describe('KanbanBoard Component', () => {
  it('renders all pipeline stage columns', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <KanbanBoard leads={mockLeads} onLeadMoved={vi.fn()} />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.getByText('Proposal')).toBeInTheDocument();
    expect(screen.getByText('Negotiation')).toBeInTheDocument();
    expect(screen.getByText('Won')).toBeInTheDocument();
    expect(screen.getByText('Lost')).toBeInTheDocument();
  });

  it('renders lead card inside the correct column', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <KanbanBoard leads={mockLeads} onLeadMoved={vi.fn()} />
        </ToastProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Sharma Luxury Villa')).toBeInTheDocument();
    expect(screen.getAllByText('₹75L').length).toBeGreaterThan(0);
  });
});
