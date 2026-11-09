export function yen(n) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

export function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 発注目安が設定されていて、在庫がそれを下回っているか
export function isBelowReorderPoint(item) {
  return item.reorder_point != null && (item.stock_qty || 0) < item.reorder_point;
}
