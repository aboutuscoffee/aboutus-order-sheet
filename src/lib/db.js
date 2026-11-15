import { supabase } from './supabase';

export async function fetchAll() {
  const [suppliers, items, locations] = await Promise.all([
    supabase.from('os_suppliers').select('*').order('sort_order', { ascending: true }),
    supabase.from('os_items').select('*').eq('active', true).order('sort_order', { ascending: true }),
    supabase.from('os_locations').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
  ]);

  for (const res of [suppliers, items, locations]) {
    if (res.error) throw new Error(res.error.message);
  }

  return {
    suppliers: suppliers.data ?? [],
    items: items.data ?? [],
    locations: locations.data ?? [],
  };
}

export async function fetchSeason() {
  const { data, error } = await supabase.from('os_settings').select('value').eq('key', 'season').maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value === 'busy' ? 'busy' : 'off';
}

// 取り込み機能の設定（シートのID・最後に取り込んだ日時）。シートのIDは公開リポジトリに入れず、DBに置く
export async function fetchSheetSettings() {
  const { data, error } = await supabase.from('os_settings').select('key, value').in('key', ['sheet_id', 'sheet_last_import']);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
}

// 発注停止中（画面に出ない）商品のシート上の行。「アプリにない新しい行」と間違えて知らせないために使う
export async function fetchInactiveSheetKeys() {
  const { data, error } = await supabase.from('os_items').select('sheet_key').eq('active', false).not('sheet_key', 'is', null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.sheet_key);
}

export async function saveSetting(key, value) {
  const { error } = await supabase.from('os_settings').upsert({ key, value });
  if (error) throw new Error(error.message);
}

export async function saveSeason(season) {
  const { error } = await supabase.from('os_settings').upsert({ key: 'season', value: season });
  if (error) throw new Error(error.message);
}

export async function fetchProposals() {
  const { data, error } = await supabase
    .from('os_proposals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertProposal(proposal) {
  const { data, error } = await supabase.from('os_proposals').upsert(proposal).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProposal(id) {
  const { error } = await supabase.from('os_proposals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertLocation(location) {
  const { data, error } = await supabase.from('os_locations').upsert(location).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteLocation(id) {
  const { error } = await supabase.from('os_locations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateHistoryDelivery(id, items) {
  const all_delivered = items.every((it) => it.delivered);
  const { data, error } = await supabase
    .from('os_order_history')
    .update({ items, all_delivered })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchHistory() {
  const { data, error } = await supabase
    .from('os_order_history')
    .select('*')
    .order('ordered_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertSupplier(supplier) {
  // last_rollover_at は自動クリアが管理する値なので、設定の保存では上書きしない
  const { last_rollover_at: _ignored, ...fields } = supplier;
  const { data, error } = await supabase.from('os_suppliers').upsert(fields).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from('os_suppliers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertItem(item) {
  // 前回の在庫・発注数と今の期間の発注数は自動クリア／発注済みが管理する値なので、設定の保存では上書きしない
  const { cycle_order_qty: _c, prev_stock: _s, prev_order: _o, ...fields } = item;
  const { data, error } = await supabase.from('os_items').upsert(fields).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteItem(id) {
  const { error } = await supabase.from('os_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateItemQty(id, fields) {
  const { data, error } = await supabase.from('os_items').update(fields).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function completeOrder(supplier, orderedItems, note) {
  const total_amount = orderedItems.reduce((sum, it) => sum + it.unit_price * it.order_qty, 0);
  const snapshot = orderedItems.map((it) => ({
    name: it.name,
    unit: it.unit,
    unit_price: it.unit_price,
    order_qty: it.order_qty,
    subtotal: it.unit_price * it.order_qty,
    delivered: false,
  }));

  const { data, error } = await supabase
    .from('os_order_history')
    .insert({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      items: snapshot,
      total_amount,
      note: note || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // 発注数をリセットし、今の期間に発注した数として積み上げる（出数の計算・記録に使う）
  const results = await Promise.all(
    orderedItems.map((it) =>
      supabase
        .from('os_items')
        .update({ order_qty: 0, stock_checked: false, cycle_order_qty: (it.cycle_order_qty || 0) + (it.order_qty || 0) })
        .eq('id', it.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(failed.error.message);

  return data;
}

// チェック日になっていた発注先の在庫を空欄に戻す（毎朝の自動実行の取りこぼしを、アプリを開いたときに補う）
export async function rolloverStock() {
  const { data, error } = await supabase.rpc('os_rollover_stock');
  if (error) throw new Error(error.message);
  return data ?? 0;
}
