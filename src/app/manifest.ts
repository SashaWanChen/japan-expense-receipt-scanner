import type { MetadataRoute } from "next";

/** PWA manifest：可加到手機桌面，standalone 顯示。 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "日本旅行記帳",
    short_name: "旅行記帳",
    description: "AI 辨識日文收據，自動翻譯分類並記錄到 Notion",
    lang: "zh-Hant",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7fb",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "掃描收據", url: "/scan" },
      { name: "手動輸入", url: "/add" },
      { name: "統計分析", url: "/stats" },
    ],
  };
}
