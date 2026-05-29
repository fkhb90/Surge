@echo off
set PS1=%~f0
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f=$env:PS1;$c=[IO.File]::ReadAllText($f,[Text.Encoding]::UTF8);iex(($c -split '(?m)^#PSSTART',2)[1])"
exit /b
#PSSTART
$ErrorActionPreference = 'Continue'
$PYPATH = Join-Path (Split-Path $env:PS1) 'autopush.py'
# 真正的 Surge git 倉庫與規則檔位置 (本機 C: 這份不是 git 倉庫，規則須寫入並推送至 P:)
$RULESET_DIR = 'P:\我的電腦\Surge\rulesets\Rules'
$REPO_DIR    = 'P:\我的電腦\Surge'
$queue  = [System.Collections.Generic.List[string]]::new()
$classMode = 'auto'
$IgnoreEnterUntil = [DateTime]::MinValue
$state  = 'MENU'

function New-MenuOption([string]$key, [string]$label, [string]$value) {
    [pscustomobject]@{
        Key = $key
        Label = $label
        Value = $value
    }
}

function Normalize-Domain([string]$Domain) {
    $s = ''
    if ($null -ne $Domain) {
        $s = [string]$Domain
    }
    $s = $s.Trim().ToLower()
    if (-not $s) { return '' }
    if ($s.StartsWith('http://') -or $s.StartsWith('https://')) {
        try {
            $u = [System.Uri]$s
            $s = $u.Host
        } catch {
            $s = $s -replace '^https?://', ''
        }
    }
    if ($s.Contains('/')) { $s = $s.Split('/')[0] }
    if ($s.Contains(':')) { $s = $s.Split(':')[0] }
    if ($s -match '\s') { return '' }   # 含空白 → 視為無效域名
    return $s.Trim('.')
}

function Queue-Contains([string]$action, [string]$domain) {
    return $queue.Contains("$action$domain")
}

function Read-DomainInput {
    # 逐鍵讀取域名輸入，支援行內游標編輯：
    #   - 空白狀態 (尚未輸入任何字) 按 ← (Left)：回傳 $null，代表「返回選單」
    #   - 有內容時 ← / →：移動游標；Home / End：移到行首 / 行尾
    #   - Backspace：刪除游標前一個字元；Delete：刪除游標處字元
    #   - 一般可見字元：插入到游標位置
    #   - Enter：回傳目前字串 (可能為空字串)
    # 用 if/elseif 分派 (而非 switch)，並在每次按鍵後重繪整行 + 重新定位游標。
    $rui    = $Host.UI.RawUI
    $sb     = New-Object System.Text.StringBuilder
    $cursor = 0
    # 清掉前一步驟 (例如 Select-Menu 的 Enter) 殘留的按鍵，避免誤觸
    try { while ([Console]::KeyAvailable) { [Console]::ReadKey($true) | Out-Null } } catch {}
    $origin = $rui.CursorPosition   # 提示字 "    +  " 之後的位置，作為輸入起點

    while ($true) {
        $k  = $rui.ReadKey('NoEcho,IncludeKeyDown')
        $vk = $k.VirtualKeyCode

        if ($vk -eq 13) {                                       # Enter = 送出
            # 空白時 Enter 無效 (一併擋掉前一步殘留的 Enter)；要離開請按 ←
            if ($sb.Length -eq 0) { continue }
            $end = $origin; $end.X = $origin.X + $sb.Length
            try { $rui.CursorPosition = $end } catch {}
            Write-Host ''
            return $sb.ToString()
        }
        elseif ($vk -eq 37) {                                   # Left
            if ($sb.Length -eq 0) { return $null }              # 空白 → 返回選單
            if ($cursor -gt 0) { $cursor-- }
        }
        elseif ($vk -eq 39) {                                   # Right
            if ($cursor -lt $sb.Length) { $cursor++ }
        }
        elseif ($vk -eq 36) { $cursor = 0 }                     # Home
        elseif ($vk -eq 35) { $cursor = $sb.Length }            # End
        elseif ($vk -eq 8)  {                                   # Backspace
            if ($cursor -gt 0) { $sb.Remove($cursor - 1, 1) | Out-Null; $cursor-- }
        }
        elseif ($vk -eq 46) {                                   # Delete
            if ($cursor -lt $sb.Length) { $sb.Remove($cursor, 1) | Out-Null }
        }
        else {
            $ch = $k.Character
            if ($ch -and -not [char]::IsControl([char]$ch)) {   # 一般可見字元 → 插入
                $sb.Insert($cursor, [string]$ch) | Out-Null
                $cursor++
            }
        }

        # 重繪：回到起點，印出整行 (尾端多一個空白以蓋掉刪除後殘留)，再把游標移到正確位置
        try {
            $rui.CursorPosition = $origin
            Write-Host -NoNewline ($sb.ToString() + ' ')
            $p = $origin
            $x = $origin.X + $cursor
            $w = $rui.BufferSize.Width
            if ($x -ge $w) { $x = $w - 1 }
            $p.X = $x
            $rui.CursorPosition = $p
        } catch {}
    }
}

function Show-MenuOptions([int]$selectedIndex, [object[]]$options) {
    for ($i = 0; $i -lt $options.Count; $i++) {
        $opt = $options[$i]
        $prefix = if ($i -eq $selectedIndex) { '  > ' } else { '    ' }
        $color = if ($i -eq $selectedIndex) { 'Cyan' } else { 'Gray' }
        Write-Host ($prefix + '[' + $opt.Key + '] ' + $opt.Label) -ForegroundColor $color
    }
    Write-Host ''
    Write-Host '  請選擇 (↑/↓ + Enter): ' -NoNewline -ForegroundColor DarkGray
}

function Select-Menu {
    param(
        [scriptblock]$RenderContext,
        [object[]]$Options,
        [int]$DefaultIndex = 0
    )

    if (-not $Options -or $Options.Count -eq 0) {
        return $null
    }

    $index = [Math]::Max(0, [Math]::Min($DefaultIndex, $Options.Count - 1))

    # 清掉前一步驟 (例如 Read-Host) 殘留的按鍵，避免誤觸預設選項
    try {
        while ([Console]::KeyAvailable) {
            [Console]::ReadKey($true) | Out-Null
        }
    } catch {}

    while ($true) {
        & $RenderContext $index $Options
        $k = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

        switch ($k.VirtualKeyCode) {
            38 { if ($index -gt 0) { $index-- }; continue }                      # Up
            40 { if ($index -lt ($Options.Count - 1)) { $index++ }; continue }   # Down
            37 {                                                                   # Left = 返回 / 取消
                Clear-Host
                $back = $Options | Where-Object { $_.Value -eq 'BACK' } | Select-Object -First 1
                if (-not $back) { $back = $Options | Where-Object { $_.Value -eq 'MENU' } | Select-Object -First 1 }
                if (-not $back) { $back = $Options | Where-Object { $_.Value -eq 'NO' } | Select-Object -First 1 }
                if (-not $back) { $back = $Options | Where-Object { $_.Key -eq '0' } | Select-Object -First 1 }
                if ($back) { return $back.Value }
                continue
            }
            13 {
                if ([DateTime]::UtcNow -lt $IgnoreEnterUntil) { continue }
                Clear-Host
                return $Options[$index].Value
            }                                                                      # Enter
        }

        $ch = ([string]$k.Character).ToLower()
        if ([string]::IsNullOrWhiteSpace($ch)) {
            continue
        }

        for ($i = 0; $i -lt $Options.Count; $i++) {
            if ($Options[$i].Key.ToLower() -eq $ch) {
                Clear-Host
                return $Options[$i].Value
            }
        }
    }
}

function Show-Header {
    $add = ($queue | Where-Object { $_ -like '+*' }).Count
    $del = $queue.Count - $add

    Clear-Host
    Write-Host ''
    Write-Host '  SURGE 廣告封鎖規則管理器' -ForegroundColor Cyan -NoNewline
    Write-Host '  |  自動推送 GitHub' -ForegroundColor DarkGray

    if ($queue.Count -gt 0) {
        Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
        Write-Host '  待處理  ' -NoNewline -ForegroundColor DarkGray
        Write-Host "+$add 新增" -NoNewline -ForegroundColor Cyan
        Write-Host '  /  ' -NoNewline -ForegroundColor DarkGray
        Write-Host "-$del 刪除" -ForegroundColor Cyan
        Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
        foreach ($item in $queue) {
            if ($item[0] -eq '+') {
                Write-Host ('    + ' + $item.Substring(1)) -ForegroundColor Cyan
            } else {
                Write-Host ('    - ' + $item.Substring(1)) -ForegroundColor Cyan
            }
        }
    }
    Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
    Write-Host ''
}

while ($true) {
    switch ($state) {

        'MENU' {
            $menuOptions = @(
                (New-MenuOption '1' '新增域名至封鎖清單' 'ADD'),
                (New-MenuOption '2' '從封鎖清單移除域名' 'DEL')
            )
            # 佇列已有待處理項目時，才提供「立即推送」入口 (空佇列不顯示，避免推送空清單)
            if ($queue.Count -gt 0) {
                $menuOptions += (New-MenuOption '3' '立即推送 (推送目前佇列至 GitHub)' 'CONFIRM')
            }
            $menuOptions += (New-MenuOption '0' '退出' 'EXIT')
            $choice = Select-Menu -Options $menuOptions -DefaultIndex 0 -RenderContext {
                param($selectedIndex, $options)
                Show-Header
                Show-MenuOptions -selectedIndex $selectedIndex -options $options
            }
            if ($choice -eq 'EXIT') {
                Write-Host ''
                if ($queue.Count -gt 0) {
                    Write-Host '  已退出，待處理項目未推送。' -ForegroundColor Yellow
                } else {
                    Write-Host '  已退出。' -ForegroundColor Yellow
                }
                Write-Host ''
                exit 0
            }
            if ($choice) { $state = $choice }
        }

        'ADD' {
            Clear-Host
            $addStepOptions = @(
                (New-MenuOption '1' '輸入域名' 'INPUT'),
                (New-MenuOption '0' '返回選單 (按 ← 返回選單)' 'BACK')
            )
            $addStepChoice = Select-Menu -Options $addStepOptions -DefaultIndex 0 -RenderContext {
                param($selectedIndex, $options)
                Clear-Host
                Write-Host ''
                Write-Host '  [ 新增 ]' -ForegroundColor Cyan -NoNewline
                Write-Host '  |  自動推送 GitHub' -ForegroundColor DarkGray
                Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
                Write-Host ''
                Show-MenuOptions -selectedIndex $selectedIndex -options $options
            }
            if ($addStepChoice -eq 'BACK') {
                $state = 'MENU'
                continue
            }
            $state = 'ADD_INPUT'
        }

        'ADD_INPUT' {
            Clear-Host
            Write-Host ''
            Write-Host '  [ 輸入域名 ]' -ForegroundColor Cyan -NoNewline
            Write-Host '  |  自動推送 GitHub' -ForegroundColor DarkGray
            Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
            Write-Host ''
            Write-Host '    輸入域名後按 Enter 送出  (← / → 移動游標；空白時按 ← 返回選單)' -ForegroundColor DarkGray
            Write-Host ''
            Write-Host -NoNewline '    +  ' -ForegroundColor Cyan
            $d = Read-DomainInput
            if ($null -eq $d) {
                $state = 'MENU'
                continue
            }
            $nd = Normalize-Domain $d
            if ($nd) {
                if (Queue-Contains '+' $nd) {
                    Write-Host "  已存在佇列，略過重複:  +  $nd" -ForegroundColor Yellow
                    $IgnoreEnterUntil = [DateTime]::UtcNow.AddMilliseconds(350)
                    $state = 'ASK_MORE'
                    continue
                }
                $queue.Add("+$nd")
                Write-Host "  已加入佇列:  +  $nd" -ForegroundColor Cyan
                $IgnoreEnterUntil = [DateTime]::UtcNow.AddMilliseconds(350)
                $state = 'ASK_MORE'
            } else {
                Write-Host '  未輸入有效域名，請重新輸入。' -ForegroundColor Yellow
                $state = 'ADD_INPUT'
            }
        }

        'DEL' {
            Clear-Host
            $delStepOptions = @(
                (New-MenuOption '1' '輸入域名' 'INPUT'),
                (New-MenuOption '0' '返回選單 (按 ← 返回選單)' 'BACK')
            )
            $delStepChoice = Select-Menu -Options $delStepOptions -DefaultIndex 0 -RenderContext {
                param($selectedIndex, $options)
                Clear-Host
                Write-Host ''
                Write-Host '  [ 刪除 ]' -ForegroundColor Cyan -NoNewline
                Write-Host '  |  自動推送 GitHub' -ForegroundColor DarkGray
                Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
                Write-Host ''
                Show-MenuOptions -selectedIndex $selectedIndex -options $options
            }
            if ($delStepChoice -eq 'BACK') {
                $state = 'MENU'
                continue
            }
            $state = 'DEL_INPUT'
        }

        'DEL_INPUT' {
            Clear-Host
            Write-Host ''
            Write-Host '  [ 輸入域名 ]' -ForegroundColor Cyan -NoNewline
            Write-Host '  |  自動推送 GitHub' -ForegroundColor DarkGray
            Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
            Write-Host ''
            Write-Host '    輸入域名後按 Enter 送出  (← / → 移動游標；空白時按 ← 返回選單)' -ForegroundColor DarkGray
            Write-Host ''
            Write-Host -NoNewline '    -  ' -ForegroundColor Cyan
            $d = Read-DomainInput
            if ($null -eq $d) {
                $state = 'MENU'
                continue
            }
            $nd = Normalize-Domain $d
            if ($nd) {
                if (Queue-Contains '-' $nd) {
                    Write-Host "  已存在佇列，略過重複:  -  $nd" -ForegroundColor Yellow
                    $IgnoreEnterUntil = [DateTime]::UtcNow.AddMilliseconds(350)
                    $state = 'ASK_MORE'
                    continue
                }
                $queue.Add("-$nd")
                Write-Host "  已加入佇列:  -  $nd" -ForegroundColor Cyan
                $IgnoreEnterUntil = [DateTime]::UtcNow.AddMilliseconds(350)
                $state = 'ASK_MORE'
            } else {
                Write-Host '  未輸入有效域名，請重新輸入。' -ForegroundColor Yellow
                $state = 'DEL_INPUT'
            }
        }

        'ASK_MORE' {
            $askOptions = @(
                (New-MenuOption '1' '繼續新增' 'ADD_INPUT'),
                (New-MenuOption '2' '繼續刪除' 'DEL_INPUT'),
                (New-MenuOption '0' '立即推送' 'CONFIRM'),
                (New-MenuOption '9' '回上一層 (按 ← 返回選單)' 'MENU')
            )
            $askChoice = Select-Menu -Options $askOptions -DefaultIndex 0 -RenderContext {
                param($selectedIndex, $options)
                Show-Header
                Show-MenuOptions -selectedIndex $selectedIndex -options $options
            }
            if ($askChoice) { $state = $askChoice }
        }

        'CONFIRM' {
            if ($queue.Count -eq 0) {
                Write-Host ''
                Write-Host '  未加入任何域名，結束。' -ForegroundColor Yellow
                Write-Host ''
                Read-Host '按 Enter 關閉'
                exit 0
            }

            $add = ($queue | Where-Object { $_ -like '+*' }).Count
            $del = $queue.Count - $add

            Clear-Host
            Write-Host ''
            Write-Host '  SURGE 廣告封鎖規則管理器' -ForegroundColor Cyan -NoNewline
            Write-Host '  |  確認推送' -ForegroundColor DarkGray
            Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
            Write-Host ''
            foreach ($item in $queue) {
                if ($item[0] -eq '+') {
                    Write-Host ('    + ' + $item.Substring(1)) -ForegroundColor Cyan
                } else {
                    Write-Host ('    - ' + $item.Substring(1)) -ForegroundColor Cyan
                }
            }
            Write-Host ''
            Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
            Write-Host "  +$add 新增  /  -$del 刪除  /  共 $($queue.Count) 筆" -ForegroundColor DarkGray
            Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
            Write-Host ''
            if ($add -gt 0) {
                $classOptions = @(
                    (New-MenuOption '1' '自動分配' 'auto'),
                    (New-MenuOption '2' '手動分配 (逐筆選 set / drop)' 'manual'),
                    (New-MenuOption '9' '回上一層' 'back')
                )
                $classChoice = Select-Menu -Options $classOptions -DefaultIndex 0 -RenderContext {
                    param($selectedIndex, $options)
                    Clear-Host
                    Write-Host ''
                    Write-Host '  SURGE 廣告封鎖規則管理器' -ForegroundColor Cyan -NoNewline
                    Write-Host '  |  新增項目分配模式' -ForegroundColor DarkGray
                    Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
                    Write-Host ''
                    Show-MenuOptions -selectedIndex $selectedIndex -options $options
                }
                if ($classChoice -eq 'back') {
                    $state = 'MENU'
                    continue
                }
                $classMode = if ($classChoice -eq 'manual') { 'manual' } else { 'auto' }
            }

            if (-not ($classMode -eq 'manual' -and $add -gt 0)) {
                $confirmOptions = @(
                    (New-MenuOption 'y' '確認推送至 GitHub' 'YES'),
                    (New-MenuOption 'n' '取消' 'NO')
                )
                $confirmChoice = Select-Menu -Options $confirmOptions -DefaultIndex 0 -RenderContext {
                    param($selectedIndex, $options)
                    Clear-Host
                    Write-Host ''
                    Write-Host '  SURGE 廣告封鎖規則管理器' -ForegroundColor Cyan -NoNewline
                    Write-Host '  |  確認推送' -ForegroundColor DarkGray
                    Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
                    Write-Host ''
                    foreach ($item in $queue) {
                        if ($item[0] -eq '+') {
                            Write-Host ('    + ' + $item.Substring(1)) -ForegroundColor Cyan
                        } else {
                            Write-Host ('    - ' + $item.Substring(1)) -ForegroundColor Cyan
                        }
                    }
                    Write-Host ''
                    Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
                    Write-Host "  +$add 新增  /  -$del 刪除  /  共 $($queue.Count) 筆" -ForegroundColor DarkGray
                    Write-Host "  分配模式: $classMode" -ForegroundColor DarkGray
                    Write-Host "  $(([string][char]0x2500) * 54)" -ForegroundColor DarkGray
                    Write-Host ''
                    Show-MenuOptions -selectedIndex $selectedIndex -options $options
                }

                if ($confirmChoice -ne 'YES') {
                    Write-Host '  已取消，未做任何變更。' -ForegroundColor Yellow
                    Write-Host ''
                    Read-Host '按 Enter 關閉'
                    exit 0
                }
            }

            $targetArgs = @('--ruleset-dir', $RULESET_DIR, '--repo-dir', $REPO_DIR)
            if ($classMode -eq 'manual' -and $add -gt 0) {
                Write-Host '  執行 autopush.py --push (手動分配模式) ...' -ForegroundColor DarkGray
                $pArgs = @($PYPATH, '--push') + $targetArgs + $queue.ToArray()
            } else {
                Write-Host '  執行 autopush.py --push --auto ...' -ForegroundColor DarkGray
                $pArgs = @($PYPATH, '--push', '--auto') + $targetArgs + $queue.ToArray()
            }
            Write-Host ''
            & python @pArgs
            $ec = $LASTEXITCODE
            Write-Host ''
            if ($ec -eq 0) {
                Write-Host '  完成，規則已成功推送至 GitHub。' -ForegroundColor Cyan
            } elseif ($ec -eq 3) {
                Write-Host '  沒有任何變更，未推送 (全部跳過，或域名已存在於規則中)。' -ForegroundColor Yellow
            } else {
                Write-Host "  發生錯誤 (exit $ec)，請查看上方 autopush 輸出。" -ForegroundColor Cyan
            }
            Write-Host ''
            Read-Host '按 Enter 關閉'
            exit $ec
        }
    }
}
