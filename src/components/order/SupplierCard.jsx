import { useMemo, useState } from 'react';
import { yen, formatShortDate, isBelowReorderPoint } from '../../lib/format';
import RequestDialog from './RequestDialog';
import ItemRow from './ItemRow';
import { GroupedRows, GroupHeader, useCollapsedSections } from './ItemGroups';
import { idsOf } from '../../lib/stocks';

// 発注先ごとのカード。商品行の下に「合計・送料無料ライン・お願い・発注済み」のバーがつく
// （カードが画面に見えている間は、バーは下のタブの上に固定される）
export default function SupplierCard({
  supplier,
  locations,
  items,
  lastOrder,
  season,
  onQtyChange,
  onLocationStockChange,
  onCheckToggle,
  onUnitChange,
  onChangeLocation,
  onCompleteOrder,
  onRequestOrder,
}) {
  const [requesting, setRequesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { subtotal, hasOrder, belowCount } = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + it.unit_price * (it.order_qty || 0), 0);
    const hasOrder = items.some((it) => (it.order_qty || 0) > 0);
    const belowCount = items.filter((it) => isBelowReorderPoint(it, season)).length;
    return { subtotal, hasOrder, belowCount };
  }, [items, season]);

  const threshold = supplier.free_shipping_threshold;
  const reached = threshold != null && subtotal >= threshold;
  const pct = threshold != null ? Math.min(100, (subtotal / threshold) * 100) : 0;

  const complete = async () => {
    setSaving(true);
    try {
      await onCompleteOrder(supplier, items);
    } finally {
      setSaving(false);
    }
  };

  // 置き場ごとにまとめる。置き場が複数ある商品は、それぞれの置き場に出る（在庫は置き場ごとに入力）
  const [collapsed, toggleSection] = useCollapsedSections();
  const sections = useMemo(() => {
    const known = new Set(locations.map((l) => l.id));
    const list = locations.map((l) => ({ id: l.id, name: l.name, locationId: l.id, items: items.filter((it) => idsOf(it).includes(l.id)) }));
    list.push({ id: 'none', name: '置き場未設定', locationId: undefined, items: items.filter((it) => !idsOf(it).some((id) => known.has(id))) });
    return list.filter((s) => s.items.length > 0);
  }, [locations, items]);

  const renderRowIn = (locationId) => (it) => (
    <ItemRow
      key={it.id}
      item={it}
      mode="location"
      locationId={locationId}
      locations={locations}
      season={season}
      onQtyChange={onQtyChange}
      onLocationStockChange={onLocationStockChange}
      onCheckToggle={onCheckToggle}
      onUnitChange={onUnitChange}
      onChangeLocation={onChangeLocation}
    />
  );

  return (
    <section className="osf-card">
      <div className="osf-card-head">
        <div className="osf-card-headmain">
          <h2 className="osf-card-title">{supplier.name}</h2>
          <div className="osf-card-sub">
            {[supplier.note, threshold != null ? `送料無料 ${yen(threshold)}〜` : null].filter(Boolean).join(' ・ ')}
          </div>
          <div className="osf-card-sub">
            {lastOrder ? `前回発注 ${formatShortDate(lastOrder.ordered_at)}${lastOrder.note ? `　${lastOrder.note}` : ''}` : '前回発注 なし'}
          </div>
        </div>
        {belowCount > 0 && <span className="osf-reorder-badge big">要発注 {belowCount}品</span>}
      </div>

      <div className="osf-rows">
        {sections.map((sec) => {
          const open = !collapsed[`${supplier.id}|${sec.id}`];
          return (
            <div key={sec.id}>
              <GroupHeader group={{ name: sec.name, items: sec.items }} expanded={open} onToggle={() => toggleSection(`${supplier.id}|${sec.id}`)} season={season} />
              {open && (
                <GroupedRows items={sec.items} cardId={`supplier:${supplier.id}|${sec.id}`} season={season} renderRow={renderRowIn(sec.locationId)} />
              )}
            </div>
          );
        })}
      </div>

      <div className="osf-sumbar">
        {threshold != null && (
          <div className="osf-sum-track">
            <div className={'osf-sum-fill' + (reached ? ' reached' : '')} style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="osf-sum-l">
          <small>発注合計</small>
          <b>{yen(subtotal)}</b>
          {threshold != null && (
            <span className={'osf-sum-ship' + (reached ? ' reached' : '')}>{reached ? '送料無料 達成' : `送料無料まで あと ${yen(threshold - subtotal)}`}</span>
          )}
        </div>
        <button type="button" className="osf-btn-sub" disabled={!hasOrder} onClick={() => setRequesting(true)}>
          お願い
        </button>
        <button type="button" className="osf-btn-main" disabled={!hasOrder || saving} onClick={complete}>
          発注済み
        </button>
      </div>

      {requesting && (
        <RequestDialog
          supplier={supplier}
          onSend={(fromStaff, toStaff, note) => onRequestOrder({ supplier, items, note, fromStaff, toStaff })}
          onClose={() => setRequesting(false)}
        />
      )}
    </section>
  );
}
