import { isBelowReorderPoint, currentReorderPoint } from '../../lib/format';
import { isMultiLocation, stocksByLocation } from '../../lib/stocks';
import { GroupedRows } from './ItemGroups';
import LocationEditor from './LocationEditor';

// locationId を渡すと「その置き場の在庫」を入力する（置き場別の表示）。渡さないとき（カテゴリ別）は、複数の置き場がある商品は合計を表示のみ
// suppliers を渡すと、置き場の中をさらに発注先ごとに小見出しで分ける
export default function LocationCard({
  cardId,
  locationId,
  title,
  items,
  suppliers,
  supplierNames,
  locations,
  season,
  onQtyChange,
  onLocationStockChange,
  onCheckToggle,
  onChangeLocation,
}) {
  const belowCount = items.filter((it) => isBelowReorderPoint(it, season)).length;
  const locationNames = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  const renderRow = (it) => {
    const multi = isMultiLocation(it);
    const perLocation = multi && locationId ? stocksByLocation(it) : null;
    const stockValue = perLocation ? perLocation[locationId] ?? 0 : it.stock_qty;
    return (
      <tr key={it.id}>
        <td>
          <div className="osf-item-name">
            {it.name}
            {isBelowReorderPoint(it, season) && <span className="osf-reorder-badge">要発注</span>}
          </div>
          <div className="osf-item-price">
            {supplierNames[it.supplier_id]}
            {it.unit ? ` / ${it.unit}` : ''}
            {currentReorderPoint(it, season) != null ? `・目安 ${currentReorderPoint(it, season)}` : ''}
          </div>
          {multi && (
            <div className="osf-stock-breakdown">
              合計 {it.stock_qty}（
              {Object.entries(stocksByLocation(it))
                .map(([id, qty]) => `${locationNames[id] ?? '?'} ${qty}`)
                .join(' / ')}
              ）
            </div>
          )}
          {it.item_note && <div className="osf-item-memo">{it.item_note}</div>}
          <LocationEditor item={it} locations={locations} onChange={(patch) => onChangeLocation(it.id, patch)} />
        </td>
        <td>
          <input
            className="osf-qty-input"
            type="number"
            min="0"
            value={stockValue}
            disabled={multi && !locationId}
            title={multi && !locationId ? '置き場別の表示で、置き場ごとに入力してください' : undefined}
            onChange={(e) =>
              perLocation ? onLocationStockChange(it.id, locationId, e.target.value) : onQtyChange(it.id, 'stock_qty', e.target.value)
            }
          />
        </td>
        <td style={{ textAlign: 'center' }}>
          <input
            className="osf-check-input"
            type="checkbox"
            checked={!!it.stock_checked}
            onChange={(e) => onCheckToggle(it.id, e.target.checked)}
          />
        </td>
        <td>
          <input
            className="osf-qty-input"
            type="number"
            min="0"
            value={it.order_qty}
            onChange={(e) => onQtyChange(it.id, 'order_qty', e.target.value)}
          />
        </td>
      </tr>
    );
  };

  // 発注先ごとの小見出し（suppliers の並び順）。発注先が1つだけでも見出しは出す
  const supplierSections = suppliers
    ? suppliers
        .map((s) => ({ supplier: s, items: items.filter((it) => it.supplier_id === s.id) }))
        .filter((sec) => sec.items.length > 0)
    : null;

  return (
    <div className="osf-supplier-card">
      <div className="osf-supplier-head">
        <div className="osf-supplier-name">{title}</div>
        <div className="osf-head-right">
          {belowCount > 0 && <span className="osf-reorder-badge">要発注 {belowCount}品</span>}
          <div className="osf-supplier-note">{items.length}品目</div>
        </div>
      </div>
      <table className="osf-item-table">
        <thead>
          <tr>
            <th>商品</th>
            <th style={{ textAlign: 'right' }}>在庫{locationId ? '（この置き場）' : ''}</th>
            <th style={{ textAlign: 'center' }}>確認</th>
            <th style={{ textAlign: 'right' }}>発注数</th>
          </tr>
        </thead>
        <tbody>
          {supplierSections ? (
            supplierSections.flatMap((sec) => [
              <tr key={`sup-${sec.supplier.id}`} className="osf-supplier-subhead">
                <td colSpan={4}>
                  <span className="osf-subhead-name">{sec.supplier.name}</span>
                  <span className="osf-group-count">{sec.items.length}品</span>
                  {sec.items.some((it) => isBelowReorderPoint(it, season)) && (
                    <span className="osf-reorder-badge">要発注 {sec.items.filter((it) => isBelowReorderPoint(it, season)).length}品</span>
                  )}
                </td>
              </tr>,
              <GroupedRows
                key={`rows-${sec.supplier.id}`}
                items={sec.items}
                cardId={`${cardId}|${sec.supplier.id}`}
                season={season}
                colSpan={4}
                renderRow={renderRow}
              />,
            ])
          ) : (
            <GroupedRows items={items} cardId={cardId} season={season} colSpan={4} renderRow={renderRow} />
          )}
        </tbody>
      </table>
    </div>
  );
}
