#!/usr/bin/env python3
"""把本 skill 打成 zip，自动排除 .git、缓存、产物等无关内容。

为什么不用 skill-creator 的 package_skill.py：
    它用 rglob('*') 遍历全部文件，会把 .git 整个塞进压缩包（几百 KB 且逐次增长）。
    本脚本在遍历阶段就按规则跳过，.git 原地不动，不用挪目录。

用法：
    python scripts/pack.py                      # 输出到当前目录/<skill名>.zip
    python scripts/pack.py --out D:/x.zip       # 指定输出路径
    python scripts/pack.py --list               # 只列文件清单，不打包

排除规则：
    目录：.git / __pycache__ / dist / .venv / venv / .idea / .vscode / node_modules
    文件：*.pyc *.pyo *.log *.tmp *.swp *.zip / .DS_Store / Thumbs.db / desktop.ini
"""

import argparse
import sys
import zipfile
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent

SKIP_DIRS = {
    ".git", "__pycache__", "dist", ".venv", "venv",
    ".idea", ".vscode", "node_modules", ".mypy_cache", ".pytest_cache",
}
SKIP_SUFFIX = {".pyc", ".pyo", ".log", ".tmp", ".swp", ".swo", ".zip"}
SKIP_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}


def skill_name() -> str:
    return SKILL_ROOT.name


def iter_files():
    """按规则过滤后的文件列表（相对 SKILL_ROOT）。"""
    for p in sorted(SKILL_ROOT.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(SKILL_ROOT)
        if set(rel.parts) & SKIP_DIRS:
            continue
        if p.name in SKIP_NAMES:
            continue
        if p.suffix.lower() in SKIP_SUFFIX:
            continue
        yield p, rel


def check_frontmatter():
    """最小校验：SKILL.md 存在，且 frontmatter 里有 name 和 description。"""
    md = SKILL_ROOT / "SKILL.md"
    if not md.exists():
        return ["缺少 SKILL.md"]

    text = md.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return ["SKILL.md 缺少 YAML frontmatter"]

    end = text.find("\n---", 3)
    if end == -1:
        return ["SKILL.md 的 frontmatter 没有闭合"]

    block = text[3:end]
    errs = []
    if "name:" not in block:
        errs.append("frontmatter 缺少 name")
    if "description:" not in block:
        errs.append("frontmatter 缺少 description")

    declared = ""
    for line in block.splitlines():
        if line.strip().startswith("name:"):
            declared = line.split(":", 1)[1].strip()
            break
    if declared and declared != skill_name():
        errs.append(f"frontmatter name（{declared}）与目录名（{skill_name()}）不一致")

    return errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="zip 输出路径")
    ap.add_argument("--list", action="store_true", help="只列出将被打包的文件")
    args = ap.parse_args()

    errs = check_frontmatter()
    if errs:
        print("❌ 校验未通过：")
        for e in errs:
            print("   -", e)
        sys.exit(1)

    files = list(iter_files())
    if not files:
        print("❌ 没有可打包的文件")
        sys.exit(1)

    if args.list:
        for _, rel in files:
            print(rel.as_posix())
        print(f"\n共 {len(files)} 个文件")
        return

    out = Path(args.out).resolve() if args.out else (Path.cwd() / f"{skill_name()}.zip").resolve()
    if out.exists():
        out.unlink()
    out.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for src, rel in files:
            z.write(src, (Path(skill_name()) / rel).as_posix())

    raw = sum(p.stat().st_size for p, _ in files)
    print(f"✅ 已打包：{out}")
    print(f"   文件数：{len(files)}　原始大小：{raw / 1024:.1f} KB　压缩后：{out.stat().st_size / 1024:.1f} KB")
    print("   已排除：.git、__pycache__、dist、*.zip、系统与编辑器文件")


if __name__ == "__main__":
    main()
