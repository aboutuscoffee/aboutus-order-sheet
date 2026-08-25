import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAll,
  fetchHistory,
  upsertSupplier,
  deleteSupplier,
  upsertItem,
  deleteItem,
  updateItemQty,
  completeOrder,
} from './lib/db';
import OrderTab from './components/order/OrderTab';
import SettingsTab from './components/order/SettingsTab';
import HistoryTab from './components/order/HistoryTab';
import ConfirmDialog from './components/order/ConfirmDialog';

const QTY_SAVE_DELAY = 500;

export default function App() {
  const [suppliers, setSuppliers] = useState(null);
  const [items, setItems] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('order');
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const saveTimers = useRef({});
  const confirmResolver = useRef(null);

  const askConfirm = useCallback((message, okLabel) => {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState({ message, okLabel });
    });
  }, []);

  const resolveConfirm = useCallback((result) => {
    setConfirmState(null);
    confirmResolver.current?.(result);
    confirmResolver.current = null;
  }, []);

  useEffect(() => {
    fetchAll()
      .then(({ suppliers, items }) => {
        setSuppliers(suppliers);
        setItems(items);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && history === null) {
      fetchHistory()
        .then(setHistory)
        .catch((e) => setError(e.message));
    }
  }, [activeTab, history]);

  const showToast = useCallback((text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const onQtyChange = useCallback((itemId, field, value) => {
    const num = value === '' ? 0 : Math.max(0, Number(value));
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, [field]: num } : it)));

    clearTimeout(saveTimers.current[itemId + field]);
    saveTimers.current[itemId + field] = setTimeout(() => {
      updateItemQty(itemId, { [field]: num }).catch((e) => showToast(e.message, true));
    }, QTY_SAVE_DELAY);
  }, [showToast]);

  const onCompleteOrder = useCallback(async (supplier, supplierItems) => {
    const ordered = supplierItems.filter((it) => (it.order_qty || 0) > 0);
    if (ordered.length === 0) return;
    if (!(await askConfirm(`${supplier.name} への発注を確定し、発注数をリセットします。よろしいですか？`, '発注済みにする'))) return;
    try {
      const saved = await completeOrder(supplier, ordered);
      const ids = new Set(ordered.map((it) => it.id));
      setItems((prev) => prev.map((it) => (ids.has(it.id) ? { ...it, order_qty: 0 } : it)));
      setHistory((prev) => (prev ? [saved, ...prev] : prev));
      showToast('発注済みにしました');
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast, askConfirm]);

  const onSaveSupplier = useCallback(async (supplier) => {
    try {
      const saved = await upsertSupplier(supplier);
      setSuppliers((prev) => {
        const exists = prev.some((s) => s.id === saved.id);
        return exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved];
      });
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast]);

  const onDeleteSupplier = useCallback(async (id) => {
    if (!(await askConfirm('この発注先を削除しますか？紐づく商品も削除されます。', '削除する'))) return;
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      setItems((prev) => prev.filter((it) => it.supplier_id !== id));
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast, askConfirm]);

  const onSaveItem = useCallback(async (item) => {
    try {
      const saved = await upsertItem(item);
      setItems((prev) => {
        const exists = prev.some((it) => it.id === saved.id);
        return exists ? prev.map((it) => (it.id === saved.id ? saved : it)) : [...prev, saved];
      });
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast]);

  const onDeleteItem = useCallback(async (id) => {
    if (!(await askConfirm('この商品を削除しますか？', '削除する'))) return;
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast, askConfirm]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setToast(null);
  };

  if (error) {
    return <div id="osf-app"><div className="osf-body"><div className="osf-toast-err">読み込みエラー：{error}</div></div></div>;
  }
  if (!suppliers || !items) {
    return <div id="osf-app"><div className="osf-loading">読み込み中…</div></div>;
  }

  return (
    <div id="osf-app">
      <div className="osf-header">
        <p className="osf-brand">ABOUT US COFFEE</p>
        <h1>発注表</h1>
      </div>
      <div className="osf-tabs">
        <button className={'osf-tab' + (activeTab === 'order' ? ' active' : '')} onClick={() => changeTab('order')}>
          発注表
        </button>
        <button className={'osf-tab' + (activeTab === 'history' ? ' active' : '')} onClick={() => changeTab('history')}>
          履歴
        </button>
        <button className={'osf-tab' + (activeTab === 'settings' ? ' active' : '')} onClick={() => changeTab('settings')}>
          設定
        </button>
      </div>
      <div className="osf-body">
        {toast && <div className={toast.isError ? 'osf-toast-err' : 'osf-toast'}>{toast.text}</div>}
        {activeTab === 'order' && (
          <OrderTab suppliers={suppliers} items={items} onQtyChange={onQtyChange} onCompleteOrder={onCompleteOrder} />
        )}
        {activeTab === 'history' && <HistoryTab history={history ?? []} />}
        {activeTab === 'settings' && (
          <SettingsTab
            suppliers={suppliers}
            items={items}
            onSaveSupplier={onSaveSupplier}
            onDeleteSupplier={onDeleteSupplier}
            onSaveItem={onSaveItem}
            onDeleteItem={onDeleteItem}
          />
        )}
      </div>
      <ConfirmDialog confirm={confirmState} onResolve={resolveConfirm} />
    </div>
  );
}
