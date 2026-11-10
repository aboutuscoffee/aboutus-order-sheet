// 置き場ごとの在庫。
// 置き場が1か所の商品は従来どおり stock_qty だけ。2か所以上ある商品は location_stocks（置き場ID→在庫）で
// 置き場ごとに数え、stock_qty はその合計（発注目安・シート取り込みなどはこの合計で判定する）。

export const idsOf = (item) => [item.location_id, ...(item.extra_location_ids ?? [])].filter(Boolean);

export const isMultiLocation = (item) => idsOf(item).length >= 2;

const round = (n) => Math.round(n * 1000) / 1000;

export const sumStocks = (map) => round(Object.values(map).reduce((a, b) => a + b, 0));

// 置き場ごとの在庫（2か所以上ある商品用）。内訳の記録がまだない場合は、主な置き場に合計を置いた状態として扱う
export function stocksByLocation(item) {
  const ids = idsOf(item);
  const saved = item.location_stocks ?? {};
  const hasSaved = ids.some((id) => saved[id] != null);
  const out = {};
  ids.forEach((id, i) => {
    out[id] = hasSaved ? (saved[id] ?? 0) : i === 0 ? item.stock_qty || 0 : 0;
  });
  return out;
}

// 置き場を変えたときの在庫の振り分け。合計は必ず保つ:
//  ・外された置き場の在庫は、新しい主な置き場に合算する
//  ・増えた置き場は0から始める
//  ・置き場が1か所以下になったら内訳はやめ、合計だけを残す
// 置き場が変わっても内訳の扱いに影響がない（前後とも1か所以下）ときは null を返す
export function redistribute(item, patch) {
  const oldIds = idsOf(item);
  const next = { ...item, ...patch };
  const newIds = idsOf(next);
  if (oldIds.length < 2 && newIds.length < 2) return null;

  const oldMap = oldIds.length >= 2 ? stocksByLocation(item) : Object.fromEntries(oldIds.map((id) => [id, item.stock_qty || 0]));
  // 置き場が未設定だった商品の在庫（どの置き場にも属していない分）
  const orphan = oldIds.length === 0 ? item.stock_qty || 0 : 0;
  const total = sumStocks(oldMap) + orphan;

  if (newIds.length < 2) return { location_stocks: {}, stock_qty: round(total) };

  const map = {};
  newIds.forEach((id) => (map[id] = oldMap[id] ?? 0));
  const removed = oldIds.filter((id) => !newIds.includes(id)).reduce((sum, id) => sum + (oldMap[id] ?? 0), 0);
  map[newIds[0]] = round(map[newIds[0]] + removed + orphan);
  return { location_stocks: map, stock_qty: sumStocks(map) };
}
