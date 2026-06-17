#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
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
  操作後自動同步 / commit / push（只處理 rulesets/Rules）：
    python autopush.py --push +ad.example.com -old-ad.com

  指定 git repo 目錄（必須包含 rulesets/Rules）：
    python autopush.py --push --repo-dir "P:\\我的電腦\\Surge" +sentry.io
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import NamedTuple
from urllib.parse import urlsplit


SURGE_RULESET_DIR = Path(r"P:\我的電腦\Surge\rulesets\Rules")
RULESET_REMOTE_SUBDIR = Path("rulesets") / "Rules"
TARGET_RULE_FILES = ("reject-set.list", "reject-drop.list")


# ─── 參數預處理 ──────────────────────────────────────────
def _preprocess_argv(argv: list[str]) -> list[str]:
    """
    攔截並預處理 sys.argv，防止 PowerShell 的解析陷阱與 argparse 的短參數誤判。
    """
    safe_argv = []
    i = 0
    while i < len(argv):
        arg = argv[i]
        
        # 針對單一 '-' 開頭但非 '--' 的參數 (可能是刪除網域)
        if arg.startswith("-") and not arg.startswith("--"):
            
            # 【核心修復：PowerShell 參數拆詞陷阱防護】
            # PowerShell 常會將 "-ad.example.com" 錯誤拆解為 "-ad" 與 ".example.com"
            # 若發現下一個參數以 '.' 開頭，代表它是被暴力拆破的網域，系統主動將其縫合！
            if i + 1 < len(argv) and argv[i+1].startswith("."):
                merged_domain = arg + argv[i+1]
                safe_argv.append(f"__DEL__{merged_domain[1:]}")
                i += 2  # 跳過已被縫合的下一個碎片
                continue

            # 含 '.' → 判定為刪除網域，轉成內部標記繞過 argparse 短旗標誤判。
            # (涵蓋開頭恰為短旗標字母的域名，如刪除 baidu.com / set.example.com；
            #  正常的 "-b domains.txt" 批次參數不含 '.'，不受影響)
            if "." in arg:
                safe_argv.append(f"__DEL__{arg[1:]}")
                i += 1
                continue

        safe_argv.append(arg)
        i += 1
        
    return safe_argv


# ─── 路徑配置 ────────────────────────────────────────────
def _is_ruleset_rules_dir(path: Path) -> bool:
    parts = [p.lower() for p in path.resolve().parts]
    return len(parts) >= 2 and parts[-2:] == ["rulesets", "rules"]


def _resolve_paths(args):
    """Resolve file paths from args / env / defaults."""
    candidates = [SURGE_RULESET_DIR]
    if _is_ruleset_rules_dir(Path.cwd()):
        candidates.insert(0, Path.cwd())

    ruleset_dir = None
    for c in candidates:
        if c.is_dir() and (c / "reject-set.list").exists():
            ruleset_dir = c
            break
    if args.ruleset_dir:
        candidate = Path(args.ruleset_dir)
        if not _is_ruleset_rules_dir(candidate):
            print(f"{_red('ERR')} --ruleset-dir 必須指向 rulesets/Rules: {candidate}")
            sys.exit(1)
        ruleset_dir = candidate

    conf_candidates = [
        Path(r"C:\28Rule_Regression_Test\SSOT_Compiler\Default_20260413.conf"),
        Path.cwd() / "Default_20260413.conf",
    ]
    conf_path = None
    for c in conf_candidates:
        if c.exists():
            conf_path = c
            break
    if args.conf:
        conf_path = Path(args.conf)

    return ruleset_dir, conf_path


# ─── 資料結構 ────────────────────────────────────────────
class RuleEntry(NamedTuple):
    rtype: str   
    value: str   


class CheckResult(NamedTuple):
    already_covered: bool        
    covered_by: str | None       
    covers_existing: list[str]   
    whitelist_conflict: list[str]  


# ─── 載入現有規則 ────────────────────────────────────────
def load_domain_set(path: Path) -> list[RuleEntry]:
    if not path.exists():
        return []
    entries = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        entries.append(RuleEntry("DOMAIN-SUFFIX", s.lower()))
    return entries


def load_rule_set(path: Path) -> list[RuleEntry]:
    if not path.exists():
        return []
    entries = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        parts = [p.strip() for p in s.split(",")]
        if len(parts) >= 2 and parts[0] in ("DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD"):
            entries.append(RuleEntry(parts[0], parts[1].lower()))
    return entries


def load_whitelist(conf_path: Path) -> set[str]:
    if not conf_path or not conf_path.exists():
        return set()
    text = conf_path.read_text(encoding="utf-8")
    wl = set()
    in_rule = False
    for line in text.splitlines():
        s = line.strip()
        if s == "[Rule]":
            in_rule = True; continue
        if in_rule and s.startswith("[") and s != "[Rule]":
            in_rule = False
        if not in_rule or s.startswith("#"):
            continue
        m = re.match(r"^DOMAIN(?:-SUFFIX)?,([^,\s]+)", s)
        if m and not re.search(r",REJECT", s):
            wl.add(m.group(1).lower())
    return wl


# ─── Subsumption 邏輯 ────────────────────────────────────
def is_subsumed_by(domain: str, suffix_set: set[str]) -> str | None:
    parts = domain.split(".")
    for i in range(len(parts)):
        anc = ".".join(parts[i:])
        if anc in suffix_set and anc != domain:
            return anc
    if domain in suffix_set:
        return domain
    return None


def find_covered_children(domain: str, suffix_set: set[str]) -> list[str]:
    covered = []
    for existing in suffix_set:
        if existing == domain:
            continue
        if existing.endswith("." + domain):
            covered.append(existing)
    return sorted(covered)


def check_domain(domain: str, all_suffixes: set[str], whitelist: set[str]) -> CheckResult:
    covered_by = is_subsumed_by(domain, all_suffixes)
    covers = find_covered_children(domain, all_suffixes)
    wl_conflicts = []
    for w in whitelist:
        if w == domain or w.endswith("." + domain):
            wl_conflicts.append(w)
    return CheckResult(
        already_covered=covered_by is not None,
        covered_by=covered_by,
        covers_existing=covers,
        whitelist_conflict=wl_conflicts,
    )


def normalize_domain_input(raw: str) -> str:
    s = (raw or "").strip().lower()
    if not s:
        return ""
    if s.startswith("http://") or s.startswith("https://"):
        u = urlsplit(s)
        s = u.netloc or u.path
    if "/" in s:
        s = s.split("/", 1)[0]
    if ":" in s:
        s = s.split(":", 1)[0]
    return s.strip().strip(".")


def find_bucket_for_exact_domain(domain: str, reject_set_path: Path, reject_drop_path: Path) -> str | None:
    set_entries = load_domain_set(reject_set_path)
    if any(e.rtype == "DOMAIN-SUFFIX" and e.value == domain for e in set_entries):
        return "set"
    drop_entries = load_rule_set(reject_drop_path)
    if any(e.rtype == "DOMAIN-SUFFIX" and e.value == domain for e in drop_entries):
        return "drop"
    return None


# ─── 分類啟發式 ────────────────────────────────────────
DROP_INDICATORS = {
    "sentry", "bugsnag", "crashlytics", "newrelic", "datadog",
    "raygun", "logrocket", "hotjar", "fullstory", "mouseflow",
    "apm", "telemetry", "heartbeat", "beacon", "collector",
    "sdk", "log-collector", "log16", "mon-va",
}

def suggest_bucket(domain: str, is_keyword: bool) -> str:
    if is_keyword:
        return "drop"  
    d = domain.lower()
    for indicator in DROP_INDICATORS:
        if indicator in d:
            return "drop"
    return "set"


def suggest_reason(bucket: str) -> str:
    if bucket == "drop":
        return "SDK/遙測類會重試 → REJECT-DROP 靜默丟棄"
    return "一般廣告/追蹤 → REJECT (trie 效能最佳)"


# ─── 寫入與移除邏輯 ────────────────────────────────────────────
def append_to_domain_set(path: Path, domain: str):
    lines = path.read_text(encoding="utf-8").splitlines()
    header, data = [], []
    for line in lines:
        if line.strip().startswith("#") or not line.strip():
            if not data:
                header.append(line)
            else:
                data.append(line)
        else:
            data.append(line)
    data.append(domain)
    data = sorted(set(d for d in data if d.strip() and not d.strip().startswith("#")))
    for i, h in enumerate(header):
        if "Total:" in h:
            header[i] = re.sub(r"Total: \d+", f"Total: {len(data)}", h)
    while header and not header[-1].strip():
        header.pop()
    path.write_text("\n".join(header + [""] + data) + "\n", encoding="utf-8")


def append_to_rule_set(path: Path, rtype: str, value: str):
    entries = load_rule_set(path)
    entries.append(RuleEntry(rtype, value))
    entries = sorted(set(entries), key=lambda e: (
        {"DOMAIN-SUFFIX": 0, "DOMAIN": 1, "DOMAIN-KEYWORD": 2}.get(e.rtype, 9),
        e.value,
    ))
    raw = path.read_text(encoding="utf-8").splitlines()
    h = []
    for l in raw:
        s = l.strip()
        if s.startswith("# ---"):        # 區段標記 (# --- TYPE ---) 由下方重新產生，不併入檔頭
            break
        if s.startswith("#") or not s:
            h.append(l)
        else:                            # 第一條規則 → 檔頭結束
            break
    while h and not h[-1].strip():        # 去除檔頭尾端空行，避免與區段標記間多一行空白
        h.pop()
    for i, line in enumerate(h):
        if "Total:" in line:
            h[i] = re.sub(r"Total: \d+", f"Total: {len(entries)}", line)
    out = h[:]
    cur_type = None
    for e in entries:
        if e.rtype != cur_type:
            out.append(f"\n# --- {e.rtype} ---")
            cur_type = e.rtype
        out.append(f"{e.rtype},{e.value}")
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def remove_from_files(reject_set_path: Path, reject_drop_path: Path, domains: list[str]) -> int:
    removed = 0
    for path, loader, writer_type in [
        (reject_set_path, load_domain_set, "domain-set"),
        (reject_drop_path, load_rule_set, "rule-set"),
    ]:
        if not path.exists():
            continue
        entries = loader(path)
        before = len(entries)
        entries = [e for e in entries if e.value not in domains]
        if len(entries) < before:
            removed += before - len(entries)
            raw = path.read_text(encoding="utf-8").splitlines()
            header = []
            for l in raw:
                s = l.strip()
                if s.startswith("# ---"):        # 區段標記由 rule-set 分支重新產生，不併入檔頭
                    break
                if s.startswith("#") or not s:
                    header.append(l)
                else:
                    break
            while header and not header[-1].strip():   # 去除檔頭尾端空行
                header.pop()
            for i, line in enumerate(header):
                if "Total:" in line:
                    header[i] = re.sub(r"Total: \d+", f"Total: {len(entries)}", line)
            if writer_type == "domain-set":
                data = sorted(e.value for e in entries)
                while header and not header[-1].strip():
                    header.pop()
                path.write_text("\n".join(header + [""] + data) + "\n", encoding="utf-8")
            else:
                entries.sort(key=lambda e: (
                    {"DOMAIN-SUFFIX": 0, "DOMAIN": 1, "DOMAIN-KEYWORD": 2}.get(e.rtype, 9),
                    e.value))
                out = header[:]
                cur = None
                for e in entries:
                    if e.rtype != cur:
                        out.append(f"\n# --- {e.rtype} ---"); cur = e.rtype
                    out.append(f"{e.rtype},{e.value}")
                path.write_text("\n".join(out) + "\n", encoding="utf-8")
    return removed


# ─── 輸出格式化 ────────────────────────────────────────
def _c(text, code): return f"\033[{code}m{text}\033[0m"
def _green(t):  return _c(t, 32)
def _yellow(t): return _c(t, 33)
def _red(t):    return _c(t, 31)
def _cyan(t):   return _c(t, 36)
def _bold(t):   return _c(t, 1)


def _read_key() -> str:
    """讀取單一按鍵，回傳 'UP'/'DOWN'/'LEFT'/'RIGHT'/'ENTER' 或單一字元。"""
    if os.name == "nt":
        import msvcrt
        ch = msvcrt.getwch()
        if ch in ("\x00", "\xe0"):                 # 方向鍵 / 功能鍵前綴
            ch2 = msvcrt.getwch()
            return {"H": "UP", "P": "DOWN", "K": "LEFT", "M": "RIGHT"}.get(ch2, "")
        if ch in ("\r", "\n"):
            return "ENTER"
        if ch == "\x1b":                           # Esc 視為返回
            return "LEFT"
        return ch
    # POSIX (Mac/Linux)
    import termios, tty
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
        if ch == "\x1b":                           # ESC 開頭：可能是方向鍵序列
            seq = sys.stdin.read(2)
            return {"[A": "UP", "[B": "DOWN", "[D": "LEFT", "[C": "RIGHT"}.get(seq, "LEFT")
        if ch in ("\r", "\n"):
            return "ENTER"
        return ch
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


def _cursor_menu(title: str, options: list[tuple[str, str]], default_value: str,
                 alias_map: dict[str, str]) -> str:
    """以 ↑/↓ 選擇、Enter 確認、← / Esc 取消(回 default) 的光標選單。"""
    idx = 0
    for i, (key, _lbl) in enumerate(options):
        if key.lower() == str(default_value).lower():
            idx = i
            break

    print(f"  {_cyan('?')} {title}  {_c('(↑/↓ 選擇, Enter 確認, ← 取消)', 90)}")
    n = len(options)
    for _ in range(n):                             # 先佔 n 行，render 再回頭重繪
        print()

    def render():
        sys.stdout.write(f"\033[{n}A")             # 游標上移 n 行回到第一個選項
        for i, (key, label) in enumerate(options):
            text = f"[{key}] {label}"
            line = ("  > " + _cyan(text)) if i == idx else ("    " + text)
            sys.stdout.write("\r\033[K" + line + "\n")
        sys.stdout.flush()

    render()
    while True:
        k = _read_key()
        if k == "UP":
            idx = (idx - 1) % n; render()
        elif k == "DOWN":
            idx = (idx + 1) % n; render()
        elif k == "ENTER":
            return options[idx][0].lower()
        elif k == "LEFT":
            return str(default_value).lower()
        elif k:                                    # 直接按鍵 / 別名也支援
            kl = k.lower()
            if kl in alias_map:
                return alias_map[kl]
            for key, _lbl in options:
                if kl == key.lower():
                    return kl


def prompt_menu_choice(title: str, options: list[tuple[str, str]], default_value: str,
                       aliases: dict[str, str] | None = None) -> str:
    alias_map = {k.lower(): v for k, v in (aliases or {}).items()}

    # 互動終端機 → 光標選單；非互動或讀鍵失敗 → 退回打字版
    if sys.stdin.isatty():
        try:
            return _cursor_menu(title, options, default_value, alias_map)
        except Exception:
            pass

    while True:
        print(f"  {_cyan('?')} {title}")
        for key, label in options:
            print(f"    [{key}] {label}")
        ans = input("    > ").strip().lower()
        if not ans:
            return default_value
        if ans in alias_map:
            return alias_map[ans]
        for key, _ in options:
            if ans == key.lower():
                return key.lower()
        print(f"  {_yellow('!')} 無效選項，請重新輸入")


# ─── CLI ────────────────────────────────────────────────
def build_parser():
    p = argparse.ArgumentParser(
        description="Surge REJECT 規則更新輔助工具 (+ 新增 / - 刪除)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("domains", nargs="*", help="要處理的域名 (可帶有 + 或 - 前綴)")
    p.add_argument("--keyword", "-k", action="store_true", help="以 DOMAIN-KEYWORD 模式新增 (自動放入 reject-drop)")
    p.add_argument("--drop", "-d", action="store_true", help="強制放入 reject-drop (REJECT-DROP)")
    p.add_argument("--set", "-s", action="store_true", help="強制放入 reject-set (REJECT)")
    p.add_argument("--batch", "-b", type=str, help="從檔案批次載入域名 (每行一個)")
    p.add_argument("--check-only", "-c", action="store_true", help="僅檢查, 不實際寫入")
    p.add_argument("--auto", "-a", action="store_true", help="非互動模式, 自動接受建議 bucket")
    p.add_argument("--clean-subsumed", action="store_true", help="自動清除被新規則覆蓋的現有子域")
    p.add_argument("--ruleset-dir", type=str, help="rulesets/Rules 目錄路徑 (覆蓋預設)")
    p.add_argument("--conf", type=str, help="Default_*.conf 路徑 (覆蓋預設)")
    p.add_argument("--push", "-p", action="store_true", help="完成後自動執行 git add / commit / push")
    p.add_argument("--repo-dir", type=str, help="git 倉庫根目錄 (必須包含 rulesets/Rules)")
    return p


# ─── Git 推送 ────────────────────────────────────────────
def _detect_repo_root(start: Path) -> Path | None:
    current = start.resolve() if start.exists() else None
    while current and current != current.parent:
        if (current / ".git").exists():
            return current
        current = current.parent
    try:
        result = subprocess.run(["git", "-C", str(start), "rev-parse", "--show-toplevel"],
                                capture_output=True, text=True, encoding="utf-8")
        if result.returncode == 0:
            candidate = Path(result.stdout.strip())
            if candidate.is_absolute() and candidate.is_dir():
                return candidate
    except FileNotFoundError:
        pass
    return None


def _target_rule_paths(repo_dir: Path, ruleset_dir: Path) -> tuple[Path, Path]:
    try:
        rel_set = (ruleset_dir / "reject-set.list").resolve().relative_to(repo_dir.resolve())
        rel_drop = (ruleset_dir / "reject-drop.list").resolve().relative_to(repo_dir.resolve())
    except ValueError:
        raise ValueError(f"ruleset_dir 不在 repo_dir 底下: {ruleset_dir}")

    expected = {
        (RULESET_REMOTE_SUBDIR / name).as_posix().lower()
        for name in TARGET_RULE_FILES
    }
    actual = {rel_set.as_posix().lower(), rel_drop.as_posix().lower()}
    if actual != expected:
        raise ValueError("autopush 只允許操作 rulesets/Rules/reject-set.list 與 reject-drop.list")
    return rel_set, rel_drop


def _git_stdout(repo_dir: Path, args: list[str]) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(repo_dir), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def _upstream_ref(repo_dir: Path) -> str:
    return _git_stdout(repo_dir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]) or "origin/main"


def _upstream_branch(upstream_ref: str) -> str:
    return upstream_ref.split("/", 1)[1] if "/" in upstream_ref else upstream_ref


def sync_remote_rules(repo_dir: Path, ruleset_dir: Path) -> bool:
    try:
        rel_paths = _target_rule_paths(repo_dir, ruleset_dir)
    except ValueError as exc:
        print(f"  {_red('ERR')} {exc}")
        return False

    fetch = subprocess.run(
        ["git", "-C", str(repo_dir), "fetch", "--prune", "origin"],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if fetch.returncode != 0:
        print(f"  {_red('ERR')} git fetch 失敗 (exit {fetch.returncode})")
        if fetch.stderr.strip():
            print(f"  {_yellow('stderr:')} {fetch.stderr.strip()}")
        return False

    upstream = _upstream_ref(repo_dir)
    for rel_path in rel_paths:
        show = subprocess.run(
            ["git", "-C", str(repo_dir), "show", f"{upstream}:{rel_path.as_posix()}"],
            capture_output=True,
        )
        if show.returncode != 0:
            print(f"  {_red('ERR')} 無法從 {upstream} 讀取 {rel_path.as_posix()}")
            if show.stderr.strip():
                print(f"  {_yellow('stderr:')} {show.stderr.decode('utf-8', errors='replace').strip()}")
            return False
        (repo_dir / rel_path).write_bytes(show.stdout)

    print(f"  {_green('✓')} 已只同步遠端 rulesets/Rules 規則檔")
    return True


def git_push(repo_dir: Path, ruleset_dir: Path, processed_tasks: list[tuple[str, str, str]]) -> bool:
    if not repo_dir.is_dir():
        print(f"  {_red('ERR')} repo_dir 不是有效的本地目錄: {repo_dir}")
        return False

    try:
        rel_set, rel_drop = _target_rule_paths(repo_dir, ruleset_dir)
    except ValueError as exc:
        print(f"  {_red('ERR')} {exc}")
        return False

    gc = ["git", "-C", str(repo_dir)]

    def run(cmd: list[str], step: str) -> bool:
        if "-C" in cmd:
            idx = cmd.index("-C")
            display_args = cmd[idx + 2:]
        else:
            display_args = cmd[1:]
        print(f"\n  {_cyan('git')} {' '.join(display_args)}")
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        if r.returncode != 0:
            print(f"  {_red('ERR')} {step} 失敗 (exit {r.returncode})")
            if r.stderr.strip():
                print(f"  {_yellow('stderr:')}\n{r.stderr.strip()}")
            if r.stdout.strip():
                print(f"  {_yellow('stdout:')}\n{r.stdout.strip()}")
            return False
        return True

    # 解析操作，動態生成 Commit 訊息
    add_set = [d for act, d, bkt in processed_tasks if act == "+" and bkt == "set"]
    add_drop = [d for act, d, bkt in processed_tasks if act == "+" and bkt == "drop"]
    removes = [d for act, d, bkt in processed_tasks if act == "-"]

    parts = []
    if add_set: parts.append(f"add-set: {', '.join(add_set)}")
    if add_drop: parts.append(f"add-drop: {', '.join(add_drop)}")
    if removes: parts.append(f"del: {', '.join(removes)}")
    
    msg = "rule: " + "; ".join(parts)
    
    # 若字元過長，縮寫 Commit 訊息
    if len(msg) > 72:
        msg = f"rule: update {len(processed_tasks)} rules (+{len(add_set)+len(add_drop)} -{len(removes)})"

    fetch = subprocess.run(gc + ["fetch", "--prune", "origin"], capture_output=True, text=True, encoding="utf-8")
    if fetch.returncode != 0:
        print(f"  {_red('ERR')} git fetch 失敗 (exit {fetch.returncode})")
        if fetch.stderr.strip():
            print(f"  {_yellow('stderr:')}\n{fetch.stderr.strip()}")
        return False

    upstream = _upstream_ref(repo_dir)
    branch = _upstream_branch(upstream)
    worktree_parent = repo_dir.parent / ".autopush-worktrees"
    worktree_parent.mkdir(exist_ok=True)
    worktree_dir = Path(tempfile.mkdtemp(prefix=f"{repo_dir.name}-rules-", dir=str(worktree_parent)))
    worktree_created = False

    try:
        if not run(gc + ["worktree", "add", "--detach", "--no-checkout", str(worktree_dir), upstream], "git worktree add"):
            return False
        worktree_created = True

        wt = ["git", "-c", f"safe.directory={worktree_dir.as_posix()}", "-C", str(worktree_dir)]
        if not run(wt + ["sparse-checkout", "init", "--cone"], "git sparse-checkout init"):
            return False
        if not run(wt + ["sparse-checkout", "set", RULESET_REMOTE_SUBDIR.as_posix()], "git sparse-checkout set"):
            return False
        if not run(wt + ["checkout"], "git checkout"):
            return False

        for rel_path in (rel_set, rel_drop):
            target = worktree_dir / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(repo_dir / rel_path, target)

        if not run(wt + ["add", rel_set.as_posix(), rel_drop.as_posix()], "git add"):
            return False

        status = subprocess.run(wt + ["diff", "--cached", "--stat"], capture_output=True, text=True, encoding="utf-8")
        if not status.stdout.strip():
            print(f"  {_yellow('!')} 無暫存變更，略過 commit/push")
            return True

        if not run(wt + ["commit", "-m", msg], "git commit"):
            return False
        if not run(wt + ["push", "origin", f"HEAD:{branch}"], "git push"):
            return False
    finally:
        if worktree_created:
            cleanup = subprocess.run(gc + ["worktree", "remove", "--force", str(worktree_dir)],
                                     capture_output=True, text=True, encoding="utf-8")
            if cleanup.returncode != 0:
                print(f"  {_yellow('!')} 無法移除暫存 worktree: {worktree_dir}")
        elif worktree_dir.exists():
            shutil.rmtree(worktree_dir, ignore_errors=True)
        try:
            worktree_parent.rmdir()
        except OSError:
            pass

    print(f"\n  {_green('✓')} 已推送至 GitHub")
    return True


def process_add(domain: str, is_keyword: bool, force_bucket: str | None,
                all_suffixes: set[str], whitelist: set[str],
                reject_set_path: Path, reject_drop_path: Path,
                check_only: bool, auto: bool, clean_subsumed: bool) -> str | None:
    if not is_keyword:
        if not re.fullmatch(r"[a-z0-9]([a-z0-9.\-]*[a-z0-9])?", domain):
            print(f"  {_red('X')} 無效域名格式")
            return None
        if "." not in domain:
            print(f"  {_red('X')} 缺少 TLD (如 .com/.net)")
            return None

        result = check_domain(domain, all_suffixes, whitelist)

        if result.already_covered:
            is_interactive = (not auto) and (not check_only) and sys.stdin.isatty()
            can_rebucket = is_interactive and (not force_bucket) and (result.covered_by == domain)
            if can_rebucket:
                current_bucket = find_bucket_for_exact_domain(domain, reject_set_path, reject_drop_path)
                if current_bucket in ("set", "drop"):
                    print(f"  {_yellow('!')} 已存在於 reject-{current_bucket}.list")
                    ans = prompt_menu_choice(
                        "要改分配嗎？",
                        [("1", "set"), ("2", "drop"), ("0", "跳過")],
                        "0",
                        aliases={"s": "1", "d": "2", "q": "0"},
                    )
                    if ans in ("1", "2"):
                        target_bucket = "set" if ans == "1" else "drop"
                        if target_bucket == current_bucket:
                            print(f"  {_yellow('~')} bucket 未變更，略過")
                            return None
                        remove_from_files(reject_set_path, reject_drop_path, [domain])
                        if target_bucket == "set":
                            append_to_domain_set(reject_set_path, domain)
                        else:
                            append_to_rule_set(reject_drop_path, "DOMAIN-SUFFIX", domain)
                        print(f"  {_green('V')} 已從 reject-{current_bucket}.list 轉移至 reject-{target_bucket}.list")
                        return target_bucket
            print(f"  {_yellow('!')} 已被覆蓋: {_cyan(result.covered_by)} (不需要新增)")
            return None

        if result.covers_existing:
            n = len(result.covers_existing)
            print(f"  {_green('+')} 此域名將額外覆蓋 {_bold(str(n))} 條現有子域:")
            for c in result.covers_existing[:5]: print(f"    - {c}")
            if clean_subsumed: print(f"  {_green('V')} --clean-subsumed: 將自動清除被覆蓋的子域")

        if result.whitelist_conflict:
            print(f"  {_red('!')} 白名單衝突:")
            for w in result.whitelist_conflict: print(f"    {_red('CONFLICT')}: {w} (DIRECT/Proxy)")
            is_interactive = (not auto) and (not check_only) and sys.stdin.isatty()
            if is_interactive:
                ans = input("    仍要新增嗎? [y/N] ").strip().lower()
                if ans != "y": return None
            else:
                return None
    else:
        result = CheckResult(False, None, [], [])

    if force_bucket:
        bucket = force_bucket
    else:
        suggested = suggest_bucket(domain, is_keyword)
        reason = suggest_reason(suggested)
        is_interactive = (not auto) and (not check_only) and sys.stdin.isatty()
        if is_interactive:
            print(f"  {_cyan('?')} 建議: {_bold('reject-' + suggested)} ({reason})")
            default_sel = "1" if suggested == "set" else "2"
            ans = prompt_menu_choice(
                "分配方式：",
                [("1", "set"), ("2", "drop"), ("0", "跳過")],
                default_sel,
                aliases={"s": "1", "d": "2", "q": "0"},
            )
            if ans == "0":
                return None
            bucket = "set" if ans == "1" else "drop"
        else:
            bucket = suggested
            print(f"  {_cyan('→')} 自動分類: {_bold('reject-' + bucket)} ({reason})")

    if check_only:
        print(f"  {_yellow('~')} [check-only] 將寫入: reject-{bucket}.list")
        return bucket

    if bucket == "set":
        append_to_domain_set(reject_set_path, domain)
    else:
        rtype = "DOMAIN-KEYWORD" if is_keyword else "DOMAIN-SUFFIX"
        append_to_rule_set(reject_drop_path, rtype, domain)

    print(f"  {_green('V')} 已新增至 {_bold(f'reject-{bucket}.list')}")

    if result.covers_existing and clean_subsumed:
        removed = remove_from_files(reject_set_path, reject_drop_path, result.covers_existing)
        if removed: print(f"  {_green('V')} 清除了 {removed} 條被覆蓋的子域")

    all_suffixes.add(domain)
    return bucket


def main():
    # 確保輸出為 UTF-8：避免在 cp950/Big5 主控台印出框線字元 (─ ━ → ✓) 時 UnicodeEncodeError
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = build_parser()
    
    # 執行已被修補的安全預處理機制，抵禦 PowerShell 強制拆解陷阱
    safe_argv = _preprocess_argv(sys.argv[1:])
    args = parser.parse_args(safe_argv)
    
    ruleset_dir, conf_path = _resolve_paths(args)

    if not ruleset_dir or not ruleset_dir.exists():
        print(f"{_red('ERR')} 找不到 rulesets 目錄。")
        sys.exit(1)

    reject_set_path = ruleset_dir / "reject-set.list"
    reject_drop_path = ruleset_dir / "reject-drop.list"

    # 若指定 --push，在任何檔案寫入前只同步遠端 rulesets/Rules 目標規則檔。
    if args.push:
        _pre_pull_repo_dir = Path(args.repo_dir).resolve() if args.repo_dir else _detect_repo_root(ruleset_dir)
        if _pre_pull_repo_dir and _pre_pull_repo_dir.is_dir():
            print(f"  {_cyan('→')} 寫入前只同步遠端 rulesets/Rules")
            if not sync_remote_rules(_pre_pull_repo_dir, ruleset_dir):
                sys.exit(1)
            print()

    set_entries = load_domain_set(reject_set_path)
    drop_entries = load_rule_set(reject_drop_path)
    all_suffixes = {e.value for e in set_entries if e.rtype == "DOMAIN-SUFFIX"}
    all_suffixes |= {e.value for e in drop_entries if e.rtype == "DOMAIN-SUFFIX"}
    whitelist = load_whitelist(conf_path) if conf_path else set()

    # 提取與解析任務：區分新增(+)與刪除(-)
    raw_domains = list(args.domains or [])
    if args.batch:
        bp = Path(args.batch)
        if bp.exists():
            raw_domains.extend(l.strip() for l in bp.read_text(encoding="utf-8").splitlines()
                               if l.strip() and not l.strip().startswith("#"))
        else:
            print(f"{_red('ERR')} batch 檔案不存在: {bp}")
            sys.exit(1)

    if not raw_domains:
        parser.print_help()
        sys.exit(0)

    parsed_tasks = []
    for d in raw_domains:
        d = d.strip()
        if not d: continue
        
        # 識別被預處理器安全縫合並標記的刪除任務
        if d.startswith("__DEL__"):
            nd = normalize_domain_input(d[7:])
            if nd:
                parsed_tasks.append(("-", nd))
        # 兼容透過 CMD 或是 batch 檔案正常讀取進來的刪除任務
        elif d.startswith("-"):
            nd = normalize_domain_input(d[1:])
            if nd:
                parsed_tasks.append(("-", nd))
        elif d.startswith("+"):
            nd = normalize_domain_input(d[1:])
            if nd:
                parsed_tasks.append(("+", nd))
        else:
            nd = normalize_domain_input(d)
            if nd:
                parsed_tasks.append(("+", nd))

    force_bucket = "set" if args.set else "drop" if (args.drop or args.keyword) else None

    processed_list = [] 
    counts = {"added": 0, "removed": 0, "skipped": 0}

    for action, domain in parsed_tasks:
        print(f"\n{'='*60}")
        if action == "+":
            print(f"  {_bold(domain)}  {_green('[新增]')}{' [KEYWORD]' if args.keyword else ''}")
            print(f"{'='*60}")
            bucket = process_add(
                domain, args.keyword, force_bucket, all_suffixes, whitelist,
                reject_set_path, reject_drop_path, args.check_only, args.auto, args.clean_subsumed
            )
            if bucket is not None:
                processed_list.append(("+", domain, bucket))
                counts["added"] += 1
            else:
                counts["skipped"] += 1

        elif action == "-":
            print(f"  {_bold(domain)}  {_red('[刪除]')}")
            print(f"{'='*60}")
            if args.check_only:
                print(f"  {_yellow('~')} [check-only] 將從規則庫移除")
                processed_list.append(("-", domain, "check"))
                counts["removed"] += 1
                continue

            rm_cnt = remove_from_files(reject_set_path, reject_drop_path, [domain])
            if rm_cnt > 0:
                print(f"  {_green('V')} 已從規則檔案中移除 ({rm_cnt} 筆關聯)")
                processed_list.append(("-", domain, "removed"))
                counts["removed"] += 1
                all_suffixes.discard(domain) 
            else:
                print(f"  {_yellow('!')} 規則中未找到此域名，略過")
                counts["skipped"] += 1

    print(f"\n{'='*60}")
    print(f"  完成: {_green(str(counts['added']) + ' 新增')} / "
          f"{_red(str(counts['removed']) + ' 移除')} / "
          f"{_yellow(str(counts['skipped']) + ' 跳過')}")

    # 離開碼：0 = 有變更且 (若 --push) 推送成功 / 3 = 沒有任何變更，未推送 / 其他 = 錯誤
    changed = bool(counts["added"] or counts["removed"])
    exit_code = 0

    if changed and not args.check_only:
        if args.push:
            repo_dir = Path(args.repo_dir).resolve() if args.repo_dir else _detect_repo_root(ruleset_dir)
            if not repo_dir or not repo_dir.is_dir():
                print(f"\n  {_red('ERR')} 無法自動偵測 git 倉庫。請用 --repo-dir 指定。")
                exit_code = 1
            else:
                print(f"\n  {_cyan('→')} 推送到 GitHub")
                exit_code = 0 if git_push(repo_dir, ruleset_dir, processed_list) else 1
        else:
            print(f"\n  提示: 加上 --push 可自動 commit 與 push")
    elif not changed:
        exit_code = 3   # 全部跳過 / 未找到，沒有東西可推送

    print(f"{'='*60}")
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
