import { isBelowReorderPoint } from '../../lib/format';
import ItemRow from './ItemRow';
import { GroupedRows } from './ItemGroups';

// 置き場ごとのカード（置き場別の表示）。発注先別と同じ商品行の見た目で、置き場の中は発注先ごとの小見出しで分ける。
// 金額や発注の操作はない（それは発注先別の表示で行う）
export default function LocationCard({
  cardId,
  locationId,
  title,
  items,
  suppliers,
  supplierNames,
  locations,
  season,
  onQtyChange,
  onLocationStockChange,
  onCheckToggle,
  onUnitChange,
  onChangeLocation,
}) {
  const belowCount = items.filter((it) => isBelowReorderPoint(it, season)).length;

  const renderRow = (it) => (
    <ItemRow
      key={it.id}
      item={it}
      mode="location"
      locationId={locationId}
      supplierName={supplierNames[it.supplier_id]}
      locations={locations}
      season={season}
      onQtyChange={onQtyChange}
      onLocationStockChange={onLocationStockChange}
      onCheckToggle={onCheckToggle}
      onUnitChange={onUnitChange}
      onChangeLocation={onChangeLocation}
    />
  );

  const sections = suppliers
    .map((s) => ({ supplier: s, items: items.filter((it) => it.supplier_id === s.id) }))
    .filter((sec) => sec.items.length > 0);

  return (
    <section className="osf-card">
      <div className="osf-card-head">
        <div className="osf-card-headmain">
          <h2 className="osf-card-title">{title}</h2>
          <div className="osf-card-sub">{items.length}品目</div>
        </div>
        {belowCount > 0 && <span className="osf-reorder-badge big">要発注 {belowCount}品</span>}
      </div>
      <div className="osf-rows">
        {sections.map((sec) => {
          const below = sec.items.filter((it) => isBelowReorderPoint(it, season)).length;
          return (
            <div key={sec.supplier.id}>
              <div className="osf-subhead">
                <span className="osf-subhead-name">{sec.supplier.name}</span>
                <span className="osf-group-count">{sec.items.length}品</span>
                {below > 0 && <span className="osf-reorder-badge">要発注 {below}品</span>}
              </div>
              <GroupedRows items={sec.items} cardId={`${cardId}|${sec.supplier.id}`} season={season} renderRow={renderRow} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
