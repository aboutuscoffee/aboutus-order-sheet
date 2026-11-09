-- aboutus-order-sheet: カテゴリ・繁忙期の発注目安・商品メモ・閑散期/繁忙期の切り替え設定を追加
-- Supabase SQL Editor で実行してください
-- 既存の reorder_point は「閑散期」の発注目安として扱う

alter table os_items add column if not exists category text;
alter table os_items add column if not exists reorder_point_busy numeric;
alter table os_items add column if not exists item_note text;

create table if not exists os_settings (
  key text primary key,
  value text not null
);

alter table os_settings enable row level security;
create policy "os_settings anon all" on os_settings for all to anon using (true) with check (true);

-- 発注目安の季節: off = 閑散期 / busy = 繁忙期
insert into os_settings (key, value) values ('season', 'off') on conflict (key) do nothing;
