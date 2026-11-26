import { useEffect, useState } from 'react';
import { fetchStaff } from '../../lib/todo';
import { yen, formatShortDate } from '../../lib/format';

// 検討タブ: 発注表に登録していない「買ってほしい物」を依頼する（稟議のようなページ）。
// データは「買ってほしい物リスト」アプリと共通(wl_items)。依頼中 → 購入済み。保留・見送りもできる。
const STATUS = {
  requested: { label: '依頼中', cls: 'osf-st-pending' },
  on_hold: { label: '保留', cls: 'osf-st-hold' },
  bought: { label: '購入済み', cls: 'osf-st-ok' },
  declined: { label: '見送り', cls: 'osf-st-ng' },
};

const FROM_KEY = 'osf-request-from'; // 発注の「お願い」と同じ記憶を使う
const TO_KEY = 'osf-wish-to';

function load(key) {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 記憶できなくても操作自体は完了している
  }
}

const EMPTY = { name: '', purpose: '', reason: '', price: '', quantity: '1', url: '', urgent: false };

const toFields = (f) => ({
  name: f.name.trim(),
  purpose: f.purpose.trim(),
  reason: f.reason.trim(),
  price: String(f.price).replace(/[^\d]/g, '') === '' ? null : Number(String(f.price).replace(/[^\d]/g, '')),
  quantity: Math.max(1, Math.round(Number(f.quantity)) || 1),
  url: f.url.trim(),
  urgent: f.urgent,
});

function WishFields({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: k === 'urgent' ? e.target.checked : e.target.value });
  return (
    <>
      <div className="osf-form-row">
        <label>買ってほしい物</label>
        <input value={value.name} onChange={set('name')} placeholder="商品名" />
      </div>
      <div className="osf-form-row">
        <label>用途</label>
        <textarea rows={2} value={value.purpose} onChange={set('purpose')} placeholder="何に使うか" />
      </div>
      <div className="osf-form-row">
        <label>備考</label>
        <textarea rows={2} value={value.reason} onChange={set('reason')} />
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>単価（税込・未定は空欄）</label>
          <input inputMode="numeric" value={value.price} onChange={set('price')} />
        </div>
        <div className="osf-form-row">
          <label>個数</label>
          <input type="number" min="1" inputMode="numeric" value={value.quantity} onChange={set('quantity')} />
        </div>
      </div>
      <div className="osf-form-row">
        <label>購入先リンク</label>
        <input type="url" inputMode="url" value={value.url} onChange={set('url')} placeholder="https://" />
      </div>
      <label className="osf-wish-urgent">
        <input type="checkbox" checked={value.urgent} onChange={set('urgent')} />
        至急
      </label>
    </>
  );
}

// 依頼する人・お願いする人の選択（Todoアプリの在籍スタッフ）
function usePeople() {
  const [from, setFrom] = useState(() => load(FROM_KEY));
  const [to, setTo] = useState(() => load(TO_KEY));
  return { from, setFrom, to, setTo };
}

function PeopleSelect({ staff, people }) {
  const select = (label, value, onChange) => (
    <div className="osf-form-row">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">選んでください</option>
        {staff.map((s) => (
          <option key={s.key} value={s.key}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="osf-form-grid">
      {select('依頼する人', people.from, people.setFrom)}
      {select('お願いする人', people.to, people.setTo)}
    </div>
  );
}

const resolvePeople = (staff, people) => ({
  fromStaff: staff.find((s) => s.key === people.from),
  toStaff: staff.find((s) => s.key === people.to),
});

const rememberPeople = (people) => {
  save(FROM_KEY, people.from);
  save(TO_KEY, people.to);
};

function NewWishForm({ staff, onCreate }) {
  const [form, setForm] = useState(EMPTY);
  const people = usePeople();
  const [sending, setSending] = useState(false);
  const { fromStaff, toStaff } = resolvePeople(staff, people);
  const ready = form.name.trim() && fromStaff && toStaff;

  const submit = async () => {
    if (!ready || sending) return;
    setSending(true);
    rememberPeople(people);
    if (await onCreate(toFields(form), fromStaff, toStaff)) setForm(EMPTY);
    setSending(false);
  };

  return (
    <div className="osf-add-box">
      <WishFields value={form} onChange={setForm} />
      <PeopleSelect staff={staff} people={people} />
      <button className="osf-mini-btn osf-primary" disabled={!ready || sending} onClick={submit}>
        {sending ? '送信中…' : '+ お願いする（Todoに依頼）'}
      </button>
    </div>
  );
}

function AssignBox({ wish, staff, onAssign, onClose }) {
  const people = usePeople();
  const [sending, setSending] = useState(false);
  const { fromStaff, toStaff } = resolvePeople(staff, people);

  const send = async () => {
    setSending(true);
    rememberPeople(people);
    const ok = await onAssign(wish, fromStaff, toStaff);
    setSending(false);
    if (ok) onClose();
  };

  return (
    <div className="osf-proposal-actions">
      <PeopleSelect staff={staff} people={people} />
      <div className="osf-proposal-buttons">
        <button className="osf-mini-btn osf-primary" disabled={!fromStaff || !toStaff || sending} onClick={send}>
          {sending ? '送信中…' : 'Todoに依頼する'}
        </button>
        <button className="osf-mini-btn" onClick={onClose}>
          やめる
        </button>
      </div>
    </div>
  );
}

function WishCard({ wish, staff, onUpdate, onAssign, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const st = STATUS[wish.status] ?? STATUS.requested;
  const isOpen = wish.status === 'requested' || wish.status === 'on_hold';

  const setStatus = (status) => onUpdate(wish.id, { status, bought_at: status === 'bought' ? new Date().toISOString() : null });

  if (editing) {
    return (
      <div className="osf-proposal">
        <WishFields value={editing} onChange={setEditing} />
        <div className="osf-proposal-buttons">
          <button
            className="osf-mini-btn osf-primary"
            disabled={!editing.name.trim()}
            onClick={async () => (await onUpdate(wish.id, toFields(editing))) && setEditing(null)}
          >
            保存
          </button>
          <button className="osf-mini-btn" onClick={() => setEditing(null)}>
            やめる
          </button>
        </div>
      </div>
    );
  }

  const link = /^https?:\/\//i.test(wish.url ?? '') ? wish.url : null;

  return (
    <div className="osf-proposal">
      <div className="osf-proposal-head">
        <span className="osf-proposal-title">
          {wish.urgent && isOpen && <span className="osf-wish-tag">至急</span>}
          {wish.name}
        </span>
        <span className={'osf-proposal-status ' + st.cls}>{st.label}</span>
      </div>
      <div className="osf-proposal-meta">
        {wish.price != null ? `${yen(wish.price)} × ${wish.quantity} ＝ ${yen(wish.price * wish.quantity)}` : `金額未定 × ${wish.quantity}`}
        {' ・ '}
        {formatShortDate(wish.created_at)}
        {wish.status === 'bought' && wish.bought_at ? `（${formatShortDate(wish.bought_at)} 購入）` : ''}
      </div>
      {(wish.requested_by || wish.assigned_to_name) && (
        <div className="osf-proposal-meta">
          {wish.requested_by ?? '—'} → {wish.assigned_to_name ?? '（お願いする人 未指定）'}
        </div>
      )}
      {wish.purpose && <div className="osf-proposal-reason">用途：{wish.purpose}</div>}
      {wish.reason && <div className="osf-proposal-reason">備考：{wish.reason}</div>}
      {link && (
        <a className="osf-wish-link" href={link} target="_blank" rel="noopener noreferrer">
          購入先リンク ↗
        </a>
      )}

      {isOpen && !wish.assigned_to_name && !assigning && (
        <button className="osf-mini-btn" style={{ marginTop: 8 }} onClick={() => setAssigning(true)}>
          お願いする人を選んでTodoに依頼
        </button>
      )}
      {assigning && <AssignBox wish={wish} staff={staff} onAssign={onAssign} onClose={() => setAssigning(false)} />}

      <div className="osf-proposal-foot">
        {isOpen ? (
          <>
            <button className="osf-mini-btn osf-primary" onClick={() => setStatus('bought')}>
              購入済みにする
            </button>
            {wish.status === 'on_hold' ? (
              <button className="osf-mini-btn" onClick={() => setStatus('requested')}>
                依頼中に戻す
              </button>
            ) : (
              <button className="osf-mini-btn" onClick={() => setStatus('on_hold')}>
                保留
              </button>
            )}
            <button className="osf-mini-btn" onClick={() => setStatus('declined')}>
              見送り
            </button>
          </>
        ) : (
          <button className="osf-mini-btn" onClick={() => setStatus('requested')}>
            依頼中に戻す
          </button>
        )}
        <button
          className="osf-mini-btn"
          onClick={() => setEditing({ ...EMPTY, ...wish, price: wish.price ?? '', quantity: String(wish.quantity ?? 1) })}
        >
          編集
        </button>
        <button className="osf-mini-btn osf-danger" onClick={() => onDelete(wish)}>
          削除
        </button>
      </div>
    </div>
  );
}

export default function ProposalsTab({ wishes, onCreate, onUpdate, onAssign, onDelete }) {
  const [staff, setStaff] = useState([]);
  const [staffError, setStaffError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    fetchStaff()
      .then(setStaff)
      .catch((e) => setStaffError(e.message));
  }, []);

  // 至急を上に、その中では新しい順
  const requested = wishes.filter((w) => w.status === 'requested').sort((a, b) => Number(b.urgent) - Number(a.urgent));
  const held = wishes.filter((w) => w.status === 'on_hold');
  const done = wishes.filter((w) => w.status === 'bought' || w.status === 'declined');
  const total = requested.reduce((sum, w) => sum + (w.price ?? 0) * w.quantity, 0);

  const renderCard = (w) => <WishCard key={w.id} wish={w} staff={staff} onUpdate={onUpdate} onAssign={onAssign} onDelete={onDelete} />;

  return (
    <div>
      <button className="osf-wish-new" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
        {adding ? '閉じる' : '＋ 買ってほしい物を追加'}
      </button>
      {adding && (
        <NewWishForm
          staff={staff}
          onCreate={async (...args) => {
            const ok = await onCreate(...args);
            if (ok) setAdding(false);
            return ok;
          }}
        />
      )}
      {staffError && <div className="osf-inline-err">スタッフの一覧を読み込めませんでした：{staffError}</div>}

      <div className="osf-section-title">
        依頼中（{requested.length}）{total > 0 ? `　合計 ${yen(total)}` : ''}
      </div>
      {requested.length === 0 ? <div className="osf-empty">依頼中のものはありません。</div> : requested.map(renderCard)}

      {held.length > 0 && (
        <>
          <div className="osf-section-title">保留（{held.length}）</div>
          {held.map(renderCard)}
        </>
      )}

      {done.length > 0 && (
        <>
          <button className="osf-wish-done" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            {showDone ? '▼' : '▶'} 購入済み・見送り（{done.length}）
          </button>
          {showDone && done.map(renderCard)}
        </>
      )}
    </div>
  );
}
