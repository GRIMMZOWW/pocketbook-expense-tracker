import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../api/client';
import { currentMonthKey } from '../utils/currency';
import BudgetAlert from '../components/BudgetAlert';

export default function Budgets() {
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [overallAmount, setOverallAmount] = useState('');
  const [catName, setCatName] = useState('');
  const [catAmount, setCatAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        api.get('/budgets', { params: { month } }),
        api.get('/categories'),
      ]);
      setData(bRes.data);
      setOverallAmount(bRes.data.overall ? String(bRes.data.overall.amount) : '');
      const expCats = cRes.data.data.filter((c) => c.type === 'Expense');
      setCategories(expCats);
      if (!catName && expCats[0]) setCatName(expCats[0].name);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load budgets.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveOverall(e) {
    e.preventDefault();
    setFormError('');
    if (!overallAmount || Number(overallAmount) < 1) {
      setFormError('Enter a budget amount of at least 1.');
      return;
    }
    try {
      const res = await api.put('/budgets', { month, amount: Number(overallAmount), category: '' });
      setData(res.data);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save budget.');
    }
  }

  async function saveCategory(e) {
    e.preventDefault();
    setFormError('');
    if (!catName || !catAmount || Number(catAmount) < 1) {
      setFormError('Pick a category and enter an amount of at least 1.');
      return;
    }
    try {
      const res = await api.put('/budgets', { month, amount: Number(catAmount), category: catName });
      setData(res.data);
      setCatAmount('');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save category budget.');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/budgets/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete budget.');
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Budgets</h1>
        <input aria-label="Select month" className="input" style={{ width: 'auto' }} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      {loading ? (
        <div className="empty-state">Loading budgets...</div>
      ) : (
        <>
          <section className="card stack">
            <h2 style={{ fontSize: 'var(--text-lg)' }}>Monthly Overall Budget</h2>
            <form className="row" onSubmit={saveOverall}>
              <input
                aria-label="Overall budget amount"
                className="input"
                style={{ maxWidth: 220 }}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 25000"
                value={overallAmount}
                onChange={(e) => setOverallAmount(e.target.value)}
              />
              <button type="submit" className="btn">Save budget</button>
              {data?.overall && (
                <button type="button" className="btn btn-secondary" onClick={() => handleDelete(data.overall.id)}>
                  Remove
                </button>
              )}
            </form>
            {data?.overall ? (
              <BudgetAlert budget={data.overall} />
            ) : (
              <p className="text-muted" style={{ margin: 0 }}>No overall budget set for {month}.</p>
            )}
          </section>

          <section className="card stack">
            <h2 style={{ fontSize: 'var(--text-lg)' }}>Category Budgets</h2>
            <form className="row" onSubmit={saveCategory}>
              <select aria-label="Expense category" className="select" style={{ width: 'auto' }} value={catName} onChange={(e) => setCatName(e.target.value)}>
                {categories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <input
                aria-label="Category budget amount"
                className="input"
                style={{ maxWidth: 180 }}
                type="number"
                min="1"
                step="1"
                placeholder="Limit"
                value={catAmount}
                onChange={(e) => setCatAmount(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary">Set limit</button>
            </form>

            {data?.categories?.length === 0 ? (
              <div className="empty-state">No category budgets for {month}.</div>
            ) : (
              <div className="stack">
                {data?.categories?.map((b) => (
                  <div key={b.id} className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <BudgetAlert budget={b} />
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" aria-label={`Delete ${b.category} budget`} onClick={() => handleDelete(b.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
