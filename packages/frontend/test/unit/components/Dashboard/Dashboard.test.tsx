import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fetchData } from '../../../../src/api';
import Dashboard from '../../../../src/components/Dashboard/Dashboard';
import { createMockStore } from '../../../utils';

jest.mock('../../../../src/api', () => ({
  fetchData: jest.fn(),
}));

const mockedFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchData.mockImplementation((url: string) => {
      if (url === '/api/folders/info') {
        return Promise.resolve({
          daemon: true,
          defaultFolder: null,
          home: '/home/reader',
        }) as never;
      }
      if (url === '/api/folders/recent') {
        return Promise.resolve({
          recent: [
            {
              path: '/home/reader/docs',
              name: 'docs',
              openedAt: '2026-10-22T09:19:14.278Z',
              exists: true,
            },
          ],
        }) as never;
      }
      return Promise.resolve(null) as never;
    });
  });

  const renderDashboard = () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </Provider>,
    );

    return store;
  };

  it('shows recently viewed folders', async () => {
    renderDashboard();

    expect(await screen.findByText('docs')).toBeInTheDocument();
    expect(screen.getByText('/home/reader/docs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open a folder/i })).toBeInTheDocument();
  });

  it('opens the folder picker dialog', async () => {
    renderDashboard();
    await screen.findByText('docs');

    fireEvent.click(screen.getByRole('button', { name: /open a folder/i }));

    expect(
      await screen.findByText(/Pick any folder on this machine/i),
    ).toBeInTheDocument();
  });

  it('removes a folder from the recent list optimistically', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ recent: [] }),
    } as Response);
    renderDashboard();

    await screen.findByText('docs');
    fireEvent.click(screen.getByRole('button', { name: /remove docs from recent folders/i }));

    await waitFor(() => {
      expect(screen.queryByText('/home/reader/docs')).not.toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/folders/recent?path=%2Fhome%2Freader%2Fdocs',
      { method: 'DELETE' },
    );

    fetchSpy.mockRestore();
  });
});
