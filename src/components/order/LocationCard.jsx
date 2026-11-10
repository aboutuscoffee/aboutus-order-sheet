import { isBelowReorderPoint, currentReorderPoint } from '../../lib/format';
import { GroupedRows } from './ItemGroups';
import LocationEditor from './LocationEditor';

export default function LocationCard({
  cardId,
  title,
  items,
  supplierNames,
  locations,
  season,
  onQtyChange,
  onCheckToggle,
  onChangeLocation,
}) {
  const belowCount = items.filter((it) => isBelowReorderPoint(it, season)).length;

  const renderRow = (it) => (
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
        {it.item_note && <div className="osf-item-memo">{it.item_note}</div>}
        <LocationEditor item={it} locations={locations} onChange={(patch) => onChangeLocation(it.id, patch)} />
      </td>
      <td>
        <input
          className="osf-qty-input"
          type="number"
          min="0"
          value={it.stock_qty}
          onChange={(e) => onQtyChange(it.id, 'stock_qty', e.target.value)}
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
            <th style={{ textAlign: 'right' }}>在庫</th>
            <th style={{ textAlign: 'center' }}>確認</th>
            <th style={{ textAlign: 'right' }}>発注数</th>
          </tr>
        </thead>
        <tbody>
          <GroupedRows items={items} cardId={cardId} season={season} colSpan={4} renderRow={renderRow} />
        </tbody>
      </table>
    </div>
  );
}
