import { useMemo, useState } from 'react';
import SupplierCard from './SupplierCard';
import PendingDeliveries from './PendingDeliveries';
import FolderTabs from './FolderTabs';
import { SEASONS } from '../../lib/constants';
import { isBelowReorderPoint } from '../../lib/format';

const SEL_SUPPLIER_KEY = 'osf-selected-supplier';

function loadPref(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 記憶できなくても切り替えは動くので無視する
  }
}

export default function OrderTab({
  suppliers,
  items,
  locations,
  history,
  season,
  onChangeSeason,
  onQtyChange,
  onCheckToggle,
  onUnitChange,
  onCompleteOrder,
  onRequestOrder,
  onToggleDelivered,
  onChangeLocation,
  onLocationStockChange,
}) {
  const [selSupplier, setSelSupplier] = useState(() => loadPref(SEL_SUPPLIER_KEY));

  const pending = useMemo(() => history.filter((h) => !h.all_delivered), [history]);

  const lastOrderBySupplier = useMemo(() => {
    const map = {};
    for (const h of history) {
      if (h.supplier_id && !map[h.supplier_id]) map[h.supplier_id] = h;
    }
    return map;
  }, [history]);

  const belowTotal = useMemo(() => items.filter((it) => isBelowReorderPoint(it, season)).length, [items, season]);

  const countsOf = (list) => ({
    below: list.filter((it) => isBelowReorderPoint(it, season)).length,
    ordering: list.filter((it) => (it.order_qty || 0) > 0).length,
  });

  const supplierTabs = suppliers.map((s) => ({ id: s.id, label: s.name, ...countsOf(items.filter((it) => it.supplier_id === s.id)) }));

  // 選んでいるものが見つからない（削除された・絞り込みで空になった）ときは、先頭を表示する
  const activeSupplier = suppliers.find((s) => s.id === selSupplier) ?? suppliers[0];

  if (suppliers.length === 0) {
    return <div className="osf-empty">発注先が未登録です。「設定」タブから追加してください。</div>;
  }

  return (
    <div>
      <PendingDeliveries entries={pending} onToggleDelivered={onToggleDelivered} />

      <div className="osf-season-row">
        <div className="osf-season-toggle" role="group" aria-label="発注目安の季節">
          {SEASONS.map((s) => (
            <button
              key={s.key}
              className={'osf-season-btn' + (season === s.key ? ' active' : '')}
              onClick={() => season !== s.key && onChangeSeason(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="osf-season-count">{belowTotal > 0 ? `要発注 ${belowTotal}品` : '要発注なし'}</span>
      </div>

      <FolderTabs
        ariaLabel="発注先"
        tabs={supplierTabs}
        activeId={activeSupplier.id}
        onSelect={(id) => {
          setSelSupplier(id);
          savePref(SEL_SUPPLIER_KEY, id);
        }}
      />
      <SupplierCard
        key={activeSupplier.id}
        supplier={activeSupplier}
        locations={locations}
        items={items.filter((it) => it.supplier_id === activeSupplier.id)}
        lastOrder={lastOrderBySupplier[activeSupplier.id]}
        season={season}
        onQtyChange={onQtyChange}
        onLocationStockChange={onLocationStockChange}
        onCheckToggle={onCheckToggle}
        onUnitChange={onUnitChange}
        onChangeLocation={onChangeLocation}
        onCompleteOrder={onCompleteOrder}
        onRequestOrder={onRequestOrder}
      />
    </div>
  );
}
