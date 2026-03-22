-- ============================================================
-- profiles に backlog_space_url カラムを追加
-- （backlog_api_key は初期スキーマで作成済み）
-- ============================================================
ALTER TABLE profiles ADD COLUMN backlog_space_url TEXT;

-- ============================================================
-- user_project_keys: ユーザーごとの同期対象プロジェクトキー
-- 1プロジェクトキー = 1レコードで管理する中間テーブル
-- ============================================================
CREATE TABLE user_project_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_key)
);

CREATE INDEX idx_user_project_keys_user_id ON user_project_keys(user_id);

ALTER TABLE user_project_keys ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全レコードを参照可能
CREATE POLICY "user_project_keys_select"
  ON user_project_keys FOR SELECT TO authenticated USING (true);

-- 自分のレコードのみ追加可能
CREATE POLICY "user_project_keys_insert"
  ON user_project_keys FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 自分のレコードのみ削除可能
CREATE POLICY "user_project_keys_delete"
  ON user_project_keys FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
