import { useState } from 'react';

export default function ConfirmDialog({ confirm, onResolve }) {
  const [inputValue, setInputValue] = useState('');

  if (!confirm) return null;

  const withInput = !!confirm.withInput;
  const canSubmit = !withInput || inputValue.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onResolve(withInput ? inputValue.trim() : true);
    setInputValue('');
  };

  const cancel = () => {
    onResolve(false);
    setInputValue('');
  };

  return (
    <div className="osf-modal-backdrop" onClick={cancel}>
      <div className="osf-modal" onClick={(e) => e.stopPropagation()}>
        <p className="osf-modal-text">{confirm.message}</p>
        {withInput && (
          <input
            className="osf-modal-input"
            autoFocus
            value={inputValue}
            placeholder={confirm.inputPlaceholder ?? ''}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        )}
        <div className="osf-modal-actions">
          <button className="osf-mini-btn" onClick={cancel}>
            キャンセル
          </button>
          <button className="osf-mini-btn osf-primary" disabled={!canSubmit} onClick={submit}>
            {confirm.okLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
