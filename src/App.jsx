import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAll,
  fetchHistory,
  fetchProposals,
  fetchSeason,
  saveSeason,
  fetchSheetSettings,
  saveSetting,
  upsertProposal,
  deleteProposal,
  upsertSupplier,
  deleteSupplier,
  upsertItem,
  deleteItem,
  upsertLocation,
  deleteLocation,
  updateItemQty,
  updateHistoryDelivery,
  completeOrder,
} from './lib/db';
import { requestOrder } from './lib/todo';
import OrderTab from './components/order/OrderTab';
import SettingsTab from './components/order/SettingsTab';
import HistoryTab from './components/order/HistoryTab';
import ProposalsTab from './components/order/ProposalsTab';
import ConfirmDialog from './components/order/ConfirmDialog';

const QTY_SAVE_DELAY = 500;

export default function App() {
  const [suppliers, setSuppliers] = useState(null);
  const [items, setItems] = useState(null);
  const [locations, setLocations] = useState(null);
  const [history, setHistory] = useState(null);
  const [proposals, setProposals] = useState(null);
  const [season, setSeason] = useState(null);
  const [sheetSettings, setSheetSettings] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('order');
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const saveTimers = useRef({});
  const confirmResolver = useRef(null);

  const askConfirm = useCallback((message, okLabel, options = {}) => {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState({ message, okLabel, ...options });
    });
  }, []);

  const resolveConfirm = useCallback((result) => {
    setConfirmState(null);
    confirmResolver.current?.(result);
    confirmResolver.current = null;
  }, []);

  useEffect(() => {
    Promise.all([fetchAll(), fetchHistory(), fetchProposals(), fetchSeason(), fetchSheetSettings()])
      .then(([{ suppliers, items, locations }, history, proposals, season, sheetSettings]) => {
        setSheetSettings(sheetSettings);
        setSuppliers(suppliers);
        setItems(items);
        setLocations(locations);
        setHistory(history);
        setProposals(proposals);
        setSeason(season);
      })
      .catch((e) => setError(e.message));
  }, []);

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

  // patch は { location_id } または { extra_location_ids }（変更した項目だけ）
  const onChangeLocation = useCallback((itemId, patch) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...patch } : it)));
    updateItemQty(itemId, patch).catch((e) => showToast(e.message, true));
  }, [showToast]);

  const onCheckToggle = useCallback((itemId, checked) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, stock_checked: checked } : it)));
    updateItemQty(itemId, { stock_checked: checked }).catch((e) => showToast(e.message, true));
  }, [showToast]);

  const onCompleteOrder = useCallback(async (supplier, supplierItems, note) => {
    const ordered = supplierItems.filter((it) => (it.order_qty || 0) > 0);
    if (ordered.length === 0) return;
    try {
      const saved = await completeOrder(supplier, ordered, note);
      const ids = new Set(ordered.map((it) => it.id));
      setItems((prev) => prev.map((it) => (ids.has(it.id) ? { ...it, order_qty: 0, stock_checked: false } : it)));
      setHistory((prev) => [saved, ...prev]);
      showToast('発注済みにしました');
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast]);

  // エラーはダイアログ側でそのまま表示するので、ここでは握りつぶさず投げる
  const onRequestOrder = useCallback(async (params) => {
    await requestOrder(params);
    showToast(`${params.toStaff.name}さんに発注をお願いしました`);
  }, [showToast]);

  const onToggleDelivered = useCallback(async (entry, itemIndex, delivered) => {
    const nextItems = entry.items.map((it, i) => (i === itemIndex ? { ...it, delivered } : it));
    const allDelivered = nextItems.every((it) => it.delivered);
    setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, items: nextItems, all_delivered: allDelivered } : h)));
    try {
      await updateHistoryDelivery(entry.id, nextItems);
    } catch (e) {
      setHistory((prev) => prev.map((h) => (h.id === entry.id ? entry : h)));
      showToast(e.message, true);
    }
  }, [showToast]);

  // シートから取り込んだ在庫を反映する。updates=在庫を書き換えるもの、recordOnly=すでに同じ値で記録だけ更新するもの
  const onApplySheetImport = useCallback(async (updates, recordOnly) => {
    for (const u of updates) await updateItemQty(u.id, { stock_qty: u.stock_qty, sheet_stock: u.sheet_stock });
    for (const r of recordOnly) await updateItemQty(r.id, { sheet_stock: r.sheet_stock });
    const now = new Date().toISOString();
    await saveSetting('sheet_last_import', now);
    const byId = new Map([...updates, ...recordOnly].map((u) => [u.id, u]));
    setItems((prev) => prev.map((it) => (byId.has(it.id) ? { ...it, ...byId.get(it.id) } : it)));
    setSheetSettings((prev) => ({ ...prev, sheet_last_import: now }));
    showToast(updates.length > 0 ? `${updates.length}件の在庫を取り込みました` : '取り込みの記録を更新しました');
  }, [showToast]);

  const onChangeSeason = useCallback(async (next) => {
    const prev = season;
    setSeason(next);
    try {
      await saveSeason(next);
    } catch (e) {
      setSeason(prev);
      showToast(e.message, true);
    }
  }, [season, showToast]);

  const saveProposal = useCallback(async (proposal) => {
    try {
      const saved = await upsertProposal(proposal);
      setProposals((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      });
      return saved;
    } catch (e) {
      showToast(e.message, true);
      return null;
    }
  }, [showToast]);

  const onSubmitProposal = useCallback(async (fields) => {
    if (await saveProposal(fields)) showToast('検討をお願いしました');
  }, [saveProposal, showToast]);

  const onDecideProposal = useCallback((proposal, status, decidedBy, comment) => {
    saveProposal({
      ...proposal,
      status,
      decided_by: decidedBy,
      decision_comment: comment,
      decided_at: new Date().toISOString(),
    });
  }, [saveProposal]);

  const onReopenProposal = useCallback((proposal) => {
    saveProposal({ ...proposal, status: 'pending', decided_by: null, decision_comment: null, decided_at: null });
  }, [saveProposal]);

  const onDeleteProposal = useCallback(async (id) => {
    if (!(await askConfirm('この検討内容を削除しますか？', '削除する'))) return;
    try {
      await deleteProposal(id);
      setProposals((prev) => prev.filter((p) => p.id !== id));
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

  const onSaveLocation = useCallback(async (location) => {
    try {
      const saved = await upsertLocation(location);
      setLocations((prev) => {
        const exists = prev.some((l) => l.id === saved.id);
        return exists ? prev.map((l) => (l.id === saved.id ? saved : l)) : [...prev, saved];
      });
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast]);

  const onDeleteLocation = useCallback(async (id) => {
    if (!(await askConfirm('この置き場を削除しますか？商品の置き場は「未設定」に戻ります。', '削除する'))) return;
    try {
      await deleteLocation(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      setItems((prev) => prev.map((it) => (it.location_id === id ? { ...it, location_id: null } : it)));
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
  if (!suppliers || !items || !locations || !history || !proposals || !season || !sheetSettings) {
    return <div id="osf-app"><div className="osf-loading">読み込み中…</div></div>;
  }

  const openProposalCount = proposals.filter((p) => p.status === 'pending' || p.status === 'on_hold').length;

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
        <button className={'osf-tab' + (activeTab === 'proposals' ? ' active' : '')} onClick={() => changeTab('proposals')}>
          検討{openProposalCount > 0 ? `（${openProposalCount}）` : ''}
        </button>
        <button className={'osf-tab' + (activeTab === 'settings' ? ' active' : '')} onClick={() => changeTab('settings')}>
          設定
        </button>
      </div>
      <div className="osf-body">
        {toast && <div className={toast.isError ? 'osf-toast-err' : 'osf-toast'}>{toast.text}</div>}
        {activeTab === 'order' && (
          <OrderTab
            suppliers={suppliers}
            items={items}
            locations={locations}
            history={history}
            season={season}
            onChangeSeason={onChangeSeason}
            sheetSettings={sheetSettings}
            onApplySheetImport={onApplySheetImport}
            onChangeLocation={onChangeLocation}
            onQtyChange={onQtyChange}
            onCheckToggle={onCheckToggle}
            onCompleteOrder={onCompleteOrder}
            onRequestOrder={onRequestOrder}
            onToggleDelivered={onToggleDelivered}
          />
        )}
        {activeTab === 'history' && <HistoryTab history={history} />}
        {activeTab === 'proposals' && (
          <ProposalsTab
            proposals={proposals}
            suppliers={suppliers}
            items={items}
            onSubmit={onSubmitProposal}
            onDecide={onDecideProposal}
            onReopen={onReopenProposal}
            onDelete={onDeleteProposal}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            suppliers={suppliers}
            items={items}
            locations={locations}
            onSaveSupplier={onSaveSupplier}
            onDeleteSupplier={onDeleteSupplier}
            onSaveItem={onSaveItem}
            onDeleteItem={onDeleteItem}
            onSaveLocation={onSaveLocation}
            onDeleteLocation={onDeleteLocation}
          />
        )}
      </div>
      <ConfirmDialog confirm={confirmState} onResolve={resolveConfirm} />
    </div>
  );
}
