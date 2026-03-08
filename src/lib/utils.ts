import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * clsxでクラス名を結合した後、tailwind-mergeで重複・競合するTailwindクラスを解決する。
 * @param inputs - クラス名（文字列、配列、オブジェクト等を許容）
 * @returns マージ済みのクラス名文字列
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
