import { useMemo, useState } from 'react';
import SupplierCard from './SupplierCard';
import LocationCard from './LocationCard';
import PendingDeliveries from './PendingDeliveries';

const VIEW_KEY = 'osf-order-view';

function loadView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'location' ? 'location' : 'supplier';
  } catch {
    return 'supplier';
  }
}

export default function OrderTab({
  suppliers,
  items,
  locations,
  history,
  onQtyChange,
  onCheckToggle,
  onCompleteOrder,
  onToggleDelivered,
}) {
  const [view, setView] = useState(loadView);

  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // 保存できなくても表示の切り替えは動くので無視する
    }
  };

  const pending = useMemo(() => history.filter((h) => !h.all_delivered), [history]);

  const lastOrderBySupplier = useMemo(() => {
    const map = {};
    for (const h of history) {
      if (h.supplier_id && !map[h.supplier_id]) map[h.supplier_id] = h;
    }
    return map;
  }, [history]);

  const supplierNames = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const locationGroups = useMemo(() => {
    const groups = locations.map((l) => ({ id: l.id, title: l.name, items: items.filter((it) => it.location_id === l.id) }));
    const known = new Set(locations.map((l) => l.id));
    groups.push({ id: 'none', title: '置き場未設定', items: items.filter((it) => !known.has(it.location_id)) });
    return groups.filter((g) => g.items.length > 0);
  }, [locations, items]);

  if (suppliers.length === 0) {
    return <div className="osf-empty">発注先が未登録です。「設定」タブから追加してください。</div>;
  }

  return (
    <div>
      <PendingDeliveries entries={pending} onToggleDelivered={onToggleDelivered} />

      <div className="osf-view-toggle">
        <button className={'osf-view-btn' + (view === 'supplier' ? ' active' : '')} onClick={() => changeView('supplier')}>
          発注先別
        </button>
        <button className={'osf-view-btn' + (view === 'location' ? ' active' : '')} onClick={() => changeView('location')}>
          置き場別
        </button>
      </div>

      {view === 'supplier' &&
        suppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            items={items.filter((it) => it.supplier_id === supplier.id)}
            lastOrder={lastOrderBySupplier[supplier.id]}
            onQtyChange={onQtyChange}
            onCheckToggle={onCheckToggle}
            onCompleteOrder={onCompleteOrder}
          />
        ))}

      {view === 'location' &&
        locationGroups.map((group) => (
          <LocationCard
            key={group.id}
            title={group.title}
            items={group.items}
            supplierNames={supplierNames}
            onQtyChange={onQtyChange}
            onCheckToggle={onCheckToggle}
          />
        ))}
    </div>
  );
}
