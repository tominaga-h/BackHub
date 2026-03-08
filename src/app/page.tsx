import { redirect } from "next/navigation";

/**
 * ルートページ。アクセスすると /projects にリダイレクトする。
 */
export default function Home() {
  redirect("/projects");
}
