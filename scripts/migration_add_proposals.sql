-- aboutus-order-sheet: 「検討してほしいもの」（稟議）欄を追加
-- Supabase SQL Editor で実行してください
-- 他のアプリのテーブルとは共有せず、os_ プレフィックスの専用テーブルのみ使用

create table if not exists os_proposals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  reason text,
  amount numeric, -- 概算金額（任意）
  submitted_by text not null,
  supplier_id uuid references os_suppliers(id) on delete set null,
  item_id uuid references os_items(id) on delete set null,
  status text not null default 'pending', -- pending（検討待ち）/ approved（承認）/ on_hold（保留）/ rejected（却下）
  decided_by text,
  decision_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table os_proposals enable row level security;
create policy "os_proposals anon all" on os_proposals for all to anon using (true) with check (true);
