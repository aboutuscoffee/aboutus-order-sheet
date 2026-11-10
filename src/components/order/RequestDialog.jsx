import { useEffect, useState } from 'react';
import { fetchStaff } from '../../lib/todo';

const FROM_KEY = 'osf-request-from';

function loadFrom() {
  try {
    return localStorage.getItem(FROM_KEY) ?? '';
  } catch {
    return '';
  }
}

export default function RequestDialog({ supplier, onSend, onClose }) {
  const [staff, setStaff] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [fromKey, setFromKey] = useState(loadFrom);
  const [toKey, setToKey] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchStaff()
      .then(setStaff)
      .catch((e) => setLoadError(e.message));
  }, []);

  const canSend = !!fromKey && !!toKey && fromKey !== toKey && !sending;

  const send = async () => {
    const fromStaff = staff.find((s) => s.key === fromKey);
    const toStaff = staff.find((s) => s.key === toKey);
    setSending(true);
    setSendError(null);
    try {
      await onSend(fromStaff, toStaff, note.trim());
      try {
        localStorage.setItem(FROM_KEY, fromKey);
      } catch {
        // 記憶できなくても依頼自体は完了している
      }
      onClose();
    } catch (e) {
      setSendError(e.message);
      setSending(false);
    }
  };

  return (
    <div className="osf-modal-backdrop" onClick={sending ? undefined : onClose}>
      <div className="osf-modal" onClick={(e) => e.stopPropagation()}>
        <p className="osf-modal-text">
          {supplier.name} の発注を、Todoアプリの依頼タスクとしてお願いします。
        </p>
        {loadError && <div className="osf-inline-err">スタッフ一覧を読み込めませんでした：{loadError}</div>}
        {!staff && !loadError && <div className="osf-loading">読み込み中…</div>}
        {staff && (
          <>
            <div className="osf-form-row">
              <label>依頼する人</label>
              <select value={fromKey} onChange={(e) => setFromKey(e.target.value)}>
                <option value="">選んでください</option>
                {staff.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="osf-form-row">
              <label>お願いする人</label>
              <select value={toKey} onChange={(e) => setToKey(e.target.value)}>
                <option value="">選んでください</option>
                {staff
                  .filter((s) => s.key !== fromKey)
                  .map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}
        {staff && (
          <div className="osf-form-row">
            <label>備考</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="任意（例: 急ぎです）" />
          </div>
        )}
        {sendError && <div className="osf-inline-err">{sendError}</div>}
        <div className="osf-modal-actions">
          <button className="osf-mini-btn" onClick={onClose} disabled={sending}>
            キャンセル
          </button>
          <button className="osf-mini-btn osf-primary" onClick={send} disabled={!canSend}>
            {sending ? '送信中…' : 'お願いする'}
          </button>
        </div>
      </div>
    </div>
  );
}
