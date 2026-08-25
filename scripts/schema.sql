-- aboutus-order-sheet: 発注表アプリ 初期スキーマ
-- Supabase SQL Editor で実行してください（Beans Profileと同じプロジェクト: wejzwflqswvqepvhruic）
-- 既存の suppliers / wos_suppliers テーブルと衝突しないよう os_ プレフィックスを使用

create table if not exists os_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  free_shipping_threshold integer, -- null = 送料無料ラインなし
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists os_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references os_suppliers(id) on delete cascade,
  name text not null,
  unit text, -- 個・袋・kg など
  unit_price numeric not null default 0,
  stock_qty numeric not null default 0,
  order_qty numeric not null default 0,
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists os_order_history (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references os_suppliers(id) on delete set null,
  supplier_name text not null, -- 発注先が変更・削除されても履歴の表示名は残す
  items jsonb not null, -- [{name, unit, unit_price, order_qty, subtotal}]
  total_amount numeric not null,
  ordered_at timestamptz not null default now(),
  note text
);

alter table os_suppliers enable row level security;
alter table os_items enable row level security;
alter table os_order_history enable row level security;

create policy "os_suppliers anon all" on os_suppliers for all to anon using (true) with check (true);
create policy "os_items anon all" on os_items for all to anon using (true) with check (true);
create policy "os_order_history anon all" on os_order_history for all to anon using (true) with check (true);
