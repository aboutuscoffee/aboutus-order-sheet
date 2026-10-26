export default function LocationCard({ title, items, supplierNames, onQtyChange, onCheckToggle }) {
  return (
    <div className="osf-supplier-card">
      <div className="osf-supplier-head">
        <div className="osf-supplier-name">{title}</div>
        <div className="osf-supplier-note">{items.length}品目</div>
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
          {items.map((it) => (
            <tr key={it.id}>
              <td>
                <div className="osf-item-name">{it.name}</div>
                <div className="osf-item-price">
                  {supplierNames[it.supplier_id]}
                  {it.unit ? ` / ${it.unit}` : ''}
                </div>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
