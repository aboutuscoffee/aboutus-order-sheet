import { supabase } from './supabase';
import { yen } from './format';

// aboutus-staff-todo と共有しているSupabaseの staff / tasks / notifications テーブルを使い、
// 「発注をお願いする」を Todo アプリの個人への依頼（承認あり）として届ける。

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// パスワードハッシュ等は取得しない（必要な列だけ選ぶ）
export async function fetchStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('key, name')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function requestOrder({ supplier, items, note, fromStaff, toStaff }) {
  const ordered = items.filter((it) => (it.order_qty || 0) > 0);
  const total = ordered.reduce((sum, it) => sum + it.unit_price * it.order_qty, 0);
  const text = `${supplier.name}の発注（${yen(total)}）`;
  const lines = ordered.map((it) => `${it.name} × ${it.order_qty}${it.unit || ''}`);
  const comment = [...lines, note ? `備考: ${note}` : null, '発注表: https://aboutuscoffee.github.io/aboutus-order-sheet/']
    .filter(Boolean)
    .join('\n');
  const today = todayStr();

  const { error: taskError } = await supabase.from('tasks').insert({
    staff_key: toStaff.key,
    text,
    comment,
    duty: 'その他',
    priority: 'mid',
    status: '',
    done: false,
    done_date: null,
    deadline: today,
    workdate: today,
    minutes: null,
    from_pool: true,
    pending_approval: true,
    offered_by: fromStaff.key,
  });
  if (taskError) throw new Error(taskError.message);

  const message = `${fromStaff.name}さんから「${text}」の依頼が届きました`;
  const notifications = [
    { staff_key: toStaff.key, type: 'task_offered', message, from_key: fromStaff.key, related_id: null, read: false },
    {
      staff_key: fromStaff.key,
      type: 'pool_posted',
      message: `「${text}」を${toStaff.name}さんに依頼しました`,
      from_key: null,
      related_id: null,
      read: false,
    },
  ];
  // タスクは作成済みなので、通知やプッシュの失敗では依頼自体を失敗にしない
  const { error: notifyError } = await supabase.from('notifications').insert(notifications);
  if (notifyError) console.error('notification insert failed:', notifyError.message);

  supabase.functions
    .invoke('staff-todo-send-push', {
      body: { staff_key: toStaff.key, title: 'ABOUT US STAFF TODO', body: message },
    })
    .catch((e) => console.error('push failed:', e.message));
}
