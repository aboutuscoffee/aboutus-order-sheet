-- aboutus-order-sheet: 在庫の単位・発注の単位（商品ごと）
-- Supabase SQL Editor で実行してください
-- 既存の unit は「12本入」「1kg」のような荷姿の説明として残す。stock_unit / order_unit は在庫・発注数の数え方の単位（本・箱・袋 など）

alter table os_items add column if not exists stock_unit text;
alter table os_items add column if not exists order_unit text;
