#!/usr/bin/env python3
"""生成「公众号一键设置」浏览器扩展。

用法：
    python scripts/build.py                           # 输出到 ./dist/公众号一键设置，版本号不变
    python scripts/build.py --bump                    # 打包前把版本号第 3 位 +1（2.0.0 → 2.0.1）
    python scripts/build.py --bump minor              # 第 2 位 +1（2.0.1 → 2.1.0）
    python scripts/build.py --bump major              # 第 1 位 +1（2.1.0 → 3.0.0）
    python scripts/build.py --out D:/tools/mp-ext     # 指定目录
    python scripts/build.py --zip D:/tools/mp.zip     # 指定压缩包路径

做的事：
    1. 校验 manifest.json / actions.json / 必需文件
    2. （可选）升版本号，并写回 assets/plugin/manifest.json
    3. 把 assets/plugin 完整复制到目标目录（Edge 直接加载这个目录）
    4. 打一个同名 zip，方便拷贝给别人
"""

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_SRC = SKILL_ROOT / "assets" / "plugin"
DEFAULT_NAME = "公众号一键设置"

KNOWN_ACTIONS = {"click", "type", "toggle", "radio", "waitFor", "waitGone", "sleep"}
REQUIRED_FILES = ["manifest.json", "actions.json", "background.js", "popup.html", "popup.js"]


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"❌ {path.name} 解析失败：{e}")
        sys.exit(1)


def bump_version(version: str, part: str = "patch") -> str:
    """按 part 升版本号：patch 改第 3 位，minor 改第 2 位，major 改第 1 位。"""
    nums = [int(x) for x in re.findall(r"\d+", version)[:3]]
    while len(nums) < 3:
        nums.append(0)

    if part == "major":
        nums = [nums[0] + 1, 0, 0]
    elif part == "minor":
        nums = [nums[0], nums[1] + 1, 0]
    else:
        nums = [nums[0], nums[1], nums[2] + 1]

    return ".".join(str(n) for n in nums)


def write_manifest_version(version: str):
    """把新版本号写回源码 manifest.json，保证下次打包从这里继续递增。"""
    path = PLUGIN_SRC / "manifest.json"
    data = load_json(path)
    data["version"] = version
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def validate():
    errs = []

    for f in REQUIRED_FILES:
        if not (PLUGIN_SRC / f).exists():
            errs.append(f"缺少文件 assets/plugin/{f}")

    for s in (16, 48, 128):
        if not (PLUGIN_SRC / "icons" / f"icon{s}.png").exists():
            errs.append(f"缺少图标 assets/plugin/icons/icon{s}.png")

    if errs:
        return errs, []

    manifest = load_json(PLUGIN_SRC / "manifest.json")
    for k in ("manifest_version", "name", "version", "background", "action"):
        if k not in manifest:
            errs.append(f"manifest.json 缺少字段 {k}")

    cfg = load_json(PLUGIN_SRC / "actions.json")
    actions = cfg.get("actions") or []

    if not actions:
        errs.append("actions.json 的 actions 为空，至少需要一个设置项")

    seen = set()
    for a in actions:
        aid = a.get("id")
        if not aid:
            errs.append("有设置项缺少 id")
            continue
        if aid in seen:
            errs.append(f"设置项 id 重复：{aid}")
        seen.add(aid)

        if not a.get("name"):
            errs.append(f"{aid} 缺少 name（弹窗里显示的名字）")
        if not a.get("steps"):
            errs.append(f"{aid} 没有 steps")

        for i, s in enumerate(a.get("steps") or []):
            act = s.get("action")
            if act not in KNOWN_ACTIONS:
                errs.append(f"{aid} 第 {i + 1} 步用了未知动作：{act}")
            if act in ("click", "type", "toggle", "radio", "waitFor", "waitGone"):
                if not s.get("target"):
                    errs.append(f"{aid} 第 {i + 1} 步缺少 target")
            if act == "type" and s.get("value") is None:
                errs.append(f"{aid} 第 {i + 1} 步是 type 但缺少 value")

    return errs, actions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="插件输出目录")
    ap.add_argument("--zip", default=None, help="zip 输出路径")
    ap.add_argument(
        "--bump",
        nargs="?",
        const="patch",
        choices=["patch", "minor", "major"],
        default=None,
        help="打包前升版本号：不带值=第 3 位 +1，minor=第 2 位，major=第 1 位",
    )
    args = ap.parse_args()

    errs, actions = validate()
    if errs:
        print("❌ 校验未通过：")
        for e in errs:
            print("   -", e)
        sys.exit(1)

    # 升版本号（写回源码，输出目录里的 manifest 也会是新版本）
    version_note = ""
    if args.bump:
        old = load_json(PLUGIN_SRC / "manifest.json").get("version", "0.0.0")
        new = bump_version(old, args.bump)
        write_manifest_version(new)
        version_note = f"{old} → {new}"
        print(f"🔢 版本号：{version_note}")

    out = Path(args.out).resolve() if args.out else (Path.cwd() / "dist" / DEFAULT_NAME).resolve()

    if out == PLUGIN_SRC.resolve():
        print("❌ 输出目录不能是 skill 内的源目录")
        sys.exit(1)

    if out.exists():
        shutil.rmtree(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(PLUGIN_SRC, out)

    zip_path = Path(args.zip).resolve() if args.zip else (out.parent / (out.name + ".zip")).resolve()
    if zip_path.exists():
        zip_path.unlink()
    zip_path.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(out.rglob("*")):
            if p.is_file():
                z.write(p, Path(out.name) / p.relative_to(out))

    names = "、".join((a.get("name") or a.get("id")) for a in actions)
    final_version = load_json(out / "manifest.json").get("version", "?")

    print(f"✅ 插件目录：{out}")
    print(f"✅ 压缩包：  {zip_path}")
    print(f"✅ 版本号：  {final_version}")
    print(f"✅ 设置项：  {names}")
    print("")
    print("加载方法：")
    print("  1. Edge 打开 edge://extensions/")
    print("  2. 开启左下角「开发人员模式」")
    print("  3. 点「加载解压缩的扩展」，选上面的插件目录")
    print("  4. 打开公众号图文编辑页并刷新一次")


if __name__ == "__main__":
    main()
