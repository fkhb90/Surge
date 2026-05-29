#!/usr/bin/env bash
# SURGE 廣告封鎖規則管理器 — 自動推送 GitHub (Mac/Linux 版，與 push.bat 行為對齊)
# 相容 bash 3.2 (macOS 內建)：不使用 ${var,,}、關聯陣列、read -t 0、小數秒 timeout。
CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'
YELLOW='\033[0;33m'; GRAY='\033[0;90m'; NC='\033[0m'
LINE='──────────────────────────────────────────────────────'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYPATH="$DIR/autopush.py"
# 真正的 git 倉庫與規則檔位置；留空 = 交給 autopush 自動偵測。
# (Mac/Linux 若規則不在腳本所在的 repo，請填絕對路徑，例如 RULESET_DIR="$HOME/Surge/rulesets/Rules")
RULESET_DIR=""
REPO_DIR=""
queue=()
state="MENU"
class_mode="auto"

# ─── 工具函式 ────────────────────────────────────────────
# 將域名正規化：去頭尾空白、轉小寫、去掉 http(s):// 與路徑/port、去頭尾的點。
normalize_domain() {
    local s="$1"
    s="${s#"${s%%[![:space:]]*}"}"          # ltrim
    s="${s%"${s##*[![:space:]]}"}"          # rtrim
    s=$(printf '%s' "$s" | tr 'A-Z' 'a-z')
    [ -z "$s" ] && { printf ''; return; }
    case "$s" in
        http://*)  s="${s#http://}";;
        https://*) s="${s#https://}";;
    esac
    s="${s%%/*}"                            # 去路徑
    s="${s%%:*}"                            # 去 port
    while [ "${s#.}" != "$s" ]; do s="${s#.}"; done   # 去開頭的點
    while [ "${s%.}" != "$s" ]; do s="${s%.}"; done   # 去結尾的點
    case "$s" in *[[:space:]]*) printf ''; return;; esac   # 含空白 → 視為無效域名
    printf '%s' "$s"
}

# 佇列是否已含某項 ("+domain" 或 "-domain")
queue_contains() {
    local item
    for item in "${queue[@]}"; do
        [ "$item" = "$1" ] && return 0
    done
    return 1
}

# 讀取單一按鍵，結果放到全域 KEY (UP/DOWN/LEFT/RIGHT/HOME/END/ENTER/BACKSPACE/DEL/CHAR/ESC/OTHER)
# CHAR 時字元放在 KEYCHAR。follow-up read 用整數 timeout (bash 3.2 相容)，方向鍵位元組同時到達不會延遲。
read_key() {
    local a b c _t
    IFS= read -rsn1 a
    if [ "$a" = $'\x1b' ]; then
        IFS= read -rsn1 -t 1 b
        if [ "$b" = '[' ] || [ "$b" = 'O' ]; then
            IFS= read -rsn1 -t 1 c
            case "$c" in
                A) KEY=UP;;   B) KEY=DOWN;; C) KEY=RIGHT;; D) KEY=LEFT;;
                H) KEY=HOME;; F) KEY=END;;
                [0-9]) IFS= read -rsn1 -t 1 _t; [ "$c" = '3' ] && KEY=DEL || KEY=OTHER;;
                *) KEY=OTHER;;
            esac
        else
            KEY=ESC
        fi
    elif [ -z "$a" ]; then
        KEY=ENTER
    elif [ "$a" = $'\x7f' ] || [ "$a" = $'\x08' ]; then
        KEY=BACKSPACE
    else
        KEY=CHAR; KEYCHAR="$a"
    fi
}

# 光標選單：$1 = 渲染表頭的函式名，其餘為 "key|label|value" 三元組。
# ↑/↓ 移動、Enter 選擇、← 返回 (找 value=BACK → MENU → key=0)、字母/數字鍵直選。
# 結果放到全域 MENU_RESULT。
select_menu() {
    local render_fn="$1"; shift
    local opts=("$@")
    local n=${#opts[@]} idx=0 i j k l v lc
    while true; do
        clear
        "$render_fn"
        for ((i=0; i<n; i++)); do
            IFS='|' read -r k l v <<< "${opts[$i]}"
            if [ "$i" -eq "$idx" ]; then
                printf "  ${CYAN}> [%s] %s${NC}\n" "$k" "$l"
            else
                printf "    ${GRAY}[%s] %s${NC}\n" "$k" "$l"
            fi
        done
        printf '\n'
        printf "  ${GRAY}請選擇 (↑/↓ + Enter): ${NC}"
        read_key
        case "$KEY" in
            UP)   [ "$idx" -gt 0 ] && idx=$((idx-1));;
            DOWN) [ "$idx" -lt $((n-1)) ] && idx=$((idx+1));;
            LEFT)
                local bi=-1
                for ((j=0;j<n;j++)); do IFS='|' read -r k l v <<< "${opts[$j]}"; [ "$v" = BACK ] && { bi=$j; break; }; done
                if [ "$bi" -lt 0 ]; then for ((j=0;j<n;j++)); do IFS='|' read -r k l v <<< "${opts[$j]}"; [ "$v" = MENU ] && { bi=$j; break; }; done; fi
                if [ "$bi" -lt 0 ]; then for ((j=0;j<n;j++)); do IFS='|' read -r k l v <<< "${opts[$j]}"; [ "$v" = NO ] && { bi=$j; break; }; done; fi
                if [ "$bi" -lt 0 ]; then for ((j=0;j<n;j++)); do IFS='|' read -r k l v <<< "${opts[$j]}"; [ "$k" = 0 ] && { bi=$j; break; }; done; fi
                if [ "$bi" -ge 0 ]; then IFS='|' read -r k l v <<< "${opts[$bi]}"; MENU_RESULT="$v"; return; fi
                ;;
            ENTER)
                IFS='|' read -r k l v <<< "${opts[$idx]}"; MENU_RESULT="$v"; return;;
            CHAR)
                lc=$(printf '%s' "$KEYCHAR" | tr 'A-Z' 'a-z')
                for ((j=0;j<n;j++)); do
                    IFS='|' read -r k l v <<< "${opts[$j]}"
                    [ "$lc" = "$(printf '%s' "$k" | tr 'A-Z' 'a-z')" ] && { MENU_RESULT="$v"; return; }
                done
                ;;
        esac
    done
}

# 行內域名輸入 (對應 push.bat 的 Read-DomainInput)
#   - 空白狀態按 ← → 回傳 1 (返回選單)
#   - ← / → 移游標、Home/End、Backspace/Delete、可見字元插入、Enter 送出
# 輸入結果放到全域 DOMAIN_RESULT；回傳 0 = 有輸入(可能空字串)，1 = 使用者要返回。
read_domain() {
    local pc="$1" buf="" cur=0
    printf '\0337'                                  # DECSC 存游標起點 (提示字之後)
    while true; do
        printf '\0338\033[K'                        # DECRC 回起點 + 清到行尾
        printf "%b%s%b" "$pc" "$buf" "$NC"
        printf '\0338'                              # 再回起點
        [ "$cur" -gt 0 ] && printf '\033[%dC' "$cur"   # 游標右移到正確位置
        read_key
        case "$KEY" in
            ENTER) [ -z "$buf" ] && continue; printf '\n'; DOMAIN_RESULT="$buf"; return 0;;   # 空白時 Enter 無效 (擋殘留 Enter)，請按 ← 返回
            LEFT)
                if [ -z "$buf" ]; then printf '\n'; return 1; fi
                [ "$cur" -gt 0 ] && cur=$((cur-1));;
            RIGHT) [ "$cur" -lt "${#buf}" ] && cur=$((cur+1));;
            HOME)  cur=0;;
            END)   cur=${#buf};;
            BACKSPACE)
                if [ "$cur" -gt 0 ]; then
                    buf="${buf:0:cur-1}${buf:cur}"; cur=$((cur-1))
                fi;;
            DEL)
                [ "$cur" -lt "${#buf}" ] && buf="${buf:0:cur}${buf:cur+1}";;
            CHAR)
                buf="${buf:0:cur}${KEYCHAR}${buf:cur}"; cur=$((cur+1));;
        esac
    done
}

# ─── 表頭渲染 ────────────────────────────────────────────
header_main() {
    local add=0 del=0 item
    for item in "${queue[@]}"; do [[ "$item" == +* ]] && add=$((add+1)) || del=$((del+1)); done
    printf '\n'
    printf "  ${CYAN}SURGE 廣告封鎖規則管理器${NC}  ${GRAY}|  自動推送 GitHub${NC}\n"
    if [ ${#queue[@]} -gt 0 ]; then
        printf "  ${GRAY}%s${NC}\n" "$LINE"
        printf "  ${GRAY}待處理  ${NC}${CYAN}+%s 新增${NC}  ${GRAY}/  ${NC}${CYAN}-%s 刪除${NC}\n" "$add" "$del"
        printf "  ${GRAY}%s${NC}\n" "$LINE"
        for item in "${queue[@]}"; do
            if [[ "$item" == +* ]]; then printf "    ${CYAN}+ %s${NC}\n" "${item:1}"
            else printf "    ${CYAN}- %s${NC}\n" "${item:1}"; fi
        done
    fi
    printf "  ${GRAY}%s${NC}\n" "$LINE"
    printf '\n'
}

header_add()   { printf '\n'; printf "  ${CYAN}[ 新增 ]${NC}${GRAY}  |  自動推送 GitHub${NC}\n"; printf "  ${GRAY}%s${NC}\n" "$LINE"; printf '\n'; }
header_del()   { printf '\n'; printf "  ${CYAN}[ 刪除 ]${NC}${GRAY}  |  自動推送 GitHub${NC}\n"; printf "  ${GRAY}%s${NC}\n" "$LINE"; printf '\n'; }
header_class() { printf '\n'; printf "  ${CYAN}SURGE 廣告封鎖規則管理器${NC}${GRAY}  |  新增項目分配模式${NC}\n"; printf "  ${GRAY}%s${NC}\n" "$LINE"; printf '\n'; }

print_confirm_body() {
    local add=0 del=0 item
    for item in "${queue[@]}"; do [[ "$item" == +* ]] && add=$((add+1)) || del=$((del+1)); done
    printf '\n'
    printf "  ${CYAN}SURGE 廣告封鎖規則管理器${NC}${GRAY}  |  確認推送${NC}\n"
    printf "  ${GRAY}%s${NC}\n" "$LINE"; printf '\n'
    for item in "${queue[@]}"; do
        if [[ "$item" == +* ]]; then printf "    ${CYAN}+ %s${NC}\n" "${item:1}"
        else printf "    ${CYAN}- %s${NC}\n" "${item:1}"; fi
    done
    printf '\n'
    printf "  ${GRAY}%s${NC}\n" "$LINE"
    printf "  ${GRAY}+%s 新增  /  -%s 刪除  /  共 %s 筆${NC}\n" "$add" "$del" "${#queue[@]}"
    printf "  ${GRAY}分配模式: %s${NC}\n" "$class_mode"
    printf "  ${GRAY}%s${NC}\n" "$LINE"; printf '\n'
}
header_confirm() { print_confirm_body; }

# ─── 主迴圈 ──────────────────────────────────────────────
while true; do
    case "$state" in
        MENU)
            menu_opts=( "1|新增域名至封鎖清單|ADD" "2|從封鎖清單移除域名|DEL" )
            [ ${#queue[@]} -gt 0 ] && menu_opts+=( "3|立即推送 (推送目前佇列至 GitHub)|CONFIRM" )
            menu_opts+=( "0|退出|EXIT" )
            select_menu header_main "${menu_opts[@]}"
            case "$MENU_RESULT" in
                EXIT)
                    printf '\n'
                    if [ ${#queue[@]} -gt 0 ]; then printf "  ${YELLOW}已退出，待處理項目未推送。${NC}\n"
                    else printf "  ${YELLOW}已退出。${NC}\n"; fi
                    printf '\n'; exit 0;;
                ADD|DEL|CONFIRM) state="$MENU_RESULT";;
            esac
            ;;

        ADD)
            select_menu header_add "1|輸入域名|INPUT" "0|返回選單 (按 ← 返回選單)|BACK"
            [ "$MENU_RESULT" = BACK ] && { state=MENU; continue; }
            state=ADD_INPUT
            ;;

        ADD_INPUT)
            clear; printf '\n'
            printf "  ${CYAN}[ 輸入域名 ]${NC}${GRAY}  |  自動推送 GitHub${NC}\n"
            printf "  ${GRAY}%s${NC}\n" "$LINE"; printf '\n'
            printf "  ${GRAY}輸入域名後按 Enter 送出  (← / → 移動游標；空白時按 ← 返回選單)${NC}\n"; printf '\n'
            printf "    ${GREEN}+  ${NC}"
            if read_domain "$GREEN"; then
                nd=$(normalize_domain "$DOMAIN_RESULT")
                if [ -n "$nd" ]; then
                    if queue_contains "+$nd"; then
                        printf "  ${YELLOW}已存在佇列，略過重複:  +  %s${NC}\n" "$nd"
                    else
                        queue+=( "+$nd" )
                        printf "  ${GREEN}已加入佇列:  +  %s${NC}\n" "$nd"
                    fi
                    state=ASK_MORE
                else
                    printf "  ${YELLOW}未輸入有效域名，請重新輸入。${NC}\n"; state=ADD_INPUT
                fi
            else
                state=MENU
            fi
            ;;

        DEL)
            select_menu header_del "1|輸入域名|INPUT" "0|返回選單 (按 ← 返回選單)|BACK"
            [ "$MENU_RESULT" = BACK ] && { state=MENU; continue; }
            state=DEL_INPUT
            ;;

        DEL_INPUT)
            clear; printf '\n'
            printf "  ${CYAN}[ 輸入域名 ]${NC}${GRAY}  |  自動推送 GitHub${NC}\n"
            printf "  ${GRAY}%s${NC}\n" "$LINE"; printf '\n'
            printf "  ${GRAY}輸入域名後按 Enter 送出  (← / → 移動游標；空白時按 ← 返回選單)${NC}\n"; printf '\n'
            printf "    ${RED}-  ${NC}"
            if read_domain "$RED"; then
                nd=$(normalize_domain "$DOMAIN_RESULT")
                if [ -n "$nd" ]; then
                    if queue_contains "-$nd"; then
                        printf "  ${YELLOW}已存在佇列，略過重複:  -  %s${NC}\n" "$nd"
                    else
                        queue+=( "-$nd" )
                        printf "  ${RED}已加入佇列:  -  %s${NC}\n" "$nd"
                    fi
                    state=ASK_MORE
                else
                    printf "  ${YELLOW}未輸入有效域名，請重新輸入。${NC}\n"; state=DEL_INPUT
                fi
            else
                state=MENU
            fi
            ;;

        ASK_MORE)
            select_menu header_main \
                "1|繼續新增|ADD_INPUT" \
                "2|繼續刪除|DEL_INPUT" \
                "0|立即推送|CONFIRM" \
                "9|回上一層 (按 ← 返回選單)|MENU"
            case "$MENU_RESULT" in
                ADD_INPUT|DEL_INPUT|CONFIRM|MENU) state="$MENU_RESULT";;
            esac
            ;;

        CONFIRM)
            if [ ${#queue[@]} -eq 0 ]; then
                printf '\n'; printf "  ${YELLOW}未加入任何域名，結束。${NC}\n"; printf '\n'
                read -r -p "按 Enter 關閉" _; exit 0
            fi
            add=0
            for item in "${queue[@]}"; do [[ "$item" == +* ]] && add=$((add+1)); done

            if [ "$add" -gt 0 ]; then
                select_menu header_confirm \
                    "1|自動分配|auto" \
                    "2|手動分配 (逐筆選 set / drop)|manual" \
                    "9|回上一層|MENU"
                [ "$MENU_RESULT" = MENU ] && { state=MENU; continue; }
                [ "$MENU_RESULT" = manual ] && class_mode="manual" || class_mode="auto"
            fi

            if ! { [ "$class_mode" = manual ] && [ "$add" -gt 0 ]; }; then
                select_menu header_confirm "y|確認推送至 GitHub|YES" "n|取消|NO"
                if [ "$MENU_RESULT" != YES ]; then
                    printf "  ${YELLOW}已取消，未做任何變更。${NC}\n"; printf '\n'
                    read -r -p "按 Enter 關閉" _; exit 0
                fi
            fi

            clear; print_confirm_body
            target_args=()
            [ -n "$RULESET_DIR" ] && target_args+=( --ruleset-dir "$RULESET_DIR" )
            [ -n "$REPO_DIR" ] && target_args+=( --repo-dir "$REPO_DIR" )
            if [ "$class_mode" = manual ] && [ "$add" -gt 0 ]; then
                printf "  ${GRAY}執行 autopush.py --push (手動分配模式) ...${NC}\n"; printf '\n'
                python3 "$PYPATH" --push "${target_args[@]}" "${queue[@]}"
            else
                printf "  ${GRAY}執行 autopush.py --push --auto ...${NC}\n"; printf '\n'
                python3 "$PYPATH" --push --auto "${target_args[@]}" "${queue[@]}"
            fi
            ec=$?; printf '\n'
            if [ "$ec" -eq 0 ]; then printf "  ${CYAN}完成，規則已成功推送至 GitHub。${NC}\n"
            elif [ "$ec" -eq 3 ]; then printf "  ${YELLOW}沒有任何變更，未推送 (全部跳過，或域名已存在於規則中)。${NC}\n"
            else printf "  ${RED}發生錯誤 (exit %s)，請查看上方 autopush 輸出。${NC}\n" "$ec"; fi
            printf '\n'; read -r -p "按 Enter 關閉" _; exit "$ec"
            ;;
    esac
done
