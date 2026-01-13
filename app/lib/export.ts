/**
 * 数据导出工具
 */

import { storage } from "./storage";

/**
 * 导出数据为 JSON 文件并下载
 */
export async function exportData(): Promise<void> {
  const data = await storage.getLocalOnly();

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `let-us-stock-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
