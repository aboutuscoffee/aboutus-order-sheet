import { useMemo } from 'react';

function yen(n) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

export default function SupplierCard({ supplier, items, onQtyChange, onCheckToggle, onCompleteOrder }) {
  const { subtotal, hasOrder } = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + it.unit_price * (it.order_qty || 0), 0);
    const hasOrder = items.some((it) => (it.order_qty || 0) > 0);
    return { subtotal, hasOrder };
  }, [items]);

  const threshold = supplier.free_shipping_threshold;
  const reached = threshold != null && subtotal >= threshold;
  const pct = threshold != null ? Math.min(100, (subtotal / threshold) * 100) : 0;

  return (
    <div className="osf-supplier-card">
      <div className="osf-supplier-head">
        <div>
          <div className="osf-supplier-name">{supplier.name}</div>
          {supplier.note && <div className="osf-supplier-note">{supplier.note}</div>}
        </div>
        {threshold != null && (
          <div className="osf-supplier-note">送料無料 {yen(threshold)}〜</div>
        )}
      </div>
      <table className="osf-item-table">
        <thead>
          <tr>
            <th>商品</th>
            <th style={{ textAlign: 'right' }}>在庫</th>
            <th style={{ textAlign: 'center' }}>確認</th>
            <th style={{ textAlign: 'right' }}>発注数</th>
            <th style={{ textAlign: 'right' }}>小計</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>
                <div className="osf-item-name">{it.name}</div>
                <div className="osf-item-price">
                  {yen(it.unit_price)}
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
              <td className={'osf-item-subtotal' + (it.order_qty > 0 ? ' osf-has-qty' : '')} style={{ textAlign: 'right' }}>
                {it.order_qty > 0 ? yen(it.unit_price * it.order_qty) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="osf-supplier-foot">
        <div className="osf-foot-row">
          <span>発注合計</span>
          <span className="osf-foot-total">{yen(subtotal)}</span>
        </div>
        {threshold != null && (
          <>
            <div className="osf-progress-track">
              <div className={'osf-progress-fill' + (reached ? ' osf-reached' : '')} style={{ width: `${pct}%` }} />
            </div>
            <div className={'osf-progress-label' + (reached ? ' osf-reached' : '')}>
              {reached ? '送料無料ラインに到達済み' : `送料無料まであと ${yen(threshold - subtotal)}`}
            </div>
          </>
        )}
        <button className="osf-order-btn" disabled={!hasOrder} onClick={() => onCompleteOrder(supplier, items)}>
          発注済みにする
        </button>
      </div>
    </div>
  );
}
