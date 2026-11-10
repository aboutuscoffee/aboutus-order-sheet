import { useMemo, useState } from 'react';
import SupplierCard from './SupplierCard';
import LocationCard from './LocationCard';
import PendingDeliveries from './PendingDeliveries';
import FolderTabs from './FolderTabs';
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

const SEL_SUPPLIER_KEY = 'osf-selected-supplier';
const SEL_LOCATION_KEY = 'osf-selected-location';

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
  const [view, setView] = useState(loadView);
  const [onlyBelow, setOnlyBelow] = useState(false);
  const [selSupplier, setSelSupplier] = useState(() => loadPref(SEL_SUPPLIER_KEY));
  const [selLocation, setSelLocation] = useState(() => loadPref(SEL_LOCATION_KEY));

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

  const countsOf = (list) => ({
    below: list.filter((it) => isBelowReorderPoint(it, season)).length,
    ordering: list.filter((it) => (it.order_qty || 0) > 0).length,
  });

  const supplierTabs = suppliers.map((s) => ({ id: s.id, label: s.name, ...countsOf(items.filter((it) => it.supplier_id === s.id)) }));
  const locationTabs = locationGroups.map((g) => ({ id: g.id, label: g.title, ...countsOf(g.items) }));

  // 選んでいるものが見つからない（削除された・絞り込みで空になった）ときは、先頭を表示する
  const activeSupplier = suppliers.find((s) => s.id === selSupplier) ?? suppliers[0];
  const activeGroup = locationGroups.find((g) => g.id === selLocation) ?? locationGroups[0];

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

      {view === 'supplier' && (
        <>
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
            onCheckToggle={onCheckToggle}
            onUnitChange={onUnitChange}
            onChangeLocation={onChangeLocation}
            onCompleteOrder={onCompleteOrder}
            onRequestOrder={onRequestOrder}
          />
        </>
      )}

      {view === 'location' &&
        (locationGroups.length === 0 ? (
          <div className="osf-empty">{onlyBelow ? '要発注のものはありません。' : '商品がありません。'}</div>
        ) : (
          <>
            <FolderTabs
              ariaLabel="置き場"
              tabs={locationTabs}
              activeId={activeGroup.id}
              onSelect={(id) => {
                setSelLocation(id);
                savePref(SEL_LOCATION_KEY, id);
              }}
            />
            <LocationCard
              key={activeGroup.id}
              cardId={`location:${activeGroup.id}`}
              locationId={activeGroup.id !== 'none' ? activeGroup.id : undefined}
              suppliers={suppliers}
              title={activeGroup.title}
              items={activeGroup.items}
              supplierNames={supplierNames}
              locations={locations}
              season={season}
              onQtyChange={onQtyChange}
              onLocationStockChange={onLocationStockChange}
              onCheckToggle={onCheckToggle}
              onUnitChange={onUnitChange}
              onChangeLocation={onChangeLocation}
            />
          </>
        ))}
    </div>
  );
}
