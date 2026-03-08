-- ============================================================
-- statuses / issue_types テーブルの PK を複合キーに変更
--
-- Backlog 組み込みステータス (id=1~4) や組み込み課題種別は
-- 全プロジェクトで同じ ID を共有するため、単一カラム PK だと
-- 複数プロジェクト同期時に project_id が上書きされる。
-- (project_id, id) の複合 PK に変更して解決する。
-- ============================================================

BEGIN;

-- =========================
-- 1. statuses テーブル
-- =========================

-- 1-a. FK を削除
ALTER TABLE issues DROP CONSTRAINT issues_status_id_fkey;

-- 1-b. 単一 PK を削除
ALTER TABLE statuses DROP CONSTRAINT statuses_pkey;

-- 1-c. 複合 PK を追加
ALTER TABLE statuses ADD PRIMARY KEY (project_id, id);

-- 1-d. 他プロジェクトで欠落しているステータス行を補完
--      (issues が参照しているが statuses に該当 project_id の行がないケース)
INSERT INTO statuses (project_id, id, name, color, display_order)
SELECT DISTINCT ON (i.project_id, i.status_id)
       i.project_id, s.id, s.name, s.color, s.display_order
FROM issues i
JOIN statuses s ON s.id = i.status_id
WHERE NOT EXISTS (
  SELECT 1 FROM statuses s2
  WHERE s2.id = i.status_id AND s2.project_id = i.project_id
)
ON CONFLICT DO NOTHING;

-- 1-e. 複合 FK を追加
ALTER TABLE issues
  ADD CONSTRAINT issues_status_fkey
  FOREIGN KEY (project_id, status_id)
  REFERENCES statuses (project_id, id)
  ON DELETE RESTRICT;

-- =========================
-- 2. issue_types テーブル
-- =========================

-- 2-a. FK を削除
ALTER TABLE issues DROP CONSTRAINT issues_issue_type_id_fkey;

-- 2-b. 単一 PK を削除
ALTER TABLE issue_types DROP CONSTRAINT issue_types_pkey;

-- 2-c. 複合 PK を追加
ALTER TABLE issue_types ADD PRIMARY KEY (project_id, id);

-- 2-d. 他プロジェクトで欠落している課題種別行を補完
INSERT INTO issue_types (project_id, id, name, color, display_order)
SELECT DISTINCT ON (i.project_id, i.issue_type_id)
       i.project_id, it.id, it.name, it.color, it.display_order
FROM issues i
JOIN issue_types it ON it.id = i.issue_type_id
WHERE NOT EXISTS (
  SELECT 1 FROM issue_types it2
  WHERE it2.id = i.issue_type_id AND it2.project_id = i.project_id
)
ON CONFLICT DO NOTHING;

-- 2-e. 複合 FK を追加
ALTER TABLE issues
  ADD CONSTRAINT issues_issue_type_fkey
  FOREIGN KEY (project_id, issue_type_id)
  REFERENCES issue_types (project_id, id)
  ON DELETE RESTRICT;

COMMIT;
