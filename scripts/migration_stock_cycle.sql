-- aboutus-order-sheet: 発注先ごとのチェック日に在庫を自動でクリアし、記録を蓄積する
-- Supabase SQL Editor で実行してください（何度実行しても安全です）
--
-- 流れ:
--  ・発注先ごとに「チェック日（曜日）」を持つ。チェック日の朝4時（日本時間）に、その発注先の在庫を空欄（未入力）に戻す
--  ・戻す直前の「在庫」と「その期間に発注した数」を、記録（os_stock_log）に残す
--  ・前回の在庫と発注数は商品に控えておき（prev_stock / prev_order）、新しく在庫を入れたときの「出数」を計算できるようにする
--      出数 = 前回の在庫 + 前回の発注数 − 今回の在庫
--  ・実行は ①毎日 朝4:05（日本時間）の自動実行 と ②アプリを開いたときの確認 の両方。どちらで動いても、同じチェック日に2回は実行されない

-- 1) 発注先: チェック日（0=日 1=月 2=火 3=水 4=木 5=金 6=土）と、最後にクリアした時刻
alter table os_suppliers add column if not exists check_days smallint[] not null default '{}';
alter table os_suppliers add column if not exists last_rollover_at timestamptz;
-- 設定した瞬間にクリアされないよう、今の時刻を「最後にクリアした時刻」にしておく
update os_suppliers set last_rollover_at = now() where last_rollover_at is null;

-- 2) 商品: 在庫を空欄（未入力）にできるようにし、前回の在庫・発注数と、今の期間の発注数を持つ
alter table os_items alter column stock_qty drop not null;
alter table os_items add column if not exists cycle_order_qty numeric not null default 0; -- 今の期間に「発注済み」にした数の合計
alter table os_items add column if not exists prev_stock numeric;                          -- 前回数えた在庫
alter table os_items add column if not exists prev_order numeric;                          -- 前回数えてから今回までに発注した数

-- 3) 記録（チェック日ごと・商品ごと）
create table if not exists os_stock_log (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references os_items(id) on delete set null,
  supplier_id uuid references os_suppliers(id) on delete set null,
  supplier_name text not null,
  item_name text not null,
  closed_on date not null,        -- この記録を締めたチェック日（日本の日付）
  stock_qty numeric,              -- その期間に数えた最後の在庫（数えていなければ null）
  order_qty numeric not null default 0, -- その期間に発注した数
  prev_stock numeric,
  prev_order numeric,
  usage_qty numeric,              -- 出数 = prev_stock + prev_order - stock_qty（計算できないときは null）
  recorded_at timestamptz not null default now()
);
create index if not exists os_stock_log_item_idx on os_stock_log (item_id, closed_on desc);
alter table os_stock_log enable row level security;
drop policy if exists "os_stock_log anon read" on os_stock_log;
create policy "os_stock_log anon read" on os_stock_log for select to anon using (true);

-- 4) 自動クリアの本体
create or replace function os_rollover_stock() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  now_jst timestamp := now() at time zone 'Asia/Tokyo';
  s record;
  d smallint;
  due timestamptz;
  latest timestamptz;
  n integer := 0;
begin
  for s in select * from os_suppliers where coalesce(array_length(check_days, 1), 0) > 0 loop
    -- 直近のチェック日の朝4時（日本時間）。今日がチェック日でまだ4時前なら、1週間前のその曜日
    latest := null;
    foreach d in array s.check_days loop
      due := (date_trunc('day', now_jst) - make_interval(days => ((extract(dow from now_jst)::int - d + 7) % 7)) + interval '4 hours') at time zone 'Asia/Tokyo';
      if due > now() then
        due := due - interval '7 days';
      end if;
      if latest is null or due > latest then
        latest := due;
      end if;
    end loop;

    -- 直近のチェック日より前にしかクリアしていなければ、今クリアする（自動実行が止まっていた場合も、次に開いたときに追いつく）
    if s.last_rollover_at is null or s.last_rollover_at < latest then
      -- 先に記録を残す
      insert into os_stock_log (item_id, supplier_id, supplier_name, item_name, closed_on, stock_qty, order_qty, prev_stock, prev_order, usage_qty)
      select i.id, s.id, s.name, i.name, (latest at time zone 'Asia/Tokyo')::date, i.stock_qty, i.cycle_order_qty, i.prev_stock, i.prev_order,
             case when i.stock_qty is not null and i.prev_stock is not null
                  then i.prev_stock + coalesce(i.prev_order, 0) - i.stock_qty end
      from os_items i
      where i.supplier_id = s.id and i.active;

      -- 在庫を空欄に戻し、数えていた在庫と発注数は「前回」として控える（数えていなかった商品は、前回の在庫を残して発注数だけ足し込む）
      update os_items i set
        prev_stock = case when i.stock_qty is not null then i.stock_qty else i.prev_stock end,
        prev_order = case when i.stock_qty is not null then i.cycle_order_qty else coalesce(i.prev_order, 0) + i.cycle_order_qty end,
        cycle_order_qty = 0,
        stock_qty = null,
        location_stocks = '{}'::jsonb,
        stock_checked = false,
        sheet_stock = null  -- シートの新しい列の数字を、次の取り込みで必ず候補にするため
      where i.supplier_id = s.id and i.active;

      update os_suppliers set last_rollover_at = now() where id = s.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- 5) 毎日 朝4:05（日本時間）に自動実行（pg_cron が使えない場合は、この手順だけ飛ばされ、アプリを開いたときの実行だけで動きます）
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'os-rollover-stock';
  perform cron.schedule('os-rollover-stock', '5 19 * * *', 'select public.os_rollover_stock()');
exception when others then
  raise notice 'pg_cron の設定をスキップしました: %', sqlerrm;
end;
$$;
