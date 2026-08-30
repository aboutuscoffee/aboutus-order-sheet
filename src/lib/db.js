import { supabase } from './supabase';

export async function fetchAll() {
  const [suppliers, items] = await Promise.all([
    supabase.from('os_suppliers').select('*').order('sort_order', { ascending: true }),
    supabase.from('os_items').select('*').eq('active', true).order('sort_order', { ascending: true }),
  ]);

  for (const res of [suppliers, items]) {
    if (res.error) throw new Error(res.error.message);
  }

  return {
    suppliers: suppliers.data ?? [],
    items: items.data ?? [],
  };
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

export async function completeOrder(supplier, orderedItems, orderedBy) {
  const total_amount = orderedItems.reduce((sum, it) => sum + it.unit_price * it.order_qty, 0);
  const snapshot = orderedItems.map((it) => ({
    name: it.name,
    unit: it.unit,
    unit_price: it.unit_price,
    order_qty: it.order_qty,
    subtotal: it.unit_price * it.order_qty,
  }));

  const { data, error } = await supabase
    .from('os_order_history')
    .insert({
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      items: snapshot,
      total_amount,
      ordered_by: orderedBy,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: resetError } = await supabase
    .from('os_items')
    .update({ order_qty: 0 })
    .in('id', orderedItems.map((it) => it.id));
  if (resetError) throw new Error(resetError.message);

  return data;
}
