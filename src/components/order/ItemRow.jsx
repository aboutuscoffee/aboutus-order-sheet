import { useState } from 'react';
import { yen, isBelowReorderPoint, currentReorderPoint, usageOf } from '../../lib/format';
import { isMultiLocation, stocksByLocation } from '../../lib/stocks';
import NumInput from './NumInput';
import UnitPicker from './UnitPicker';
import LocationEditor from './LocationEditor';

// 商品1行（デザイン案A5）。発注先別・置き場別の両方でこの同じ見た目を使う。
//  上段: 商品名・要発注バッジ・補足（価格/荷姿/目安）・確認チェック。名前をタップすると、メモ・置き場の編集が開く
//  下段: 「在庫 | 発注」の左右2つ。数字は直接入力、単位は在庫・発注それぞれに選べる
// mode='supplier'（発注先別）: 置き場が複数ある商品の在庫は合計の表示のみ
// mode='location'（置き場別）: locationId の置き場の在庫を入力する
export default function ItemRow({
  item,
  mode,
  locationId,
  locations,
  season,
  onQtyChange,
  onLocationStockChange,
  onCheckToggle,
  onUnitChange,
  onChangeLocation,
}) {
  const [open, setOpen] = useState(false);
  const below = isBelowReorderPoint(item, season);
  const aim = currentReorderPoint(item, season);
  const multi = isMultiLocation(item);
  const perLocation = multi && mode === 'location' && locationId ? stocksByLocation(item) : null;
  const stockValue = perLocation ? (item.stock_qty == null ? null : perLocation[locationId] ?? 0) : item.stock_qty;
  const usage = usageOf(item);
  // 入れた発注数が最低発注数に届いていないとき知らせる（入力は止めない）
  const underMin = item.min_order_qty != null && (item.order_qty || 0) > 0 && item.order_qty < item.min_order_qty;
  const stockLocked = multi && !perLocation;
  const locationNames = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  const sub = [
    item.unit_price > 0 ? yen(item.unit_price) : null,
    item.unit,
    aim != null ? `目安 ${aim}` : null,
    item.min_order_qty != null ? `最低 ${item.min_order_qty}${item.order_unit ?? ''}` : null,
  ]
    .filter(Boolean)
    .join(' ・ ');

  return (
    <div className={'osf-ir' + (below ? ' low' : '')}>
      <div className="osf-ir-top">
        <div className="osf-ir-main" onClick={() => setOpen((o) => !o)}>
          <div className="osf-ir-name">
            <span className="osf-ir-nm">{item.name}</span>
            {below && <span className="osf-reorder-badge">要発注</span>}
            {usage != null && (
              <span className="osf-usage" title={`前回の在庫 ${item.prev_stock} + 発注 ${item.prev_order || 0} − 今回の在庫 ${item.stock_qty}`}>
                出数 {usage}
              </span>
            )}
            <span className="osf-ir-caret">{open ? '▴' : '▾'}</span>
          </div>
          <div className="osf-ir-sub">{sub}</div>
        </div>
        <input
          className="osf-check-input"
          type="checkbox"
          aria-label={`${item.name}の在庫を確認した`}
          checked={!!item.stock_checked}
          onChange={(e) => onCheckToggle(item.id, e.target.checked)}
        />
      </div>

      <div className="osf-ir-split">
        <div className="osf-ir-half">
          <small>在庫</small>
          <NumInput
            value={stockValue}
            placeholder="未入力"
            ariaLabel={`${item.name}の在庫`}
            disabled={stockLocked}
            title={stockLocked ? '置き場が複数あるので、置き場別の表示で置き場ごとに入力します（これは合計）' : undefined}
            onCommit={(t) => (perLocation ? onLocationStockChange(item.id, locationId, t) : onQtyChange(item.id, 'stock_qty', t))}
          />
          <UnitPicker label="在庫" value={item.stock_unit} onChange={(u) => onUnitChange(item.id, 'stock_unit', u)} />
        </div>
        <div className={'osf-ir-half' + (underMin ? ' under' : '')}>
          <small>発注</small>
          <NumInput value={item.order_qty} ariaLabel={`${item.name}の発注数`} onCommit={(t) => onQtyChange(item.id, 'order_qty', t)} />
          {/* 発注の単位は固定（設定タブで決める）。最低ロットをわかりやすくするため、行では変えられない */}
          <span className="osf-unit-fixed" title="発注の単位（設定タブで変更）">{item.order_unit || '—'}</span>
        </div>
      </div>

      {underMin && (
        <div className="osf-lot-warn">最低発注数は {item.min_order_qty}{item.order_unit ?? ''} です</div>
      )}

      {open && (
        <div className="osf-ir-more">
          {multi && (
            <div className="osf-stock-breakdown">
              合計 {item.stock_qty ?? '未入力'}（
              {Object.entries(stocksByLocation(item))
                .map(([id, qty]) => `${locationNames[id] ?? '?'} ${qty}`)
                .join(' / ')}
              ）
            </div>
          )}
          {item.prev_stock != null && (
            <div className="osf-stock-breakdown">
              前回 在庫 {item.prev_stock}・発注 {item.prev_order || 0}
              {usage != null ? ` → 出数 ${usage}` : '（今回の在庫を入れると出数が出ます）'}
            </div>
          )}
          {item.item_note && <div className="osf-item-memo">{item.item_note}</div>}
          <LocationEditor item={item} locations={locations} onChange={(patch) => onChangeLocation(item.id, patch)} />
        </div>
      )}
    </div>
  );
}
