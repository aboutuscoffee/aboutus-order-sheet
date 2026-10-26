import { formatShortDate } from '../../lib/format';

export default function PendingDeliveries({ entries, onToggleDelivered }) {
  if (entries.length === 0) return null;

  return (
    <div className="osf-pending">
      <div className="osf-section-title">納品待ち</div>
      {entries.map((entry) => (
        <div key={entry.id} className="osf-pending-card">
          <div className="osf-pending-head">
            <span className="osf-pending-supplier">{entry.supplier_name}</span>
            <span className="osf-pending-date">{formatShortDate(entry.ordered_at)} 発注</span>
          </div>
          {entry.note && <div className="osf-pending-note">{entry.note}</div>}
          {entry.items.map((it, i) => (
            <label key={i} className={'osf-pending-row' + (it.delivered ? ' osf-done' : '')}>
              <input
                type="checkbox"
                className="osf-check-input"
                checked={!!it.delivered}
                onChange={(e) => onToggleDelivered(entry, i, e.target.checked)}
              />
              <span className="osf-pending-item">
                {it.name} × {it.order_qty}
                {it.unit || ''}
              </span>
              <span className="osf-pending-state">{it.delivered ? '納品済み' : '未納品'}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
