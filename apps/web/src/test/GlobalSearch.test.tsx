import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GlobalSearch from '../components/layout/GlobalSearch';
import api from '../lib/api';

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('GlobalSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with correct placeholder', () => {
    render(
      <BrowserRouter>
        <GlobalSearch />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Search leads, clients, locations/i);
    expect(input).toBeInTheDocument();
  });

  it('fetches search results when query is entered', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          leads: [
            {
              id: 'lead-1',
              name: 'Apex Design Corp',
              stage: 'PROPOSAL',
              projectType: 'Office Interior',
              location: 'Bangalore',
              budgetLakhs: 45,
              priority: 'HOT',
            },
          ],
        },
      },
    });

    render(
      <BrowserRouter>
        <GlobalSearch />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Search leads, clients, locations/i);
    fireEvent.change(input, { target: { value: 'Apex' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/search?q=Apex&limit=10');
    });

    await waitFor(() => {
      expect(screen.getByText('Apex Design Corp')).toBeInTheDocument();
    });
  });
});
