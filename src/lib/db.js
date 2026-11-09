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
  const { data, error } = await supabase.from('os_suppliers').upsert(supplier).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from('os_suppliers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertItem(item) {
  const { data, error } = await supabase.from('os_items').upsert(item).select().single();
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

  const { error: resetError } = await supabase
    .from('os_items')
    .update({ order_qty: 0, stock_checked: false })
    .in('id', orderedItems.map((it) => it.id));
  if (resetError) throw new Error(resetError.message);

  return data;
}
