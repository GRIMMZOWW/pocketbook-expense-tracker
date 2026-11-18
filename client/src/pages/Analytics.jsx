import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import api from '../api/client';
import { formatMoney } from '../utils/currency';
import { formatDate, formatPeriod } from '../utils/date';

const RANGES = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '3months', label: '3 Months' },
  { key: 'year', label: 'Year' },
];

const COLORS = ['#134E4A', '#D97706', '#2563EB', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#475569'];

export default function Analytics() {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get('/analytics', { params: { range } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load analytics.'))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Analytics</h1>
        <div className="row" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`btn btn-sm ${range === r.key ? '' : 'btn-secondary'}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="empty-state">Loading analytics...</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && !error && data && (
        <>
          <section className="grid-stats">
            <div className="card">
              <div className="text-muted">Income</div>
              <div className="num text-income" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: '4px' }}>
                {formatMoney(data.income)}
              </div>
            </div>
            <div className="card">
              <div className="text-muted">Expenses</div>
              <div className="num text-expense" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: '4px' }}>
                {formatMoney(data.expenses)}
              </div>
            </div>
            <div className="card">
              <div className="text-muted">Net Savings</div>
              <div className="num" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: '4px' }}>
                {formatMoney(data.netSavings)}
              </div>
            </div>
            <div className="card">
              <div className="text-muted">Period</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '8px' }}>
                {formatPeriod(data.from, data.to)}
              </div>
            </div>
          </section>

          <div className="grid-2">
            <section className="card stack">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Spending by Category</h2>
              {data.categories.length === 0 ? (
                <div className="empty-state">No expenses in this period.</div>
              ) : (
                <>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categories}
                          dataKey="total"
                          nameKey="category"
                          innerRadius={55}
                          outerRadius={88}
                        >
                          {data.categories.map((c, i) => (
                            <Cell key={c.category} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => formatMoney(val)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="stack" style={{ gap: '6px' }}>
                    {data.categories.map((c, i) => (
                      <div key={c.category} className="row" style={{ justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                        <span className="row" style={{ gap: '8px' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                          {c.category}
                        </span>
                        <span className="num">{formatMoney(c.total)} ({c.percent}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="card stack">
              <h2 style={{ fontSize: 'var(--text-lg)' }}>Spending Trend</h2>
              {data.trend.every((t) => t.income === 0 && t.expenses === 0) ? (
                <div className="empty-state">No transactions in this period.</div>
              ) : (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trend}>
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip
                        formatter={(val) => formatMoney(val)}
                        labelFormatter={(l) => (String(l).length === 10 ? formatDate(l) : l)}
                      />
                      <Bar dataKey="income" name="Income" fill="#15693B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#B91C1C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
