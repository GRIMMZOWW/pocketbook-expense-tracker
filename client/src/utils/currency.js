export const CURRENCY_SYMBOL = '₹';

export function formatMoney(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return num < 0 ? `-${CURRENCY_SYMBOL}${abs}` : `${CURRENCY_SYMBOL}${abs}`;
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}
