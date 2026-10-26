export function yen(n) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

export function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
