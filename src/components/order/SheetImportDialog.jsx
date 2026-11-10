import { useEffect, useMemo, useState } from 'react';
import { fetchSheetStocks } from '../../lib/sheetImport';
import { fetchInactiveSheetKeys } from '../../lib/db';
import { idsOf, isMultiLocation } from '../../lib/stocks';

export default function SheetImportDialog({ sheetId, items, supplierNames, onApply, onClose }) {
  const [rows, setRows] = useState(null); // シートの行 Map
  const [inactiveKeys, setInactiveKeys] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [checked, setChecked] = useState({});
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);

  useEffect(() => {
    Promise.all([fetchSheetStocks(sheetId), fetchInactiveSheetKeys()])
      .then(([sheetRows, inactive]) => {
        setInactiveKeys(inactive);
        setRows(sheetRows);
      })
      .catch((e) => setLoadError(e.message));
  }, [sheetId]);

  // シートの値が前回取り込み時から変わっている商品だけを候補にする（アプリでだけ変えた値は、シートが変わらない限り触らない）
  const { candidates, silent, newRows, linked } = useMemo(() => {
    if (!rows) return { candidates: [], silent: [], newRows: [], linked: 0 };
    const candidates = [];
    const silent = [];
    const keys = new Set(inactiveKeys);
    let linked = 0;
    for (const it of items) {
      if (!it.sheet_key) continue;
      keys.add(it.sheet_key);
      const row = rows.get(it.sheet_key);
      if (!row) continue;
      linked++;
      const sv = row.stock;
      if (sv == null || sv === it.sheet_stock) continue;
      if (sv === it.stock_qty) {
        silent.push({ id: it.id, sheet_stock: sv }); // すでに同じ値。記録だけ更新する
        continue;
      }
      // 前回取り込み後にアプリ側でも在庫を変えている（スタッフが入力した）場合は注意を出す
      const appEdited = it.stock_qty !== (it.sheet_stock ?? 0);
      candidates.push({ item: it, sheetValue: sv, appEdited, multi: isMultiLocation(it) });
    }
    const newRows = [...rows.values()].filter((r) => !keys.has(r.key));
    return { candidates, silent, newRows, linked };
  }, [rows, items, inactiveKeys]);

  useEffect(() => {
    setChecked(Object.fromEntries(candidates.map((c) => [c.item.id, !c.appEdited && !c.multi])));
  }, [candidates]);

  const selected = candidates.filter((c) => checked[c.item.id]);

  const apply = async () => {
    setApplying(true);
    setApplyError(null);
    try {
      await onApply(
        selected.map((c) => ({
          id: c.item.id,
          stock_qty: c.sheetValue,
          sheet_stock: c.sheetValue,
          // 置き場が複数ある商品は、シートの合計をメインの置き場に入れ、他の置き場は0にする
          ...(c.multi ? { location_stocks: Object.fromEntries(idsOf(c.item).map((id, i) => [id, i === 0 ? c.sheetValue : 0])) } : {}),
        })),
        silent
      );
      onClose();
    } catch (e) {
      setApplyError(e.message);
      setApplying(false);
    }
  };

  return (
    <div className="osf-modal-backdrop" onClick={applying ? undefined : onClose}>
      <div className="osf-modal osf-modal-wide" onClick={(e) => e.stopPropagation()}>
        <p className="osf-modal-title">シートから在庫を取り込む</p>
        {loadError && <div className="osf-toast-err">{loadError}</div>}
        {!rows && !loadError && <div className="osf-loading">シートを読み込み中…</div>}

        {rows && (
          <>
            <p className="osf-modal-text">
              シートの最新の在庫を読み込みました（対応する商品 {linked}件）。前回の取り込みから
              <strong>シートで変わったもの</strong>が下の一覧です。反映するものにチェックを付けてください。
            </p>

            {candidates.length === 0 ? (
              <div className="osf-empty">シートで変わった在庫はありません。</div>
            ) : (
              <div className="osf-import-list">
                {candidates.map((c) => (
                  <label key={c.item.id} className="osf-import-row">
                    <input
                      type="checkbox"
                      className="osf-check-input"
                      checked={!!checked[c.item.id]}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [c.item.id]: e.target.checked }))}
                    />
                    <span className="osf-import-name">
                      {c.item.name}
                      <span className="osf-import-sub">{supplierNames[c.item.supplier_id]}</span>
                      {c.appEdited && <span className="osf-import-warn">アプリでも変更あり</span>}
                      {c.multi && <span className="osf-import-warn">置き場が複数（内訳はメインの置き場にまとめます）</span>}
                    </span>
                    <span className="osf-import-values">
                      {c.item.stock_qty} → <strong>{c.sheetValue}</strong>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {newRows.length > 0 && (
              <details className="osf-import-new">
                <summary>シートにあって、アプリにない行（{newRows.length}件）</summary>
                <div className="osf-import-new-list">{newRows.map((r) => r.label).join('、')}</div>
                <div className="osf-import-new-note">新しい商品は「設定」タブから追加してください。</div>
              </details>
            )}
          </>
        )}

        {applyError && <div className="osf-toast-err">{applyError}</div>}
        <div className="osf-modal-actions">
          <button className="osf-mini-btn" onClick={onClose} disabled={applying}>
            閉じる
          </button>
          {rows && (
            <button className="osf-mini-btn osf-primary" onClick={apply} disabled={applying || (selected.length === 0 && silent.length === 0)}>
              {applying ? '反映中…' : selected.length > 0 ? `${selected.length}件を反映` : '記録を更新'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
