# aboutus-order-sheet

発注表アプリ。発注先ごとに在庫数・発注数を入力し、送料無料ラインまでの金額を可視化する。React + Vite + Supabase。

Beans Profile / aboutus-staff-todo とは独立したアプリ。Supabaseプロジェクトのみ共有（テーブルは`os_`プレフィックスで独立、既存の`suppliers`/`wos_suppliers`テーブルとは無関係）。

## セットアップ（初回のみ・手動）

1. **Supabaseにテーブルを作成**
   Supabase SQL Editorで [`scripts/schema.sql`](scripts/schema.sql) の内容を実行する（`os_suppliers` / `os_items` / `os_order_history`）。

2. **ローカル動作確認**
   ```bash
   npm install
   npm run dev
   ```
   `.env` はすでに用意済み（既存Supabaseプロジェクトの接続情報）。

3. **GitHubリポジトリ・Pages・Secrets**（未設定の場合はユーザーが手動で実施）
   - Secrets: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`

## 使い方

- **発注表**：発注先ごとにカード表示。商品の在庫数・発注数を入力すると自動保存され、小計・送料無料ラインまでの残額がリアルタイムで表示される。発注数が入った状態で「発注済みにする」を押すと履歴に記録され、発注数がリセットされる
- **履歴**：発注済みにした内容（発注先・日時・商品ごとの数量と金額・合計）を確認
- **設定**：発注先（名前・送料無料ライン・メモ）と商品（商品名・単位・単価・発注先）の追加・編集・削除

## データ構造

- `os_suppliers` — 発注先（名前・送料無料ライン・メモ）
- `os_items` — 商品（発注先に紐づく・単位・単価・在庫数・発注数）
- `os_order_history` — 発注確定時のスナップショット（発注先名・商品ごとの数量/金額・合計金額・日時）
