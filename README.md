# 日本旅行記帳 — AI 收據掃描

> TL;DR：手機拍日文收據 → Gemini 辨識翻譯分類 → 寫進 Notion。跑在 GitHub Codespaces 的 **Private 轉發埠**或本機，成本 **$0/月**。

第一次使用請看 [docs/SETUP.md](docs/SETUP.md)。沒有 API key 也可以在「設定 → Demo 模式」用 55 筆假資料瀏覽完整 UI。

## 功能

| 功能 | 說明 |
|:--|:--|
| 掃描收據 | 手機直接開相機，client-side 壓縮到 1024px 後交給 Gemini 辨識 |
| AI 辨識 | 店名 / 品項翻繁中並保留日文原文、金額、日本三種稅制、類別、支付方式、日期 |
| 確認修正 | 每個欄位都可手動修改，可選「一般寫入（一筆）」或「逐品項寫入（多筆）」 |
| 手動輸入 | 沒有收據時直接填表 |
| Dashboard | 今日花費、旅程累計、現金預算進度條、快捷入口 |
| 歷史記錄 | 依日期 / 類別 / 用戶篩選，可編輯與刪除 |
| 統計分析 | 每日趨勢、類別佔比、支付方式與地區分布、TOP 10、預算消化，可按用戶篩選（圖表純 CSS 手刻） |
| 虛擬用戶 | 可自由增刪的記帳標籤，彩色頭像，改名可批次同步 Notion |
| 地區自動判定 | 依行程表（`名古屋 2/23-2/28`）與收據日期自動歸地區 |
| PWA | 可加到手機桌面，standalone 顯示 |
| Demo 模式 | 不呼叫 Notion / Gemini，用假資料預覽 |

## 架構

```
手機瀏覽器 (PWA)
   │  https://<codespace>-3000.app.github.dev（Private 轉發埠）
   │  或 http://localhost:3000
   ▼
Next.js App Router（頁面 + API Routes）
   ├─▶ Gemini 2.0 Flash（Vision AI：OCR + 翻譯 + 分類）
   └─▶ Notion API（資料庫，可在 Notion UI 直接修正）
```

## 技術選型

| Layer | 技術 | 為什麼 |
|:--|:--|:--|
| Framework | **Next.js 16**（App Router） | 前後端一個框架搞定，API Routes 直接接 Gemini / Notion |
| Language | **TypeScript**（strict） | 稅制與金額計算複雜，型別檢查防呆 |
| Styling | **Tailwind CSS v4 + CSS variables** | design tokens 管理色彩，內建深色模式 |
| AI / OCR | **Gemini 2.0 Flash** | 圖片辨識 + 日文翻譯 + 結構化 JSON，一個 API call |
| Database | **Notion** | 免費、有 GUI 可手動修正、可匯出 |
| State | React hooks + localStorage | 不用 Redux / Zustand |
| 執行環境 | GitHub Codespaces（Private port）／本機 | 不需部署平台，天然 HTTPS |

> 圖表全部用純 CSS / SVG 手刻，沒有引入 Chart.js / Recharts。

## 專案結構

```
src/
├── app/
│   ├── page.tsx / layout.tsx / globals.css / manifest.ts
│   ├── login|scan|scan/confirm|add|history|stats|settings/page.tsx
│   └── api/
│       ├── analyze/route.ts      # Gemini Vision
│       ├── debug/route.ts        # 健康檢查
│       ├── login/route.ts        # 密碼驗證
│       └── notion/{route,items,update,delete,rename-user}
├── lib/                          # types, gemini, notion, settings, users,
│                                 # cache, demo-mode, mock-data, region, image…
├── components/                   # BottomNav, Avatar, StatBar, ReceiptForm…
└── middleware.ts                 # 可選密碼保護
```

## 頁面與 API 對照

| 頁面 | 用途 | 主要 API |
|:--|:--|:--|
| `/` | Dashboard | `GET /api/notion` |
| `/scan` | 拍照 / 上傳 | `POST /api/analyze` |
| `/scan/confirm` | 確認 AI 結果 | `POST /api/notion`、`POST /api/notion/items` |
| `/add` | 手動輸入 | `POST /api/notion` |
| `/history` | 歷史記錄 | `GET /api/notion`、`/update`、`/delete` |
| `/stats` | 統計分析 | `GET /api/notion` |
| `/settings` | 設定 | `POST /api/notion/rename-user`、`GET /api/debug` |
| `/login` | 密碼登入（可選） | `POST /api/login` |

| API | Method | 說明 |
|:--|:--|:--|
| `/api/analyze` | POST | 收據圖片（base64）→ Gemini 辨識 |
| `/api/notion` | GET / POST | 讀取（in-memory cache 3 分鐘）／新增 |
| `/api/notion/items` | POST | 逐品項寫入，按比例分攤稅額 |
| `/api/notion/update` | POST | 更新記錄 |
| `/api/notion/delete` | POST | 刪除（archive 到垃圾桶） |
| `/api/notion/rename-user` | POST | 批次改名（舊名 → 新名） |
| `/api/debug` | GET | 健康檢查（不顯示 key 內容） |
| `/api/login` | GET / POST | 查詢是否啟用保護／驗證密碼 |

任何寫入操作都會自動 invalidate `GET /api/notion` 的 cache。

## 開始使用

```bash
cp .env.local.example .env.local   # 填入 GEMINI_API_KEY / NOTION_TOKEN / NOTION_DATABASE_ID
npm install
npm run dev                        # http://localhost:3000
```

### 主要方案：Codespaces + **Private** 轉發埠

1. repo 頁面 → Code → Codespaces → 開新的 Codespace
2. `npm run dev`
3. PORTS 面板確認 port 3000 的 visibility 維持 **Private**（預設值）
4. 手機瀏覽器登入同一個 GitHub 帳號，開 `https://<codespace-name>-3000.app.github.dev`

好處：不用自己電腦開機、天然 HTTPS（PWA 與相機必要）、只有自己能存取，**不需再設密碼**。

注意事項：

- Codespace 閒置一段時間會自動停止，用之前先回 GitHub 重啟
- 手機要保持 GitHub 登入狀態
- PWA standalone 模式可能因 cookie 隔離而要求重新登入，遇到就改用瀏覽器開

### 替代方案

| 方案 | 指令 | 備註 |
|:--|:--|:--|
| Cloudflare Tunnel | `cloudflared tunnel --url http://localhost:3000` | 隨機 `*.trycloudflare.com` 網址，本機要開著 |
| Tailscale Funnel | `tailscale funnel 3000` | 固定 `*.ts.net`，只有自己的 tailnet 進得去 |

### 密碼保護（可選）

- **沒設定 `APP_PASSWORD` → 完全不啟用**，適合 Codespaces Private port 自己用
- 有設定 → 未登入一律導向 `/login`，cookie 為 httpOnly
- 想分享給旅伴：把 port 3000 改成 **Public** 並設定 `APP_PASSWORD`

## 環境變數

| 變數 | 必填 | 說明 |
|:--|:--|:--|
| `GEMINI_API_KEY` | 掃描功能需要 | Google AI Studio |
| `NOTION_TOKEN` | 是 | Notion integration token |
| `NOTION_DATABASE_ID` | 是 | 資料庫 ID |
| `APP_PASSWORD` | 否 | 留空則不啟用密碼保護 |

缺少時不會 crash，畫面會顯示清楚的錯誤與引導；`/api/debug` 可查連線狀態。

## Notion 資料庫欄位

| 欄位 | 類型 |
|:--|:--|
| 項目 | Title |
| 商店名稱 / 商店日文 / 商品日文 / 用戶 / 備註 | Rich Text |
| 日期 | Date |
| 金額 (JPY) | Number |
| 金額 (TWD) | Formula `round(prop("金額 (JPY)") * 0.21)`（程式不寫入） |
| 類別 / 支付方式 / 地區 | Select |

## 成本

| 項目 | 費用 |
|:--|:--|
| Gemini API | $0（免費額度 1,500 req/day） |
| Notion | $0（個人版免費） |
| GitHub Codespaces | $0（個人帳號每月免費額度內） |
| 網域 | 不需要 |
| **Total** | **$0/月** |

## 驗收

```bash
npm run build
npx tsc --noEmit
npm run lint
```

## 關鍵學習

1. **Prompt engineering 最花時間**：外税 / 内税 / 免税、8% 與 10% 混合、割引寫法都要在 prompt 講清楚，還要求 Gemini 自行驗算避免 hallucination。
2. **Notion 當 DB 很實用**：辨識錯了可直接在 Notion UI 改；但要處理分頁（100 筆上限）、property 型別對應、schema 改過的相容問題。
3. **Codespaces Private port 取代部署平台**：天然 HTTPS + GitHub 帳號驗證，個人自用不需要再做一套 auth。
4. **圖片壓縮很有感**：手機照片 3-5MB，壓到最長邊 1024px 上傳快很多，辨識品質沒差。
