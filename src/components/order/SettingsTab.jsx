import { useState } from 'react';
import LocationEditor from './LocationEditor';

function numOrNull(v) {
  return v === '' ? null : Number(v);
}

function SupplierRow({ supplier, onSave, onDelete }) {
  const [name, setName] = useState(supplier.name);
  const [threshold, setThreshold] = useState(supplier.free_shipping_threshold ?? '');
  const [note, setNote] = useState(supplier.note ?? '');

  const commit = () => {
    const next = {
      ...supplier,
      name,
      free_shipping_threshold: threshold === '' ? null : Number(threshold),
      note,
    };
    if (
      next.name !== supplier.name ||
      next.free_shipping_threshold !== supplier.free_shipping_threshold ||
      next.note !== (supplier.note ?? '')
    ) {
      onSave(next);
    }
  };

  return (
    <div className="osf-settings-item">
      <div className="osf-settings-item-top">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} style={{ fontWeight: 600 }} />
        <button className="osf-mini-btn osf-danger" onClick={() => onDelete(supplier.id)}>
          削除
        </button>
      </div>
      <div className="osf-form-row">
        <label>送料無料ライン</label>
        <input type="number" min="0" placeholder="未設定" value={threshold} onChange={(e) => setThreshold(e.target.value)} onBlur={commit} />
      </div>
      <div className="osf-form-row">
        <label>メモ</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} onBlur={commit} />
      </div>
    </div>
  );
}

function LocationRow({ location, onSave, onDelete }) {
  const [name, setName] = useState(location.name);

  const commit = () => {
    if (name.trim() && name !== location.name) onSave({ ...location, name: name.trim() });
  };

  return (
    <div className="osf-settings-item">
      <div className="osf-settings-item-top">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} style={{ fontWeight: 600 }} />
        <button className="osf-mini-btn osf-danger" onClick={() => onDelete(location.id)}>
          削除
        </button>
      </div>
    </div>
  );
}

function AddLocationBox({ onAdd, nextOrder }) {
  const [name, setName] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), sort_order: nextOrder });
    setName('');
  };

  return (
    <div className="osf-add-box">
      <div className="osf-form-row">
        <label>置き場名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 倉庫・店頭" />
      </div>
      <button className="osf-mini-btn osf-primary" onClick={submit}>
        + 置き場を追加
      </button>
    </div>
  );
}

function LocationSelect({ locations, value, onChange }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">未設定</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

function ItemRow({ item, suppliers, locations, onSave, onDelete }) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit ?? '');
  const [unitPrice, setUnitPrice] = useState(item.unit_price);
  const [supplierId, setSupplierId] = useState(item.supplier_id);
  const [locationId, setLocationId] = useState(item.location_id ?? null);
  const [reorderPoint, setReorderPoint] = useState(item.reorder_point ?? '');
  const [reorderBusy, setReorderBusy] = useState(item.reorder_point_busy ?? '');
  const [stockUnit, setStockUnit] = useState(item.stock_unit ?? '');
  const [orderUnit, setOrderUnit] = useState(item.order_unit ?? '');
  const [itemNote, setItemNote] = useState(item.item_note ?? '');
  const [itemGroup, setItemGroup] = useState(item.item_group ?? '');

  const commit = (overrides = {}) => {
    const next = {
      ...item,
      name,
      unit,
      unit_price: Number(unitPrice) || 0,
      reorder_point: numOrNull(reorderPoint),
      reorder_point_busy: numOrNull(reorderBusy),
      supplier_id: supplierId,
      location_id: locationId,
      stock_unit: stockUnit.trim() || null,
      order_unit: orderUnit.trim() || null,
      item_note: itemNote.trim() || null,
      item_group: itemGroup.trim() || null,
      ...overrides,
    };
    onSave(next);
  };

  return (
    <div className="osf-settings-item">
      <div className="osf-settings-item-top">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => commit()} style={{ fontWeight: 600 }} />
        <button className="osf-mini-btn osf-danger" onClick={() => onDelete(item.id)}>
          削除
        </button>
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>荷姿</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} onBlur={() => commit()} placeholder="12本入・1kg など" />
        </div>
        <div className="osf-form-row">
          <label>単価</label>
          <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} onBlur={() => commit()} />
        </div>
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>目安(閑散)</label>
          <input
            type="number"
            min="0"
            placeholder="未設定"
            value={reorderPoint}
            onChange={(e) => setReorderPoint(e.target.value)}
            onBlur={() => commit()}
          />
        </div>
        <div className="osf-form-row">
          <label>目安(繁忙)</label>
          <input
            type="number"
            min="0"
            placeholder="未設定"
            value={reorderBusy}
            onChange={(e) => setReorderBusy(e.target.value)}
            onBlur={() => commit()}
          />
        </div>
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>在庫の単位</label>
          <input value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} onBlur={() => commit()} placeholder="本・袋 など" />
        </div>
        <div className="osf-form-row">
          <label>発注の単位</label>
          <input value={orderUnit} onChange={(e) => setOrderUnit(e.target.value)} onBlur={() => commit()} placeholder="箱・袋 など" />
        </div>
      </div>
      <div className="osf-form-row">
        <label>メモ</label>
        <input value={itemNote} onChange={(e) => setItemNote(e.target.value)} onBlur={() => commit()} placeholder="発注の条件・注意点など" />
      </div>
      <div className="osf-form-row">
        <label>グループ</label>
        <input value={itemGroup} onChange={(e) => setItemGroup(e.target.value)} onBlur={() => commit()} placeholder="折りたたみでまとめる名前（例: トナー）" />
      </div>
      <div className="osf-form-row">
        <label>発注先</label>
        <select
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value);
            commit({ supplier_id: e.target.value });
          }}
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="osf-form-row">
        <label>置き場</label>
        <LocationEditor
          item={{ ...item, location_id: locationId }}
          locations={locations}
          onChange={(patch) => {
            if ('location_id' in patch) setLocationId(patch.location_id);
            commit(patch);
          }}
        />
      </div>
    </div>
  );
}

function AddSupplierBox({ onAdd }) {
  const [name, setName] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), free_shipping_threshold: null, note: '', sort_order: 0 });
    setName('');
  };

  return (
    <div className="osf-add-box">
      <div className="osf-form-row">
        <label>発注先名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ○○商事" />
      </div>
      <button className="osf-mini-btn osf-primary" onClick={submit}>
        + 発注先を追加
      </button>
    </div>
  );
}

function AddItemBox({ suppliers, locations, onAdd }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [locationId, setLocationId] = useState(null);
  const [reorderPoint, setReorderPoint] = useState('');
  const [reorderBusy, setReorderBusy] = useState('');
  const [stockUnit, setStockUnit] = useState('');
  const [orderUnit, setOrderUnit] = useState('');

  const submit = () => {
    if (!name.trim() || !supplierId) return;
    onAdd({
      name: name.trim(),
      unit,
      unit_price: Number(unitPrice) || 0,
      reorder_point: numOrNull(reorderPoint),
      reorder_point_busy: numOrNull(reorderBusy),
      stock_unit: stockUnit.trim() || null,
      order_unit: orderUnit.trim() || null,
      supplier_id: supplierId,
      location_id: locationId,
      stock_qty: 0,
      order_qty: 0,
      sort_order: 0,
      active: true,
    });
    setName('');
    setUnit('');
    setUnitPrice('');
    setReorderPoint('');
    setReorderBusy('');
    setStockUnit('');
    setOrderUnit('');
  };

  if (suppliers.length === 0) {
    return <div className="osf-empty">先に発注先を登録してください。</div>;
  }

  return (
    <div className="osf-add-box">
      <div className="osf-form-row">
        <label>商品名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: コーヒー豆用袋" />
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>荷姿</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="12本入・1kg など" />
        </div>
        <div className="osf-form-row">
          <label>単価</label>
          <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>目安(閑散)</label>
          <input type="number" min="0" placeholder="未設定" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
        </div>
        <div className="osf-form-row">
          <label>目安(繁忙)</label>
          <input type="number" min="0" placeholder="未設定" value={reorderBusy} onChange={(e) => setReorderBusy(e.target.value)} />
        </div>
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>在庫の単位</label>
          <input value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} placeholder="本・袋 など" />
        </div>
        <div className="osf-form-row">
          <label>発注の単位</label>
          <input value={orderUnit} onChange={(e) => setOrderUnit(e.target.value)} placeholder="箱・袋 など" />
        </div>
      </div>
      <div className="osf-form-row">
        <label>発注先</label>
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="osf-form-row">
        <label>置き場</label>
        <LocationSelect locations={locations} value={locationId} onChange={setLocationId} />
      </div>
      <button className="osf-mini-btn osf-primary" onClick={submit}>
        + 商品を追加
      </button>
    </div>
  );
}

export default function SettingsTab({
  suppliers,
  items,
  locations,
  onSaveSupplier,
  onDeleteSupplier,
  onSaveItem,
  onDeleteItem,
  onSaveLocation,
  onDeleteLocation,
}) {
  return (
    <div>
      <div className="osf-section-title">発注先</div>
      {suppliers.map((s) => (
        <SupplierRow key={s.id} supplier={s} onSave={onSaveSupplier} onDelete={onDeleteSupplier} />
      ))}
      <AddSupplierBox onAdd={onSaveSupplier} />

      <div className="osf-section-title">置き場</div>
      {locations.map((l) => (
        <LocationRow key={l.id} location={l} onSave={onSaveLocation} onDelete={onDeleteLocation} />
      ))}
      <AddLocationBox onAdd={onSaveLocation} nextOrder={locations.length} />

      <div className="osf-section-title">商品</div>
      {items.map((it) => (
        <ItemRow key={it.id} item={it} suppliers={suppliers} locations={locations} onSave={onSaveItem} onDelete={onDeleteItem} />
      ))}
      <AddItemBox suppliers={suppliers} locations={locations} onAdd={onSaveItem} />
    </div>
  );
}
