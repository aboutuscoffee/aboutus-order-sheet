export default function ConfirmDialog({ confirm, onResolve }) {
  if (!confirm) return null;

  return (
    <div className="osf-modal-backdrop" onClick={() => onResolve(false)}>
      <div className="osf-modal" onClick={(e) => e.stopPropagation()}>
        <p className="osf-modal-text">{confirm.message}</p>
        <div className="osf-modal-actions">
          <button className="osf-mini-btn" onClick={() => onResolve(false)}>
            キャンセル
          </button>
          <button className="osf-mini-btn osf-primary" onClick={() => onResolve(true)}>
            {confirm.okLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
