import { useMemo, useState } from 'react';
import SupplierCard from './SupplierCard';
import LocationCard from './LocationCard';
import PendingDeliveries from './PendingDeliveries';
import SheetImportDialog from './SheetImportDialog';
import { CATEGORIES, SEASONS, UNCATEGORIZED } from '../../lib/constants';
import { formatShortDate } from '../../lib/format';
import { isBelowReorderPoint } from '../../lib/format';

const VIEW_KEY = 'osf-order-view';
const VIEWS = ['supplier', 'location', 'category'];

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
  onCompleteOrder,
  onRequestOrder,
  onToggleDelivered,
  sheetSettings,
  onApplySheetImport,
  onChangeLocation,
}) {
  const [view, setView] = useState(loadView);
  const [onlyBelow, setOnlyBelow] = useState(false);
  const [importing, setImporting] = useState(false);

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

  // 置き場別・カテゴリ別は金額を出さない表示なので、要発注だけに絞り込んでも合計に影響しない
  const visibleItems = useMemo(
    () => (onlyBelow ? items.filter((it) => isBelowReorderPoint(it, season)) : items),
    [items, onlyBelow, season]
  );

  const locationGroups = useMemo(() => {
    const groups = locations.map((l) => ({ id: l.id, title: l.name, items: visibleItems.filter((it) => it.location_id === l.id) }));
    const known = new Set(locations.map((l) => l.id));
    groups.push({ id: 'none', title: '置き場未設定', items: visibleItems.filter((it) => !known.has(it.location_id)) });
    return groups.filter((g) => g.items.length > 0);
  }, [locations, visibleItems]);

  const categoryGroups = useMemo(() => {
    const groups = CATEGORIES.map((c) => ({ id: c, title: c, items: visibleItems.filter((it) => it.category === c) }));
    const known = new Set(CATEGORIES);
    groups.push({ id: 'none', title: UNCATEGORIZED, items: visibleItems.filter((it) => !known.has(it.category)) });
    return groups.filter((g) => g.items.length > 0);
  }, [visibleItems]);

  if (suppliers.length === 0) {
    return <div className="osf-empty">発注先が未登録です。「設定」タブから追加してください。</div>;
  }

  const groups = view === 'location' ? locationGroups : categoryGroups;

  return (
    <div>
      <PendingDeliveries entries={pending} onToggleDelivered={onToggleDelivered} />

      <div className="osf-season-row">
        <span className="osf-season-label">発注目安</span>
        <div className="osf-season-toggle">
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

      {sheetSettings.sheet_id && (
        <div className="osf-import-bar">
          <button className="osf-mini-btn" onClick={() => setImporting(true)}>
            シートから在庫を取り込む
          </button>
          <span className="osf-import-last">
            {sheetSettings.sheet_last_import ? `前回: ${formatShortDate(sheetSettings.sheet_last_import)}` : 'まだ取り込んでいません'}
          </span>
        </div>
      )}
      {importing && (
        <SheetImportDialog
          sheetId={sheetSettings.sheet_id}
          items={items}
          supplierNames={supplierNames}
          onApply={onApplySheetImport}
          onClose={() => setImporting(false)}
        />
      )}

      <div className="osf-view-toggle">
        <button className={'osf-view-btn' + (view === 'supplier' ? ' active' : '')} onClick={() => changeView('supplier')}>
          発注先別
        </button>
        <button className={'osf-view-btn' + (view === 'category' ? ' active' : '')} onClick={() => changeView('category')}>
          カテゴリ別
        </button>
        <button className={'osf-view-btn' + (view === 'location' ? ' active' : '')} onClick={() => changeView('location')}>
          置き場別
        </button>
      </div>

      {view !== 'supplier' && (
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
            items={items.filter((it) => it.supplier_id === supplier.id)}
            lastOrder={lastOrderBySupplier[supplier.id]}
            season={season}
            onQtyChange={onQtyChange}
            onCheckToggle={onCheckToggle}
            onCompleteOrder={onCompleteOrder}
            onRequestOrder={onRequestOrder}
          />
        ))}

      {view !== 'supplier' &&
        (groups.length === 0 ? (
          <div className="osf-empty">{onlyBelow ? '要発注のものはありません。' : '商品がありません。'}</div>
        ) : (
          groups.map((group) => (
            <LocationCard
              key={group.id}
              title={group.title}
              items={group.items}
              supplierNames={supplierNames}
              locations={locations}
              season={season}
              onQtyChange={onQtyChange}
              onCheckToggle={onCheckToggle}
              onChangeLocation={onChangeLocation}
            />
          ))
        ))}
    </div>
  );
}
