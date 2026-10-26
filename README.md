# 聚餐分帳

純前端的聚餐分帳工具。逐道輸入菜品、價格、數量及分攤人員，工具會在瀏覽器本機準確計算每個人的應付金額，並提供複製或系統分享。帳單資料不會上傳。

目前只支援港幣（HKD）。這項最新要求取代 `prompt.md` 與歷史 `PLAN.md` 中舊版的多貨幣規格；兩份原始文件保留供查閱。

## 本機開發

需要 Node.js 22 或更新版本。

```bash
npm ci
npm run dev
```

開發伺服器啟動後，開啟終端顯示的本機網址。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 啟動 Vite 開發伺服器 |
| `npm test` | 執行 Vitest 單元測試 |
| `npm run typecheck` | 執行 TypeScript 型別檢查 |
| `npm run build` | 建置正式靜態檔案至 `dist/` |
| `npm run preview` | 本機預覽正式建置 |

## 計算規則

- 所有金額固定以港幣 HKD 計算，採兩位小數並顯示為 `HK$ 12.34 HKD`；金額輸入使用整數仙運算。
- 菜品以整數最小貨幣單位計算；每道菜在選定人員間平均分攤，餘數依參與者 ID 排序分配，所以畫面排序不影響結果。
- 固定或百分比折扣先依個人菜品小計分攤。稅費與服務費再按折扣後小計分攤，百分比兩者以同一基數計算、互不疊加。百分比最多兩位小數，金額採 half-up 四捨五入。
- 結算前檢查菜品分攤、折扣、費用和個人應付金額的總和守恆。輸入錯誤或菜品尚未指定分攤人員時不會顯示有效結算或允許分享。

## 本機保存與分享

目前帳單會存放在瀏覽器 `localStorage`，使用者清除瀏覽資料或更換瀏覽器後不會保留。未完成的輸入草稿也會保存。損壞或不相容的資料不會自動覆蓋；可先下載原始備份，再確認重設。舊版其他貨幣的帳單會保留原文並提示目前僅支援 HKD；下載備份並確認重設後才可建立新帳單。

完整摘要及單人金額可複製；支援 Web Share API 的瀏覽器可開啟系統分享。剪貼簿或分享失敗時，畫面會提供可手動選取的文字。

## 部署至 GitHub Pages

此專案不使用前端路由。`.github/workflows/deploy.yml` 會在 `main` 分支推送或手動執行時安裝依賴、跑測試和型別檢查，再建置及部署到 GitHub Pages。Vite 的 base 路徑來自 `actions/configure-pages`，不需在程式碼猜測儲存庫名稱。

首次部署前，請在 GitHub 儲存庫的 **Settings → Pages → Build and deployment** 選擇 **GitHub Actions**。工作流程成功後可從該頁查看網站網址。

本機驗證子路徑建置：

```powershell
$env:VITE_BASE_PATH = "/verification-path/"
npm run build
npm run preview
```

若在 PowerShell 執行，請以 `/verification-path/` 開頭的預覽路徑開啟網站。

部署文件：[GitHub Pages 自訂工作流程](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [Vite 靜態部署](https://vite.dev/guide/static-deploy)

## 目前限制

- 只支援每道菜在所選人員間平均分攤，不支援自訂比例或金額。
- 不提供匯率換算、帳單歷史、圖片匯出、付款轉帳或雲端同步。
- 資料僅存在目前瀏覽器的本機儲存空間。
