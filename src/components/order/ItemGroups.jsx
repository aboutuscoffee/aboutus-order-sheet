import { useState } from 'react';
import { isBelowReorderPoint } from '../../lib/format';

// 折りたたみの開閉は端末ごとに記憶する。何も記憶がないグループは「閉じた状態」から始める
const KEY = 'osf-expanded-groups';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function useExpandedGroups() {
  const [expanded, setExpanded] = useState(load);
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // 記憶できなくても開閉は動くので無視する
      }
      return next;
    });
  return [expanded, toggle];
}

// 商品を「グループなし」と、グループ名ごとのまとまりに分ける（グループは最初に出てきた順）
export function splitByGroup(items) {
  const plain = [];
  const groups = [];
  const index = new Map();
  for (const it of items) {
    if (!it.item_group) {
      plain.push(it);
      continue;
    }
    if (!index.has(it.item_group)) {
      index.set(it.item_group, groups.length);
      groups.push({ name: it.item_group, items: [] });
    }
    groups[index.get(it.item_group)].items.push(it);
  }
  return { plain, groups };
}

// 折りたたんでいても、要発注や発注数ありの商品を見落とさないよう、見出しに件数を出す
export function GroupHeader({ group, expanded, onToggle, season }) {
  const below = group.items.filter((it) => isBelowReorderPoint(it, season)).length;
  const ordering = group.items.filter((it) => (it.order_qty || 0) > 0).length;
  return (
    <button type="button" className="osf-group-head" onClick={onToggle} aria-expanded={expanded}>
      <span className="osf-group-caret">{expanded ? '▼' : '▶'}</span>
      <span className="osf-group-name">{group.name}</span>
      <span className="osf-group-count">{group.items.length}品</span>
      {below > 0 && <span className="osf-reorder-badge">要発注 {below}品</span>}
      {ordering > 0 && <span className="osf-group-ordering">発注 {ordering}品</span>}
    </button>
  );
}

// 商品行（renderRow）を、グループなし→グループごと（見出し＋開いているときだけ中身）の順に並べる
export function GroupedRows({ items, cardId, season, renderRow }) {
  const [expanded, toggle] = useExpandedGroups();
  const { plain, groups } = splitByGroup(items);
  return (
    <>
      {plain.map(renderRow)}
      {groups.map((g) => {
        const id = `${cardId}|${g.name}`;
        const open = !!expanded[id];
        return (
          <div key={id}>
            <GroupHeader group={g} expanded={open} onToggle={() => toggle(id)} season={season} />
            {open && g.items.map(renderRow)}
          </div>
        );
      })}
    </>
  );
}
