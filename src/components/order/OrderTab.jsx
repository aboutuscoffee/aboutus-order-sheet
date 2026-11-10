import { useMemo, useState } from 'react';
import SupplierCard from './SupplierCard';
import LocationCard from './LocationCard';
import PendingDeliveries from './PendingDeliveries';
import { SEASONS } from '../../lib/constants';
import { isBelowReorderPoint } from '../../lib/format';

const VIEW_KEY = 'osf-order-view';
const VIEWS = ['supplier', 'location'];

function loadView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return VIEWS.includes(saved) ? saved : 'supplier';
  } catch {
    return 'supplier';
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
  const [view, setView] = useState(loadView);
  const [onlyBelow, setOnlyBelow] = useState(false);

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

  const belowTotal = useMemo(() => items.filter((it) => isBelowReorderPoint(it, season)).length, [items, season]);

  // 置き場別は金額を出さない表示なので、要発注だけに絞り込んでも合計に影響しない
  const visibleItems = useMemo(
    () => (onlyBelow ? items.filter((it) => isBelowReorderPoint(it, season)) : items),
    [items, onlyBelow, season]
  );

  // 置き場は主＋追加で複数持てる。複数ある商品は、それぞれの置き場のグループに出る
  const locationGroups = useMemo(() => {
    const idsOf = (it) => [it.location_id, ...(it.extra_location_ids ?? [])].filter(Boolean);
    const groups = locations.map((l) => ({ id: l.id, title: l.name, items: visibleItems.filter((it) => idsOf(it).includes(l.id)) }));
    const known = new Set(locations.map((l) => l.id));
    groups.push({ id: 'none', title: '置き場未設定', items: visibleItems.filter((it) => !idsOf(it).some((id) => known.has(id))) });
    return groups.filter((g) => g.items.length > 0);
  }, [locations, visibleItems]);

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

      <div className="osf-views" role="tablist">
        <button className={'osf-view-btn' + (view === 'supplier' ? ' active' : '')} onClick={() => changeView('supplier')}>
          発注先別
        </button>
        <button className={'osf-view-btn' + (view === 'location' ? ' active' : '')} onClick={() => changeView('location')}>
          置き場別
        </button>
      </div>

      {view === 'location' && (
        <label className="osf-only-below">
          <input type="checkbox" className="osf-check-input" checked={onlyBelow} onChange={(e) => setOnlyBelow(e.target.checked)} />
          要発注のものだけ表示
        </label>
      )}

      {view === 'supplier' &&
        suppliers.map((supplier) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            locations={locations}
            items={items.filter((it) => it.supplier_id === supplier.id)}
            lastOrder={lastOrderBySupplier[supplier.id]}
            season={season}
            onQtyChange={onQtyChange}
            onCheckToggle={onCheckToggle}
            onUnitChange={onUnitChange}
            onChangeLocation={onChangeLocation}
            onCompleteOrder={onCompleteOrder}
            onRequestOrder={onRequestOrder}
          />
        ))}

      {view === 'location' &&
        (locationGroups.length === 0 ? (
          <div className="osf-empty">{onlyBelow ? '要発注のものはありません。' : '商品がありません。'}</div>
        ) : (
          locationGroups.map((group) => (
            <LocationCard
              key={group.id}
              cardId={`location:${group.id}`}
              locationId={group.id !== 'none' ? group.id : undefined}
              suppliers={suppliers}
              title={group.title}
              items={group.items}
              supplierNames={supplierNames}
              locations={locations}
              season={season}
              onQtyChange={onQtyChange}
              onLocationStockChange={onLocationStockChange}
              onCheckToggle={onCheckToggle}
              onUnitChange={onUnitChange}
              onChangeLocation={onChangeLocation}
            />
          ))
        ))}
    </div>
  );
}
