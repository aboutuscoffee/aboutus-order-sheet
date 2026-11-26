import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAll,
  fetchHistory,
  fetchWishes,
  createWish,
  updateWish,
  deleteWish,
  fetchSeason,
  saveSeason,
  fetchSheetSettings,
  saveSetting,
  upsertSupplier,
  deleteSupplier,
  upsertItem,
  deleteItem,
  upsertLocation,
  deleteLocation,
  updateItemQty,
  updateHistoryDelivery,
  completeOrder,
  rolloverStock,
} from './lib/db';
import { requestOrder, requestPurchase } from './lib/todo';
import { redistribute, stocksByLocation, sumStocks } from './lib/stocks';
import OrderTab from './components/order/OrderTab';
import SettingsTab from './components/order/SettingsTab';
import HistoryTab from './components/order/HistoryTab';
import ProposalsTab from './components/order/ProposalsTab';
import ConfirmDialog from './components/order/ConfirmDialog';
import SheetImportDialog from './components/order/SheetImportDialog';
import { formatShortDate, checkDaysLabel } from './lib/format';

const QTY_SAVE_DELAY = 500;

const svg = (d) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const ICONS = {
  list: svg(<><path d="M8 6h12M8 12h12M8 18h12" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>),
  clock: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  note: svg(<><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6" /></>),
  gear: svg(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>),
  down: svg(<path d="M12 4v11M7 11l5 5 5-5M5 20h14" />),
};

export default function App() {
  const [suppliers, setSuppliers] = useState(null);
  const [items, setItems] = useState(null);
  const [locations, setLocations] = useState(null);
  const [history, setHistory] = useState(null);
  const [wishes, setWishes] = useState(null);
  const [season, setSeason] = useState(null);
  const [sheetSettings, setSheetSettings] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('order');
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [importing, setImporting] = useState(false);
  const [selSupplier, setSelSupplier] = useState(() => {
    try {
      return localStorage.getItem('osf-selected-supplier');
    } catch {
      return null;
    }
  });
  const saveTimers = useRef({});
  const itemsRef = useRef(null); // 保存する内容を最新の状態から作るため
  const confirmResolver = useRef(null);

  itemsRef.current = items;

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
    // 自動実行の取りこぼしがあれば先に補ってから読み込む（失敗しても読み込みは続ける）
    rolloverStock()
      .catch(() => 0)
      .then(() => Promise.all([fetchAll(), fetchHistory(), fetchWishes(), fetchSeason(), fetchSheetSettings()])
      .then(([{ suppliers, items, locations }, history, wishes, season, sheetSettings]) => {
        setSheetSettings(sheetSettings);
        setSuppliers(suppliers);
        setItems(items);
        setLocations(locations);
        setHistory(history);
        setWishes(wishes);
        setSeason(season);
      }))
      .catch((e) => setError(e.message));
  }, []);

  const showToast = useCallback((text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const onQtyChange = useCallback((itemId, field, value) => {
    // 在庫は空欄（未入力）にできる。発注数は空欄なら0
    const num = value === '' ? (field === 'stock_qty' ? null : 0) : Math.max(0, Number(value));
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, [field]: num } : it)));

    clearTimeout(saveTimers.current[itemId + field]);
    saveTimers.current[itemId + field] = setTimeout(() => {
      updateItemQty(itemId, { [field]: num }).catch((e) => showToast(e.message, true));
    }, QTY_SAVE_DELAY);
  }, [showToast]);

  // patch は { location_id } または { extra_location_ids }（変更した項目だけ）。
  // 置き場が2か所以上になる/なくなるときは、在庫の内訳（location_stocks）も合計を保ったまま振り分ける
  const onChangeLocation = useCallback((itemId, patch) => {
    const item = itemsRef.current?.find((it) => it.id === itemId);
    if (!item) return;
    const full = { ...patch, ...redistribute(item, patch) };
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...full } : it)));
    updateItemQty(itemId, full).catch((e) => showToast(e.message, true));
  }, [showToast]);

  // 2か所以上に置き場がある商品の、特定の置き場の在庫を入力したとき。stock_qty はその合計にする
  const onLocationStockChange = useCallback((itemId, locationId, value) => {
    const item = itemsRef.current?.find((it) => it.id === itemId);
    if (!item) return;
    const num = value === '' ? 0 : Math.max(0, Number(value));
    const map = { ...stocksByLocation(item), [locationId]: num };
    const full = { location_stocks: map, stock_qty: sumStocks(map) };
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...full } : it)));

    clearTimeout(saveTimers.current[`${itemId}:locstock`]);
    saveTimers.current[`${itemId}:locstock`] = setTimeout(() => {
      updateItemQty(itemId, full).catch((e) => showToast(e.message, true));
    }, QTY_SAVE_DELAY);
  }, [showToast]);

  const onCheckToggle = useCallback((itemId, checked) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, stock_checked: checked } : it)));
    updateItemQty(itemId, { stock_checked: checked }).catch((e) => showToast(e.message, true));
  }, [showToast]);

  // 発注済みにする: 確認（備考は任意）のうえ、履歴に保存して発注数・確認をリセットする
  const onCompleteOrder = useCallback(async (supplier, supplierItems) => {
    const ordered = supplierItems.filter((it) => (it.order_qty || 0) > 0);
    if (ordered.length === 0) return;
    const answer = await askConfirm(
      `${supplier.name} を発注済みにします。履歴に保存し、発注数と「確認」をリセットします。`,
      '発注済みにする',
      { withInput: true, inputOptional: true, inputPlaceholder: '備考（任意）' }
    );
    if (!answer) return;
    try {
      const saved = await completeOrder(supplier, ordered, answer.value);
      const ids = new Set(ordered.map((it) => it.id));
      setItems((prev) => prev.map((it) => (ids.has(it.id) ? { ...it, order_qty: 0, stock_checked: false } : it)));
      setHistory((prev) => [saved, ...prev]);
      showToast('発注済みにしました');
    } catch (e) {
      showToast(e.message, true);
    }
  }, [showToast, askConfirm]);

  // 在庫・発注の単位（商品ごと）。選んだらすぐ保存する
  const onUnitChange = useCallback((itemId, field, value) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)));
    updateItemQty(itemId, { [field]: value }).catch((e) => showToast(e.message, true));
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
    for (const u of updates) {
      await updateItemQty(u.id, {
        stock_qty: u.stock_qty,
        sheet_stock: u.sheet_stock,
        ...(u.location_stocks ? { location_stocks: u.location_stocks } : {}),
      });
    }
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

  const putWish = useCallback((saved) => {
    setWishes((prev) => (prev.some((w) => w.id === saved.id) ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev]));
  }, []);

  // お願いする人が決まっていれば、Todoアプリに依頼を作ってから「誰にお願いしたか」を記録する
  const assignWish = useCallback(async (wish, fromStaff, toStaff) => {
    try {
      await requestPurchase({ wish, fromStaff, toStaff });
    } catch (e) {
      showToast(`Todoへの依頼ができませんでした：${e.message}`, true);
      return false;
    }
    try {
      putWish(await updateWish(wish.id, { requested_by: fromStaff.name, assigned_to_key: toStaff.key, assigned_to_name: toStaff.name }));
      showToast(`${toStaff.name}さんのTodoに依頼しました`);
    } catch (e) {
      showToast(e.message, true);
    }
    return true;
  }, [putWish, showToast]);

  const onCreateWish = useCallback(async (fields, fromStaff, toStaff) => {
    let saved;
    try {
      saved = await createWish({ ...fields, requested_by: fromStaff.name });
    } catch (e) {
      showToast(e.message, true);
      return false;
    }
    putWish(saved);
    await assignWish(saved, fromStaff, toStaff);
    return true;
  }, [putWish, assignWish, showToast]);

  const onUpdateWish = useCallback(async (id, fields) => {
    try {
      putWish(await updateWish(id, fields));
      return true;
    } catch (e) {
      showToast(e.message, true);
      return false;
    }
  }, [putWish, showToast]);

  const onDeleteWish = useCallback(async (wish) => {
    if (!(await askConfirm(`「${wish.name}」を削除しますか？\n買ってほしい物リストからも消えます。`, '削除する'))) return;
    try {
      await deleteWish(wish.id);
      setWishes((prev) => prev.filter((w) => w.id !== wish.id));
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
    // 買ってほしい物リスト側で追加・変更されたものも見えるように、開くたびに読み直す
    if (tab === 'proposals') fetchWishes().then(setWishes).catch((e) => showToast(e.message, true));
    setActiveTab(tab);
    setToast(null);
  };

  if (error) {
    return <div id="osf-app"><div className="osf-body"><div className="osf-inline-err">読み込みエラー：{error}</div></div></div>;
  }
  if (!suppliers || !items || !locations || !history || !wishes || !season || !sheetSettings) {
    return <div id="osf-app"><div className="osf-loading">読み込み中…</div></div>;
  }

  const openWishCount = wishes.filter((w) => w.status === 'requested').length;
  const supplierNames = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  const NAV = [
    { key: 'order', label: '発注表', icon: ICONS.list },
    { key: 'history', label: '履歴', icon: ICONS.clock },
    { key: 'proposals', label: '検討', icon: ICONS.note, badge: openWishCount },
    { key: 'settings', label: '設定', icon: ICONS.gear },
  ];

  const onSelectSupplier = (id) => {
    setSelSupplier(id);
    try {
      localStorage.setItem('osf-selected-supplier', id);
    } catch {
      // 記憶できなくても切り替えは動くので無視する
    }
  };
  const activeSupplier = suppliers.find((s) => s.id === selSupplier) ?? suppliers[0];

  return (
    <div id="osf-app">
      {activeSupplier && (
        <div className="osf-topbar">
          {activeSupplier.name}　在庫チェック日 {checkDaysLabel(activeSupplier.check_days) || '未設定'}
        </div>
      )}
      <header className="osf-header">
        <div>
          <div className="osf-brand">ABOUT US COFFEE</div>
          <h1>{NAV.find((n) => n.key === activeTab).label}</h1>
        </div>
        {activeTab === 'order' && sheetSettings.sheet_id && (
          <button className="osf-imp" aria-label="シート取込" title="シート取込" onClick={() => setImporting(true)}>
            {ICONS.down}
            <span>シート取込</span>
          </button>
        )}
      </header>

      {toast && <div className={'osf-toast' + (toast.isError ? ' err' : '')}>{toast.text}</div>}

      <main className="osf-body">
        {activeTab === 'order' && (
          <OrderTab
            suppliers={suppliers}
            selectedSupplierId={selSupplier}
            onSelectSupplier={onSelectSupplier}
            items={items}
            locations={locations}
            history={history}
            season={season}
            onChangeSeason={onChangeSeason}
            onChangeLocation={onChangeLocation}
            onLocationStockChange={onLocationStockChange}
            onQtyChange={onQtyChange}
            onCheckToggle={onCheckToggle}
            onUnitChange={onUnitChange}
            onCompleteOrder={onCompleteOrder}
            onRequestOrder={onRequestOrder}
            onToggleDelivered={onToggleDelivered}
          />
        )}
        {activeTab === 'history' && <HistoryTab history={history} />}
        {activeTab === 'proposals' && (
          <ProposalsTab wishes={wishes} onCreate={onCreateWish} onUpdate={onUpdateWish} onAssign={assignWish} onDelete={onDeleteWish} />
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
      </main>

      <nav className="osf-nav" aria-label="メニュー">
        {NAV.map((n) => (
          <button key={n.key} className={'osf-nav-btn' + (activeTab === n.key ? ' active' : '')} onClick={() => changeTab(n.key)}>
            <span className="osf-nav-icon">
              {n.icon}
              {n.badge > 0 && <em>{n.badge}</em>}
            </span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {importing && (
        <SheetImportDialog
          sheetId={sheetSettings.sheet_id}
          lastImport={sheetSettings.sheet_last_import ? formatShortDate(sheetSettings.sheet_last_import) : null}
          items={items}
          supplierNames={supplierNames}
          onApply={onApplySheetImport}
          onClose={() => setImporting(false)}
        />
      )}
      <ConfirmDialog confirm={confirmState} onResolve={resolveConfirm} />
    </div>
  );
}
