import { useEffect, useRef, useState } from 'react';

// よく使う単位。ここにないものは「自由に入力」で入れられる
const PRESETS = ['個', '本', '袋', '箱', 'kg', 'g', 'L', 'ml', '枚', '缶', '冊', '束', 'パック', 'セット'];

// 在庫・発注数それぞれの単位。タップで選択肢が開き、選ぶか自由に入力して決める
export default function UnitPicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [free, setFree] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const pick = (u) => {
    onChange(u || null);
    setOpen(false);
    setFree('');
  };

  return (
    <span className="osf-unit" ref={ref}>
      <button type="button" className={'osf-unit-btn' + (value ? '' : ' empty')} aria-label={`${label}の単位`} onClick={() => setOpen((o) => !o)}>
        {value || '単位'}
        <i>▾</i>
      </button>
      {open && (
        <div className="osf-unit-pop">
          <div className="osf-unit-title">{label}の単位</div>
          <div className="osf-unit-chips">
            {PRESETS.map((u) => (
              <button type="button" key={u} className={'osf-unit-chip' + (u === value ? ' on' : '')} onClick={() => pick(u)}>
                {u}
              </button>
            ))}
          </div>
          <div className="osf-unit-free">
            <input
              value={free}
              maxLength={8}
              placeholder="自由に入力"
              onChange={(e) => setFree(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && free.trim() && pick(free.trim())}
            />
            <button type="button" className="osf-mini-btn osf-primary" disabled={!free.trim()} onClick={() => pick(free.trim())}>
              決定
            </button>
          </div>
          {value && (
            <button type="button" className="osf-unit-clear" onClick={() => pick(null)}>
              単位をなしにする
            </button>
          )}
        </div>
      )}
    </span>
  );
}
