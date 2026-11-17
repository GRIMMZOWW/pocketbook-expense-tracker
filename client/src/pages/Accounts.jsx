import { useEffect, useState, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../api/client';
import { formatMoney } from '../utils/currency';

const TYPES = ['Cash', 'Bank Account', 'Credit Card', 'Wallet', 'Savings'];

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState('');
  const [type, setType] = useState('Bank Account');
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Enter an account name.');
      return;
    }
    try {
      if (editId) {
        await api.put(`/accounts/${editId}`, { name: name.trim(), type });
      } else {
        await api.post('/accounts', { name: name.trim(), type });
      }
      setName('');
      setType('Bank Account');
      setEditId(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save account.');
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await api.delete(`/accounts/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete account.');
    }
  }

  if (loading) return <div className="empty-state">Loading accounts...</div>;

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Accounts</h1>
        <div className="card" style={{ padding: '10px 16px' }}>
          <span className="text-muted">Combined Total: </span>
          <strong className="num">{formatMoney(total)}</strong>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <section className="card stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>{editId ? 'Edit Account' : 'Add Account'}</h2>
        <form className="row" onSubmit={handleSubmit}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="acc-name">Name</label>
            <input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Savings" />
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <label htmlFor="acc-type">Type</label>
            <select id="acc-type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="row" style={{ alignSelf: 'flex-end' }}>
            <button type="submit" className="btn">{editId ? 'Save' : 'Add'}</button>
            {editId && (
              <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setName(''); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {formError && <span className="field-error">{formError}</span>}
      </section>

      {accounts.length === 0 ? (
        <div className="card empty-state">No accounts yet.</div>
      ) : (
        <div className="grid-2">
          {accounts.map((a) => (
            <div key={a._id} className="card row" style={{ justifyContent: 'space-between' }}>
              <div>
                <strong>{a.name}</strong>
                <div className="text-muted">{a.type}</div>
              </div>
              <div className="row">
                <span className="num" style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                  {formatMoney(a.balance)}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  aria-label={`Edit ${a.name}`}
                  onClick={() => { setEditId(a._id); setName(a.name); setType(a.type); }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  aria-label={`Delete ${a.name}`}
                  onClick={() => handleDelete(a._id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
