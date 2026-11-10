// 商品の置き場所の編集。主な置き場（選択欄）＋追加の置き場（ラベルを×で外せる、「＋置き場を追加」で足せる）
// onChange には変更した項目だけ { location_id } / { extra_location_ids } を渡す
export default function LocationEditor({ item, locations, onChange }) {
  const extra = item.extra_location_ids ?? [];
  const taken = new Set([item.location_id, ...extra].filter(Boolean));
  const free = locations.filter((l) => !taken.has(l.id));
  const nameOf = (id) => locations.find((l) => l.id === id)?.name ?? '（削除済み）';

  return (
    <div className="osf-loc-editor">
      <select
        className="osf-loc-select"
        aria-label={`${item.name}の置き場`}
        value={item.location_id ?? ''}
        onChange={(e) => onChange({ location_id: e.target.value || null })}
      >
        <option value="">置き場未設定</option>
        {locations
          .filter((l) => l.id === item.location_id || !taken.has(l.id))
          .map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
      </select>
      {extra.map((id) => (
        <span key={id} className="osf-loc-chip">
          {nameOf(id)}
          <button type="button" aria-label={`${nameOf(id)}を外す`} onClick={() => onChange({ extra_location_ids: extra.filter((x) => x !== id) })}>
            ×
          </button>
        </span>
      ))}
      {item.location_id && free.length > 0 && (
        <select
          className="osf-loc-select osf-loc-add"
          aria-label={`${item.name}の置き場を追加`}
          value=""
          onChange={(e) => e.target.value && onChange({ extra_location_ids: [...extra, e.target.value] })}
        >
          <option value="">＋ 置き場を追加</option>
          {free.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
