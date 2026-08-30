-- aboutus-order-sheet: 発注者名を履歴に記録するための追加
-- Supabase SQL Editor で実行してください

alter table os_order_history add column if not exists ordered_by text;
