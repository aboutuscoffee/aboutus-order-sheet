// 二条城 発注表（Google スプレッドシート）から、商品ごとの「最新の在庫」を読み取る。
// 最新の在庫 = その商品の行で、日付の列を左（新しい日付）から順に見て、最初に数字が入っているもの。
// （左ほど新しい日付。最新の列が空欄の商品は、その次に新しい日付の値を使う。どの日付の値かは asOf で返す）
// シート → アプリの一方通行。シートへの書き込みはしない。
// シートは「リンクを知っている全員が閲覧可」の設定なので、ログインなしで gviz の CSV として読める。

// タブごとの読み方。off は「発注目安」の列（シートの1行目に「在庫が下記数字を切ったら…」と書かれている列）を自動で探す
export const SHEET_TABS = [
  { tab: 'ミナト', dateRow: 0, dateMinCol: 4 },
  { tab: 'タカナシ', single: true, dateRow: 1, dateMinCol: 3, firstDataRow: 4 },
  { tab: 'Food・Drink関連', dateRow: 0, dateMinCol: 4 },
  { tab: '備品類', dateRow: 0, dateMinCol: 4 },
  // 澤野井さんのタブは先頭の「最新更新日」の2列（右の方が新しい日付）に直近の在庫が入り、その右に日付ごとの列が続く。
  // 新しい順に 右の列→左の列→日付ごとの列 と見ていく
  { tab: '澤野井さん発注', dateRow: 1, dateMinCol: 5, fixedStockCols: [3, 2], titles: ['インフォメーションカード', 'SOSOGU', 'オンラインインフォメーションカード', 'TOKINOHA'] },
];

// 澤野井さんのタブで、小見出しごとに商品名の前に付ける言葉（アプリ側の商品名と合わせてある）
const SECTION_PREFIX = {
  店頭: 'インフォメーションカード 店頭',
  SOSOGU: 'インフォメーションカード SOSOGU',
  オンラインインフォメーションカード: 'オンラインインフォメーションカード',
  TOKINOHA: 'TOKINOHA',
};

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function toNum(s) {
  const t = (s ?? '')
    .trim()
    .replace(/[０-９．]/g, (c) => (c === '．' ? '.' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)))
    .replace(/,/g, '');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

const norm = (s) => (s ?? '').replace(/[\s　]/g, '');

// 商品名の整形（移行時と同じ規則。アプリ側の商品名と一致させるため）
function cleanName(raw, prevName) {
  const trimmed = raw.trim();
  let name = trimmed;
  let base = prevName;
  if (/^[\s　]/.test(raw) && prevName) name = `${prevName.split(/[\s　]/)[0]} ${trimmed}`;
  else base = trimmed;
  if (/発注停止中/.test(name)) name = name.replace(/（発注停止中）|\(発注停止中\)/, '');
  if (/まだ発注しなくて/.test(name)) name = name.replace(/\(まだ発注しなくて◯\)|（まだ発注しなくて◯）/, '');
  if (name.startsWith('食洗機用洗剤（電話）')) name = '食洗機用洗剤（電話発注）';
  return { name: name.trim(), base };
}

// 1つのタブのCSV → [{ key, label, stock }]。key は「タブ名|商品名」で、アプリ側の os_items.sheet_key と対応する
export function parseSheetRows(cfg, rows) {
  const out = [];
  const seen = new Set();

  // 発注目安の列（ラベル行の判定に使う）
  let offCol = -1;
  for (const r of rows.slice(0, 3)) {
    const i = r.findIndex((c) => (c ?? '').includes('切ったら'));
    if (i >= 0) offCol = i;
  }

  // 在庫が入る列を、日付が新しい順（左から）に並べる。asOf の表示のため、列ごとの日付の文字も控える
  const header = rows[cfg.dateRow ?? 0] ?? [];
  const isDate = (c) => /^\d{1,2}\/\d{1,2}$/.test((c ?? '').trim());
  const dated = header.map((c, i) => i).filter((i) => i >= cfg.dateMinCol && isDate(header[i]));
  const stockCols = [...(cfg.fixedStockCols ?? []), ...dated];

  let section = cfg.single ? cfg.tab : null;
  let prevName = '';
  const start = cfg.firstDataRow ?? 0;
  for (let r = start; r < rows.length; r++) {
    const row = rows[r];
    const a = (row[0] ?? '').replace(/\r/g, '');
    const trimmed = a.trim();
    if (!trimmed) continue;

    if (!cfg.single) {
      const isLabelRow = offCol >= 0 && (row[offCol] ?? '').trim() === '閑散期';
      if (isLabelRow) { section = trimmed; prevName = ''; continue; }
      if (cfg.titles?.includes(norm(trimmed)) && [1, 2, 3].every((c) => !(row[c] ?? '').trim())) { section = norm(trimmed); prevName = ''; continue; }
      if (section === null) continue; // 最初の見出しより前（日付や発注者の行）は読まない
    }
    if (trimmed === '合計金額' || trimmed.startsWith('※')) continue;
    if (cfg.single && trimmed === 'ナカデケイラン') continue;

    const { name, base } = cleanName(a, prevName);
    prevName = base;
    const prefix = cfg.tab === '澤野井さん発注' ? SECTION_PREFIX[norm(section)] : null;
    const label = prefix ? `${prefix}／${name}` : name;
    const key = `${cfg.tab}|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // 左から見て、最初に数字になるセルを使う（空欄・「発注済み」などの文字は飛ばす）
    let stock = null;
    let asOf = '';
    for (const c of stockCols) {
      const n = toNum(row[c]);
      if (n !== null) {
        stock = n;
        asOf = (header[c] ?? '').trim();
        break;
      }
    }
    // 発注目安の元の文字（「3本」「0.5袋」など。単位の推測に使う）
    const targetRaw = offCol >= 0 ? [row[offCol], row[offCol + 1]].map((v) => (v ?? '').trim()).find((v) => v !== '') ?? '' : '';
    out.push({ key, label, stock, asOf, targetRaw });
  }
  return out;
}

// 全タブを読み込む。戻り値は key → { label, stock, asOf } のMap
export async function fetchSheetStocks(sheetId) {
  const all = new Map();
  for (const cfg of SHEET_TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cfg.tab)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`シートの「${cfg.tab}」を読み込めませんでした（${res.status}）`);
    for (const row of parseSheetRows(cfg, parseCSV(await res.text()))) all.set(row.key, row);
  }
  return all;
}
