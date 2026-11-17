import { AlertTriangle, Info } from 'lucide-react';
import { formatMoney } from '../utils/currency';

export default function BudgetAlert({ budget }) {
  if (!budget) return null;

  const pct = Math.min(100, budget.percentUsed || 0);
  const alertClass =
    budget.level === 'exceeded' || budget.level === 'danger'
      ? 'alert-error'
      : budget.level === 'warning'
        ? 'alert-warning'
        : 'alert-notice';

  return (
    <div className="stack" style={{ gap: '8px' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="text-muted">
          {budget.category ? `${budget.category} budget` : 'Monthly budget'}
        </span>
        <span className="num" style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
          {formatMoney(budget.spent)} / {formatMoney(budget.amount)} ({budget.percentUsed}%)
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`progress-fill ${budget.level}`} style={{ width: `${pct}%` }} />
      </div>
      {budget.message && (
        <div className={`alert ${alertClass}`} role="status">
          {budget.level === 'notice' ? <Info size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          <span>{budget.message}</span>
        </div>
      )}
    </div>
  );
}
