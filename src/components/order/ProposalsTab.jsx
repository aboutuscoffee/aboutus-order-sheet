import { useEffect, useMemo, useState } from 'react';
import { fetchDeciders } from '../../lib/todo';
import { yen, formatShortDate } from '../../lib/format';

const STATUS = {
  pending: { label: '検討待ち', cls: 'osf-st-pending' },
  on_hold: { label: '保留', cls: 'osf-st-hold' },
  approved: { label: '承認', cls: 'osf-st-ok' },
  rejected: { label: '却下', cls: 'osf-st-ng' },
};

const PROPOSER_KEY = 'osf-proposer';
const DECIDER_KEY = 'osf-decider';

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

function ProposalForm({ suppliers, items, onSubmit }) {
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [submittedBy, setSubmittedBy] = useState(() => load(PROPOSER_KEY));
  const [supplierId, setSupplierId] = useState('');
  const [itemId, setItemId] = useState('');

  const itemOptions = supplierId ? items.filter((it) => it.supplier_id === supplierId) : items;
  const canSubmit = title.trim() && submittedBy.trim();

  const submit = () => {
    if (!canSubmit) return;
    save(PROPOSER_KEY, submittedBy.trim());
    onSubmit({
      title: title.trim(),
      reason: reason.trim() || null,
      amount: amount === '' ? null : Number(amount),
      submitted_by: submittedBy.trim(),
      supplier_id: supplierId || null,
      item_id: itemId || null,
    });
    setTitle('');
    setReason('');
    setAmount('');
    setSupplierId('');
    setItemId('');
  };

  return (
    <div className="osf-add-box">
      <div className="osf-form-row">
        <label>検討したいこと</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 豆袋の発注ロットを変えたい" />
      </div>
      <div className="osf-form-row">
        <label>理由・内容</label>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="なぜ必要か、今困っていること など" />
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>概算金額</label>
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="任意" />
        </div>
        <div className="osf-form-row">
          <label>提出者</label>
          <input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="名前" />
        </div>
      </div>
      <div className="osf-form-grid">
        <div className="osf-form-row">
          <label>発注先</label>
          <select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setItemId('');
            }}
          >
            <option value="">指定なし</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="osf-form-row">
          <label>商品</label>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">指定なし</option>
            {itemOptions.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="osf-mini-btn osf-primary" disabled={!canSubmit} onClick={submit}>
        + 検討をお願いする
      </button>
    </div>
  );
}

function ProposalCard({ proposal, supplierName, itemName, deciders, onDecide, onReopen, onDelete }) {
  const [decider, setDecider] = useState(() => load(DECIDER_KEY));
  const [comment, setComment] = useState('');
  const st = STATUS[proposal.status] ?? STATUS.pending;
  const isOpen = proposal.status === 'pending' || proposal.status === 'on_hold';

  const decide = (status) => {
    if (!decider) return;
    save(DECIDER_KEY, decider);
    onDecide(proposal, status, decider, comment.trim() || null);
    setComment('');
  };

  return (
    <div className="osf-proposal">
      <div className="osf-proposal-head">
        <span className="osf-proposal-title">{proposal.title}</span>
        <span className={'osf-proposal-status ' + st.cls}>{st.label}</span>
      </div>
      <div className="osf-proposal-meta">
        {proposal.submitted_by} ・ {formatShortDate(proposal.created_at)}
        {proposal.amount != null ? ` ・ 概算 ${yen(proposal.amount)}` : ''}
        {supplierName ? ` ・ ${supplierName}` : ''}
        {itemName ? ` / ${itemName}` : ''}
      </div>
      {proposal.reason && <div className="osf-proposal-reason">{proposal.reason}</div>}

      {proposal.decided_by && (
        <div className="osf-proposal-decision">
          {proposal.decided_by}（{formatShortDate(proposal.decided_at)}）
          {proposal.decision_comment ? `：${proposal.decision_comment}` : ''}
        </div>
      )}

      {isOpen && (
        <div className="osf-proposal-actions">
          <div className="osf-form-row">
            <label>判断する人</label>
            <select value={decider} onChange={(e) => setDecider(e.target.value)}>
              <option value="">選んでください</option>
              {deciders.map((d) => (
                <option key={d.key} value={d.name}>
                  {d.name}（{d.role === 'owner' ? 'オーナー' : 'GM'}）
                </option>
              ))}
            </select>
          </div>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="コメント（任意）" />
          <div className="osf-proposal-buttons">
            <button className="osf-mini-btn osf-primary" disabled={!decider} onClick={() => decide('approved')}>
              承認
            </button>
            <button className="osf-mini-btn" disabled={!decider} onClick={() => decide('on_hold')}>
              保留
            </button>
            <button className="osf-mini-btn osf-danger" disabled={!decider} onClick={() => decide('rejected')}>
              却下
            </button>
          </div>
        </div>
      )}

      <div className="osf-proposal-foot">
        {!isOpen && (
          <button className="osf-mini-btn" onClick={() => onReopen(proposal)}>
            検討待ちに戻す
          </button>
        )}
        <button className="osf-mini-btn osf-danger" onClick={() => onDelete(proposal.id)}>
          削除
        </button>
      </div>
    </div>
  );
}

export default function ProposalsTab({ proposals, suppliers, items, onSubmit, onDecide, onReopen, onDelete }) {
  const [deciders, setDeciders] = useState([]);
  const [decidersError, setDecidersError] = useState(null);

  useEffect(() => {
    fetchDeciders()
      .then(setDeciders)
      .catch((e) => setDecidersError(e.message));
  }, []);

  const supplierNames = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const itemNames = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it.name])), [items]);

  const open = proposals.filter((p) => p.status === 'pending' || p.status === 'on_hold');
  const closed = proposals.filter((p) => p.status === 'approved' || p.status === 'rejected');

  const renderCard = (p) => (
    <ProposalCard
      key={p.id}
      proposal={p}
      supplierName={supplierNames[p.supplier_id]}
      itemName={itemNames[p.item_id]}
      deciders={deciders}
      onDecide={onDecide}
      onReopen={onReopen}
      onDelete={onDelete}
    />
  );

  return (
    <div>
      <div className="osf-section-title">検討してほしいものを出す</div>
      <ProposalForm suppliers={suppliers} items={items} onSubmit={onSubmit} />

      {decidersError && <div className="osf-inline-err">判断する人の一覧を読み込めませんでした：{decidersError}</div>}

      <div className="osf-section-title">検討中（{open.length}）</div>
      {open.length === 0 ? <div className="osf-empty">検討中のものはありません。</div> : open.map(renderCard)}

      <div className="osf-section-title">決定済み（{closed.length}）</div>
      {closed.length === 0 ? <div className="osf-empty">決定済みのものはありません。</div> : closed.map(renderCard)}
    </div>
  );
}
