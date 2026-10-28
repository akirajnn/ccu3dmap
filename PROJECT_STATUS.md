# 專案交接

## 2026-10-28 Internet 部署準備

- 新增 `.github/workflows/deploy-pages.yml`：master 推送後以 Node.js 22 建置並部署 GitHub Pages；新增 `vite.config.js`，使用相對資產路徑以支援儲存庫子目錄。
- 使用者明確同意改公開後，已將 akirajnn/ccu3dmap 設為 public 並啟用 workflow 型 GitHub Pages；原私人儲存庫的方案限制已解除。
- 網址：https://akirajnn.github.io/ccu3dmap/ 。推送 master 會自動建置部署；首次 Actions run 40714593979 已成功，部署提交為 0eb8759。
- 未修改 DB、套件依賴或應用功能；修改建置與 CI 設定。
- 驗證：npm run build、node --check vite.config.js 與 git diff --check 通過；首頁、JS、CSS 與 GLB 線上 HTTPS 檢查均 HTTP 200，GLB Content-Length 39,437,916 bytes；已呼叫系統瀏覽器開啟網站，未完成 3D 視覺／互動實測。仍有既有的大型 chunk 提醒。
- 下一步：桌面與手機實測、人工校正地標。Actions 目前成功，但有 action 內部 Node.js 20 淘汰提示，後續可更新 actions 主版本。

## 2026-10-23 README 聲明

- README 末尾新增與政策島無關、類似之處純屬巧合的聲明；僅文件修改，未修改 DB 或設定。
- 驗證：git diff --check 通過；無程式碼變更，不需重跑 build。

## 2026-10-23 GitHub 私人儲存庫

- 已建立私人儲存庫 https://github.com/akirajnn/ccu3dmap，沿用 master 與既有提交。
- 完整前端、套件鎖檔、GLB 與分析腳本已納入版本控制；依 .gitignore 排除依賴、產出及快取。未修改 DB 或應用程式設定。
- JavaScript 語法、git diff --check 與 npm.cmd run build 通過；仍有大型 chunk 提醒，尚未完成瀏覽器實測。
- 下一步：人工校正其餘地標，完成桌面與手機實測。

## 地標最大放大導覽

- 點選地標清單、地標標籤或「前往這一站」時，以地標座標為相機目標，平滑移動至 OrbitControls.minDistance（目前允許的最大放大倍率）。維持原縮放限制與編輯模式行為。
- 修改 src/scene/CampusScene.js；未修改 DB、套件設定或原始 GLB。
- 驗證：node --check 與 npm run build 通過；尚未進行瀏覽器視覺實測，既有大型 chunk 提醒仍存在。

## 編輯入口可見性修正

- 原入口位於側欄最下方，矮螢幕需要捲動、手機側欄收合時不可見。保留既有 edit-toggle ID／事件，移到獨立右上固定按鈕，綠底提高辨識度，無須展開側欄。
- 調整 FPS 位置避免與入口重疊；原 GLB、DB、套件設定與編輯資料流程不變。
- 驗證：JavaScript 語法與 npm run build 通過；介面結構檢查確認編輯入口唯一且位於可收合側欄之外。未完成瀏覽器視覺實測。

## 俯視與 XYZ 地標校正

- 編輯器新增俯視模式（鎖定旋轉、保留縮放平移、退出還原視角），以及 Three.js TransformControls 世界座標 XYZ 拖曳箭頭與定位球。
- 點表面、拖曳或手動輸入即時預覽標籤／座標；按套用才寫入 localStorage／可匯出資料。支援還原草稿；切換地標與退出編輯會捨棄草稿。拖曳控制器時停用 OrbitControls 並抑制表面誤取點。
- UI、src/main.js 與 CampusScene 串接既有流程；未修改 DB、原始模型或套件設定。俯視時 Y 軸需斜視或數字輸入調整，已於介面提示。
- 驗證：三個異動 JavaScript 模組語法與 npm run build 均通過。沿用現有 JS chunk 大小提醒；尚未完成瀏覽器拖曳與手機觸控實測。

## 校園機器人

- 新增 src/scene/CampusRobots.js：Three.js 原生幾何建立最多三隻奶油白／粉彩機器人，含圓角大頭、螢幕眼睛、天線及擺臂抬腿行走動畫；不需要外部模型或圖片。
- 載入後一次取樣島嶼中心 5×5 網格，以表面法線、高度差與中點檢查建立短距離路線；沒有相連表面則不生成。可落在平台／屋頂，尚無語意道路或完整 NavMesh，不應宣稱為精準道路導航。
- 每幀僅沿快取路線移動，不逐幀 Raycast 高面數模型；沿用減少動態效果偏好與資源釋放。原模型、DB、套件設定不變。
- 驗證：JavaScript 語法與 npm run build 通過；直接讀取原 GLB 幾何進行取樣測試，成功生成三隻機器人並執行更新。瀏覽器視覺尚未實測；首次取樣會增加模型準備時間。

## 浮島瀑布增補

- 新增 src/scene/Waterfalls.js：在兩個朝向的浮島邊緣以向下 Raycaster 搜尋實際模型表面作為出水點，曲線水柱連接海面，搭配流動紋理、落水水花與擴散波紋。找不到表面時略過，避免憑空出水。
- 落點高度依照海浪相同公式更新；沿用環境時間、減少動態效果偏好及統一 GPU 資源釋放。原 GLB、DB、套件設定未變動。
- 驗證：三個相關模組 node --check 與 npm run build 通過；尚未進行瀏覽器視覺實測。現有大型 JS chunk 提醒仍存在。

## 品牌主題更新

- 頁首、載入畫面與分頁標題改為「天空之城 中正大學」，移除「山」字圖示；加入中正大學官方校徽與 favicon。
- 官方來源：https://www.ccu.edu.tw/p/404-1000-25575.php ，圖片：https://www.ccu.edu.tw/var/file/0/1000/img/1331/emblem.png 。curl 與 Invoke-WebRequest 下載皆遭環境連線限制，故目前使用官方遠端圖片網址，未宣稱已下載本機檔案。
- 未修改模型、DB 或套件設定。

## 海面增補

- SkyEnvironment 新增島嶼下方 Y=-62 的藍綠海面，GPU shader 疊加三組起伏波浪、波峰白沫與日光反射，遠處淡入天空色。保留藍天、雲海與飛鳥；不修改 GLB、DB 或套件設定。
- 海浪共用既有時間更新及減少動態效果偏好；材質與幾何由既有資源釋放機制處理。
- 驗證：node --check 與 npm run build 通過；尚未進行瀏覽器 shader／視覺實測。原有 JS chunk 大小提醒仍存在。

## 天空與雲海增補

- 新增 src/scene/SkyEnvironment.js：藍天漸層球體、環繞島嶼下方的 180 個 InstancedMesh 雲朵、9 隻振翅環繞飛鳥。保留原 GLB。
- 使用既有 RAF 更新、限制背景分頁恢復時的時間步長、遵守 prefers-reduced-motion；資源由既有 release 統一釋放。裝飾不加入取點 Mesh 清單。
- 本次未修改 DB 或套件設定；再次檢查時依賴已可用，node --check 與 npm run build 均成功（Vite 7.3.7），已產出 dist。下方先前缺套件的記錄為歷史狀態。瀏覽器視覺仍未實測；build 有 500 kB 以上 JS chunk 提醒。

## 2026-10-22

- 工作目錄原先只有 GLB，沒有 Git 儲存庫、既有程式、AGENTS.md 或 PROJECT_STATUS.md。已嘗試 git status / diff / log，回報非 Git 專案。
- 已建立 Vite + Three.js + JavaScript 模組專案；GLTFLoader、OrbitControls、CSS2DRenderer、GSAP、搜尋與地標介紹、全島視角、標籤及 FPS 切換、手機側欄、取點編輯、localStorage、JSON 匯出。
- 模型為單一合併 Tripo Mesh、一個材質與三張內嵌貼圖；無建築語意。八個地標全數暫定，不可描述為精準定位。
- 架構決策：保留原始 GLB；執行時 Y-up 置中並將最長邊統一為 100；地標使用正規化場景座標。無資料庫、後端與權限機制。
- 原始 SHA256：EB1A77C222F29CC5E4C79B7B0E2305213BC73FF7023FB7D6C1DC41D6AC398CA8。
- 驗證完成：全部 JavaScript 通過 node --check；獨立模型分析腳本執行成功並產出 model-analysis.json；原 GLB SHA256 與初始相同。共 536,654 頂點、2,766,414 索引（約 922,138 三角形）。
- 驗證受阻：npm install 遭環境網路 EACCES 拒絕，registry 無法連線；離線快取缺少 Three.js 與 GSAP。npm run build 已實際執行，因 Vite 尚未安裝而失敗。尚無 package-lock.json 或 dist，不能宣稱 build 或 3D 瀏覽器測試通過。網路恢復後執行 npm install、npm run build 並完成桌面／手機實測。
- UI 設計服務 12ui 已嘗試，需登入且連線失敗；目前介面依使用者指定風格實作，未完成生成設計圖比對。Browser 外掛不可用，Playwright 亦未完成安裝與執行。
- 下一步：人工校正地標、目標設備實測；替換模型後清除 localStorage 並重新定位。
- 使用者要求自行執行後，已再次執行 npm install（指定專案內快取、停用重試）；npm registry 的 GSAP 請求仍遭作業環境 EACCES 拒絕。也再次執行 npm run build 與 npm run dev，兩者皆因 Vite 未安裝而失敗；網站尚未啟動。此執行環境禁止 sandbox_approval，無法申請解除網路限制。
