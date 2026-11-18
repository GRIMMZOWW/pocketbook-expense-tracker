import { Paperclip, Pencil, Trash2 } from 'lucide-react';
import api from '../api/client';
import { CategoryIcon } from '../utils/categories';
import { formatMoney } from '../utils/currency';
import { formatDate } from '../utils/date';

export default function TransactionRow({ tx, onEdit, onDelete }) {
  async function openAttachment() {
    const res = await api.get(`/transactions/${tx._id}/attachment`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="tx-row">
      <div className="row" style={{ minWidth: 0, flex: 1 }}>
        <div className="tx-icon">
          <CategoryIcon name={tx.category} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: '8px' }}>
            <strong style={{ fontSize: 'var(--text-sm)' }}>{tx.category}</strong>
            <span className={`badge ${tx.type === 'Income' ? 'badge-income' : 'badge-expense'}`}>
              {tx.type}
            </span>
          </div>
          <div className="text-muted">
            {formatDate(tx.date)} · {tx.account?.name || 'Account'}
            {tx.note ? ` · ${tx.note}` : ''}
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: '8px' }}>
        <span className={`num ${tx.type === 'Income' ? 'text-income' : 'text-expense'}`} style={{ fontWeight: 700 }}>
          {tx.type === 'Income' ? '+' : '-'}{formatMoney(tx.amount)}
        </span>
        {tx.attachment?.name && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            aria-label={`View attachment ${tx.attachment.name}`}
            onClick={openAttachment}
          >
            <Paperclip size={14} />
          </button>
        )}
        {onEdit && (
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Edit transaction" onClick={() => onEdit(tx)}>
            <Pencil size={14} />
          </button>
        )}
        {onDelete && (
          <button type="button" className="btn btn-secondary btn-sm" aria-label="Delete transaction" onClick={() => onDelete(tx._id)}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
