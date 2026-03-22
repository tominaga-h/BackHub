"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

/** Backlog プロジェクト情報（API レスポンスの項目） */
type BacklogProject = {
  id: number;
  projectKey: string;
  name: string;
};

/**
 * ユーザー設定ページ。
 * Backlog 連携設定（スペースURL、APIキー、同期プロジェクト）を管理する。
 */
export default function SettingsPage() {
  const router = useRouter();

  // フォーム値
  const [spaceUrl, setSpaceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedProjectKeys, setSelectedProjectKeys] = useState<Set<string>>(
    new Set(),
  );

  // Backlog から取得したプロジェクト選択肢
  const [availableProjects, setAvailableProjects] = useState<BacklogProject[]>(
    [],
  );

  // プロジェクト検索クエリ
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  // UI状態
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 初回ロード: 保存済み設定を取得
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        setSpaceUrl(data.spaceUrl ?? "");
        setApiKey(data.apiKey ?? "");
        setSelectedProjectKeys(new Set(data.projectKeys ?? []));

        // URL と API キーが保存済みなら、プロジェクト一覧も自動取得
        if (data.spaceUrl && data.apiKey) {
          await fetchProjects(data.spaceUrl, data.apiKey);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Backlog API からプロジェクト一覧を取得する。
   * 取得成功時に既存選択状態を維持したまま選択肢を更新する。
   */
  const fetchProjects = useCallback(
    async (url?: string, key?: string) => {
      const resolvedUrl = url ?? spaceUrl;
      const resolvedKey = key ?? apiKey;

      if (!resolvedUrl || !resolvedKey) {
        setErrorMessage("Backlog URLとAPIキーを入力してください。");
        return;
      }

      setFetchingProjects(true);
      setErrorMessage("");

      try {
        const res = await fetch("/api/settings/backlog-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spaceUrl: resolvedUrl,
            apiKey: resolvedKey,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "プロジェクトの取得に失敗しました");
        }

        const data = await res.json();
        setAvailableProjects(data.projects ?? []);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "プロジェクトの取得に失敗しました";
        setErrorMessage(message);
        setAvailableProjects([]);
      } finally {
        setFetchingProjects(false);
      }
    },
    [spaceUrl, apiKey],
  );

  /** プロジェクトのチェック状態をトグルする */
  const toggleProjectKey = (key: string) => {
    setSelectedProjectKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  /** 検索クエリでフィルタしたプロジェクト一覧 */
  const filteredProjects = useMemo(() => {
    const q = projectSearchQuery.trim().toLowerCase();
    if (!q) return availableProjects;
    return availableProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.projectKey.toLowerCase().includes(q),
    );
  }, [availableProjects, projectSearchQuery]);

  /** 設定を保存する */
  const handleSave = async () => {
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceUrl: spaceUrl || null,
          apiKey: apiKey || null,
          projectKeys: Array.from(selectedProjectKeys),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "保存に失敗しました");
      }

      setSuccessMessage("設定を保存しました。");
      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "保存に失敗しました";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingSettings) {
    return (
      <div
        data-component="SettingsPage"
        className="flex items-center justify-center py-20"
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-4 text-sm text-gray-500">設定を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-component="SettingsPage" className="mx-auto max-w-3xl">
      {/* ページタイトル */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ユーザー設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          アカウントの環境設定を管理します。
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-6">
            {/* セクションタイトル */}
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">連携設定</h2>
            </div>
            <Separator className="mb-6" />

            {/* Backlog URL */}
            <div className="mb-6">
              <Label htmlFor="spaceUrl" className="mb-2 block text-sm font-medium text-gray-700">
                Backlog URL
              </Label>
              <Input
                id="spaceUrl"
                type="url"
                placeholder="https://your-space.backlog.com"
                value={spaceUrl}
                onChange={(e) => setSpaceUrl(e.target.value)}
              />
            </div>

            {/* Backlog APIキー */}
            <div className="mb-6">
              <Label htmlFor="apiKey" className="mb-2 block text-sm font-medium text-gray-700">
                Backlog APIキー
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="APIキーを入力"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {/* 同期するプロジェクト */}
            <div className="mb-6">
              <Label className="mb-2 block text-sm font-medium text-gray-700">
                同期するプロジェクト
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchProjects()}
                disabled={fetchingProjects || !spaceUrl || !apiKey}
                className="mb-3"
              >
                {fetchingProjects ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    取得中...
                  </>
                ) : (
                  "プロジェクトを取得"
                )}
              </Button>

              {availableProjects.length > 0 && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  {/* プロジェクト検索フォーム */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="プロジェクト名またはキーで検索"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="pl-8 pr-8"
                    />
                    {projectSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setProjectSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* プロジェクト一覧（固定高さ＋スクロール） */}
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {filteredProjects.map((project) => (
                      <label
                        key={project.projectKey}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={selectedProjectKeys.has(
                            project.projectKey,
                          )}
                          onCheckedChange={() =>
                            toggleProjectKey(project.projectKey)
                          }
                        />
                        <span className="text-sm text-gray-700">
                          {project.name}
                          <span className="ml-1 text-xs text-gray-400">
                            ({project.projectKey})
                          </span>
                        </span>
                      </label>
                    ))}
                    {filteredProjects.length === 0 && (
                      <p className="py-2 text-center text-xs text-gray-400">
                        一致するプロジェクトがありません
                      </p>
                    )}
                  </div>
                </div>
              )}

              {availableProjects.length === 0 &&
                !fetchingProjects &&
                spaceUrl &&
                apiKey && (
                  <p className="text-xs text-gray-400">
                    「プロジェクトを取得」を押してプロジェクト一覧を読み込んでください。
                  </p>
                )}
            </div>

            {/* エラー / 成功メッセージ */}
            {errorMessage && (
              <p className="mb-4 text-sm text-red-600">{errorMessage}</p>
            )}
            {successMessage && (
              <p className="mb-4 text-sm text-green-600">{successMessage}</p>
            )}

            <Separator className="mb-6" />

            {/* アクションボタン */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/projects")}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-backhub text-white hover:bg-backhub/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存する"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
