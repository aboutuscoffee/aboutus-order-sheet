-- aboutus-order-sheet: 在庫カウント確認チェックを追加
-- Supabase SQL Editor で実行してください

alter table os_items add column if not exists stock_checked boolean not null default false;
