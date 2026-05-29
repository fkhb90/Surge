autopush.py — Surge REJECT 規則更新輔助工具

━━━ 基本用法 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  新增（預設或使用 + 符號）：
    python autopush.py ad.example.com
    python autopush.py +ad.example.com

  刪除（使用 - 符號）：
    python autopush.py -tracker.example.com

  互動模式（自動決定 bucket，會詢問確認）：
    python autopush.py --auto ad.example.com

━━━ 強制指定 bucket (僅對新增有效) ━━━━━━━━━━━━━━━━━━
  強制 REJECT-DROP（SDK/遙測類）：
    python autopush.py --drop sentry-new.io

  強制 REJECT（一般廣告/追蹤）：
    python autopush.py --set ad-network.com

  DOMAIN-KEYWORD 模式（自動進 reject-drop）：
    python autopush.py --keyword tracker

━━━ 檢查 / 批次 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  僅檢查不寫入：
    python autopush.py --check-only -some-host.com

  批次（從檔案讀取，支援混用 + 與 -）：
    python autopush.py --batch new-domains.txt --auto

━━━ 推送到 GitHub ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  操作後自動 git add / commit / push（自動偵測 repo 根目錄）：
    python autopush.py --push +ad.example.com -old-ad.com

  指定 git repo 目錄（P: 磁碟未被自動偵測時使用）：
    python autopush.py --push --repo-dir "P:\\我的電腦\\Surge" +sentry.io

━━━ 功能說明 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. 自動判斷 reject-set (DOMAIN-SET) vs reject-drop (RULE-SET)
  2. 正向 subsumption 檢查（新域名已被現有父域覆蓋？）
  3. 反向 subsumption 檢查（新域名是否覆蓋現有子域→可清除？）
  4. 白名單衝突檢查（與 Default_*.conf 中的 DIRECT/Proxy 規則比對）
  5. 追加到正確 bucket 並依字母排序
  6. 自動 git add / commit / push（--push）

━━━ 檔案路徑 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  reject-set.list   DOMAIN-SET，純域名，trie O(L) 匹配
  reject-drop.list  RULE-SET，TYPE,VALUE，支援 DOMAIN-KEYWORD
  Default_*.conf    白名單來源（DIRECT/Proxy 規則）

━━━ GitHub ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  https://github.com/fkhb90/Surge/blob/main/rulesets/Rules/reject-set.list
  https://github.com/fkhb90/Surge/blob/main/rulesets/Rules/reject-drop.list