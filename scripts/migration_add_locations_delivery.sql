-- aboutus-order-sheet: 置き場（倉庫・店頭など）と納品チェックを追加
-- Supabase SQL Editor で実行してください

create table if not exists os_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table os_locations enable row level security;
create policy "os_locations anon all" on os_locations for all to anon using (true) with check (true);

alter table os_items add column if not exists location_id uuid references os_locations(id) on delete set null;

-- 発注内の全商品が納品済みになったら true（納品待ちの絞り込み用）
alter table os_order_history add column if not exists all_delivered boolean not null default false;

-- 既存の履歴は納品済み扱いにして、「納品待ち」に過去分が並ばないようにする
update os_order_history set all_delivered = true;
