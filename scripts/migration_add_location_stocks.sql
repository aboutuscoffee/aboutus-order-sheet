-- aboutus-order-sheet: 置き場が2か所以上ある商品の、置き場ごとの在庫
-- Supabase SQL Editor で実行してください
-- location_stocks = { "<置き場ID>": 在庫数, ... }。置き場が1か所の商品は空のまま（stock_qty を使う）。stock_qty は常にその合計

alter table os_items add column if not exists location_stocks jsonb not null default '{}'::jsonb;
