import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Layout from './Layout';
import { MemoryRouter } from 'react-router-dom';

// Mock Auth, Org, Finance and Theme hooks to provide predictable values
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'dev@local', name: 'Developer' }, logout: jest.fn() })
}));
jest.mock('../context/OrgContext', () => ({
  useOrg: () => ({ orgs: [{ id: 'o1', name: 'Org' }], activeOrgId: 'o1', switchOrg: jest.fn(), currency: 'USD', role: 'admin' })
}));
jest.mock('../context/FinanceContext', () => ({
  useFinance: () => ({ incomes: [], expenses: [] })
}));

// Use real ThemeProvider behavior by mocking only the hook interface
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: () => { document.documentElement.classList.toggle('dark'); } })
}));

describe('Layout component', () => {
  beforeEach(() => {
    // ensure no dark class left behind
    document.documentElement.classList.remove('dark');
  });

  test('renders sidebar navigation items and topbar links', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.getByText('Fundify')).toBeInTheDocument();
    // nav items
    ['Dashboard','Income','Funders','Projects','Expenses','Donor Portal','Audit','Reports'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    // topbar action links
    expect(screen.getAllByText('Income').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0);
  });

  test('toggles dark mode using the theme button', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const darkBtn = screen.getAllByLabelText(/Toggle dark mode|Switch to dark mode|Switch to light mode/i)[0];
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    fireEvent.click(darkBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(darkBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('provides aria-current on active links', () => {
    // simulate location by rendering MemoryRouter with initialEntries
    render(
      <MemoryRouter initialEntries={["/dashboard/overview"]}>
        <Layout />
      </MemoryRouter>
    );

    const dashboardLink = screen.getAllByLabelText('Dashboard')[0];
    expect(dashboardLink.getAttribute('aria-current')).toBe('page');
  });
});
