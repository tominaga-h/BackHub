-- ============================================================
-- profiles: BackHub認証ユーザー
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url  TEXT,
  backlog_api_key TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- projects: Backlogプロジェクト
-- ============================================================
CREATE TABLE projects (
  id          INTEGER PRIMARY KEY,
  project_key TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  synced_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);

-- ============================================================
-- statuses: プロジェクトごとのステータス
-- ============================================================
CREATE TABLE statuses (
  id            INTEGER PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "statuses_select" ON statuses FOR SELECT TO authenticated USING (true);

-- ============================================================
-- issue_types: プロジェクトごとの課題種別
-- ============================================================
CREATE TABLE issue_types (
  id            INTEGER PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

ALTER TABLE issue_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issue_types_select" ON issue_types FOR SELECT TO authenticated USING (true);

-- ============================================================
-- milestones: プロジェクトごとのマイルストーン
-- ============================================================
CREATE TABLE milestones (
  id               INTEGER PRIMARY KEY,
  project_id       INTEGER NOT NULL REFERENCES projects ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  start_date       DATE,
  release_due_date DATE,
  archived         BOOLEAN NOT NULL DEFAULT false,
  display_order    INTEGER NOT NULL
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones_select" ON milestones FOR SELECT TO authenticated USING (true);

-- ============================================================
-- categories: プロジェクトごとのカテゴリ
-- ============================================================
CREATE TABLE categories (
  id            INTEGER PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);

-- ============================================================
-- members: Backlogユーザー
-- ============================================================
CREATE TABLE members (
  id              INTEGER PRIMARY KEY,
  backlog_user_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  mail_address    TEXT,
  role_type       INTEGER NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select" ON members FOR SELECT TO authenticated USING (true);

-- ============================================================
-- project_members: プロジェクト-メンバー中間テーブル
-- ============================================================
CREATE TABLE project_members (
  project_id INTEGER NOT NULL REFERENCES projects ON DELETE CASCADE,
  member_id  INTEGER NOT NULL REFERENCES members ON DELETE CASCADE,
  PRIMARY KEY (project_id, member_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_members_select" ON project_members FOR SELECT TO authenticated USING (true);

-- ============================================================
-- issues: Backlog課題
-- ============================================================
CREATE TABLE issues (
  id                 INTEGER PRIMARY KEY,
  project_id         INTEGER NOT NULL REFERENCES projects ON DELETE CASCADE,
  issue_key          TEXT NOT NULL UNIQUE,
  key_id             INTEGER NOT NULL,
  summary            TEXT NOT NULL,
  description        TEXT,
  issue_type_id      INTEGER NOT NULL REFERENCES issue_types ON DELETE RESTRICT,
  status_id          INTEGER NOT NULL REFERENCES statuses ON DELETE RESTRICT,
  priority_id        INTEGER NOT NULL,
  priority_name      TEXT NOT NULL,
  assignee_id        INTEGER REFERENCES members ON DELETE SET NULL,
  parent_issue_id    INTEGER REFERENCES issues ON DELETE SET NULL,
  start_date         DATE,
  due_date           DATE,
  estimated_hours    DECIMAL,
  actual_hours       DECIMAL,
  created_user_id    INTEGER NOT NULL REFERENCES members ON DELETE RESTRICT,
  backlog_created_at TIMESTAMPTZ NOT NULL,
  backlog_updated_at TIMESTAMPTZ NOT NULL,
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issues_project_id ON issues (project_id);
CREATE INDEX idx_issues_status_id ON issues (status_id);
CREATE INDEX idx_issues_assignee_id ON issues (assignee_id);
CREATE INDEX idx_issues_backlog_updated_at ON issues (backlog_updated_at);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues_select" ON issues FOR SELECT TO authenticated USING (true);

-- ============================================================
-- issue_milestones: 課題-マイルストーン中間テーブル
-- ============================================================
CREATE TABLE issue_milestones (
  issue_id     INTEGER NOT NULL REFERENCES issues ON DELETE CASCADE,
  milestone_id INTEGER NOT NULL REFERENCES milestones ON DELETE CASCADE,
  PRIMARY KEY (issue_id, milestone_id)
);

CREATE INDEX idx_issue_milestones_milestone_id ON issue_milestones (milestone_id);

ALTER TABLE issue_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issue_milestones_select" ON issue_milestones FOR SELECT TO authenticated USING (true);

-- ============================================================
-- issue_categories: 課題-カテゴリ中間テーブル
-- ============================================================
CREATE TABLE issue_categories (
  issue_id    INTEGER NOT NULL REFERENCES issues ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories ON DELETE CASCADE,
  PRIMARY KEY (issue_id, category_id)
);

CREATE INDEX idx_issue_categories_category_id ON issue_categories (category_id);

ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issue_categories_select" ON issue_categories FOR SELECT TO authenticated USING (true);

-- ============================================================
-- issue_remarks: BackHub固有の備考欄
-- ============================================================
CREATE TABLE issue_remarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   INTEGER NOT NULL UNIQUE REFERENCES issues ON DELETE CASCADE,
  content    TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES profiles ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE issue_remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issue_remarks_select" ON issue_remarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "issue_remarks_insert" ON issue_remarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "issue_remarks_update" ON issue_remarks FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- Realtime 有効化
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE issues;
ALTER PUBLICATION supabase_realtime ADD TABLE issue_remarks;

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_issue_remarks_updated_at
  BEFORE UPDATE ON issue_remarks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
