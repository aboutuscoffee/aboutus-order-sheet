export function yen(n) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

export function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// 今の季節（off=閑散期 / busy=繁忙期）に合う発注目安。繁忙期の値が空なら閑散期の値を使う
export function currentReorderPoint(item, season) {
  if (season === 'busy' && item.reorder_point_busy != null) return item.reorder_point_busy;
  return item.reorder_point;
}

// 発注目安が設定されていて、在庫がそれを下回っているか
export function isBelowReorderPoint(item, season) {
  const point = currentReorderPoint(item, season);
  return point != null && (item.stock_qty || 0) < point;
}
