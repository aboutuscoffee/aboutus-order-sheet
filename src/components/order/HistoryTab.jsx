import { useState } from 'react';

function yen(n) {
  return `¥${Math.round(n).toLocaleString('ja-JP')}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryTab({ history }) {
  const [openId, setOpenId] = useState(null);

  if (history.length === 0) {
    return <div className="osf-empty">発注履歴はまだありません。</div>;
  }

  return (
    <div>
      {history.map((h) => (
        <div key={h.id} className="osf-history-item">
          <div className="osf-history-top" onClick={() => setOpenId(openId === h.id ? null : h.id)}>
            <div>
              <div className="osf-history-supplier">
                {h.supplier_name}
                <span className={'osf-history-badge' + (h.all_delivered ? ' osf-done' : '')}>
                  {h.all_delivered ? '納品済み' : '納品待ち'}
                </span>
              </div>
              <div className="osf-history-date">
                {formatDate(h.ordered_at)}
                {h.ordered_by ? `・発注者: ${h.ordered_by}` : ''}
              </div>
            </div>
            <div className="osf-history-total">{yen(h.total_amount)}</div>
          </div>
          <div className={'osf-history-detail' + (openId === h.id ? ' open' : '')}>
            {h.note && <div className="osf-history-note">{h.note}</div>}
            {h.items.map((it, i) => (
              <div className="osf-history-row" key={i}>
                <span>
                  {it.name} × {it.order_qty}
                  {it.unit || ''}
                  {it.delivered ? '　✓納品済み' : ''}
                </span>
                <span>{yen(it.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
