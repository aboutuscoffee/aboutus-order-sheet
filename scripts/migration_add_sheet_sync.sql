-- aboutus-order-sheet: 元のスプレッドシートから在庫を取り込む（シート → アプリの一方通行）ための列
-- Supabase SQL Editor で実行してください

-- sheet_key: この商品に対応するシートの行（「タブ名|商品名」）
-- sheet_stock: 前回取り込んだときのシートの在庫（シートで変わったものだけを候補にするための記録）
alter table os_items add column if not exists sheet_key text;
alter table os_items add column if not exists sheet_stock numeric;
