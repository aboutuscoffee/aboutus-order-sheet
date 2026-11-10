import { useEffect, useRef } from 'react';

// ファイルのタブのように1つずつ切り替える選択（発注先・置き場）。横にスクロールでき、選んだタブは自動で見える位置に動く。
// tabs: [{ id, label, below(要発注の件数), ordering(発注数が入っている品数) }]
export default function FolderTabs({ tabs, activeId, onSelect, ariaLabel }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [activeId]);

  return (
    <div className="osf-ftabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            ref={active ? activeRef : null}
            role="tab"
            aria-selected={active}
            className={'osf-ftab' + (active ? ' active' : '')}
            onClick={() => onSelect(t.id)}
          >
            <span className="osf-ftab-label">{t.label}</span>
            {t.below > 0 && <span className="osf-ftab-below">{t.below}</span>}
            {t.ordering > 0 && <span className="osf-ftab-ordering" title="発注数が入っています" />}
          </button>
        );
      })}
    </div>
  );
}
