import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../api/client';
import { formatMoney } from '../utils/currency';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [deposits, setDeposits] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/goals');
      setGoals(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !targetAmount || Number(targetAmount) < 1) {
      setFormError('Enter a goal name and a target amount of at least 1.');
      return;
    }
    try {
      await api.post('/goals', {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        targetDate: targetDate || null,
      });
      setName('');
      setTargetAmount('');
      setTargetDate('');
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not create goal.');
    }
  }

  async function handleContribute(id) {
    const amt = Number(deposits[id]);
    if (!amt || amt <= 0) return;
    setError('');
    try {
      await api.post(`/goals/${id}/contribute`, { amount: amt });
      setDeposits((d) => ({ ...d, [id]: '' }));
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add money to goal.');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/goals/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete goal.');
    }
  }

  if (loading) return <div className="empty-state">Loading goals...</div>;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Savings Goals</h1>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>New Goal</h2>
        <form className="row" onSubmit={handleCreate}>
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Goal name (e.g. Emergency Fund)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" style={{ maxWidth: 160 }} type="number" min="1" placeholder="Target amount" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          <input aria-label="Target date" className="input" style={{ maxWidth: 160 }} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <button type="submit" className="btn">Create goal</button>
        </form>
        {formError && <span className="field-error">{formError}</span>}
      </section>

      {goals.length === 0 ? (
        <div className="card empty-state">No savings goals yet.</div>
      ) : (
        <div className="grid-2">
          {goals.map((g) => (
            <div key={g._id} className="card stack">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{g.name}</strong>
                  {g.targetDate && <div className="text-muted">Target date: {g.targetDate.slice(0, 10)}</div>}
                </div>
                <button type="button" className="btn btn-secondary btn-sm" aria-label={`Delete ${g.name}`} onClick={() => handleDelete(g._id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="num">{formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}</span>
                <strong className="num">{g.progress}%</strong>
              </div>
              <div className="progress-track" role="progressbar" aria-valuenow={g.progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${g.progress}%` }} />
              </div>
              <div className="row">
                <input
                  aria-label={`Add money to ${g.name}`}
                  className="input"
                  style={{ flex: 1 }}
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Amount to add"
                  value={deposits[g._id] || ''}
                  onChange={(e) => setDeposits((d) => ({ ...d, [g._id]: e.target.value }))}
                />
                <button type="button" className="btn btn-secondary" onClick={() => handleContribute(g._id)}>
                  Add money
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
