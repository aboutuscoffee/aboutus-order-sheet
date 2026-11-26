-- 発注表の「検討」タブと「買ってほしい物リスト」(wl_items) を同じデータで使うための追加
-- Supabase SQL Editor で実行してください（何度実行しても安全です。登録済みのデータは変わりません）
alter table wl_items add column if not exists requested_by text;      -- 依頼した人の名前
alter table wl_items add column if not exists assigned_to_key text;   -- お願いされた人（Todoアプリのスタッフキー）
alter table wl_items add column if not exists assigned_to_name text;  -- お願いされた人の名前
alter table wl_items drop constraint if exists wl_items_status_check;
alter table wl_items add constraint wl_items_status_check check (status in ('requested','bought','on_hold','declined'));
