import { useEffect, useState, useCallback } from 'react';
import { Download, Plus } from 'lucide-react';
import api from '../api/client';
import TransactionRow from '../components/TransactionRow';
import TransactionForm from '../components/TransactionForm';

const EMPTY_FILTERS = {
  search: '', type: '', category: '', account: '',
  from: '', to: '', minAmount: '', maxAmount: '',
};

export default function Transactions() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 1 });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('Expense');
  const [catError, setCatError] = useState('');

  const buildParams = useCallback((extra = {}) => {
    const params = { ...extra };
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '') params[k] = v;
    });
    return params;
  }, [filters]);

  const loadMeta = useCallback(async () => {
    const [acc, cat] = await Promise.all([api.get('/accounts'), api.get('/categories')]);
    setAccounts(acc.data.data);
    setCategories(cat.data.data);
  }, []);

  const loadTransactions = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/transactions', { params: buildParams({ page, limit: 10 }) });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [buildParams, page]);

  useEffect(() => {
    loadMeta().catch(() => {});
  }, [loadMeta]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/transactions/${id}`);
      loadTransactions();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete transaction.');
    }
  }

  async function handleExport() {
    try {
      const res = await api.get('/transactions/export', { params: buildParams(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pocketbook-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not export CSV.');
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    setCatError('');
    if (!newCatName.trim()) {
      setCatError('Enter a category name.');
      return;
    }
    try {
      await api.post('/categories', { name: newCatName.trim(), type: newCatType });
      setNewCatName('');
      loadMeta();
    } catch (err) {
      setCatError(err.response?.data?.message || 'Could not add category.');
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Transactions</h1>
        <div className="row">
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button type="button" className="btn" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={16} aria-hidden="true" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      <section className="card stack" aria-label="Filters">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="f-search">Search</label>
            <input
              id="f-search"
              className="input"
              placeholder="Note, category, or amount"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="f-type">Type</label>
              <select id="f-type" className="select" value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
                <option value="">All types</option>
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-account">Account</label>
              <select id="f-account" className="select" value={filters.account} onChange={(e) => updateFilter('account', e.target.value)}>
                <option value="">All accounts</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="grid-2">
            <div className="field">
              <label htmlFor="f-cat">Category</label>
              <select id="f-cat" className="select" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={`${c.type}-${c.name}`} value={c.name}>{c.name} ({c.type})</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-from">From date</label>
              <input id="f-from" className="input" type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="f-to">To date</label>
              <input id="f-to" className="input" type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
            </div>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
                Reset filters
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card stack">
        {loading ? (
          <div className="empty-state">Loading transactions...</div>
        ) : result.data.length === 0 ? (
          <div className="empty-state">No transactions match these filters.</div>
        ) : (
          <div className="tx-list">
            {result.data.map((tx) => (
              <TransactionRow
                key={tx._id}
                tx={tx}
                onEdit={(row) => { setEditing(row); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {result.totalPages > 1 && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="text-muted">Page {result.page} of {result.totalPages} ({result.total} total)</span>
            <div className="row">
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Custom Category</h2>
        <form className="row" onSubmit={handleAddCategory}>
          <input
            aria-label="New category name"
            className="input"
            style={{ maxWidth: 240 }}
            placeholder="e.g. Pets"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <select aria-label="New category type" className="select" style={{ width: 'auto' }} value={newCatType} onChange={(e) => setNewCatType(e.target.value)}>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
          <button type="submit" className="btn btn-secondary">Add category</button>
        </form>
        {catError && <span className="field-error">{catError}</span>}
      </section>

      {showForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editing ? 'Edit transaction' : 'Add transaction'}>
          <div className="modal-panel stack">
            <h2 style={{ fontSize: 'var(--text-lg)' }}>{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>
            <TransactionForm
              accounts={accounts}
              categories={categories}
              initial={editing}
              onSaved={() => { setShowForm(false); setEditing(null); loadTransactions(); }}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
