import { useState } from 'react';

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

function ItemRow({ item, suppliers, onSave, onDelete }) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit ?? '');
  const [unitPrice, setUnitPrice] = useState(item.unit_price);
  const [supplierId, setSupplierId] = useState(item.supplier_id);

  const commit = (overrides = {}) => {
    const next = {
      ...item,
      name,
      unit,
      unit_price: Number(unitPrice) || 0,
      supplier_id: supplierId,
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
          <label>単位</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} onBlur={() => commit()} placeholder="袋・kg等" />
        </div>
        <div className="osf-form-row">
          <label>単価</label>
          <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} onBlur={() => commit()} />
        </div>
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

function AddItemBox({ suppliers, onAdd }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');

  const submit = () => {
    if (!name.trim() || !supplierId) return;
    onAdd({
      name: name.trim(),
      unit,
      unit_price: Number(unitPrice) || 0,
      supplier_id: supplierId,
      stock_qty: 0,
      order_qty: 0,
      sort_order: 0,
      active: true,
    });
    setName('');
    setUnit('');
    setUnitPrice('');
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
          <label>単位</label>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="袋・kg等" />
        </div>
        <div className="osf-form-row">
          <label>単価</label>
          <input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
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
      <button className="osf-mini-btn osf-primary" onClick={submit}>
        + 商品を追加
      </button>
    </div>
  );
}

export default function SettingsTab({ suppliers, items, onSaveSupplier, onDeleteSupplier, onSaveItem, onDeleteItem }) {
  return (
    <div>
      <div className="osf-section-title">発注先</div>
      {suppliers.map((s) => (
        <SupplierRow key={s.id} supplier={s} onSave={onSaveSupplier} onDelete={onDeleteSupplier} />
      ))}
      <AddSupplierBox onAdd={onSaveSupplier} />

      <div className="osf-section-title">商品</div>
      {items.map((it) => (
        <ItemRow key={it.id} item={it} suppliers={suppliers} onSave={onSaveItem} onDelete={onDeleteItem} />
      ))}
      <AddItemBox suppliers={suppliers} onAdd={onSaveItem} />
    </div>
  );
}
