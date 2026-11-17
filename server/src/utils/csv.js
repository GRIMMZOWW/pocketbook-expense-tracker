// Cells that start with = + - @ (or tab / carriage return) can run as formulas in Excel.
// A leading single quote makes the spreadsheet treat them as text.
function safeCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

const HEADER = 'Date,Type,Category,Account,Amount,Note';

function toCsv(transactions) {
  const rows = transactions.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      t.type,
      t.category,
      t.account ? t.account.name : '',
      t.amount.toFixed(2),
      t.note,
    ]
      .map(safeCell)
      .join(',')
  );
  return [HEADER, ...rows].join('\r\n') + '\r\n';
}

module.exports = { toCsv, safeCell };
