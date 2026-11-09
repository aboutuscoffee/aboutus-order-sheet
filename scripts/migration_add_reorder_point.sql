-- aboutus-order-sheet: 発注目安（在庫がこの数を下回ったら要発注）を追加
-- Supabase SQL Editor で実行してください

alter table os_items add column if not exists reorder_point numeric;
