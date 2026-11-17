import { useState } from 'react';
import api from '../api/client';

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

export default function TransactionForm({ accounts, categories, initial, onSaved, onCancel }) {
  const isEdit = Boolean(initial?._id);
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState(initial?.type || 'Expense');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [category, setCategory] = useState(initial?.category || '');
  const [account, setAccount] = useState(initial?.account?._id || initial?.account || accounts[0]?._id || '');
  const [note, setNote] = useState(initial?.note || '');
  const [date, setDate] = useState(initial?.date ? initial.date.slice(0, 10) : today);
  const [recurring, setRecurring] = useState(Boolean(initial?.recurring));
  const [frequency, setFrequency] = useState(initial?.frequency || 'Monthly');
  const [file, setFile] = useState(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const typeCategories = categories.filter((c) => c.type === type);
  const selectedCategory = category || typeCategories[0]?.name || '';

  function validate() {
    const next = {};
    if (!amount || Number(amount) <= 0) next.amount = 'Enter an amount greater than 0.';
    if (!selectedCategory) next.category = 'Pick a category.';
    if (!account) next.account = 'Pick an account.';
    if (!date) next.date = 'Pick a date.';
    if (file && file.size > 1024 * 1024) next.attachment = 'Attachment must be 1 MB or smaller.';
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const form = new FormData();
      form.append('amount', String(Number(amount)));
      form.append('type', type);
      form.append('category', selectedCategory);
      form.append('account', account);
      form.append('note', note.trim());
      form.append('date', date);
      form.append('recurring', String(recurring));
      if (recurring) form.append('frequency', frequency);
      if (removeAttachment) form.append('removeAttachment', 'true');
      if (file) form.append('attachment', file);

      if (isEdit) {
        await api.put(`/transactions/${initial._id}`, form);
      } else {
        await api.post('/transactions', form);
      }
      onSaved();
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      setServerError(err.response?.data?.message || 'Could not save transaction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}

      <div className="grid-2">
        <div className="field">
          <label htmlFor="tx-type">Type</label>
          <select
            id="tx-type"
            className="select"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setCategory('');
            }}
          >
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="tx-amount">Amount</label>
          <input
            id="tx-amount"
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount && <span className="field-error">{errors.amount}</span>}
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="tx-category">Category</label>
          <select
            id="tx-category"
            className="select"
            value={selectedCategory}
            onChange={(e) => setCategory(e.target.value)}
          >
            {typeCategories.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </div>

        <div className="field">
          <label htmlFor="tx-account">Account</label>
          <select
            id="tx-account"
            className="select"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
          {errors.account && <span className="field-error">{errors.account}</span>}
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="tx-date">Date</label>
          <input id="tx-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {errors.date && <span className="field-error">{errors.date}</span>}
        </div>

        <div className="field">
          <label htmlFor="tx-note">Note</label>
          <input id="tx-note" className="input" type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="row">
        <label className="row" style={{ gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={recurring}
            disabled={Boolean(initial?.parent)}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <span>Repeat this transaction</span>
        </label>
        {recurring && (
          <select
            aria-label="Frequency"
            className="select"
            style={{ width: 'auto' }}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
      </div>

      <div className="field">
        <label htmlFor="tx-file">Receipt (image or PDF, max 1 MB)</label>
        <input
          id="tx-file"
          className="input"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setRemoveAttachment(false);
          }}
        />
        {isEdit && initial?.attachment?.name && !file && (
          <label className="row" style={{ gap: '6px', fontSize: 'var(--text-xs)' }}>
            <input
              type="checkbox"
              checked={removeAttachment}
              onChange={(e) => setRemoveAttachment(e.target.checked)}
            />
            <span>Remove current file ({initial.attachment.name})</span>
          </label>
        )}
        {errors.attachment && <span className="field-error">{errors.attachment}</span>}
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add transaction'}
        </button>
      </div>
    </form>
  );
}
