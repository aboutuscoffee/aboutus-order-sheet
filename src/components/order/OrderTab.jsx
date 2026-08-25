import SupplierCard from './SupplierCard';

export default function OrderTab({ suppliers, items, onQtyChange, onCompleteOrder }) {
  if (suppliers.length === 0) {
    return <div className="osf-empty">発注先が未登録です。「設定」タブから追加してください。</div>;
  }

  return (
    <div>
      {suppliers.map((supplier) => (
        <SupplierCard
          key={supplier.id}
          supplier={supplier}
          items={items.filter((it) => it.supplier_id === supplier.id)}
          onQtyChange={onQtyChange}
          onCompleteOrder={onCompleteOrder}
        />
      ))}
    </div>
  );
}
