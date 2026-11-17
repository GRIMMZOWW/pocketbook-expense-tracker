import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import api from '../src/api/client';
import { AuthProvider } from '../src/context/AuthContext';
import Login from '../src/pages/Login';
import TransactionForm from '../src/components/TransactionForm';
import Transactions from '../src/pages/Transactions';
import BudgetAlert from '../src/components/BudgetAlert';

vi.mock('../src/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  setUnauthorizedHandler: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('LoginForm', () => {
  it('shows inline validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('submits credentials to /auth/login', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { token: 't1', user: { id: '1', name: 'Asha', email: 'a@b.com' } } });
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'password123' });
    });
  });
});

describe('TransactionForm', () => {
  const accounts = [{ _id: 'a1', name: 'Cash' }];
  const categories = [
    { name: 'Food', type: 'Expense' },
    { name: 'Salary', type: 'Income' },
  ];

  it('validates amount > 0 and submits valid form data', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    api.post.mockResolvedValueOnce({ data: { _id: 'tx1' } });

    render(<TransactionForm accounts={accounts} categories={categories} onSaved={onSaved} />);
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));
    expect(screen.getByText('Enter an amount greater than 0.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Amount'), '150');
    await user.type(screen.getByLabelText('Note'), 'Lunch');
    await user.click(screen.getByRole('button', { name: 'Add transaction' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/transactions', expect.any(FormData));
      expect(onSaved).toHaveBeenCalled();
    });
  });
});

describe('TransactionList with filters', () => {
  it('loads transactions and refetches when search or type filter changes', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/accounts') return Promise.resolve({ data: { data: [{ _id: 'a1', name: 'Cash' }] } });
      if (url === '/categories') return Promise.resolve({ data: { data: [{ name: 'Food', type: 'Expense' }] } });
      return Promise.resolve({
        data: {
          data: [{ _id: 'tx1', type: 'Expense', category: 'Food', amount: 120, date: '2026-11-10', note: 'Coffee', account: { name: 'Cash' } }],
          page: 1,
          total: 1,
          totalPages: 1,
        },
      });
    });

    render(
      <MemoryRouter>
        <Transactions />
      </MemoryRouter>
    );

    expect(await screen.findByText('Food')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Type'), 'Expense');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/transactions', { params: { page: 1, limit: 10, type: 'Expense' } });
    });
  });
});

describe('BudgetAlert', () => {
  it('renders progress bar and warning message for danger and exceeded levels', () => {
    const { rerender } = render(
      <BudgetAlert
        budget={{
          category: '',
          amount: 1000,
          spent: 900,
          percentUsed: 90,
          level: 'danger',
          message: 'You have used 90% of your November budget.',
        }}
      />
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '90');
    expect(screen.getByText('You have used 90% of your November budget.')).toBeInTheDocument();

    rerender(
      <BudgetAlert
        budget={{
          category: '',
          amount: 1000,
          spent: 1125,
          percentUsed: 112.5,
          level: 'exceeded',
          message: 'Budget exceeded by ₹125.',
        }}
      />
    );
    expect(screen.getByText('Budget exceeded by ₹125.')).toBeInTheDocument();
  });
});
