import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { formatMoney } from '../utils/currency';
import BudgetAlert from '../components/BudgetAlert';
import TransactionRow from '../components/TransactionRow';
import TransactionForm from '../components/TransactionForm';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [dash, acc, cat] = await Promise.all([
        api.get('/dashboard'),
        api.get('/accounts'),
        api.get('/categories'),
      ]);
      setData(dash.data);
      setAccounts(acc.data.data);
      setCategories(cat.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="empty-state">Loading dashboard...</div>;
  if (error) return <div className="alert alert-error" role="alert">{error}</div>;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button type="button" className="btn" onClick={() => setShowAdd(true)}>
          <Plus size={16} aria-hidden="true" />
          <span>Add Transaction</span>
        </button>
      </div>

      <section className="grid-stats" aria-label="Summary">
        <div className="card">
          <div className="text-muted">Total Balance</div>
          <div className="num" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: '4px' }}>
            {formatMoney(data.totalBalance)}
          </div>
        </div>
        <div className="card">
          <div className="text-muted">Total Income</div>
          <div className="num text-income" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: '4px' }}>
            {formatMoney(data.totalIncome)}
          </div>
        </div>
        <div className="card">
          <div className="text-muted">Total Expenses</div>
          <div className="num text-expense" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: '4px' }}>
            {formatMoney(data.totalExpenses)}
          </div>
        </div>
        <div className="card">
          <div className="text-muted">Remaining Budget</div>
          <div className="num" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: '4px' }}>
            {data.budget ? formatMoney(data.budget.remaining) : 'Not set'}
          </div>
        </div>
      </section>

      {data.budget ? (
        <section className="card">
          <BudgetAlert budget={data.budget} />
        </section>
      ) : (
        <section className="card row" style={{ justifyContent: 'space-between' }}>
          <span className="text-muted">No monthly budget set for {data.month}.</span>
          <Link to="/budgets" className="btn btn-secondary btn-sm">Set budget</Link>
        </section>
      )}

      <section className="card stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Income vs Expenses (Last 6 Months)</h2>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chart}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="income" name="Income" fill="#15693B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#B91C1C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Recent Transactions</h2>
          <Link to="/transactions">View all</Link>
        </div>
        {data.recent.length === 0 ? (
          <div className="empty-state">No transactions yet. Add your first one above.</div>
        ) : (
          <div className="tx-list">
            {data.recent.map((tx) => (
              <TransactionRow key={tx._id} tx={tx} />
            ))}
          </div>
        )}
      </section>

      {showAdd && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add transaction">
          <div className="modal-panel stack">
            <h2 style={{ fontSize: 'var(--text-lg)' }}>Add Transaction</h2>
            <TransactionForm
              accounts={accounts}
              categories={categories}
              onSaved={() => {
                setShowAdd(false);
                load();
              }}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
