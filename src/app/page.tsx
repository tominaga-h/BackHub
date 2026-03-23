import { redirect } from "next/navigation";

/**
 * ルートページ。アクセスすると /settings にリダイレクトする。
 * 設定完了後はユーザーが手動でダッシュボードへ遷移する。
 */
export default function Home() {
  redirect("/settings");
}
