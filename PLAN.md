# 分帳工具實作交接計畫

需求依據：`prompt.md` 與 `AGENTS.md`。目前只有需求文件，尚無應用、套件或 Git 儲存庫。本文件由規劃階段建立；實作者應完成整個可運作的應用與驗證，不能只交付本計畫。

## 模型與工作範圍

- 使用者指定：GPT-6.1 Sol 規劃、GPT-6 Luna 實作；可用模型識別碼分別為 `gpt-6.1-sol`、`gpt-6-luna`。實作者在更新 `AGENTS.md` 的專案狀態時，記錄這項協作方式。不建立新的使用者聊天。
- 純前端 React + TypeScript + Vite，採用 Tailwind CSS、Lucide React 與 Vitest；npm 及 `package-lock.json`。不加路由、狀態管理框架、十進位套件、後端或外部資料服務。
- 使用現有工作目錄，保留既有需求文件。Sites 技能只採本機工作流程；部署目標仍為 GitHub Pages，不註冊或發布 Sites。
- 實作者負責全部應用檔案、README 與 AGENTS 狀態更新；規劃階段只負責本檔。
- 第一版完成所有核心功能；不加入可選的圖片匯出、多帳單歷史、付款轉帳或自訂分攤比例。

## 產品認知與介面決策

- 這是聚餐後由一位朋友代大家輸入菜品、算清金額並分享的手機工具；主要物件只有參與者、菜品、折扣與附加費、結算。
- 新專案／手機任務介面；入口是空白帳單或恢復的草稿。第一個決定是加入誰，接著輸入菜品及分攤人員，最後複製或分享。
- 成功是所有人的應付金額準確相加等於整單總額，能核對明細並交給朋友。錯誤要指到可修正欄位；保存或複製失敗要有保留資料的替代途徑。
- 推薦原生表單、`fieldset`、`details`、React 元件與少量自訂樣式，避免為這個小工具引入大型 UI 套件。另一可行方向是分步精靈，但會增加來回切換；本版用單頁漸進揭露。
- 視覺方向比較：普通金融表單最保守；餐桌收據式工具更符合核帳情境；色彩強烈的社交介面容易壓過數字。選餐桌收據式工具，以精確、親切、易核對為主。
- 配色：畫布 `#F4F7FA`、表面 `#FFFFFF`、文字 `#172B3A`、主操作 `#146B62`、線條 `#D7E1E8`、錯誤 `#B42318`。小面積淡綠提示即可，不用漸層或裝飾圖。
- 字型採本機系統繁體中文字體（例如 Microsoft JhengHei、PingFang TC、sans-serif），金額用 `tabular-nums`；不依賴遠端字型。標題約 24–28px、區塊標題 18px、內文及輸入 16px、次要標籤 13–14px。
- 桌面：左側參與者／菜品／可收合費用，右側較窄的帳單摘要及結算；只對摘要做適度 sticky。手機：標頭與貨幣 → 參與者 → 菜品 → 費用 → 摘要與個人結果。避免底部固定列遮住鍵盤與長帳單。
- 表單左對齊、金額右對齊；區塊之間以留白和分隔線建立層級，菜品必要時用輕邊框容器，避免整頁等大卡片。唯一強調是有效結算的總金額。
- 主要文字用繁體中文；操作為「新增參與者」「新增菜品」「複製摘要」「分享結算」「新帳單」。菜品內直接顯示分攤人員，附「全選／清除」。費用顯示一句「稅費與服務費皆依折扣後菜品金額計算，互不疊加」。
- 首頁不放行銷 hero、技術術語、假統計或範例金額。可用短 placeholder 協助輸入，但初始帳單保持空白。
- 所有欄位有標籤，錯誤以文字加 `aria-describedby` 關聯；原生 checkbox 選分攤人員，按鈕及輸入保留可見焦點；觸控目標至少 44px。金額 `inputMode="decimal"`，數量 `inputMode="numeric"`。
- 同名顯示可由同名成員的穩定 ID 排序派生「Alex（1）」「Alex（2）」；計算、選項、明細與分享共用同一個標籤函式，不能以顯示名字當 ID。
- 空白時告知「先新增參與者，再加入菜品」；有錯時摘要與分享顯示待修正及原因，不把部分結果顯示成正式總額。輸入中不得保留上一次有效金額冒充目前結算。
- 驗證：320px、約 390px、桌面畫面，長名字、大量項目、鍵盤、焦點、展開明細、橫向溢出及分享失敗；截圖後實際檢視，不只依賴 build。

## 檔案與資料責任

```text
src/types/bill.ts                 草稿、有效模型、結果、錯誤型別
src/utils/money.ts                貨幣精度、字串解析、安全範圍、百分比、格式化
src/utils/validation.ts           草稿與保存邊界驗證
src/utils/splitCalculator.ts      純計算、最大餘數分配、守恆檢查
src/utils/storage.ts              版本化讀寫與失敗狀態
src/utils/share.ts                有效結果轉文字、分享／剪貼板操作
src/hooks/useBill.ts              草稿更新及參與者刪除的原子操作
src/hooks/useBillStorage.ts       首次載入與保存效果
src/components/                  參與者、菜品、費用、摘要、個人結果、分享替代
src/App.tsx                      組合工作區與目前計算狀態
tests/                           金額、計算、保存與分享測試
.github/workflows/deploy.yml      檢查、建置、GitHub Pages 部署
README.md                        指令、規則、部署與已知限制
```

- 草稿保留價格、數量與費用的原始輸入字串，使空白、`1.` 或非法輸入仍能編輯及恢復；不要輸入每個字時立即轉成 Number。
- `Participant = { id, name }`；`FoodItem = { id, name, unitPrice: string, quantity: string, participantIds: string[] }`；費用用 `{ mode: 'none' | 'percent' | 'fixed', value: string }`；帳單含標題、currency、participants、items、discount、tax、serviceCharge。
- ID 使用 `crypto.randomUUID()`；不以索引或名字識別。刪除參與者和移除所有菜品對應 ID 必須在同一次草稿更新完成；空分攤留下菜品並標待處理。
- 驗證成功才產生正整數數量、整數最小貨幣單位與百分比整數的有效模型。計算回傳結構化成功／錯誤聯集，不把驗證錯誤丟到整頁未捕捉例外。
- React 只保存草稿及必要互動狀態；計算結果由當前草稿衍生，避免同步另一份結果 state。初始化用 lazy initializer；新增、修改、刪除用函式型更新。不要預先全面 memo；只有昂貴的衍生計算需要時才 memo。

## 精確金額規格

1. 貨幣表：MYR 預設，SGD／USD／CNY 皆 2 位，JPY 為 0 位。以輸入字串的整數與小數部分組合成最小單位；拒絕負號、指數、千位逗號、非數字、超出貨幣精度及空字串。可 trim 前後空白；允許零價格。
2. 數量必須是十進位正整數字串並在安全範圍內；不接受 `1.5`、`1e3`、零或負數。名稱 trim 後不得空白。至少一位參與者與一道菜，所有 ID 唯一，參照存在且每道菜至少一位不重複參與者。
3. 金額對外以安全整數 Number 表達（`0..Number.MAX_SAFE_INTEGER`）；解析及所有乘法／比例分子用 BigInt 暫時計算，再檢查轉回 Number 的安全範圍。總菜品、各費用、最終總額都要檢查，不只單價。BigInt 不寫入 JSON。
4. 百分比最多兩位小數，解析為百分之一個百分點，例如 `6.25% → 625`、`100% → 10000`。折扣限 `0..10000`；稅費／服務費允許非負百分比，不擅自設 100% 上限，但解析值與計算金額需安全。
5. 百分比金額統一 half-up：非負 `base * rate / 10000`，以 BigInt 商及餘數判斷是否加 1；不使用浮點 `Math.round(base * percentage)`。
6. 切換貨幣保留原輸入字串，不換匯、不搬移小數點、不默默截斷。`20.50 MYR` 切 JPY 仍為 `20.50`，顯示「JPY 不接受小數，請改為整數」並阻止結算；`20 MYR` 切 JPY 代表 20 JPY。UI 說明「切換貨幣不換算匯率」。固定折扣及固定附加費同樣重新依貨幣精度驗證。
7. 顯示依貨幣表精度，總是含明確幣別（如 `MYR`）避免 `$` 混淆。不得因 formatter 重四捨五入而改變計算值；安全範圍極大的整數需以整數商／餘數產生確切小數文字，避免除以 100 的 Number 精度損失。可用 `Intl.NumberFormat` 取得符號及分隔格式，但不能讓浮點顯示掩蓋分差。

## 分帳演算法與守恆

- 統一 `allocate(amount, [{id, weight}])` 最大餘數函式：`q_i = floor(amount * weight_i / sumWeight)`，餘數為同一除法的餘數；先分 q，再依餘數降冪、ID 字串升冪逐人補 1。排序使用明確字串比較，不依 locale 或 UI 順序。BigInt 計算乘法及餘數；回傳原 ID 對應的安全整數。
- `amount=0` 回傳所有人 0；`sumWeight=0 && amount>0` 回錯誤，不捏造平均分配。菜品平均分攤為各選中人的 weight=1。
- 逐道菜：`itemTotal = unitPrice * quantity`，獨立平均分給該道選中人；累加每人菜品金額及整單 subtotal。未吃菜的人保持零。
- 由 subtotal 算折扣金額（none／固定／百分比）；拒絕超過 subtotal。依每人菜品金額權重分配折扣，再算個人折扣後金額。必須檢查非負。
- 由折扣後 subtotal 各自算 tax 與 serviceCharge，兩者基數相同、互不疊加；各自依個人折扣後金額分配。折扣後為零可接受百分比計算出的零，拒絕非零固定附加費。
- 個人 final = items - discount + tax + service；grandTotal = subtotal - discount + tax + service。
- 每次成功結果檢查下列整數等式；不容許誤差，任何失敗回可辨識錯誤並阻止分享：每道 shares 合計等於 itemTotal；所有個人菜品小計合計等於 subtotal；所有 discount／tax／service 分配各自等於整單值；所有個人 final 合計等於 grandTotal。
- 個人結果附每道菜 itemId、名稱、分配額，以及個人小計、折扣、兩種費用、最終應付。`details` 展開即可核對。

## 保存與分享的失敗處理

- localStorage 封套 `{ version: 1, bill: draft }`，key 固定且版本化。讀取只做一次並 catch getItem／JSON.parse 例外；驗證封套、欄位型別、支援貨幣、ID 唯一及參照。
- 保存合法結構的編輯草稿，允許其中價格字串暫時不符合業務規則；讀回後仍需重新計算驗證。不可把所有未填完的草稿當成損壞。
- 缺資料可正常初始化；損壞、不相容版本、無效結構時保留原 key，不啟動自動覆寫。顯示恢復提示，可下載原始文字備份；只有使用者明確確認「重設保存資料」或「新帳單」才允許取代。檔案下載可用 Blob／URL.createObjectURL。
- 儲存權限或 quota 失敗要顯示「這次修改未能保存，請先複製結算」等明確狀態，不聲稱已自動保存；目前草稿保留在記憶體。同步保存最簡單且少掉關頁前 debounce 遺漏；若實測需要 debounce，再處理 pagehide flush。
- 不在 render 時寫保存；首次載入與後續 useEffect 不得因 StrictMode 將損壞資料覆蓋。重設前一律 confirm；取消完全不改草稿與儲存。
- 純文字摘要只接受當前有效 BillResult，包含標題、明確幣別、菜品與分攤／個人明細、整單折扣及兩項費用、各人應付和合計，並使用相同同名標籤與格式化函式。
- 單人複製與完整摘要皆提供真實 clipboard 寫入及成功回饋；失敗時顯示可選取的 textarea，清楚提示手動複製。`navigator.clipboard` 缺失也走此路徑。
- Share 按鈕的使用者事件直接呼叫 `navigator.share({title,text})`；不支援則走完整摘要複製。`AbortError` 是使用者取消，不提示失敗也不偷偷複製；其他失敗顯示訊息並提供複製／手動文字。非有效帳單禁用正式分享且列出需修正項目。

## 必做驗證與執行順序

1. 初始化 package、TypeScript、Vite、Tailwind、Vitest 與 scripts；先做資料型別、money、validation、allocator、calculator 及單元測試。
2. 測試核心通過後串接空白 UI、參與者、菜品、費用、即時摘要與個人明細；再接保存與分享。
3. money 測試：兩位／零位、零、非法字元、負值、精度超出、空白、數量規則、半個最小單位的 half-up、安全範圍、極大值確切顯示、切貨幣後重新驗證。
4. calculator 測試：100/4；100/3 得 33.34/33.33/33.33；0.01/3；JPY 100/3 得 34/33/33；單人 50；兩人 60；需求混合例 70/50/50/35（205）；200 折扣10%後180、稅6%=10.80、服務10%=18、總208.80；固定折扣及費用；100%折扣；無消費人員0；相同餘數；不同權重；重排參與者及菜品後按ID結果相同。
5. 每個有效案例斷言全部守恆式；補大量生成的確定性案例檢查 allocator 合計、非負、重排穩定，不為此加 property-test 套件。
6. 無效案例：空參與者／菜品、空或不存在的分攤ID、重複ID、超額折扣、零基數非零費用、不合法數量、運算溢位；確認回錯誤而非 NaN、當機或有效結算。
7. 保存與操作測試：刪除參與者清除全部參照且空菜品待修正；重設取消；有效草稿恢復；未完成欄位恢復；毀損JSON／未知版本／無效參照不覆寫；getItem／setItem拋錯。分享測試：有效文字金額、同名標籤、系統分享、取消、不支援、clipboard拒絕、textarea替代。適合以 Vitest mock 瀏覽器介面，少數真實互動用瀏覽器驗證。
8. npm scripts 必須提供 `dev`、`test`（`vitest run`）、`typecheck`（`tsc -b` 或相應 noEmit）、`build`、`preview`。安裝完成後執行 `npm test`、`npm run typecheck`、`npm run build`。
9. 用本機瀏覽器驗證320px／390px／桌面：新增修改刪除、混合結果、費用、貨幣切換、同名、重新整理、長帳單、所有copy/share替代、鍵盤與焦點、無橫向溢出。截圖檢視及 console 檢查；工具不足時明確交代未驗證，不能用單元測試取代宣稱通過。

## GitHub Pages 與交付

- 單一 index 頁、不用 client-side URL 路由，因此在正式 Pages 子路徑重新整理不需伺服器 rewrite。
- 未知倉庫名稱不硬編碼 Vite base。預設可採 `./`；workflow 以 `actions/configure-pages` 的 `base_path` 輸出設定 `VITE_BASE_PATH`（正規化末尾 `/`），`vite.config.ts` 讀取該值建置。如此從實際Pages設定取得子路徑，不猜 repository 名稱。
- workflow checkout、setup-node、`npm ci`、test、typecheck、configure-pages、build、upload-pages-artifact、deploy-pages；設 pages／id-token 最小權限及 pages concurrency，部署環境 `github-pages`。實作者採用當時官方支援的 action 版本並確認設定。
- 用指定非根 base（例如 `/verification-path/`）再建置並本機掛載該路徑驗證資源載入及重新整理；這是驗證路徑，不是推測正式倉庫名稱。
- README 記錄 Node需求、`npm ci`／scripts、整數與餘數規則、百分比精度、貨幣切換語意、保存限制、分享替代、GitHub Pages啟用Actions的步驟、核心功能與不做圖片匯出。
- 更新 AGENTS 的「目前狀態」及實際命令，不改寫需求。交付列出實際測試數與建置結果、瀏覽器覆蓋、未執行事項。
- 目前沒有 Git remote／GitHub 倉庫資訊；本次可完成程式、workflow 與本機驗證，不能宣稱已部署。正式遠端上傳、Pages啟用及URL驗證留待實際倉庫存在後執行，不因此延後本機應用完成。
