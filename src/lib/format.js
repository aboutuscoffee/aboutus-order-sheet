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
  // まだ数えていない（空欄）ものは判定しない
  return point != null && item.stock_qty != null && item.stock_qty < point;
}

// 出数 = 前回の在庫 + 前回の発注数 − 今回の在庫（前回の在庫か今回の在庫がないときは null）
export function usageOf(item) {
  if (item.stock_qty == null || item.prev_stock == null) return null;
  // 発注は「発注の単位」、在庫は「在庫の単位」なので、入数（1発注で届く数）をかけて在庫の単位にそろえる
  const pack = item.order_pack_qty > 0 ? Number(item.order_pack_qty) : 1;
  return Math.round((item.prev_stock + (item.prev_order || 0) * pack - item.stock_qty) * 1000) / 1000;
}

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function checkDaysLabel(days) {
  return (days ?? []).slice().sort((a, b) => a - b).map((d) => WEEKDAYS[d]).join('・');
}

const fmtNum = (n) => (Math.round(n * 1000) / 1000).toLocaleString('ja-JP');

// 発注 n 回で届く量の表記。届く実数（例: 8,000枚）と、在庫の単位（例: 8箱）の両方を出す
//  例: 「8,000枚（8箱）」。どちらか片方だけ設定されていれば、そのほうだけ出す
export function arrivalLabel(item, n = 1) {
  const arr = item.arrival_qty > 0 ? `${fmtNum(item.arrival_qty * n)}${item.arrival_unit ?? ''}` : null;
  const pack = item.order_pack_qty > 0 ? `${fmtNum(item.order_pack_qty * n)}${item.stock_unit ?? ''}` : null;
  if (arr && pack) return arr === pack ? arr : `${arr}（${pack}）`;
  return arr ?? pack;
}

// 在庫（管理の単位）が、実数でどれくらいか。例: 0.6袋 → 約60枚（1発注＝1袋＝100枚のとき）
export function stockApprox(item) {
  if (!(item.arrival_qty > 0) || !(item.order_pack_qty > 0) || !(item.stock_qty > 0) || !item.arrival_unit) return null;
  return `${fmtNum((item.stock_qty * item.arrival_qty) / item.order_pack_qty)}${item.arrival_unit}`;
}
