import { useEffect, useState } from 'react';

// 数字は直接入力する（−／＋ボタンはなし）。タップしたら、触った位置にかかわらず数字の右端にカーソルを置く。
// type=number だとカーソルの位置を制御できないので、type=text + inputMode=decimal にしている。
// 入力中は手元の文字列を優先し（「0.」のような途中の状態を壊さない）、フォーカスが外れたら保存値に揃える。
function caretToEnd(el) {
  const n = el.value.length;
  try {
    el.setSelectionRange(n, n);
  } catch {
    // 一部の入力欄では位置を指定できないので無視する
  }
}

// 数字と小数点だけにそろえる（先頭の余計な0・2つ目以降の小数点を除く）
export function cleanNumberText(raw) {
  let t = raw.replace(/[０-９．]/g, (c) => (c === '．' ? '.' : String.fromCharCode(c.charCodeAt(0) - 0xfee0))).replace(/[^\d.]/g, '');
  const dot = t.indexOf('.');
  if (dot >= 0) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '');
  if (t.startsWith('.')) t = `0${t}`;
  return t.replace(/^0+(?=\d)/, '');
}

export default function NumInput({ value, onCommit, disabled, title, ariaLabel, className = '' }) {
  const [text, setText] = useState(String(value ?? 0));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value ?? 0));
  }, [value, focused]);

  return (
    <input
      className={`osf-num ${className}`}
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete="off"
      value={text}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onFocus={(e) => {
        setFocused(true);
        const el = e.target;
        // フォーカス直後はブラウザが位置を決め直すことがあるので、少し遅らせてから右端に置く
        setTimeout(() => caretToEnd(el), 0);
      }}
      onClick={(e) => caretToEnd(e.target)}
      onBlur={() => {
        setFocused(false);
        setText(String(value ?? 0));
      }}
      onChange={(e) => {
        const t = cleanNumberText(e.target.value);
        setText(t);
        onCommit(t);
      }}
    />
  );
}
