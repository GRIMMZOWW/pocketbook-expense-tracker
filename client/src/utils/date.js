const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value) {
  if (!value) return '';
  const iso = String(value).slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatPeriod(fromIso, toIso) {
  if (!fromIso || !toIso) return '';
  const [fy, fm, fd] = fromIso.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toIso.slice(0, 10).split('-').map(Number);
  const start = fy === ty ? `${fd} ${MONTHS[fm - 1]}` : `${fd} ${MONTHS[fm - 1]} ${fy}`;
  const end = `${td} ${MONTHS[tm - 1]} ${ty}`;
  return `${start} to ${end}`;
}
