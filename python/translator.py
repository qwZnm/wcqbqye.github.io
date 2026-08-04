#!/usr/bin/env python3
# 在线翻译命令行版：基于用户上传的 translator.py 优化

import argparse
import json
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("缺少 requests：请先运行 pip install requests", file=sys.stderr)
    raise


API_URL = "https://fanyi.so.com/index/search"
HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Origin": "https://fanyi.so.com",
    "Pro": "fanyi",
    "Referer": "https://fanyi.so.com/",
    "User-Agent": "Mozilla/5.0",
}


def is_chinese(text: str) -> bool:
    return any("\u4e00" <= ch <= "\u9fff" for ch in text)


def translate(text: str) -> str:
    if not text.strip():
        return ""

    data = {
        "eng": 0 if is_chinese(text) else 1,
        "validate": "",
        "ignore_trans": 0,
        "query": text,
    }
    response = requests.post(API_URL, headers=HEADERS, data=data, timeout=15)
    response.raise_for_status()
    payload = response.json()
    result = payload.get("data", {}).get("fanyi")
    if not result:
        raise RuntimeError(f"翻译接口未返回结果：{payload}")
    return result


def append_history(text: str, result: str, history_path: Path) -> None:
    history_path.parent.mkdir(parents=True, exist_ok=True)
    if history_path.exists() and history_path.stat().st_size > 0:
        try:
            history = json.loads(history_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = []
    else:
        history = []
    history.append({
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "source": text,
        "result": result,
    })
    history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="在线翻译命令行工具，自动判断中英文方向。")
    parser.add_argument("text", nargs="*", help="要翻译的文本")
    parser.add_argument("--history", default="../PythonData/translator.json", help="翻译历史保存路径")
    args = parser.parse_args()

    text = " ".join(args.text).strip()
    if not text:
        text = input("输入翻译内容: ").strip()
    if not text:
        print("未输入内容")
        return

    result = translate(text)
    append_history(text, result, Path(args.history))
    print(result)


if __name__ == "__main__":
    main()
