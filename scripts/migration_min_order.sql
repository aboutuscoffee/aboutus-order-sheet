-- aboutus-order-sheet: 最低発注数（最低ロット）の欄を追加
-- Supabase SQL Editor で実行してください（何度実行しても安全です）
alter table os_items add column if not exists min_order_qty numeric;
