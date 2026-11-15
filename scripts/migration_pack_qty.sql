-- aboutus-order-sheet: 発注1単位あたりの入数（1発注でいくつ届くか）の欄を追加し、出数の記録に反映
-- Supabase SQL Editor で実行してください（何度実行しても安全です）
alter table os_items add column if not exists order_pack_qty numeric;

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

    if s.last_rollover_at is null or s.last_rollover_at < latest then
      insert into os_stock_log (item_id, supplier_id, supplier_name, item_name, closed_on, stock_qty, order_qty, prev_stock, prev_order, usage_qty)
      select i.id, s.id, s.name, i.name, (latest at time zone 'Asia/Tokyo')::date, i.stock_qty, i.cycle_order_qty, i.prev_stock, i.prev_order,
             case when i.stock_qty is not null and i.prev_stock is not null
                  then i.prev_stock + coalesce(i.prev_order, 0) * coalesce(i.order_pack_qty, 1) - i.stock_qty end
      from os_items i
      where i.supplier_id = s.id and i.active;

      update os_items i set
        prev_stock = case when i.stock_qty is not null then i.stock_qty else i.prev_stock end,
        prev_order = case when i.stock_qty is not null then i.cycle_order_qty else coalesce(i.prev_order, 0) + i.cycle_order_qty end,
        cycle_order_qty = 0,
        stock_qty = null,
        location_stocks = '{}'::jsonb,
        stock_checked = false,
        sheet_stock = null
      where i.supplier_id = s.id and i.active;

      update os_suppliers set last_rollover_at = now() where id = s.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
