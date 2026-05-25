# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

BackHub は、複数の Backlog プロジェクトにまたがる課題を 1 画面で横断的に一覧・管理する社内向け Web サービス。Next.js (App Router) + Supabase で構成され、Vercel へのデプロイを想定している。詳細な要件は `docs/OVERVIEW.md`、フェーズ計画は `docs/DEVELOP_PHASE.md`、DB スキーマは `docs/DB_SCHEMA.md` を参照。

## コマンド

```bash
make dev          # 開発サーバー起動（.env を source し HOST/PORT を反映）
make build        # 本番ビルド
make lint         # ESLint
make typecheck    # npx tsc --noEmit（型チェックのみ）
make push         # npx supabase db push（マイグレーション適用）
make list         # npx supabase migrations list
```

`npm run dev` は `source .env && next dev -H $HOST -p $PORT` を実行するため、`.env` に `HOST`/`PORT` を定義しておく必要がある（`.env.sample` には未記載なので注意）。テストフレームワークは未導入。

## アーキテクチャ

### データフローの核心：Backlog → Supabase → フロントエンド

このアプリは Backlog API を直接フロントから叩かない。**Backlog のデータを Supabase に同期し、フロントは Supabase からのみ読む** という二段構えが設計の中心。

1. **同期 (write path)**: `POST /api/backlog/sync` が `backlog-fetcher.ts`（Backlog API から生データ取得）→ `backlog-sync.ts`（Supabase へ upsert）を呼ぶ。
2. **表示 (read path)**: `GET /api/backlog/projects` が Supabase から読み、フロント用の `Project[]` 型（`src/types/index.ts`）に変換して返す。
3. **クライアント状態**: `ProjectDataContext`（`src/contexts/ProjectDataContext.tsx`）がマウント時に `/api/backlog/projects` を fetch し、フィルター状態（ステータス/プロジェクト/担当者）を一元管理する。ダッシュボード配下のページはすべて `useProjectData()` でこのコンテキストから読む。

DB のカラム名（snake_case）とフロントの型（camelCase）は別物。変換は `backlog-sync.ts`（フロント型 → DB）と `api/backlog/projects/route.ts` の `loadProjectFromDb`（DB → フロント型）に集約されている。新しいフィールドを通す際はこの両方を更新する。

### 同期処理の順序制約（backlog-sync.ts）

FK 制約のため投入順が固定されている: `projects → members → マスタ(statuses/issue_types/milestones/categories) → project_members → issues`。
- `parent_issue_id` は全 issue を upsert した後の**第 2 パス**で設定する（自己参照 FK のため）。
- `project_members` / `issue_milestones` / `issue_categories` は upsert ではなく **delete → insert の全件洗い替え**（プロジェクトから外れた関連を確実に除去するため）。

### Backlog 設定の解決順序

`backlog-client.ts` の各関数は「引数 → 環境変数フォールバック」の順で設定を解決する。実運用ではユーザーごとの設定（`profiles.backlog_*` と `user_project_keys`、`src/lib/settings.ts` の `getUserBacklogSettings` で取得）を引数として渡し、未設定時のみ `.env` の `BACKLOG_*` にフォールバックする。

### Supabase クライアントは 3 種類を使い分ける

- `src/lib/supabase/server.ts` — Server Components / Route Handlers 用（cookie ベースのセッション、RLS 適用、認証チェックに使う）。
- `src/lib/supabase/browser.ts` — クライアントコンポーネント用（cookie セッション維持）。
- `src/lib/supabase.ts` の `createServiceClient()` — **Service Role Key 使用で RLS をバイパス**。BFF からのバッチ書き込み専用。`supabase`（匿名キー）も同ファイルにあるが用途は限定的。

API Route では「`server.ts` の `createClient()` で `auth.getUser()` による認証チェック → `createServiceClient()` で実際の DB 操作」というパターンが定型。

### 認証とルーティング

- `src/middleware.ts` が全リクエストでセッションをリフレッシュし、未認証なら `/login`、認証済みで `/login` アクセスなら `/projects` へリダイレクト。`PUBLIC_PATHS` = `/login`, `/auth/callback`, `/api/`。
- OAuth は Supabase Auth（Google / GitHub）。コールバックは `/auth/callback/route.ts`（PKCE コード → セッション交換）。
- ルートページ `/` は `/settings` へリダイレクト。Backlog 設定が未構成（`needsSetup`）の場合、ダッシュボードレイアウトが `/settings` へ誘導する。
- ダッシュボードは `src/app/(dashboard)/` ルートグループ配下（`/projects`, `/assignees`）。共通の `DashboardShell` が Header・GlobalFilterBar・ローディング/エラー/空状態を描画する。

## コーディング規約（.cursor/rules）

- **`data-component` 属性**: 全 React コンポーネントのルート DOM 要素に `data-component="関数名"` を付与する（DOM を返さないプロバイダー等は最初に描画される子要素に付与）。スクロール処理などがこの属性に依存している（例: `[data-component="GlobalFilterBar"]`）。
- **TSX 内でのデータ定義禁止**: 配列・オブジェクトは TSX の外（TypeScript として）で定義し、TSX 内では参照のみ。
- **コメント**: コードにはなるべく日本語コメントを付ける（既存コードは JSDoc 形式の関数コメントが標準）。
- 作業開始時はまず `docs/OVERVIEW.md` を読む。

## その他

- **DB の型** (`src/types/database.ts`) は Supabase スキーマから生成される型。マイグレーション変更時は再生成が必要。マイグレーションは `supabase/migrations/`、`make push` で適用。
- **YAML import**: `next.config.ts` で yaml-loader を Turbopack / webpack 両方に設定済み。`src/lib/mock.yaml` のようにモックデータを YAML で読める。
- **パスエイリアス**: `@/*` → `src/*`。
- **UI**: shadcn/ui（style: `base-nova`, baseColor: neutral, lucide アイコン）。プリミティブは `src/components/ui/`、機能別コンポーネントは `filters/` `issues/` `layout/` に分かれる。

<!-- dev-cycle:toolchain start -->

## dev-cycle ツールチェーン定義（自動生成）

このセクションは `/task-dev-cycle` スキルにより自動管理されている。手動編集は可能だが、フォーマット（マーカーとキー名）は変更しないこと。再検出させたい場合はブロックごと削除する。

- `<TEST_CMD>`: ` `（テストフレームワーク未導入。品質ゲートは型チェック+lintで代替）
- `<BUILD_CMD>`: `make build`
- `<LINT_CMD>`: `make lint`
- `<CHECK_CMD>`: `make typecheck`
- `<VERSION_FILE>`: `package.json`
- `<VERSION_BUMP_POLICY>`: SemVer 2.0.0 標準（ただし SEMVER 運用は無効）
- `<SEMVER_ENABLED>`: `false`
- 検出日: `2026-05-25`
<!-- dev-cycle:toolchain end -->
