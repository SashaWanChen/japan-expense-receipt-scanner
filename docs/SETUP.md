# 安裝設定指南

> TL;DR：拿 Gemini key → 建 Notion 資料庫 → 填 `.env.local` → `npm install && npm run dev` → Codespaces port 3000 保持 Private，手機直接開。

沒有 API key 也能先玩：啟動後到「設定 → Demo 模式」打開，即可用假資料瀏覽所有頁面。

## 1. Gemini API Key

1. 開 <https://aistudio.google.com/app/apikey>（Google 帳號登入）
2. **Create API key** → 選一個 Google Cloud 專案（沒有就讓它自動建）
3. 複製 key（`AIza...`），這就是 `GEMINI_API_KEY`

免費額度：Gemini 2.0 Flash 每天 1,500 次請求，個人記帳綽綽有餘。

## 2. Notion Integration

1. 開 <https://www.notion.so/my-integrations> → **New integration**
2. Name 隨意（例如 `Receipt Scanner`），Type 選 **Internal**
3. 建立後複製 **Internal Integration Secret**（`ntn_...` 或 `secret_...`），這是 `NOTION_TOKEN`

## 3. 建立 Notion 資料庫

在任一頁面輸入 `/database` → **Table view / Database - Full page**，命名例如「日本旅行花費」，然後逐欄建立：

| 欄位名稱 | 類型 | 設定 |
|:--|:--|:--|
| 項目 | Title | 預設的 Name 改名成「項目」即可 |
| 商店名稱 | Text (Rich Text) | |
| 商店日文 | Text | |
| 商品日文 | Text | |
| 日期 | Date | |
| 金額 (JPY) | Number | Format 選 Number 或 Yen |
| 金額 (TWD) | Formula | 見下方公式 |
| 類別 | Select | 餐飲 / 交通 / 購物 / 門票 / 住宿 / 藥品 / 其他 |
| 支付方式 | Select | 現金 / 信用卡 / Suica / PayPay / 其他 |
| 地區 | Select | 依行程加，例如 名古屋 / 京都 / 大阪 |
| 用戶 | Text | 虛擬用戶名稱 |
| 備註 | Text | 稅制、折扣等資訊 |

**金額 (TWD) 公式**（Edit property → Formula）：

```
round(prop("金額 (JPY)") * 0.21)
```

> 0.21 是匯率（JPY→TWD），可依實際匯率調整。程式端**不會寫入**這欄。
> Select 的選項不先建也可以，Notion 會在寫入時自動新增。
> 欄位名稱要**完全一致**（含空格與半形括號），程式靠名稱對應。

## 4. 分享資料庫給 Integration

資料庫頁面右上角 `⋯` → **Connections / 連結** → 搜尋你剛建立的 integration → Confirm。

沒做這步會一直收到 `object_not_found`。

## 5. 取得 Database ID

資料庫頁面 → Share → Copy link，網址長這樣：

```
https://www.notion.so/<workspace>/1a2b3c4d5e6f7890abcdef1234567890?v=...
                                  └────────── Database ID ──────────┘
```

`?` 前面那 32 碼英數字就是 `NOTION_DATABASE_ID`（有沒有連字號都可以）。

## 6. 環境變數

### 本機

```bash
cp .env.local.example .env.local
```

```
GEMINI_API_KEY=AIza...
NOTION_TOKEN=ntn_...
NOTION_DATABASE_ID=1a2b3c4d5e6f7890abcdef1234567890
APP_PASSWORD=          # 留空 = 不啟用密碼保護
```

`.env.local` 已被 `.gitignore` 排除，不會 commit。

### Codespaces（建議）

不要把 key 放進 repo，改用 secrets：

1. <https://github.com/settings/codespaces> → **Codespaces secrets** → New secret
2. 依序新增 `GEMINI_API_KEY`、`NOTION_TOKEN`、`NOTION_DATABASE_ID`（必要時 `APP_PASSWORD`）
3. Repository access 勾選本 repo
4. 已開著的 Codespace 要 **Rebuild / 重啟** 才會讀到新 secret

## 7. 啟動

```bash
npm install
npm run dev
```

開 <http://localhost:3000>。到「設定 → 連線健康檢查」按「執行檢查」，Gemini 與 Notion 都顯示正常就代表串接成功。

## 8. Codespaces Private 轉發埠（手機使用）

1. repo 頁 → **Code → Codespaces → Create codespace on main**
   （`.devcontainer/devcontainer.json` 會自動跑 `npm install`）
2. 終端機執行 `npm run dev`
3. 切到 **PORTS** 面板，確認 port 3000 的 Visibility 是 **Private**（預設就是）
4. 複製 Forwarded Address，形如 `https://<codespace-name>-3000.app.github.dev`
5. 手機瀏覽器**先登入同一個 GitHub 帳號**，再開這個網址

| 情境 | 設定 |
|:--|:--|
| 只有自己用 | Private port，`APP_PASSWORD` 留空 |
| 要分享給旅伴 | port 改 **Public** + 設定 `APP_PASSWORD` |

Public port 等於任何人拿到網址都能開，**一定要設 `APP_PASSWORD`**。

### 常見狀況

| 狀況 | 處理 |
|:--|:--|
| 網址打不開 | Codespace 閒置 30 分鐘會自動停止，回 GitHub 重啟並重跑 `npm run dev` |
| 一直跳 GitHub 登入 | 手機瀏覽器要保持登入狀態，別用無痕模式 |
| PWA 開啟要求重新登入 | standalone 模式 cookie 隔離，改用瀏覽器開即可 |
| 相機叫不出來 | 必須是 HTTPS；`app.github.dev` 本來就是 HTTPS，本機請用 tunnel |

## 9. 加到手機桌面（PWA）

- **iPhone / Safari**：分享鈕 → 加入主畫面
- **Android / Chrome**：右上 `⋮` → 安裝應用程式 / 加到主畫面

開啟後是全螢幕 standalone 模式，跟 App 一樣。

## 10. 替代方案（不用 Codespaces）

### Cloudflare Tunnel

```bash
npm run dev
cloudflared tunnel --url http://localhost:3000
```

會拿到隨機 `https://xxx.trycloudflare.com` 網址（每次重跑都會變）。**公開網址請務必設定 `APP_PASSWORD`。**

### Tailscale Funnel

```bash
tailscale funnel 3000
```

固定 `https://<device>.<tailnet>.ts.net`，只有你的 tailnet 裝置進得去，最安全。

兩者的網域都已列在 `next.config.ts` 的 `allowedDevOrigins`。

## 11. App 內設定

「設定」頁存於瀏覽器 localStorage（每台裝置獨立）：

| 項目 | 說明 |
|:--|:--|
| 總預算 / 備註 | 現金預算進度條的基準 |
| 匯率 | JPY → TWD，畫面上換算用（Notion 的 TWD 由 formula 各自計算） |
| 旅行天數 | 統計頁的日均花費 |
| 行程表 | 每行一個地區，格式 `名古屋 2/23-2/28`，掃描時依日期自動判定地區 |
| 虛擬用戶 | 可增刪改，改名時可選擇同步更新 Notion 既有記錄 |
| Demo 模式 | 開啟後不呼叫 Notion / Gemini，改用 55 筆假資料 |

## 疑難排解

| 訊息 | 原因 / 解法 |
|:--|:--|
| `尚未設定 NOTION_TOKEN...` | `.env.local` 沒填或沒重啟 dev server |
| `object_not_found` | 資料庫沒有分享給 integration（見步驟 4） |
| `Could not find property` | 欄位名稱與規格不一致，請比對步驟 3 的表格 |
| 掃描回「所有模型都失敗」 | Gemini key 無效、超過額度，或圖片太模糊 |
| 金額辨識錯誤 | 在 `/scan/confirm` 直接改；日本收據排版差異大屬正常 |
